/**
 * Renders public/icon.svg to the PNG sizes iOS and Android need.
 * Optional dev helper: npm i -D playwright && node scripts/make-icons.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const svg = fs.readFileSync('public/icon.svg', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: `public/icon-${size}.png` });
  await page.close();
  console.log(`public/icon-${size}.png`);
}
await browser.close();
