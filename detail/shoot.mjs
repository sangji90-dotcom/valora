/**
 * 상세 HTML 을 PNG 로 굽습니다.
 *
 *  - full : 전체 한 장 (사이트 상세 탭이나 PDF 에 넣을 때)
 *  - 01~  : 섹션별 조각 (스마트스토어 등은 여러 장으로 올립니다)
 *
 * 폭 860px 은 국내 커머스 상세의 관행입니다. 두 배로 찍어 두면
 * 고해상도 화면에서도 글자가 뭉개지지 않습니다.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] ?? path.join(HERE, 'out');
await mkdir(OUT, { recursive: true });

const PINNED = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({
  viewport: { width: 860, height: 1200 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
});
await page.goto('file://' + path.join(HERE, process.argv[3] ?? 'dispenser.html'), { waitUntil: 'load' });
await page.waitForTimeout(400);

await page.screenshot({ path: path.join(OUT, 'dispenser-full.png'), fullPage: true });
console.log('  ✎ dispenser-full.png');

const ids = await page.$$eval('section', (ss) => ss.map((s) => s.id));
let i = 0;
for (const id of ids) {
  i += 1;
  const el = await page.$('#' + id);
  const file = path.join(OUT, `dispenser-${String(i).padStart(2, '0')}.png`);
  await el.screenshot({ path: file });
  console.log('  ✎', path.basename(file));
}

await browser.close();
