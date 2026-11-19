#!/usr/bin/env node
// usage: node build-report.mjs <report.json> [--no-open]   (run from the repo root)
// Builds the why-change Change report from the agent's report file, takes every code snippet from `git diff` itself,
// writes the page to the system temp folder, prints its path, and opens it in the default browser. Node 20+,
// built-ins and the vendored highlight.js only.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import hljs from '../vendor/highlight.js/highlight.min.mjs';

const CSS = readFileSync(new URL('../assets/report.css', import.meta.url), 'utf8');

// A diff longer than this many rows starts folded, so the reasons stay readable; `git diff` shows the rest.
const FOLD_AFTER = 30;

const LABELS = {
  'zh-TW': {
    htmlLang: 'zh-Hant',
    range: '範圍',
    nav: '目錄',
    overview: '總覽',
    counts: (bugfix, refactor) => `這次改了 ${bugfix + refactor} 件` + (bugfix && refactor ? `：${bugfix} 件修 bug、${refactor} 件重構` : ''),
    columns: ['#', '類別', '改了甚麼', '風險'],
    noRisk: '沒有找到風險',
    evidence: '有證據',
    suspected: '待確認',
    impact: '影響哪裡',
    reason: '為什麼懷疑',
    checkEvidence: '怎麼發現',
    checkSuspected: '怎麼確認',
    remedy: '怎麼補救',
    tests: '修的過程中跑過的測試',
    fold: (n) => `這段 diff 有 ${n} 行，點一下展開`,
    kinds: {
      bugfix: { name: '修 bug', wrong: '出了甚麼錯？', how: '怎麼修？', why: '為什麼這樣修？', risks: '修了之後的風險是甚麼？' },
      refactor: { name: '重構', wrong: '原本哪裡不好？', how: '怎麼重構？', why: '為什麼這樣重構？', risks: '重構之後的風險是甚麼？' },
    },
  },
  en: {
    htmlLang: 'en',
    range: 'Range',
    nav: 'Contents',
    overview: 'Overview',
    counts: (bugfix, refactor) =>
      `${bugfix + refactor} change${bugfix + refactor === 1 ? '' : 's'}` + (bugfix && refactor ? `: ${bugfix} bug fix${bugfix === 1 ? '' : 'es'}, ${refactor} refactor${refactor === 1 ? '' : 's'}` : ''),
    columns: ['#', 'Kind', 'What changed', 'Risks'],
    noRisk: 'No risks found',
    evidence: 'Evidence',
    suspected: 'Unconfirmed',
    impact: 'What it affects',
    reason: 'Why suspected',
    checkEvidence: 'How to notice',
    checkSuspected: 'How to confirm',
    remedy: 'How to fix',
    tests: 'Tests run during the work',
    fold: (n) => `Show ${n} diff lines`,
    kinds: {
      bugfix: { name: 'Bug fix', wrong: 'What went wrong?', how: 'How was it fixed?', why: 'Why fix it this way?', risks: 'What are the risks now?' },
      refactor: { name: 'Refactor', wrong: 'What was wrong with the old code?', how: 'How was it restructured?', why: 'Why restructure it this way?', risks: 'What are the risks now?' },
    },
  },
};

