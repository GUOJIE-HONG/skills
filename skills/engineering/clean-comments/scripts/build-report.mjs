#!/usr/bin/env node
// usage: node build-report.mjs <findings.json>   (run from the repo root)
// Builds the clean-comments report from the findings file and prints its path. Node 20+, built-ins only.
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CSS = readFileSync(new URL('../assets/report.css', import.meta.url), 'utf8');

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

// The file's lines as HTML, one string per line, read fresh so the report always shows the real code.
function sourceLines(file) {
  return readFileSync(file, 'utf8').split(/\r?\n/).map(escape);
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

function row(f, t, open) {
  const [from, to] = f.lines;
  const old = f.kind === 'mismatch' ? `<div class="old"><span class="tag">${t.before}</span><pre>${escape(f.oldComment)}</pre></div>` : '';
  return `<details${open ? ' open' : ''}>
      <summary>${CHEVRON}<span class="lines">${from === to ? from : `${from}–${to}`}</span><span class="text">${escape(f.note)}</span></summary>
      <div class="body">${old}${code(f)}</div>
    </details>`;
}

function rows(items, t, first) {
  let file;
  return items
    .map((f) => {
      const heading = f.file === file ? '' : `<h3 class="file">${escape(f.file)}</h3>\n    `;
      file = f.file;
      return heading + row(f, t, f === first);
    })
    .join('\n    ');
}

function section({ kind, pict, items }, t, first) {
  const k = t.kinds[kind];
  const band = (heading) => `<div class="band"><div class="wrap">
    <div class="pict" aria-hidden="true"><svg viewBox="0 0 24 24">${pict}</svg></div>
    <h2>${heading}</h2>
    <div class="n">${items.length}</div>
  </div></div>`;
  if (items.length === 0) {
    return `<section class="kind empty" id="${kind}">
  ${band(k.name)}
  <div class="wrap"><p class="none">${t.none}</p></div>
</section>`;
  }
  return `<section class="kind" id="${kind}">
  ${band(`${k.name}<span class="q">${k.question}</span>`)}
  <div class="wrap">
    <p class="ask"><strong>${k.question}</strong>${k.explain}</p>
    ${rows(items, t, first)}
  </div>
</section>`;
}

function page(data, now) {
  const t = LABELS[data.lang];
  const groups = KINDS.map((k) => ({ ...k, items: data.findings.filter((f) => f.kind === k.kind).sort(byPlace) }));
  const first = groups.flatMap((g) => g.items)[0];
  const counts = groups
    .map(({ kind, items }) => `<li${items.length === 0 ? ' class="zero"' : ''}><a href="#${kind}"><span class="cn">${items.length}</span><span class="cl">${t.kinds[kind].name}</span>${DOWN_ARROW}</a></li>`)
    .join('\n      ');
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>clean-comments · ${escape(data.repo)}</title>
<style>
${CSS}</style>
</head>
<body>

<header class="head">
  <div class="wrap top">
    <h1>clean-comments <span>· ${escape(data.repo)}</span></h1>
    <div class="meta"><span>${t.path} <code>${escape(data.scope)}</code></span><span>${shownTime(now)}</span></div>
  </div>
  <nav class="wrap" aria-label="${t.nav}">
    <ul class="counts">
      ${counts}
    </ul>
  </nav>
</header>

<main>

${groups.map((g) => section(g, t, first)).join('\n\n')}

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

  function checkFinding(f, at) {
    if (!isObject(f)) return say(at, 'must be an object with kind, file, lines, show, and note');
    const p = `${at}.`;
    const kindOk = oneOf(f, p, 'kind', KINDS.map((k) => k.kind));
    const fileOk = text(f, p, 'file');
    text(f, p, 'note');

    const linesOk = isRange(f.lines);
    if (f.lines === undefined) say(`${p}lines`, 'missing');
    else if (!linesOk) say(`${p}lines`, `must be ${RANGE}`);
    const showOk = Array.isArray(f.show) && f.show.length > 0 && f.show.every(isRange);
    if (f.show === undefined) say(`${p}show`, 'missing');
    else if (!showOk) say(`${p}show`, `must be a non-empty list of ${RANGE}`);

    if (f.kind === 'mismatch') {
      if (f.oldComment === undefined) say(`${p}oldComment`, "missing; a mismatch keeps the old comment's exact text");
      else text(f, p, 'oldComment');
    } else if (kindOk && f.oldComment !== undefined) {
      say(`${p}oldComment`, `only a mismatch has one; remove it from this ${f.kind} finding`);
    }

    if (showOk) {
      f.show.slice(1).forEach((r, j) => {
        const prev = f.show[j];
        if (r[0] < prev[0]) say(`${p}show`, `${range(r)} comes after ${range(prev)}; list the ranges from top to bottom`);
        else if (r[0] <= prev[1]) say(`${p}show`, `${range(r)} overlaps ${range(prev)}; merge them or split them apart`);
      });
      if (linesOk && !f.show.some(([start, end]) => start <= f.lines[0] && f.lines[1] <= end)) {
        say(`${p}lines`, `${range(f.lines)} is not inside any one show range; widen a show range to cover it`);
      }
    }

    if (!fileOk) return;
    const count = lineCount(f.file);
    if (count === undefined) return say(`${p}file`, `${JSON.stringify(f.file)} does not exist or is not a file; give the path from the repo root`);
    const past = `goes past the end of ${f.file}, which has ${count} lines`;
    if (linesOk && f.lines[1] > count) say(`${p}lines`, past);
    if (showOk && f.show.some((r) => r[1] > count)) say(`${p}show`, past);
  }
}

// How many lines the file has (a final newline does not start another), or undefined when it cannot be read.
function lineCount(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
  return text === '' ? 0 : text.replace(/\r?\n$/, '').split(/\r?\n/).length;
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
