import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] ?? path.join(HERE, '..', 'src', 'assets', 'products', 'detail');
await mkdir(OUT, { recursive: true });
const PINNED = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({ viewport: { width: 820, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + path.join(HERE, 'sections.html'), { waitUntil: 'load' });
await page.waitForTimeout(400);
for (const id of await page.$$eval('.fig', (ss) => ss.map((s) => s.id))) {
  const el = await page.$('#' + id);
  await el.screenshot({ path: path.join(OUT, id + '.png') });
  console.log('  ✎', id + '.png');
}
await browser.close();
