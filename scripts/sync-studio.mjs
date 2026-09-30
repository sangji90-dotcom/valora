/**
 * Studio 동기화 — 카테고리 + 언어 설정.
 *
 *   npm run studio:sync
 *
 * 왜 필요한가 —
 * 카테고리는 세 곳에 나타납니다.
 *   1) site.config.ts 의 categories      (사이트가 쓰는 원본)
 *   2) Studio 스키마의 선택 목록          (고객사가 고르는 값)
 *   3) 이미 저장된 상품 문서의 category 값
 *
 * 2번을 손으로 베껴 적으면 반드시 어긋납니다. 실제로 템플릿의 Studio 스키마가
 * 예전 카테고리(industrial/office/accessory)를 들고 있었습니다. 그 상태로
 * 납품하면 고객사가 고른 값이 사이트 스키마에서 거부되어 빌드가 실패합니다.
 *
 * 그래서 1번에서 2번을 생성합니다. 카테고리를 바꾸면 이 스크립트를 다시 돌리고
 * Studio를 재배포하세요. 3번(기존 문서)은 사람이 직접 고쳐야 합니다.
 *
 * 언어 —
 * site.config.ts 의 i18n.published 에 'en' 이 없으면 Studio 의 영문 입력칸을
 * 숨깁니다. 쓰지 않는 칸이 화면에 남아 있으면 "이것도 채워야 하나" 하고
 * 물어보게 되기 때문입니다.
 */
import { writeFileSync } from 'node:fs';
import siteConfig from '../site.config.ts';

/** label 이 { ko, en } 형태일 수 있습니다. Studio 화면은 한국어로 씁니다. */
const ko = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v.ko ?? v.en ?? '') : v);

const categoriesTarget = new URL(
  '../sanity-studio/schemaTypes/categories.generated.js',
  import.meta.url
).pathname;
const i18nTarget = new URL('../sanity-studio/schemaTypes/i18n.generated.js', import.meta.url)
  .pathname;

const stamp = new Date().toISOString();
const header = (origin) => `/**
 * 이 파일은 자동 생성됩니다. 직접 고치지 마세요.
 * 원본: site.config.ts 의 ${origin}
 * 다시 만들기: npm run studio:sync
 *
 * 생성 시각: ${stamp}
 */`;

const rows = siteConfig.categories
  .map((c) => `  { title: ${JSON.stringify(ko(c.label))}, value: ${JSON.stringify(c.id)} },`)
  .join('\n');

writeFileSync(
  categoriesTarget,
  `${header('categories')}
export const CATEGORY_OPTIONS = [
${rows}
];
`,
  'utf8'
);

const locales = siteConfig.i18n?.published ?? ['ko'];
const showEn = locales.includes('en');

writeFileSync(
  i18nTarget,
  `${header('i18n.published')}
export const SITE_LOCALES = ${JSON.stringify(locales)};

/** 영문 사이트를 켰는지. 꺼져 있으면 Studio 의 영문 칸을 숨깁니다. */
export const SHOW_EN = ${showEn};

/** 영문 칸 공통 안내 — 비워도 사이트는 깨지지 않습니다. */
export const EN_NOTE = '비워두면 영문 페이지에도 한국어가 그대로 나옵니다.';
`,
  'utf8'
);

console.log(`카테고리 ${siteConfig.categories.length}개를 Studio 스키마로 내보냈습니다.`);
for (const c of siteConfig.categories) console.log(`  ${c.id} — ${ko(c.label)}`);
console.log(`\n언어: ${locales.join(', ')} — Studio 영문 칸 ${showEn ? '표시' : '숨김'}`);
console.log('\nStudio를 다시 배포해야 고객사 화면에 반영됩니다: cd sanity-studio && npm run deploy');
