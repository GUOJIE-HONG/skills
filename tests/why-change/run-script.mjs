// What the why-change test files share: a fake git repo in a temp folder with committed and changed files, and a
// run of build-report.mjs there as the skill would run it.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'engineering', 'why-change', 'scripts', 'build-report.mjs');

function git(dir, ...args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
}

function write(dir, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
}

// A git repo whose last commit holds `before`, with `after` written over it and left uncommitted.
export function repo(before, after = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'why-change-test-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'test');
  git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, before);
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', 'before');
  write(dir, after);
  return dir;
}

// Writes the report file (an object as JSON, a string as is) and runs the script on it from the repo folder.
export function run(dir, report) {
  const reportPath = join(mkdtempSync(join(tmpdir(), 'why-change-report-')), 'report.json');
  writeFileSync(reportPath, typeof report === 'string' ? report : JSON.stringify(report));
  const r = spawnSync(process.execPath, [SCRIPT, reportPath, '--no-open'], { cwd: dir, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// A file's text of n lines, "line 1" to "line n" unless make says otherwise.
export const numbered = (n, make = (i) => `line ${i}`) => Array.from({ length: n }, (_, i) => make(i + 1)).join('\n') + '\n';

export function change(extra = {}) {
  return {
    kind: 'bugfix',
    title: '日期少一天',
    wrong: '錯在這裡。',
    how: '這樣修。',
    why: '因為這樣。',
    diffs: [{ file: 'src/a.js' }],
    risks: [],
    ...extra,
  };
}

export function report(changes, extra = {}) {
  return { repo: 'demo', range: 'HEAD', lang: 'zh-TW', changes, ...extra };
}
