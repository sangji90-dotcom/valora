import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
await mkdir(OUT, { recursive: true });
const PINNED = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
await page.goto('file://' + path.join(path.dirname(fileURLToPath(import.meta.url)), 'products.html'), { waitUntil: 'load' });
await page.waitForTimeout(400);
const ids = await page.$$eval('.shot', (ss) => ss.map((s) => s.id));

/* 설명이 있는 판본 — 상세 이미지·히어로용 */
for (const id of ids) {
  const el = await page.$('#' + id);
  await el.screenshot({ path: path.join(OUT, id + '.png') });
  console.log('  ✎', id + '.png');
}

/* 설명을 뺀 판본 — 카드 썸네일용. 작게 줄면 글자가 안 읽힙니다 */
await page.evaluate(() => document.body.classList.add('plain'));
await page.waitForTimeout(150);
for (const id of ids) {
  const el = await page.$('#' + id);
  await el.screenshot({ path: path.join(OUT, id + '-thumb.png') });
  console.log('  ✎', id + '-thumb.png');
}
await browser.close();
