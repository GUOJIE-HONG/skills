// Run with `node --test` from the repo root. Kept outside the skill folder so installing the skill leaves it out.
// Each test builds a fake git repo in a temp folder, runs build-report.mjs there as the skill would, and reads only
// its stdout, stderr, exit code, and the report it writes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, basename } from 'node:path';
import { repo, run, numbered, change, report } from './run-script.mjs';

function html(dir, data) {
  const r = run(dir, data);
  assert.equal(r.status, 0, r.stderr);
  return readFileSync(r.stdout.trim(), 'utf8');
}

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const text = (s) => unescape(s.replace(/<[^>]+>/g, ''));

// Each diff table row as "<old> <new> <sign><code>", the hunk header rows as "@@".
function diffRows(page) {
  return [...page.matchAll(/<tr class="(add|del|ctx|hunk)"><td class="ln">([^<]*)<\/td><td class="ln">([^<]*)<\/td><td class="code">([\s\S]*?)<\/td><\/tr>/g)].map(([, cls, o, n, code]) =>
    cls === 'hunk' ? '@@' : `${o} ${n} ${text(code)}`,
  );
}

const headings = (page) => [...page.matchAll(/<h3>([^<]*)<\/h3>/g)].map((m) => m[1]);

test('a run writes the report to the system temp folder and prints its full path', () => {
  const dir = repo({ 'src/a.js': numbered(5) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'changed' : `line ${i}`)) });
  const r = run(dir, report([change()], { repo: 'Path Repo' }));
  assert.equal(r.status, 0, r.stderr);
  const path = r.stdout.trim();
  assert.equal(dirname(path), tmpdir());
  assert.match(basename(path), /^why-change-Path-Repo-\d{8}-\d{6}\.html$/);
  assert.ok(existsSync(path));
});

test('a bug fix and a refactor each ask their own four questions, in order', () => {
  const dir = repo({ 'src/a.js': numbered(5) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'changed' : `line ${i}`)) });
  const page = html(dir, report([change(), change({ kind: 'refactor', title: '合併重試' })]));
  assert.deepEqual(headings(page), ['出了甚麼錯？', '怎麼修？', '為什麼這樣修？', '修了之後的風險是甚麼？', '原本哪裡不好？', '怎麼重構？', '為什麼這樣重構？', '重構之後的風險是甚麼？']);
});

test('the diff comes from git, with old and new line numbers', () => {
  const dir = repo({ 'src/a.js': numbered(5) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'new 3' : `line ${i}`)) });
  const page = html(dir, report([change()]));
  assert.deepEqual(diffRows(page), ['@@', '1 1 line 1', '2 2 line 2', '3  −line 3', ' 3 +new 3', '4 4 line 4', '5 5 line 5']);
  assert.match(page, /<span class="plus">\+1<\/span> <span class="minus">−1<\/span>/);
});

test('lines picks the hunks that touch them and leaves the others out', () => {
  const before = numbered(40);
  const after = numbered(40, (i) => (i === 3 ? 'top' : i === 35 ? 'bottom' : `line ${i}`));
  const dir = repo({ 'src/a.js': before }, { 'src/a.js': after });
  const rows = diffRows(html(dir, report([change({ diffs: [{ file: 'src/a.js', lines: [34, 36] }] })])));
  assert.ok(rows.some((r) => r.endsWith('+bottom')));
  assert.ok(!rows.some((r) => r.endsWith('+top')));
});

test('a diff longer than 30 rows starts folded; a short one does not', () => {
  const dir = repo({ 'src/long.js': numbered(5), 'src/a.js': numbered(5) }, { 'src/long.js': numbered(40, (i) => `new ${i}`), 'src/a.js': numbered(5, (i) => (i === 3 ? 'x' : `line ${i}`)) });
  const page = html(dir, report([change({ diffs: [{ file: 'src/long.js' }, { file: 'src/a.js' }] })]));
  const blocks = page.split('<div class="diff">').slice(1);
  assert.match(blocks[0], /<details class="fold"><summary>這段 diff 有 45 行，點一下展開<\/summary>/);
  assert.doesNotMatch(blocks[1], /<details/);
});

test('a range of two commits shows that commit\'s diff', () => {
  const dir = repo({ 'src/a.js': numbered(3) });
  const page = html(dir, report([change()], { range: '4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD' }));
  assert.deepEqual(diffRows(page), ['@@', ' 1 +line 1', ' 2 +line 2', ' 3 +line 3']);
  assert.match(page, /<code>git diff 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD<\/code>/);
});

