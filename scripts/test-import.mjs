/**
 * 상품 일괄 등록 검증.
 *
 *   npm run test:import
 *
 * 고객사 엑셀은 통제할 수 없는 입력입니다.
 * 한글 인코딩, 제각각인 열 이름, 빈 칸, 중복, YAML을 깨뜨리는 문자까지
 * 실제로 들어오는 형태를 만들어 두고 매번 확인합니다.
 */
import { mkdtemp, writeFile, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ExcelJS from 'exceljs';
import iconv from 'iconv-lite';
import sharp from 'sharp';

import { readSheet, mapColumns, parseCsv } from './lib/sheet.mjs';
import {
  deriveSlug,
  parsePrice,
  parseStatus,
  parseBoolean,
  matchCategory,
  yamlString,
} from './lib/normalize.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CONTENT_DIR = path.join(ROOT, 'src/content/products');
const ASSET_DIR = path.join(ROOT, 'src/assets/products');

const pass = [];
const fail = [];
const check = (name, ok, detail = '') => (ok ? pass : fail).push(detail ? `${name} — ${detail}` : name);

/**
 * 카테고리는 고객사마다 바뀝니다.
 * 테스트가 값을 하드코딩하면 site.config.ts 를 고칠 때마다 깨지므로
 * 설정에서 읽어옵니다.
 */
const { default: siteConfig } = await import(
  new URL('../site.config.ts', import.meta.url).href
);
const CATEGORIES = siteConfig.categories;
const CAT = CATEGORIES[0];

// ---------------------------------------------------------------- 값 변환

check('가격: "189,000원" → 189000', parsePrice('189,000원') === 189000);
check('가격: "145000" → 145000', parsePrice('145000') === 145000);
check('가격: "가격문의" → 없음', parsePrice('가격문의') === undefined);
check('가격: 빈 값 → 없음', parsePrice('') === undefined);
check('가격: "18.9만원" 은 추측하지 않음', parsePrice('18.9만원') === undefined);

check('상태: "단종" → discontinued', parseStatus('단종') === 'discontinued');
check('상태: "출시 예정" → coming-soon', parseStatus('출시 예정') === 'coming-soon');
check('상태: 빈 값 → active', parseStatus('') === 'active');

check('대표: "O" → true', parseBoolean('O') === true);
check('대표: "예" → true', parseBoolean('예') === true);
check('대표: 빈 값 → false', parseBoolean('') === false);

check(`카테고리: 한글 label 매칭 ("${CAT.label}")`, matchCategory(CAT.label, CATEGORIES) === CAT.id);
check('카테고리: id 직접 입력', matchCategory(CATEGORIES[1].id, CATEGORIES) === CATEGORIES[1].id);
check('카테고리: 부분 일치', matchCategory(`${CAT.label} 제품`, CATEGORIES) === CAT.id);
check('카테고리: 없는 값 → null', matchCategory('존재하지않는분류', CATEGORIES) === null);

check(
  'slug: 제품명의 모델명 추출',
  deriveSlug({ title: '방진 커버 (DC-100)', specs: {}, tags: [] }).slug === 'dc-100'
);
check(
  'slug: 사양의 모델명 사용',
  deriveSlug({ title: '한글제품', specs: { 모델명: 'AB-77' }, tags: [] }).slug === 'ab-77'
);
check(
  'slug: 한글만이면 실패 처리',
  deriveSlug({ title: '한글만있는제품명', specs: {}, tags: [] }).slug === null
);
check(
  'slug: slug 열 우선',
  deriveSlug({ slug: 'My Product', title: '무시 (XX-1)', specs: {}, tags: [] }).slug ===
    'my-product'
);

// YAML 안전 인용 — 깨지면 빌드가 통째로 실패합니다
check('YAML: 콜론 포함 시 인용', yamlString('제목: 부제').startsWith('"'));
check('YAML: 따옴표 이스케이프', yamlString('a "b"').includes('\\"'));
check('YAML: 숫자형 문자열 인용', yamlString('0123').startsWith('"'));
check('YAML: 평범한 한글은 인용 안 함', yamlString('방진 커버') === '방진 커버');
check('YAML: 줄바꿈 제거', !yamlString('a\nb').includes('\n'));

// ---------------------------------------------------------------- 열 매핑

const mapped = mapColumns(['품명', '간단설명', '분류', '판매가', '무게', '재질']);
check('열 매핑: "품명" → title', mapped.fields.title === 0);
check('열 매핑: "간단설명" → summary', mapped.fields.summary === 1);
check('열 매핑: 모르는 열은 specs로', mapped.specColumns.map((c) => c.label).join(',') === '무게,재질');

const dup = mapColumns(['제품명', '상품명']);
check('열 매핑: 중복 매칭은 첫 열만', dup.fields.title === 0 && dup.duplicates.length === 1);

// ---------------------------------------------------------------- CSV 파싱

const csvRows = parseCsv('a,b\n"쉼표, 포함","줄\n바꿈"\n');
check('CSV: 따옴표 안 쉼표', csvRows[1][0] === '쉼표, 포함');
check('CSV: 따옴표 안 줄바꿈', csvRows[1][1] === '줄\n바꿈');

// ---------------------------------------------------------------- 파일 단위

const work = await mkdtemp(path.join(tmpdir(), 'import-test-'));
const before = await readdir(CONTENT_DIR);

try {
  // EUC-KR CSV — 한글 엑셀에서 "CSV로 저장"하면 이렇게 떨어집니다
  const euckrPath = path.join(work, 'euckr.csv');
  const csvText = `제품명,한줄설명,분류,판매가\n방진 커버 (EK-1),한글 인코딩 확인,${CAT.label},10000\n`;
  await writeFile(euckrPath, iconv.encode(csvText, 'euc-kr'));
  const euckr = await readSheet(euckrPath);
  check('CSV: EUC-KR 자동 인식', euckr.source.includes('euc-kr'), euckr.source);
  check('CSV: EUC-KR 한글 깨짐 없음', euckr.rows[0][0] === '방진 커버 (EK-1)', euckr.rows[0][0]);

  // UTF-8 BOM CSV
  const bomPath = path.join(work, 'bom.csv');
  await writeFile(bomPath, '﻿' + csvText, 'utf8');
  const bom = await readSheet(bomPath);
  check('CSV: UTF-8 BOM 제거', bom.headers[0] === '제품명', bom.headers[0]);

  // 안내 시트가 앞에 있는 엑셀 — 올바른 시트를 골라야 함
  const wb = new ExcelJS.Workbook();
  const info = wb.addWorksheet('작성 안내');
  info.addRow(['항목', '작성 방법']);
  info.addRow(['제품명', '필수입니다']);
  const data = wb.addWorksheet('상품목록');
  data.addRow(['제품명', '한줄설명', '분류', '사진파일']);
  data.addRow(['테스트 커버 (TS-1)', '시트 선택 확인', CAT.label, 'ts-1.jpg']);
  const xlsxPath = path.join(work, 'two-sheets.xlsx');
  await wb.xlsx.writeFile(xlsxPath);

  const picked = await readSheet(xlsxPath);
  check('엑셀: 안내 시트를 건너뛰고 상품 시트 선택', picked.source.includes('상품목록'), picked.source);

  // 이미지 리사이즈 — 원본 4000px 를 넣고 1600 이하로 줄어드는지
  const photoDir = path.join(work, 'photos');
  await writeFile(path.join(work, '.keep'), '');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(photoDir, { recursive: true });
  await sharp({
    create: { width: 4000, height: 3000, channels: 3, background: '#336699' },
  })
    .jpeg()
    .toFile(path.join(photoDir, 'TS-1.jpg')); // 대소문자가 엑셀과 다름

  const run = spawnSync(
    'node',
    ['scripts/import-products.mjs', xlsxPath, '--images', photoDir, '--force'],
    { cwd: ROOT, encoding: 'utf8' }
  );
  check('실행: 종료 코드 0', run.status === 0, (run.stderr || '').slice(-200));

  const mdPath = path.join(CONTENT_DIR, 'ts-1.md');
  const md = await readFile(mdPath, 'utf8').catch(() => '');
  check('생성: ts-1.md 존재', md.length > 0);
  check('생성: 카테고리가 id로 변환', md.includes(`category: ${CAT.id}`));
  check('생성: thumbnail 경로', md.includes('thumbnail: ../../assets/products/ts-1.jpg'));

  const meta = await sharp(path.join(ASSET_DIR, 'ts-1.jpg')).metadata();
  check('이미지: 대소문자 다른 파일명 매칭', Boolean(meta.width));
  check('이미지: 1600px 이하로 축소', meta.width <= 1600, `${meta.width}px`);

  // 생성된 md 로 실제 빌드가 통과하는지 — 최종 관문
  const build = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8' });
  check('빌드: 생성된 상품으로 빌드 성공', build.status === 0, (build.stdout || '').slice(-300));
} finally {
  // 테스트로 만든 파일 정리
  const after = await readdir(CONTENT_DIR);
  for (const f of after) {
    if (!before.includes(f)) await rm(path.join(CONTENT_DIR, f), { force: true });
  }
  await rm(path.join(ASSET_DIR, 'ts-1.jpg'), { force: true });
  await rm(work, { recursive: true, force: true });
}

console.log(`\n통과 ${pass.length}건`);
for (const p of pass) console.log(`  ✓ ${p}`);

if (fail.length) {
  console.log(`\n실패 ${fail.length}건`);
  for (const f of fail) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\n전부 통과했습니다.');
