#!/usr/bin/env node
// usage: node build-report.mjs <findings.json>   (run from the repo root)
// Builds the clean-comments report from the findings file and prints its path. Node 20+, built-ins and the
// vendored highlight.js only.
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import hljs from '../vendor/highlight.js/highlight.min.mjs';

const CSS = readFileSync(new URL('../assets/report.css', import.meta.url), 'utf8');

// Fira Sans (OFL, Latin subset) embedded so Latin text and numbers look the same on any machine; CJK is outside the
// unicode-range and falls through to the system face.
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const FONT = [400, 600, 700]
  .map((weight) => {
    const woff2 = readFileSync(new URL(`../assets/fira-sans-${weight}.woff2`, import.meta.url)).toString('base64');
    return `@font-face { font-family: "Fira Sans Report"; font-weight: ${weight}; font-style: normal; font-display: block; unicode-range: ${LATIN}; src: url(data:font/woff2;base64,${woff2}) format("woff2"); }`;
  })
  .join('\n');

// The four kinds in report order, each with the pictogram on its band.
const KINDS = [
  { kind: 'mismatch', pict: '<path d="M4 9h16M4 15h16M16 4 8 20"/>' },
  { kind: 'naming', pict: '<path class="f" d="M2.5 3.5h9.2l9.8 9.8-8.2 8.2-10.8-10.8z"/><circle class="hole" cx="7.4" cy="8.4" r="2"/>' },
  { kind: 'todo', pict: '<path d="M5.5 21.5V3"/><path class="f" d="M5.5 2.5h14l-3.4 5.2 3.4 5.3h-14z"/>' },
  { kind: 'commented-out', pict: '<path d="M8 4C6 4 5 5 5 7v3l-2 2 2 2v3c0 2 1 3 3 3M16 4c2 0 3 1 3 3v3l2 2-2 2v3c0 2-1 3-3 3M14 8l-4 8"/>' },
];

const LABELS = {
  'zh-TW': {
    htmlLang: 'zh-Hant',
    path: '路徑',
    before: '改之前',
    none: '這次沒有找到。',
    nav: '四種項目',
    kinds: {
      mismatch: { name: '註解與程式碼不一致', question: '程式碼是不是有 bug？', explain: '這些註解原本跟程式碼說的不一樣。註解已改成符合程式碼，請確認程式碼本身是對的。' },
      naming: { name: '名稱不好', question: '要不要改名？', explain: '這些名稱看不出用途。clean-comments 只改註解，不改名稱。' },
      todo: { name: 'TODO / FIXME', question: '還需要做嗎？', explain: '還沒做完的事。決定要做、開成 issue，或刪掉這行。' },
      'commented-out': { name: '被註解掉的程式碼', question: '可以刪掉嗎？', explain: 'git 記得舊版本，不需要留在檔案裡。' },
    },
  },
  en: {
    htmlLang: 'en',
    path: 'Path',
    before: 'Before',
    none: 'None found this run.',
    nav: 'The four kinds',
    kinds: {
      mismatch: { name: 'Comment and code disagree', question: 'Is the code wrong?', explain: 'These comments said something the code does not do. Each comment now matches the code; check that the code itself is right.' },
      naming: { name: 'Unclear names', question: 'Rename it?', explain: "These names don't say what the code is for. clean-comments edits comments only, never names." },
      todo: { name: 'TODO / FIXME', question: 'Still needed?', explain: 'Unfinished work. Do it, file an issue, or delete the line.' },
      'commented-out': { name: 'Commented-out code', question: 'Delete it?', explain: "git keeps old versions; the file doesn't need to." },
    },
  },
};

const DOWN_ARROW = '<svg viewBox="0 0 16 16"><path d="M8 2v11M3.5 8.5 8 13l4.5-4.5"/></svg>';
const CHEVRON = '<span class="chev"><svg viewBox="0 0 12 12"><path d="M4 2l4 4-4 4"/></svg></span>';

const pad = (n) => String(n).padStart(2, '0');
const fileStamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const shownTime = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// The file's lines, split the one way both the checks and the report count them: LF or CRLF, and a final newline
// does not start another line. Undefined when the file cannot be read.
function readLines(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
  return text === '' ? [] : text.replace(/\r?\n$/, '').split(/\r?\n/);
}

// The file's lines as HTML, one string per line, read fresh so the report always shows the real code.
function sourceLines(file) {
  const lines = readLines(file);
  const language = extname(file).slice(1);
  if (!hljs.getLanguage(language)) return lines.map(escape);
  return splitLines(hljs.highlight(lines.join('\n'), { language, ignoreIllegals: true }).value);
}

