/**
 * One command for local development.
 *
 *   Vite on :5173 for the UI (hot reload) and the Worker on :8787 for the API,
 *   with Vite proxying /api to it. Local D1 lives in .wrangler/state.
 */
import { spawn } from 'node:child_process';

const procs = [];
const run = (name, cmd, args, color) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  const tag = `\x1b[${color}m[${name}]\x1b[0m`;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const l of lines) if (l.trim()) out.write(`${tag} ${l}\n`);
    });
  };
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    process.stdout.write(`${tag} exited (${code})\n`);
    shutdown(code ?? 0);
  });
  procs.push(p);
  return p;
};

function shutdown(code = 0) {
  for (const p of procs) { try { p.kill('SIGTERM'); } catch { /* already gone */ } }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('\n  Media Wall Designer — dev\n  UI  http://localhost:5173\n  API http://localhost:8787/api/health\n');
run('api', 'npx', ['wrangler', 'dev', '--port', '8787', '--local'], 36);
run('web', 'npx', ['vite'], 33);
