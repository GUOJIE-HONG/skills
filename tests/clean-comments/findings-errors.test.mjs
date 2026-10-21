// Run with `node --test` from the repo root. Each test hands build-report.mjs a findings file with mistakes and
// checks that it refuses: non-zero exit, every problem on stderr with its finding and field, and no report written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repo, run, numbered, finding } from './run-script.mjs';

// Runs the script on findings that must be refused and returns its stderr lines. The repo name must be unique to the
// test, so that a report written by mistake can be found.
function refused(dir, findings) {
  const reports = () => readdirSync(tmpdir()).filter((f) => f.startsWith(`clean-comments-${findings.repo}-`));
  for (const old of reports()) rmSync(join(tmpdir(), old));
  const r = run(dir, findings);
  assert.notEqual(r.status, 0, 'the script should fail');
  assert.equal(r.stdout, '');
  assert.deepEqual(reports(), [], 'no report should be written');
  return r.stderr.split(/\r?\n/).filter(Boolean);
}

// The stderr line about one field, e.g. problem(lines, 'findings[1].note').
function problem(lines, field) {
  const hits = lines.filter((l) => l.includes(`${field}:`));
  assert.equal(hits.length, 1, `expected one problem for ${field} in:\n${lines.join('\n')}`);
  return hits[0];
}

test('missing fields at the top and in a finding are each reported', () => {
  const dir = repo({ 'src/A.cs': numbered(5) });
  const lines = refused(dir, {
    repo: 'RefusedMissing',
    lang: 'zh-TW',
    findings: [finding(), { kind: 'todo', lines: [1, 1], show: [[1, 1]] }],
  });
  assert.match(problem(lines, 'scope'), /missing/);
  assert.match(problem(lines, 'findings[1].file'), /missing/);
  assert.match(problem(lines, 'findings[1].note'), /missing/);
  assert.equal(lines.filter((l) => l.includes('findings[0]')).length, 0);
});

test('a kind or lang outside the allowed values and an empty note are reported', () => {
  const dir = repo({ 'src/A.cs': numbered(5) });
  const lines = refused(dir, {
    repo: 'RefusedValues',
    scope: 'src/',
    lang: 'ja',
    findings: [finding({ kind: 'bug' }), finding({ note: '   ' })],
  });
  assert.match(problem(lines, 'lang'), /"ja".*zh-TW, en/);
  assert.match(problem(lines, 'findings[0].kind'), /"bug".*mismatch, naming, todo, commented-out/);
  assert.match(problem(lines, 'findings[1].note'), /empty/);
});

test('a file that does not exist and line numbers past the end of the file are reported', () => {
  const dir = repo({ 'src/A.cs': numbered(5), 'src/B.cs': `${numbered(5)}\r\n` });
  const lines = refused(dir, {
    repo: 'RefusedFile',
    scope: 'src/',
    lang: 'zh-TW',
    findings: [
      finding({ file: 'src/Gone.cs' }),
      finding({ lines: [6, 6], show: [[1, 7]] }),
      finding({ file: 'src/B.cs', lines: [5, 5], show: [[5, 6]] }),
      finding({ file: 'src/B.cs', lines: [5, 5], show: [[1, 5]] }),
    ],
  });
  assert.match(problem(lines, 'findings[0].file'), /"src\/Gone\.cs" does not exist/);
  assert.match(problem(lines, 'findings[1].lines'), /past the end of src\/A\.cs, which has 5 lines/);
  assert.match(problem(lines, 'findings[1].show'), /past the end of src\/A\.cs, which has 5 lines/);
  assert.match(problem(lines, 'findings[2].show'), /past the end of src\/B\.cs, which has 5 lines/);
  assert.equal(lines.filter((l) => l.includes('findings[3]')).length, 0);
});

