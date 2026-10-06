import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] ?? path.join(HERE, '..', 'src', 'assets', 'products', 'detail');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
const page = await browser.newPage({ viewport: { width: 820, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('file://' + path.join(HERE, 'callout.html'), { waitUntil: 'load' });
await page.waitForTimeout(400);
for (const id of await page.$$eval('.shot', (ss) => ss.map((s) => s.id))) {
  const el = await page.$('#' + id);
  await el.screenshot({ path: path.join(OUT, id + '.png') });
  console.log('  ✎', id + '.png');
}
await browser.close();
