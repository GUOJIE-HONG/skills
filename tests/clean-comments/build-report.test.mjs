// Run with `node --test` from the repo root. Kept outside the skill folder so installing the skill leaves
// it out. Each test builds a fake repo in a temp folder, runs build-report.mjs there as the skill would, and
// reads only its stdout, stderr, exit code, and the report it writes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'engineering', 'clean-comments', 'scripts', 'build-report.mjs');

// A fake repo: { 'src/A.cs': 'line 1\nline 2' } becomes files under a fresh temp folder.
function repo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'clean-comments-test-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

function run(dir, findings) {
  const findingsPath = join(mkdtempSync(join(tmpdir(), 'clean-comments-findings-')), 'findings.json');
  writeFileSync(findingsPath, JSON.stringify(findings));
  const r = spawnSync(process.execPath, [SCRIPT, findingsPath], { cwd: dir, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// Runs the script and returns the report's HTML, failing the test when no report was written.
function report(dir, findings) {
  const r = run(dir, findings);
  assert.equal(r.status, 0, r.stderr);
  return readFileSync(r.stdout.trim(), 'utf8');
}

const numbered = (n, make = (i) => `line ${i}`) => Array.from({ length: n }, (_, i) => make(i + 1)).join('\n');

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&amp;/g, '&');

// Each code block in the report as plain lines: ">12 text" for a marked line, " 12 text" for another, "…" for the
// break between two `show` ranges.
function codeBlocks(html) {
  return [...html.matchAll(/<pre class="code"><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) =>
    m[1].split(/(?=<span class="l(?: hit| gap)?">)/).map((line) => {
      const cls = line.match(/^<span class="(l(?: hit| gap)?)">/)[1];
      if (cls === 'l gap') return '…';
      const n = line.match(/<span class="ln">(\d+)<\/span>/)[1];
      const text = unescape(line.replace(/<span class="ln">\d+<\/span>/, '').replace(/<[^>]+>/g, ''));
      return `${cls === 'l hit' ? '>' : ' '}${n} ${text}`;
    }),
  );
}

// The report's sections in page order as [id, html].
const sections = (html) => [...html.matchAll(/<section class="kind[^"]*" id="([^"]+)">([\s\S]*?)<\/section>/g)].map((m) => [m[1], m[0]]);

// Each row of a section as "<file> <line range> <note>", in page order, with the file taken from the last path heading.
function rowsOf(sectionHtml) {
  let file;
  const out = [];
  for (const m of sectionHtml.matchAll(/<h3 class="file">([^<]*)<\/h3>|<summary>[\s\S]*?<span class="lines">([^<]*)<\/span><span class="text">([^<]*)<\/span>/g)) {
    if (m[1] !== undefined) file = unescape(m[1]);
    else out.push(`${file} ${m[2]} ${unescape(m[3])}`);
  }
  return out;
}

function finding(extra = {}) {
  return { kind: 'todo', file: 'src/A.cs', lines: [1, 1], show: [[1, 1]], note: '一句說明。', ...extra };
}

function findings(repoName, list, extra = {}) {
  return { repo: repoName, scope: 'src/', lang: 'zh-TW', findings: list, ...extra };
}

test('a run writes the report to the system temp folder and prints its full path', () => {
  const dir = repo({ 'src/Mail.cs': numbered(10) });
  const r = run(dir, {
    repo: 'PathRepo',
    scope: 'src/',
    lang: 'zh-TW',
    findings: [{ kind: 'todo', file: 'src/Mail.cs', lines: [3, 3], show: [[1, 5]], note: '還沒做。' }],
  });
  assert.equal(r.status, 0, r.stderr);
  const path = r.stdout.trim();
  assert.equal(dirname(path), tmpdir());
  assert.match(basename(path), /^clean-comments-PathRepo-\d{8}-\d{6}\.html$/);
  assert.ok(existsSync(path));
});

test('a finding shows its show ranges with line numbers, marks its lines, and breaks between ranges', () => {
  const dir = repo({ 'src/A.cs': numbered(20, (i) => `code ${i}`) });
  const html = report(dir, findings('ShowRepo', [finding({ lines: [3, 4], show: [[2, 5], [10, 10]] })]));
  assert.deepEqual(codeBlocks(html), [[' 2 code 2', '>3 code 3', '>4 code 4', ' 5 code 5', '…', ' 10 code 10']]);
});

test('the header names the repo, the scope, and the run time, and links each kind\'s count to its section', () => {
  const dir = repo({ 'src/A.cs': numbered(10) });
  const html = report(dir, findings('HeaderRepo', [
    finding({ kind: 'mismatch', lines: [2, 2], show: [[2, 2]], oldComment: '// 舊' }),
    finding({ kind: 'todo', lines: [4, 4], show: [[4, 4]] }),
    finding({ kind: 'todo', lines: [6, 6], show: [[6, 6]] }),
  ], { scope: 'src/' }));
  const header = html.match(/<header[\s\S]*?<\/header>/)[0];
  assert.match(header, /<h1>[^]*HeaderRepo[^]*<\/h1>/);
  assert.match(header, /<code>src\/<\/code>/);
  assert.match(header, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  const counts = [...header.matchAll(/<a href="#([^"]+)"><span class="cn">(\d+)<\/span><span class="cl">([^<]+)<\/span>/g)].map((m) => m.slice(1));
  assert.deepEqual(counts, [
    ['mismatch', '1', '註解與程式碼不一致'],
    ['naming', '0', '名稱不好'],
    ['todo', '2', 'TODO / FIXME'],
    ['commented-out', '0', '被註解掉的程式碼'],
  ]);
  for (const [id] of counts) assert.match(html, new RegExp(`<section class="kind[^"]*" id="${id}">`));
});

test('the four kinds appear in fixed order under bands that state the question and the count; an empty kind says none was found', () => {
  const dir = repo({ 'src/A.cs': numbered(10) });
  const html = report(dir, findings('SectionsRepo', [
    finding({ kind: 'todo', lines: [4, 4], show: [[4, 4]] }),
    finding({ kind: 'naming', lines: [2, 2], show: [[2, 2]] }),
    finding({ kind: 'naming', lines: [3, 3], show: [[3, 3]] }),
    finding({ kind: 'commented-out', lines: [5, 5], show: [[5, 5]] }),
  ]));
  const all = sections(html);
  assert.deepEqual(all.map(([id]) => id), ['mismatch', 'naming', 'todo', 'commented-out']);
  const [mismatch, naming, todo, commented] = all.map(([, s]) => s);

  assert.match(naming, /<div class="band">[\s\S]*<h2>名稱不好<span class="q">要不要改名？<\/span><\/h2>\s*<div class="n">2<\/div>/);
  assert.match(naming, /<p class="ask"><strong>要不要改名？<\/strong>這些名稱看不出用途。clean-comments 只改註解，不改名稱。<\/p>/);
  assert.match(todo, /<h2>TODO \/ FIXME<span class="q">還需要做嗎？<\/span><\/h2>\s*<div class="n">1<\/div>/);
  assert.match(commented, /<h2>被註解掉的程式碼<span class="q">可以刪掉嗎？<\/span><\/h2>/);
  assert.match(commented, /git 記得舊版本，不需要留在檔案裡。/);

  assert.match(mismatch, /<section class="kind empty"/);
  assert.match(mismatch, /<h2>註解與程式碼不一致<\/h2>\s*<div class="n">0<\/div>/);
  assert.match(mismatch, /這次沒有找到。/);
  assert.doesNotMatch(mismatch, /<details/);
  for (const s of [naming, todo, commented]) assert.doesNotMatch(s, /kind empty|這次沒有找到/);
});

test('rows in a section are sorted by file then line, and each file path is written once', () => {
  const dir = repo({ 'src/b.cs': numbered(30), 'src/a.cs': numbered(30), 'lib/z.cs': numbered(30) });
  const html = report(dir, findings('SortRepo', [
    finding({ file: 'src/b.cs', lines: [20, 20], show: [[20, 20]], note: 'b20' }),
    finding({ file: 'src/a.cs', lines: [9, 9], show: [[9, 9]], note: 'a9' }),
    finding({ file: 'src/b.cs', lines: [3, 4], show: [[3, 4]], note: 'b3' }),
    finding({ file: 'lib/z.cs', lines: [12, 12], show: [[12, 12]], note: 'z12' }),
    finding({ file: 'src/a.cs', lines: [2, 2], show: [[2, 2]], note: 'a2' }),
  ]));
  const todo = sections(html).find(([id]) => id === 'todo')[1];
  assert.deepEqual(rowsOf(todo), ['lib/z.cs 12 z12', 'src/a.cs 2 a2', 'src/a.cs 9 a9', 'src/b.cs 3–4 b3', 'src/b.cs 20 b20']);
  assert.deepEqual([...todo.matchAll(/<h3 class="file">([^<]*)<\/h3>/g)].map((m) => m[1]), ['lib/z.cs', 'src/a.cs', 'src/b.cs']);
});

test('only a mismatch row shows the old comment under "改之前"', () => {
  const dir = repo({ 'src/A.cs': numbered(10) });
  const html = report(dir, findings('OldCommentRepo', [
    finding({ kind: 'mismatch', lines: [2, 2], show: [[1, 3]], oldComment: '// 失敗會重試三次' }),
    finding({ kind: 'naming', lines: [5, 5], show: [[5, 5]] }),
    finding({ kind: 'todo', lines: [6, 6], show: [[6, 6]] }),
    finding({ kind: 'commented-out', lines: [7, 7], show: [[7, 7]] }),
  ]));
  const [mismatch, ...others] = sections(html).map(([, s]) => s);
  assert.match(mismatch, /<div class="old"><span class="tag">改之前<\/span><pre>\/\/ 失敗會重試三次<\/pre><\/div>/);
  for (const s of others) assert.doesNotMatch(s, /class="old"|改之前/);
});

test('only the first row of the whole report starts open', () => {
  const dir = repo({ 'src/A.cs': numbered(10) });
  const html = report(dir, findings('FirstOpenRepo', [
    finding({ kind: 'todo', lines: [1, 1], show: [[1, 1]] }),
    finding({ kind: 'naming', lines: [6, 6], show: [[6, 6]], note: '後面那筆' }),
    finding({ kind: 'naming', lines: [3, 3], show: [[3, 3]], note: '最前面那筆' }),
  ]));
  const opens = [...html.matchAll(/<details( open)?>\s*<summary>[\s\S]*?<span class="text">([^<]*)<\/span>/g)].map((m) => [m[2], Boolean(m[1])]);
  assert.deepEqual(opens, [['最前面那筆', true], ['後面那筆', false], ['一句說明。', false]]);
});

test('markup in the code, paths, note, old comment, repo, and scope shows as text, and the report has no script or outside URL', () => {
  const evil = '<script>alert(1)</script>';
  const file = "src/R&D's.cs";
  const dir = repo({ [file]: `// ${evil}\n/// <summary>"日期" & 'time'</summary>` });
  const html = report(dir, findings(`Repo${evil}`, [
    finding({ kind: 'mismatch', file, lines: [1, 2], show: [[1, 2]], note: `note ${evil}`, oldComment: `// old ${evil}` }),
  ], { scope: `src/${evil}` }));
  assert.doesNotMatch(html, /<script|<summary>"|R&D/i);
  assert.doesNotMatch(html, /https?:\/\/|url\(\s*["']?\/\//i);
  assert.deepEqual(codeBlocks(html), [[`>1 // ${evil}`, `>2 /// <summary>"日期" & 'time'</summary>`]]);
  assert.deepEqual(rowsOf(sections(html)[0][1]), [`${file} 1–2 note ${evil}`]);
  assert.match(html, /<pre>\/\/ old &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/pre>/);
  assert.match(html, /<code>src\/&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/code>/);
  assert.match(html, /<title>clean-comments · Repo&lt;script&gt;/);
});

test('the report carries its own styles: light and dark, phone width, jump offset under the band, and a keyboard focus ring', () => {
  const dir = repo({ 'src/A.cs': numbered(3) });
  const html = report(dir, findings('StyleRepo', [finding()]));
  assert.doesNotMatch(html, /<link\b/i);
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /scroll-margin-top:/);
  assert.match(css, /:focus-visible\s*\{\s*outline:/);
  assert.match(css, /\.band\s*\{[^}]*position: sticky/);
});

test('the code comes from the file: editing the source file changes the next report', () => {
  const dir = repo({ 'src/A.cs': 'int a = 1;\n// TODO: 改掉\nint b = 2;' });
  const list = [finding({ lines: [2, 2], show: [[1, 3]] })];
  assert.deepEqual(codeBlocks(report(dir, findings('EditRepoBefore', list))), [[' 1 int a = 1;', '>2 // TODO: 改掉', ' 3 int b = 2;']]);
  writeFileSync(join(dir, 'src/A.cs'), 'int a = 10;\r\n// FIXME: 換掉\r\nint b = 20;\r\n');
  assert.deepEqual(codeBlocks(report(dir, findings('EditRepoAfter', list))), [[' 1 int a = 10;', '>2 // FIXME: 換掉', ' 3 int b = 20;']]);
});

// The code of the report's first code block.
const firstCode = (html) => html.match(/<pre class="code"><code>([\s\S]*?)<\/code><\/pre>/)[1];

test('C# code is coloured with highlight.js classes', () => {
  const dir = repo({ 'src/Mail.cs': 'public class Mail\n{\n    // TODO: 寄信\n    string To = "a";\n}' });
  const html = report(dir, findings('HighlightRepo', [finding({ file: 'src/Mail.cs', lines: [3, 3], show: [[1, 5]] })]));
  const code = firstCode(html);
  assert.match(code, /<span class="hljs-keyword">public<\/span> <span class="hljs-keyword">class<\/span>/);
  assert.match(code, /<span class="hljs-comment">\/\/ <span class="hljs-doctag">TODO:<\/span> 寄信<\/span>/);
  assert.match(code, /<span class="hljs-string">&quot;a&quot;<\/span>/);
  assert.deepEqual(codeBlocks(html), [[' 1 public class Mail', ' 2 {', '>3     // TODO: 寄信', ' 4     string To = "a";', ' 5 }']]);
});

test('a file whose extension highlight.js does not know is shown whole and escaped, with no colour', () => {
  const dir = repo({ 'conf/app.zzz': 'public class <b>&\n// TODO: "x"\nend' });
  const html = report(dir, findings('PlainRepo', [finding({ file: 'conf/app.zzz', lines: [2, 2], show: [[1, 3]] })]));
  assert.doesNotMatch(firstCode(html), /hljs-/);
  assert.match(firstCode(html), /public class &lt;b&gt;&amp;/);
  assert.deepEqual(codeBlocks(html), [[' 1 public class <b>&', '>2 // TODO: "x"', ' 3 end']]);
});

test('a token that spans lines is split per line: each line closes the spans it opens and keeps its colour', () => {
  const dir = repo({ 'src/Old.cs': 'int a = 1;\n/* int b = 2;\n   int c = 3;\n   int d = 4; */\nint e = 5;' });
  const html = report(dir, findings('MultiLineRepo', [finding({ kind: 'commented-out', file: 'src/Old.cs', lines: [3, 4], show: [[3, 5]] })]));
  assert.deepEqual(codeBlocks(html), [['>3    int c = 3;', '>4    int d = 4; */', ' 5 int e = 5;']]);
  const lines = firstCode(html).split(/(?=<span class="l(?: hit)?">)/);
  for (const line of lines) {
    assert.equal(line.match(/<span\b/g).length, line.match(/<\/span>/g).length, line);
  }
  assert.match(lines[0], /<span class="hljs-comment">   int c = 3;<\/span>/);
  assert.match(lines[1], /<span class="hljs-comment">   int d = 4; \*\/<\/span>/);
  assert.doesNotMatch(lines[2], /hljs-comment/);
});