// Splits highlighted HTML into lines, closing the spans still open at each line end and reopening them on the
// next line, so a token that spans lines (a block comment, a multi-line string) keeps its colour on every line.
function splitLines(html) {
  const open = [];
  return html.split('\n').map((line) => {
    const start = open.join('');
    for (const [tag] of line.matchAll(/<span[^>]*>|<\/span>/g)) {
      if (tag === '</span>') open.pop();
      else open.push(tag);
    }
    return start + line + '</span>'.repeat(open.length);
  });
}

function code(f) {
  const lines = sourceLines(f.file);
  const [from, to] = f.lines;
  const ranges = f.show.map(([start, end]) => {
    const rows = [];
    for (let n = start; n <= end; n++) {
      rows.push(`<span class="l${n >= from && n <= to ? ' hit' : ''}"><span class="ln">${n}</span>${lines[n - 1]}</span>`);
    }
    return rows.join('');
  });
  return `<pre class="code"><code>${ranges.join('<span class="l gap"></span>')}</code></pre>`;
}

const byPlace = (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.lines[0] - b.lines[0]);

function row(f, labels, open) {
  const [from, to] = f.lines;
  const old = f.kind === 'mismatch' ? `<div class="old"><span class="tag">${labels.before}</span><pre>${escape(f.oldComment)}</pre></div>` : '';
  return `<details${open ? ' open' : ''}>
      <summary>${CHEVRON}<span class="lines">${from === to ? from : `${from}–${to}`}</span><span class="text">${escape(f.note)}</span></summary>
      <div class="body">${old}${code(f)}</div>
    </details>`;
}

function rows(items, labels, openByDefault) {
  let file;
  return items
    .map((f) => {
      const heading = f.file === file ? '' : `<h3 class="file">${escape(f.file)}</h3>\n    `;
      file = f.file;
      return heading + row(f, labels, f === openByDefault);
    })
    .join('\n    ');
}

function section({ kind, pict, items }, labels, openByDefault) {
  const kindLabels = labels.kinds[kind];
  const band = (heading) => `<div class="band"><div class="wrap">
    <div class="pict" aria-hidden="true"><svg viewBox="0 0 24 24">${pict}</svg></div>
    <h2>${heading}</h2>
    <div class="n">${items.length}</div>
  </div></div>`;
  if (items.length === 0) {
    return `<section class="kind empty" id="${kind}">
  ${band(kindLabels.name)}
  <div class="wrap"><p class="none">${labels.none}</p></div>
</section>`;
  }
  return `<section class="kind" id="${kind}">
  ${band(`${kindLabels.name}<span class="q">${kindLabels.question}</span>`)}
  <div class="wrap">
    <p class="ask"><strong>${kindLabels.question}</strong>${kindLabels.explain}</p>
    ${rows(items, labels, openByDefault)}
  </div>
</section>`;
}

function page(data, now) {
  const labels = LABELS[data.lang];
  const groups = KINDS.map((group) => ({ ...group, items: data.findings.filter((f) => f.kind === group.kind).sort(byPlace) }));
  const openByDefault = groups.flatMap((g) => g.items)[0];
  const counts = groups
    .map(({ kind, items }) => `<li${items.length === 0 ? ' class="zero"' : ''}><a href="#${kind}"><span class="cn">${items.length}</span><span class="cl">${labels.kinds[kind].name}</span>${DOWN_ARROW}</a></li>`)
    .join('\n      ');
  return `<!doctype html>
<html lang="${labels.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>clean-comments · ${escape(data.repo)}</title>
<style>
${FONT}
${CSS}</style>
</head>
<body>

<header class="head">
  <div class="wrap top">
    <h1>clean-comments <span>· ${escape(data.repo)}</span></h1>
    <div class="meta"><span>${labels.path} <code>${escape(data.scope)}</code></span><span>${shownTime(now)}</span></div>
  </div>
  <nav class="wrap" aria-label="${labels.nav}">
    <ul class="counts">
      ${counts}
    </ul>
  </nav>
</header>

<main>

${groups.map((g) => section(g, labels, openByDefault)).join('\n\n')}

</main>
</body>
</html>
`;
}

