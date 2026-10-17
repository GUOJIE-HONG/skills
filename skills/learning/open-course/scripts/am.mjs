#!/usr/bin/env node
// usage: node am.mjs <am arguments>, e.g. node am.mjs video draft.md --no-open -o page.html
// Runs the bundled am CLI with the same command on Windows and macOS: its settings, state and voice-over cache stay in
// the temp directory, away from any separate answer-me-with-html install, and it never checks GitHub for updates,
// since this copy updates with the skill. Node 20+, built-ins only.
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const am = fileURLToPath(new URL('../vendor/answer-me-with-html/am.mjs', import.meta.url));
const env = { ...process.env, AM_HOME: join(tmpdir(), 'open-course-am'), AM_NO_UPDATE_CHECK: '1' };
const run = spawnSync(process.execPath, [am, ...process.argv.slice(2)], { stdio: 'inherit', env });
if (run.error) throw run.error;
process.exit(run.status ?? 1);
