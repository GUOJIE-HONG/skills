// What both clean-comments test files share: a fake repo in a temp folder, and a run of build-report.mjs there as
// the skill would run it.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'engineering', 'clean-comments', 'scripts', 'build-report.mjs');

// A fake repo: { 'src/A.cs': 'line 1\nline 2' } becomes files under a fresh temp folder.
export function repo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'clean-comments-test-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

// Writes the findings file (an object as JSON, a string as is) and runs the script on it from the repo folder.
export function run(dir, findings) {
  const findingsPath = join(mkdtempSync(join(tmpdir(), 'clean-comments-findings-')), 'findings.json');
  writeFileSync(findingsPath, typeof findings === 'string' ? findings : JSON.stringify(findings));
  const r = spawnSync(process.execPath, [SCRIPT, findingsPath], { cwd: dir, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// A file's text of n lines, "line 1" to "line n" unless make says otherwise.
export const numbered = (n, make = (i) => `line ${i}`) => Array.from({ length: n }, (_, i) => make(i + 1)).join('\n');

export function finding(extra = {}) {
  return { kind: 'todo', file: 'src/A.cs', lines: [1, 1], show: [[1, 1]], note: '一句說明。', ...extra };
}
