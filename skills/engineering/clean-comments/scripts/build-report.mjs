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
  const t = LABELS['zh-TW'];
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

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const now = new Date();
const out = join(tmpdir(), `clean-comments-${fileSafe(data.repo)}-${fileStamp(now)}.html`);
writeFileSync(out, page(data, now));
console.log(out);
