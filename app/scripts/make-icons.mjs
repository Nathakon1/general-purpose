// Renders public/icon.svg to the PNG sizes the manifest needs.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icon.svg', 'utf8');
const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}`);
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true });
}
await browser.close();
