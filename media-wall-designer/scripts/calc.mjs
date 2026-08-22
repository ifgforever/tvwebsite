/**
 * Prints the full take-off for a default project — the quickest way to sanity
 * check the calculation engine after changing a formula. `npm run calc`
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'mwd-')), 'calc.mjs');
const build = spawnSync(
  'npx',
  ['esbuild', 'scripts/calc-demo.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${out}`, '--log-level=error'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
if (build.status !== 0) process.exit(build.status ?? 1);
const run = spawnSync('node', [out], { stdio: 'inherit' });
process.exit(run.status ?? 0);
