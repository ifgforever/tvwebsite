// Optional verification helper — needs: npm i -D playwright
// Optional verification helper: npm i -D playwright
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.env.SHOT_DIR || '/tmp/shots';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const id = fs.readFileSync(process.env.PID_FILE, 'utf8').trim();
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function shot(name, path, { width = 1440, height = 1000, wait = 900 } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  await page.close();
  console.log(`✓ ${name}`);
}

await shot('01-projects', '/');
await shot('02-overview', `/p/${id}`);
await shot('03-designer', `/p/${id}/design`);
await shot('04-preview', `/p/${id}/preview`);
await shot('05-drawings', `/p/${id}/drawings`);
await shot('06-materials', `/p/${id}/materials`);
await shot('07-sourcing', `/p/${id}/sourcing`);
await shot('08-estimate', `/p/${id}/estimate`);
await shot('09-package', `/p/${id}/package`);
await shot('10-mobile-designer', `/p/${id}/design`, { width: 393, height: 852 });

console.log(errors.length ? `\nERRORS:\n${[...new Set(errors)].join('\n')}` : '\nNo console or page errors.');
await browser.close();
