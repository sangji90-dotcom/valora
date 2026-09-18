/**
 * 모든 프리셋 조합을 빌드해 스크린샷으로 확인하고,
 * 모바일 가로 스크롤 / 콘솔 에러를 검사합니다.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from './lib/serve.mjs';

// 카테고리는 고객사마다 바뀌므로 설정에서 읽습니다
const { default: siteConfig } = await import(
  new URL('../site.config.ts', import.meta.url).href
);
const TEST_CATEGORY = siteConfig.categories[1] ?? siteConfig.categories[0];

const OUT = '/tmp/claude-0/presets';
mkdirSync(OUT, { recursive: true });
const CONFIG = 'site.config.ts';
const original = readFileSync(CONFIG, 'utf8');

/**
 * carousel 은 슬라이드 콘텐츠가 있어야 렌더됩니다.
 * 템플릿의 예시 슬라이드는 draft 라서, 이 조합에서만 잠시 켭니다.
 * 고객사 프로젝트에는 이 파일이 없고 실제 배너가 있으므로 건드리지 않습니다.
 */
const SLIDE = 'src/content/slides/example.md';
const slideOriginal = existsSync(SLIDE) ? readFileSync(SLIDE, 'utf8') : null;

const combos = [
  ['stacked', 'card'],
  ['split', 'card'],
  ['minimal', 'overlay'],
  ['split', 'list'],
  ['carousel', 'card'],
];

const problems = [];

try {
  for (const [hero, productCard] of combos) {
    /**
     * 값만 골라 바꿉니다.
     * layout 블록 전체를 정규식으로 잡으면 설정에 항목이 하나 늘 때마다
     * 이 스크립트가 깨집니다 (실제로 두 번 깨졌습니다).
     */
    const patched = original
      .replace(/hero: '(?:stacked|split|minimal|carousel)'/, `hero: '${hero}'`)
      .replace(/productCard: '(?:card|overlay|list)'/, `productCard: '${productCard}'`);

    if (patched === original && !original.includes(`hero: '${hero}'`)) {
      throw new Error('config 패치 실패 — site.config.ts 의 layout 값 형식을 확인하세요');
    }

    writeFileSync(CONFIG, patched);
    if (slideOriginal !== null) {
      writeFileSync(
        SLIDE,
        hero === 'carousel'
          ? slideOriginal.replace('draft: true', 'draft: false')
          : slideOriginal
      );
    }

    const b = spawnSync('npm', ['run', 'build'], { encoding: 'utf8' });
    if (b.status !== 0) {
      problems.push(`${hero}/${productCard}: 빌드 실패`);
      console.log(b.stdout.slice(-500));
      continue;
    }

    const srv = await serveDist(new URL('../dist', import.meta.url).pathname);
    try {
      const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const errs = [];
      page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      page.on('pageerror', (e) => errs.push(String(e)));

      await page.goto(srv.url + '/', { waitUntil: 'load', timeout: 60000 });
      await page.screenshot({ path: `${OUT}/${hero}-${productCard}-home.png`, fullPage: false });

      // 히어로가 실제로 그려졌는지 — carousel 은 콘텐츠가 없으면 통째로 사라집니다
      const heroCount = await page.locator('.hero, [data-carousel]').count();
      if (heroCount === 0) problems.push(`${hero}/${productCard}: 히어로가 렌더되지 않음`);

      await page.goto(srv.url + '/products/', { waitUntil: 'load', timeout: 60000 });
      await page.screenshot({ path: `${OUT}/${hero}-${productCard}-list.png`, fullPage: false });

      // 필터가 여전히 동작하는지 — 기대 개수도 실제 데이터에서 셉니다
      const expected = await page.locator(
        `[data-item][data-category="${TEST_CATEGORY.id}"]`
      ).count();
      await page.click(`[data-filter="${TEST_CATEGORY.id}"]`);
      await page.waitForTimeout(250);
      const vis = await page.locator('[data-item]:not([hidden])').count();
      if (vis !== expected) {
        problems.push(
          `${hero}/${productCard}: ${TEST_CATEGORY.label} 필터 결과 ${vis} (기대 ${expected})`
        );
      }

      // 모바일 가로 스크롤
      const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await m.goto(srv.url + '/products/', { waitUntil: 'load', timeout: 60000 });
      const overflow = await m.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      if (overflow) problems.push(`${hero}/${productCard}: 모바일 가로 스크롤 발생`);
      await m.screenshot({ path: `${OUT}/${hero}-${productCard}-mobile.png`, fullPage: false });

      if (errs.length) problems.push(`${hero}/${productCard}: 콘솔 에러 ${errs.join(' | ')}`);
      await browser.close();

      console.log(`${hero}/${productCard} ok`);
    } finally {
      await srv.close();
    }
  }
} finally {
  writeFileSync(CONFIG, original);
  if (slideOriginal !== null) writeFileSync(SLIDE, slideOriginal);
}

console.log(problems.length ? `\n문제:\n- ${problems.join('\n- ')}` : '\n문제 없음');