// The repo name as it can appear in a file name on any OS.
const fileSafe = (s) => String(s).replace(/[\\/:*?"<>|\s]+/g, '-');

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isRange = (r) => Array.isArray(r) && r.length === 2 && r.every((n) => Number.isInteger(n) && n >= 1) && r[0] <= r[1];
const RANGE = '[first, last], whole line numbers from 1 with first <= last';
const range = (r) => `[${r.join(', ')}]`;

// Every mistake in the findings file as "<field>: <why>", so the agent can fix them all before the next run.
function problems(data) {
  if (!isObject(data)) return ['the file must hold one JSON object with repo, scope, lang, and findings'];
  const out = [];
  const say = (field, why) => out.push(`${field}: ${why}`);
  // Each check reports what is wrong with one field and returns whether later checks can rely on it.
  const text = (obj, at, key) => {
    const v = obj[key];
    if (v === undefined) say(at + key, 'missing');
    else if (typeof v !== 'string') say(at + key, 'must be text');
    else if (v.trim() === '') say(at + key, 'empty');
    else return true;
    return false;
  };
  const oneOf = (obj, at, key, allowed) => {
    const v = obj[key];
    if (v === undefined) say(at + key, 'missing');
    else if (!allowed.includes(v)) say(at + key, `${JSON.stringify(v)} is not one of ${allowed.join(', ')}`);
    else return true;
    return false;
  };

  text(data, '', 'repo');
  text(data, '', 'scope');
  oneOf(data, '', 'lang', Object.keys(LABELS));
  if (data.findings === undefined) say('findings', 'missing');
  else if (!Array.isArray(data.findings)) say('findings', 'must be a list of findings');
  else data.findings.forEach((f, i) => checkFinding(f, `findings[${i}]`));
  return out;

  function checkFinding(finding, at) {
    if (!isObject(finding)) return say(at, 'must be an object with kind, file, lines, show, and note');
    const prefix = `${at}.`;
    const kindOk = oneOf(finding, prefix, 'kind', KINDS.map((k) => k.kind));
    const fileOk = text(finding, prefix, 'file');
    text(finding, prefix, 'note');

    const linesOk = isRange(finding.lines);
    if (finding.lines === undefined) say(`${prefix}lines`, 'missing');
    else if (!linesOk) say(`${prefix}lines`, `must be ${RANGE}`);
    const showOk = Array.isArray(finding.show) && finding.show.length > 0 && finding.show.every(isRange);
    if (finding.show === undefined) say(`${prefix}show`, 'missing');
    else if (!showOk) say(`${prefix}show`, `must be a non-empty list of ${RANGE}`);

    if (finding.kind === 'mismatch') {
      if (finding.oldComment === undefined) say(`${prefix}oldComment`, "missing; a mismatch keeps the old comment's exact text");
      else text(finding, prefix, 'oldComment');
    } else if (kindOk && finding.oldComment !== undefined) {
      say(`${prefix}oldComment`, `only a mismatch has one; remove it from this ${finding.kind} finding`);
    }

    if (showOk) {
      finding.show.slice(1).forEach((r, j) => {
        const prev = finding.show[j];
        if (r[0] < prev[0]) say(`${prefix}show`, `${range(r)} comes after ${range(prev)}; list the ranges from top to bottom`);
        else if (r[0] <= prev[1]) say(`${prefix}show`, `${range(r)} overlaps ${range(prev)}; merge them or split them apart`);
      });
      if (linesOk && !finding.show.some(([start, end]) => start <= finding.lines[0] && finding.lines[1] <= end)) {
        say(`${prefix}lines`, `${range(finding.lines)} is not inside any one show range; widen a show range to cover it`);
      }
    }

    if (!fileOk) return;
    const count = readLines(finding.file)?.length;
    if (count === undefined) return say(`${prefix}file`, `${JSON.stringify(finding.file)} does not exist or is not a file; give the path from the repo root`);
    const past = `goes past the end of ${finding.file}, which has ${count} lines`;
    if (linesOk && finding.lines[1] > count) say(`${prefix}lines`, past);
    if (showOk && finding.show.some((r) => r[1] > count)) say(`${prefix}show`, past);
  }
}

function fail(lines) {
  console.error(lines.join('\n'));
  process.exit(1);
}

const findingsPath = process.argv[2];
if (!findingsPath) fail(['usage: node build-report.mjs <findings.json>   (run from the repo root)']);
let data;
try {
  data = readFileSync(findingsPath, 'utf8');
} catch (e) {
  fail([`${findingsPath} could not be read; no report was written.`, `  ${e.message}`]);
}
try {
  data = JSON.parse(data);
} catch (e) {
  fail([`${findingsPath} is not valid JSON; no report was written.`, `  ${e.message}`]);
}
const found = problems(data);
if (found.length) {
  fail([`${findingsPath} has ${found.length} problem(s); no report was written. Fix them all and run again.`, ...found.map((p) => `  ${p}`)]);
}
const now = new Date();
const out = join(tmpdir(), `clean-comments-${fileSafe(data.repo)}-${fileStamp(now)}.html`);
writeFileSync(out, page(data, now));
console.log(out);
