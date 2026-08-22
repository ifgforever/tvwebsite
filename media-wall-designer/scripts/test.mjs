/** Runs scripts/selftest.ts through esbuild, since the shared code is TS. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'mwd-test-')), 'selftest.mjs');
const build = spawnSync('npx', ['esbuild', 'scripts/selftest.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${out}`, '--log-level=error'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (build.status !== 0) process.exit(build.status ?? 1);
process.exit(spawnSync('node', [out], { stdio: 'inherit' }).status ?? 0);