test('a risk with at shows that line from the file; a risk without at is marked unconfirmed with its reason', () => {
  const dir = repo({ 'src/a.js': numbered(5), 'src/b.js': numbered(3, (i) => (i === 2 ? 'const t = addHours(d, 8);' : `b ${i}`)) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'x' : `line ${i}`)) });
  const page = html(dir, report([change({
    risks: [
      { title: '晚 8 小時', at: 'src/b.js:2', impact: '匯出。', check: '匯出一筆。', remedy: '拿掉。' },
      { title: '舊資料可能錯', reason: '沒找到寫入那一行。', impact: '舊訂單。', check: '查舊訂單。' },
    ],
  })]));
  const [evidence, suspected] = page.split('<div class="risk ').slice(1);
  assert.match(evidence, /^evidence">/);
  assert.match(evidence, /<span class="badge">有證據<\/span>/);
  assert.match(evidence, /<code class="at">src\/b\.js:2<\/code>/);
  assert.equal(text(evidence.match(/<pre class="at-line[^"]*">([\s\S]*?)<\/pre>/)[1]), '2const t = addHours(d, 8);');
  assert.deepEqual([...evidence.matchAll(/<dt>([^<]*)<\/dt>/g)].map((m) => m[1]), ['影響哪裡', '怎麼發現', '怎麼補救']);
  assert.match(suspected, /^suspected">/);
  assert.match(suspected, /<span class="badge">待確認<\/span>/);
  assert.doesNotMatch(suspected, /class="at"/);
  assert.deepEqual([...suspected.matchAll(/<dt>([^<]*)<\/dt>/g)].map((m) => m[1]), ['影響哪裡', '為什麼懷疑', '怎麼確認']);
});

test('the overview lists every change with its kind and risk counts, linked to its section', () => {
  const dir = repo({ 'src/a.js': numbered(5), 'src/b.js': numbered(3) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'x' : `line ${i}`)) });
  const page = html(dir, report([
    change({ risks: [{ title: 'r1', at: 'src/b.js:1', impact: 'i', check: 'c' }, { title: 'r2', reason: 'r', impact: 'i', check: 'c' }] }),
    change({ kind: 'refactor', title: '合併重試' }),
  ]));
  const rows = [...page.match(/<table class="summary">[\s\S]*?<\/table>/)[0].matchAll(/<tr><td class="no">[\s\S]*?<\/tr>/g)].map((m) => m[0]);
  assert.equal(rows.length, 2);
  assert.match(rows[0], /href="#change-1">日期少一天</);
  assert.match(rows[0], /有證據 1<\/span> <span class="count suspected">待確認 1/);
  assert.match(rows[1], /<span class="kind refactor">重構<\/span>/);
  assert.match(rows[1], /沒有找到風險/);
  assert.match(page, /這次改了 2 件：1 件修 bug、1 件重構/);
  assert.match(page, /<section class="change" id="change-2">/);
});

test('text fields become paragraphs, lists and code, with HTML escaped', () => {
  const dir = repo({ 'src/a.js': numbered(5) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'x' : `line ${i}`)) });
  const page = html(dir, report([change({ why: '第一段 `<b>`\n\n- 一\n- 二', tests: [{ command: 'npm test', result: '1 passed' }] })]));
  assert.match(page, /<p>第一段 <code>&lt;b&gt;<\/code><\/p>\n<ul><li>一<\/li><li>二<\/li><\/ul>/);
  assert.match(page, /<li><code>npm test<\/code><span>1 passed<\/span><\/li>/);
});

test('English labels follow lang en', () => {
  const dir = repo({ 'src/a.js': numbered(5) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'x' : `line ${i}`)) });
  const page = html(dir, report([change({ kind: 'refactor' })], { lang: 'en' }));
  assert.match(page, /<html lang="en">/);
  assert.deepEqual(headings(page), ['What was wrong with the old code?', 'How was it restructured?', 'Why restructure it this way?', 'What are the risks now?']);
});

test('the report holds no script', () => {
  const dir = repo({ 'src/a.js': numbered(5) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'x' : `line ${i}`)) });
  assert.doesNotMatch(html(dir, report([change()])), /<script/i);
});