const pad = (n) => String(n).padStart(2, '0');
const fileStamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const shownTime = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Text from the report file: a blank line between paragraphs, a paragraph of `- ` lines is a list, `backticks` are code.
const inline = (s) => escape(s).replace(/`([^`]+)`/g, '<code>$1</code>');
function prose(text) {
  return text
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((para) => {
      const lines = para.split(/\r?\n/).map((l) => l.trim());
      if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('\n');
}

// The file's lines, LF or CRLF, a final newline not starting another line. Undefined when the file cannot be read.
function readLines(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
  return text === '' ? [] : text.replace(/\r?\n$/, '').split(/\r?\n/);
}

// The highlight.js language named by the file's extension, or undefined when highlight.js does not know it.
function languageOf(file) {
  const language = extname(file).slice(1);
  return language && hljs.getLanguage(language) ? language : undefined;
}

// Splits highlighted HTML into lines, closing the spans still open at each line end and reopening them on the next
// line, so a token that spans lines (a block comment, a multi-line string) keeps its colour on every line.
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

const highlight = (lines, language) =>
  language ? splitLines(hljs.highlight(lines.join('\n'), { language, ignoreIllegals: true }).value) : lines.map(escape);

// ---- git ----

const diffs = new Map();

// The hunks `git diff <range> -- <file>` prints, each row with its old and new line numbers, or { error }.
function diffOf(rangeArgs, file) {
  const key = `${rangeArgs.join(' ')}\0${file}`;
  if (!diffs.has(key)) {
    const r = spawnSync('git', ['-c', 'core.quotepath=false', 'diff', '--no-color', '--no-ext-diff', '-U3', ...rangeArgs, '--', file], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (r.error) diffs.set(key, { error: `git could not run: ${r.error.message}` });
    else if (r.status !== 0) diffs.set(key, { error: (r.stderr || r.stdout).trim() });
    else diffs.set(key, { hunks: parseHunks(r.stdout) });
  }
  return diffs.get(key);
}

function parseHunks(text) {
  const hunks = [];
  let hunk;
  let oldNo;
  let newNo;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const head = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/);
    if (head) {
      oldNo = Number(head[1]);
      newNo = Number(head[3]);
      hunk = { header: line.slice(0, line.indexOf('@@', 2) + 2), context: head[5], newStart: newNo, newCount: head[4] === undefined ? 1 : Number(head[4]), rows: [] };
      hunks.push(hunk);
    } else if (hunk && line.startsWith('+')) hunk.rows.push({ sign: '+', old: '', new: newNo++, text: line.slice(1) });
    else if (hunk && line.startsWith('-')) hunk.rows.push({ sign: '-', old: oldNo++, new: '', text: line.slice(1) });
    else if (hunk && line.startsWith(' ')) hunk.rows.push({ sign: ' ', old: oldNo++, new: newNo++, text: line.slice(1) });
  }
  return hunks;
}

// The new-file lines a hunk covers; a hunk that only deletes covers the line it sits at.
const hunkSpan = (h) => [h.newStart, h.newStart + Math.max(h.newCount, 1) - 1];
const overlaps = ([a, b], [c, d]) => a <= d && c <= b;

// The hunks a diff entry shows: all of the file's, or those touching its `lines`.
const shownHunks = (hunks, lines) => (lines ? hunks.filter((h) => overlaps(hunkSpan(h), lines)) : hunks);

// ---- page ----

function diffBlock(entry, rangeArgs, labels) {
  const hunks = shownHunks(diffOf(rangeArgs, entry.file).hunks, entry.lines);
  const language = languageOf(entry.file);
  let added = 0;
  let removed = 0;
  let count = 0;
  const body = hunks
    .map((h) => {
      // Highlight each side as one text so multi-line tokens colour right, then put the rows back in diff order.
      const oldSide = highlight(h.rows.filter((r) => r.sign !== '+').map((r) => r.text), language);
      const newSide = highlight(h.rows.filter((r) => r.sign !== '-').map((r) => r.text), language);
      let o = 0;
      let n = 0;
      const rows = h.rows.map((r) => {
        count++;
        let html;
        if (r.sign === '-') {
          removed++;
          html = oldSide[o++];
        } else if (r.sign === '+') {
          added++;
          html = newSide[n++];
        } else {
          o++;
          html = newSide[n++];
        }
        const cls = r.sign === '+' ? 'add' : r.sign === '-' ? 'del' : 'ctx';
        return `<tr class="${cls}"><td class="ln">${r.old}</td><td class="ln">${r.new}</td><td class="code"><span class="sign">${r.sign === ' ' ? '' : r.sign === '-' ? '−' : '+'}</span>${html}</td></tr>`;
      });
      return `<tr class="hunk"><td class="ln"></td><td class="ln"></td><td class="code">${escape(h.header)}${h.context ? ` <span class="ctx-name">${escape(h.context)}</span>` : ''}</td></tr>\n${rows.join('\n')}`;
    })
    .join('\n');
  const table = `<div class="scroll"><table class="lines${language ? ` language-${language}` : ''}"><tbody>\n${body}\n</tbody></table></div>`;
  return `<div class="diff">
  <div class="diff-head"><span class="path">${escape(entry.file)}</span><span class="stat"><span class="plus">+${added}</span> <span class="minus">−${removed}</span></span></div>
  ${count > FOLD_AFTER ? `<details class="fold"><summary>${labels.fold(count)}</summary>${table}</details>` : table}