test('lines outside every show range, and show ranges out of order or overlapping, are reported', () => {
  const dir = repo({ 'src/A.cs': numbered(20) });
  const lines = refused(dir, {
    repo: 'RefusedRange',
    scope: 'src/',
    lang: 'zh-TW',
    findings: [
      finding({ lines: [8, 8], show: [[1, 3], [10, 12]] }),
      finding({ lines: [3, 4], show: [[1, 3], [4, 5]] }),
      finding({ lines: [1, 1], show: [[1, 2], [6, 7], [4, 5]] }),
      finding({ lines: [1, 1], show: [[1, 3], [3, 5]] }),
      finding({ lines: [3, 4], show: [[1, 2], [3, 5], [9, 9]] }),
    ],
  });
  assert.match(problem(lines, 'findings[0].lines'), /\[8, 8\] is not inside any one show range/);
  assert.match(problem(lines, 'findings[1].lines'), /\[3, 4\] is not inside any one show range/);
  assert.match(problem(lines, 'findings[2].show'), /\[4, 5\] comes after \[6, 7\]/);
  assert.match(problem(lines, 'findings[3].show'), /\[3, 5\] overlaps \[1, 3\]/);
  assert.equal(lines.filter((l) => l.includes('findings[4]')).length, 0);
});

test('a mismatch without its old comment, and any other kind with one, is reported', () => {
  const dir = repo({ 'src/A.cs': numbered(5) });
  const lines = refused(dir, {
    repo: 'RefusedOldComment',
    scope: 'src/',
    lang: 'zh-TW',
    findings: [
      finding({ kind: 'mismatch' }),
      finding({ kind: 'mismatch', oldComment: '' }),
      finding({ kind: 'naming', oldComment: '// 舊' }),
      finding({ kind: 'mismatch', oldComment: '// 舊' }),
    ],
  });
  assert.match(problem(lines, 'findings[0].oldComment'), /missing.*mismatch/);
  assert.match(problem(lines, 'findings[1].oldComment'), /empty/);
  assert.match(problem(lines, 'findings[2].oldComment'), /only a mismatch/);
  assert.equal(lines.filter((l) => l.includes('findings[3]')).length, 0);
});

test('values of the wrong type and malformed ranges are reported', () => {
  const dir = repo({ 'src/A.cs': numbered(5) });
  const top = refused(dir, { repo: 'RefusedTypeTop', scope: 3, lang: 'en', findings: 'none' });
  assert.match(problem(top, 'scope'), /text/);
  assert.match(problem(top, 'findings'), /list/);

  const lines = refused(dir, {
    repo: 'RefusedType',
    scope: 'src/',
    lang: 'zh-TW',
    findings: [
      finding({ lines: [3, 2], show: [[1, 5]] }),
      finding({ lines: 5, show: [] }),
      finding({ show: [[0, 1]] }),
      finding({ file: 7, note: ['a'] }),
      'todo',
      finding(),
    ],
  });
  assert.match(problem(lines, 'findings[0].lines'), /\[first, last\]/);
  assert.match(problem(lines, 'findings[1].lines'), /\[first, last\]/);
  assert.match(problem(lines, 'findings[1].show'), /list of \[first, last\]/);
  assert.match(problem(lines, 'findings[2].show'), /list of \[first, last\]/);
  assert.match(problem(lines, 'findings[3].file'), /text/);
  assert.match(problem(lines, 'findings[3].note'), /text/);
  assert.match(problem(lines, 'findings[4]'), /object/);
  assert.equal(lines.filter((l) => l.includes('findings[5]')).length, 0);
});

test('a findings file that is not JSON is reported', () => {
  const dir = repo({ 'src/A.cs': numbered(5) });
  const r = run(dir, '{ "repo": "BadJsonRepo", ');
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /not valid JSON/);
});

test('one run lists every problem across findings under a count, and writes no report', () => {
  const dir = repo({ 'src/A.cs': numbered(10) });
  const lines = refused(dir, {
    repo: 'RefusedAll',
    scope: 'src/',
    lang: 'zh-TW',
    findings: [
      finding({ kind: 'mismatch' }),
      finding({ file: 'src/Gone.cs' }),
      finding({ lines: [2, 2], show: [[1, 4], [3, 6]] }),
      finding({ kind: 'todo', note: '' }),
    ],
  });
  assert.match(lines[0], /4 problem/);
  assert.deepEqual(lines.slice(1).map((l) => l.trim().split(':')[0]), [
    'findings[0].oldComment',
    'findings[1].file',
    'findings[2].show',
    'findings[3].note',
  ]);
});
