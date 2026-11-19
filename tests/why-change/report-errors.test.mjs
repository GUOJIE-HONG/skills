// The script refuses a report file with problems: it lists every one, exits 1, and writes no report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repo, run, numbered, change, report } from './run-script.mjs';

const changed = () => repo({ 'src/a.js': numbered(5), 'src/b.js': numbered(3) }, { 'src/a.js': numbered(5, (i) => (i === 3 ? 'x' : `line ${i}`)) });

function problems(dir, data) {
  const r = run(dir, data);
  assert.equal(r.status, 1, `expected a refusal, got: ${r.stdout}`);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /no report was written/);
  return r.stderr.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
}

test('every missing field is listed at once', () => {
  const lines = problems(changed(), { changes: [{ kind: 'feature', diffs: [] }] });
  assert.deepEqual(lines, [
    'repo: missing',
    'range: missing',
    'lang: missing',
    'changes[0].kind: "feature" is not one of bugfix, refactor',
    'changes[0].title: missing',
    'changes[0].wrong: missing',
    'changes[0].how: missing',
    'changes[0].why: missing',
    'changes[0].diffs: must be a non-empty list of { file, lines? }',
    'changes[0].risks: missing; use [] when there are none',
  ]);
});

test('a risk needs at or reason, never both, and at must point inside a real file', () => {
  const lines = problems(changed(), report([change({
    risks: [
      { title: 't', impact: 'i', check: 'c' },
      { title: 't', impact: 'i', check: 'c', at: 'src/b.js:1', reason: 'r' },
      { title: 't', impact: 'i', check: 'c', at: 'src/missing.js:1' },
      { title: 't', impact: 'i', check: 'c', at: 'src/b.js:9' },
      { title: 't', impact: 'i', check: 'c', at: 'src/b.js' },
    ],
  })]));
  assert.deepEqual(lines, [
    'changes[0].risks[0].reason: missing; a risk without at is unconfirmed and says why you suspect it',
    'changes[0].risks[1].reason: a risk with at is backed by that line; remove reason, or remove at if the line does not show the risk',
    'changes[0].risks[2].at: "src/missing.js" does not exist or is not a file; give the path from the repo root',
    'changes[0].risks[3].at: line 9 is outside src/b.js, which has 3 lines',
    'changes[0].risks[4].at: must be "<path from the repo root>:<line>"',
  ]);
});

test('a diff entry must name a file git diff shows changed, and lines must touch a change', () => {
  const lines = problems(changed(), report([change({ diffs: [{ file: 'src/b.js' }, { file: 'src/a.js', lines: [10, 12] }] })]));
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^changes\[0\]\.diffs\[0\]\.file: git diff HEAD shows no text change in src\/b\.js;/);
  assert.equal(lines[1], 'changes[0].diffs[1].lines: no change in src/a.js touches [10, 12]; its changes cover lines 1-5');
});

test('a range git cannot read is refused with git\'s own message', () => {
  const lines = problems(changed(), report([change()], { range: 'no-such-branch' }));
  assert.match(lines[0], /^changes\[0\]\.diffs\[0\]\.file: git diff no-such-branch -- src\/a\.js failed: /);
});

test('a file that is not JSON is refused', () => {
  const r = run(changed(), '{ not json');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /is not valid JSON; no report was written/);
});

test('an unknown lang is refused', () => {
  assert.deepEqual(problems(changed(), report([change()], { lang: 'ja' })), ['lang: "ja" is not one of zh-TW, en']);
});