</div>`;
}

const AT = /^(.+):(\d+)$/;

// The line a risk points to, as it is in the file now.
function atLine(at) {
  const [, file, no] = at.match(AT);
  const line = readLines(file)[Number(no) - 1];
  const language = languageOf(file);
  return `<pre class="at-line${language ? ` language-${language}` : ''}"><span class="ln">${no}</span>${highlight([line], language)[0]}</pre>`;
}

function risk(r, labels) {
  const evidence = r.at !== undefined;
  const rows = [
    [labels.impact, r.impact],
    ...(evidence ? [] : [[labels.reason, r.reason]]),
    [evidence ? labels.checkEvidence : labels.checkSuspected, r.check],
    ...(r.remedy !== undefined ? [[labels.remedy, r.remedy]] : []),
  ];
  return `<div class="risk ${evidence ? 'evidence' : 'suspected'}">
  <div class="risk-head"><span class="badge">${evidence ? labels.evidence : labels.suspected}</span><strong>${inline(r.title)}</strong>${evidence ? `<code class="at">${escape(r.at)}</code>` : ''}</div>
  ${evidence ? atLine(r.at) : ''}
  <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${prose(v)}</dd>`).join('')}</dl>
</div>`;
}

const riskCounts = (risks) => {
  const evidence = risks.filter((r) => r.at !== undefined).length;
  return { evidence, suspected: risks.length - evidence };
};

function riskBadges({ evidence, suspected }, labels) {
  if (!evidence && !suspected) return `<span class="none">${labels.noRisk}</span>`;
  return [evidence && `<span class="count evidence">${labels.evidence} ${evidence}</span>`, suspected && `<span class="count suspected">${labels.suspected} ${suspected}</span>`]
    .filter(Boolean)
    .join(' ');
}

function change(c, i, rangeArgs, labels) {
  const k = labels.kinds[c.kind];
  const tests = c.tests?.length
    ? `<div class="tests"><h4>${labels.tests}</h4><ul>${c.tests.map((t) => `<li><code>${escape(t.command)}</code><span>${inline(t.result)}</span></li>`).join('')}</ul></div>`
    : '';
  return `<section class="change" id="change-${i + 1}">
  <h2><span class="no">${i + 1}.</span> ${inline(c.title)} <span class="kind ${c.kind}">${k.name}</span></h2>
  <h3>${k.wrong}</h3>
  <div class="prose">${prose(c.wrong)}</div>
  <h3>${k.how}</h3>
  <div class="prose">${prose(c.how)}</div>
  ${tests}
  ${c.diffs.map((d) => diffBlock(d, rangeArgs, labels)).join('\n  ')}
  <h3>${k.why}</h3>
  <div class="prose">${prose(c.why)}</div>
  <h3>${k.risks}</h3>
  ${c.risks.length ? c.risks.map((r) => risk(r, labels)).join('\n  ') : `<p class="none">${labels.noRisk}</p>`}
</section>`;
}

function page(data, rangeArgs, now) {
  const labels = LABELS[data.lang];
  const bugfix = data.changes.filter((c) => c.kind === 'bugfix').length;
  const refactor = data.changes.length - bugfix;
  const nav = data.changes
    .map((c, i) => `<li><a href="#change-${i + 1}"><span class="no">${i + 1}.</span><span>${inline(c.title)}</span></a></li>`)
    .join('\n      ');
  const rows = data.changes
    .map(
      (c, i) =>
        `<tr><td class="no">${i + 1}</td><td><span class="kind ${c.kind}">${labels.kinds[c.kind].name}</span></td><td><a href="#change-${i + 1}">${inline(c.title)}</a></td><td class="risks">${riskBadges(riskCounts(c.risks), labels)}</td></tr>`,
    )
    .join('\n      ');
  return `<!doctype html>
<html lang="${labels.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Change report · ${escape(data.repo)}</title>
<style>
${CSS}</style>
</head>
<body>

<header class="top">
  <div class="top-inner">
    <span class="mark">why-change</span><span class="repo">${escape(data.repo)}</span>
    <span class="meta"><span>${labels.range} <code>git diff ${escape(data.range)}</code></span><span>${shownTime(now)}</span></span>
  </div>
</header>

<div class="layout">
  <nav class="toc" aria-label="${labels.nav}">
    <h2>${labels.nav}</h2>
    <ul>
      <li><a href="#overview">${labels.overview}</a></li>
      ${nav}
    </ul>
  </nav>

  <main>
    <section id="overview">
      <h1>Change report</h1>
      <p class="lede">${labels.counts(bugfix, refactor)}</p>
      <table class="summary">
      <thead><tr>${labels.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>
      ${rows}
      </tbody>
      </table>
    </section>

${data.changes.map((c, i) => change(c, i, rangeArgs, labels)).join('\n\n')}
  </main>
</div>
</body>
</html>
`;
}

// ---- checks ----

const fileSafe = (s) => String(s).replace(/[\\/:*?"<>|\s]+/g, '-');
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isRange = (r) => Array.isArray(r) && r.length === 2 && r.every((n) => Number.isInteger(n) && n >= 1) && r[0] <= r[1];
const KINDS = ['bugfix', 'refactor'];

// Every mistake in the report file as "<field>: <why>", so the agent can fix them all before the next run.
function problems(data) {
  if (!isObject(data)) return { out: ['the file must hold one JSON object with repo, range, lang, and changes'] };
  const out = [];
  const say = (field, why) => out.push(`${field}: ${why}`);
  const text = (obj, at, key) => {
    const v = obj[key];
    if (v === undefined) say(at + key, 'missing');
    else if (typeof v !== 'string') say(at + key, 'must be text');
    else if (v.trim() === '') say(at + key, 'empty');
    else return true;
    return false;
  };
  const optionalText = (obj, at, key) => obj[key] === undefined || text(obj, at, key);

  text(data, '', 'repo');
  const rangeOk = text(data, '', 'range');
  if (data.lang === undefined) say('lang', 'missing');
  else if (!LABELS[data.lang]) say('lang', `${JSON.stringify(data.lang)} is not one of ${Object.keys(LABELS).join(', ')}`);
  const rangeArgs = rangeOk ? data.range.trim().split(/\s+/) : undefined;
  if (data.changes === undefined) say('changes', 'missing');
  else if (!Array.isArray(data.changes) || data.changes.length === 0) say('changes', 'must be a non-empty list of changes');
  else data.changes.forEach((c, i) => checkChange(c, `changes[${i}]`));
  return { out, rangeArgs };

  function checkChange(c, at) {
    if (!isObject(c)) return say(at, 'must be an object with kind, title, wrong, how, why, diffs, and risks');
    const p = `${at}.`;
    if (c.kind === undefined) say(`${p}kind`, 'missing');
    else if (!KINDS.includes(c.kind)) say(`${p}kind`, `${JSON.stringify(c.kind)} is not one of ${KINDS.join(', ')}`);
    for (const key of ['title', 'wrong', 'how', 'why']) text(c, p, key);

    if (c.tests !== undefined) {
      if (!Array.isArray(c.tests)) say(`${p}tests`, 'must be a list of { command, result }');
      else c.tests.forEach((t, j) => (isObject(t) ? (text(t, `${p}tests[${j}].`, 'command'), text(t, `${p}tests[${j}].`, 'result')) : say(`${p}tests[${j}]`, 'must be an object with command and result')));
    }

    if (c.diffs === undefined) say(`${p}diffs`, 'missing; name the files whose changes this entry explains');
    else if (!Array.isArray(c.diffs) || c.diffs.length === 0) say(`${p}diffs`, 'must be a non-empty list of { file, lines? }');
    else c.diffs.forEach((d, j) => checkDiff(d, `${p}diffs[${j}]`));

    if (c.risks === undefined) say(`${p}risks`, 'missing; use [] when there are none');
    else if (!Array.isArray(c.risks)) say(`${p}risks`, 'must be a list of risks');
    else c.risks.forEach((r, j) => checkRisk(r, `${p}risks[${j}]`));
  }

  function checkDiff(d, at) {
    if (!isObject(d)) return say(at, 'must be an object with file and optional lines');
    const p = `${at}.`;
    const fileOk = text(d, p, 'file');
    const linesOk = d.lines === undefined || isRange(d.lines);
    if (!linesOk) say(`${p}lines`, 'must be [first, last], whole line numbers from 1 with first <= last, in the file as it is after the change');
    if (!fileOk || !linesOk || !rangeOk) return;
    const diff = diffOf(rangeArgs, d.file);
    if (diff.error) return say(`${p}file`, `git diff ${data.range} -- ${d.file} failed: ${diff.error}`);
    if (diff.hunks.length === 0) {
      return say(`${p}file`, `git diff ${data.range} shows no text change in ${d.file}; check the path from the repo root and the range (a new untracked file needs \`git add -N ${d.file}\` first)`);
    }
    if (d.lines && shownHunks(diff.hunks, d.lines).length === 0) {
      const spans = diff.hunks.map((h) => hunkSpan(h).join('-')).join(', ');
      say(`${p}lines`, `no change in ${d.file} touches [${d.lines.join(', ')}]; its changes cover lines ${spans}`);
    }
  }

  function checkRisk(r, at) {
    if (!isObject(r)) return say(at, 'must be an object with title, impact, check, and either at or reason');
    const p = `${at}.`;
    for (const key of ['title', 'impact', 'check']) text(r, p, key);
    optionalText(r, p, 'remedy');
    if (r.at !== undefined) {
      if (r.reason !== undefined) say(`${p}reason`, 'a risk with at is backed by that line; remove reason, or remove at if the line does not show the risk');
      if (typeof r.at !== 'string' || !AT.test(r.at)) return say(`${p}at`, 'must be "<path from the repo root>:<line>"');
      const [, file, no] = r.at.match(AT);
      const count = readLines(file)?.length;
      if (count === undefined) say(`${p}at`, `${JSON.stringify(file)} does not exist or is not a file; give the path from the repo root`);
      else if (Number(no) < 1 || Number(no) > count) say(`${p}at`, `line ${no} is outside ${file}, which has ${count} lines`);
    } else if (r.reason === undefined) {
      say(`${p}reason`, 'missing; a risk without at is unconfirmed and says why you suspect it');
    } else text(r, p, 'reason');
  }
}

// ---- run ----

function fail(lines) {
  console.error(lines.join('\n'));
  process.exit(1);
}

// Opens the report in the default browser without waiting for it; the printed path is the delivery either way.
function openInBrowser(path) {
  const [cmd, args] = process.platform === 'win32' ? ['explorer.exe', [path]] : process.platform === 'darwin' ? ['open', [path]] : ['xdg-open', [path]];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
  } catch {
    // The path is already printed; the user can open it by hand.
  }
}

const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');
const reportPath = args.find((a) => a !== '--no-open');
if (!reportPath) fail(['usage: node build-report.mjs <report.json> [--no-open]   (run from the repo root)']);
let data;
try {
  data = readFileSync(reportPath, 'utf8');
} catch (e) {
  fail([`${reportPath} could not be read; no report was written.`, `  ${e.message}`]);
}
try {
  data = JSON.parse(data);
} catch (e) {
  fail([`${reportPath} is not valid JSON; no report was written.`, `  ${e.message}`]);
}
const checked = problems(data);
const found = checked.out;
if (found.length) {
  fail([`${reportPath} has ${found.length} problem(s); no report was written. Fix them all and run again.`, ...found.map((p) => `  ${p}`)]);
}
const now = new Date();
const out = join(tmpdir(), `why-change-${fileSafe(data.repo)}-${fileStamp(now)}.html`);
writeFileSync(out, page(data, checked.rangeArgs, now));
console.log(out);
if (!noOpen) openInBrowser(out);
