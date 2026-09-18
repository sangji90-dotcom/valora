/**
 * 고객사에 보낼 상품 등록 양식(.xlsx)을 만듭니다.
 *
 *   node scripts/make-product-template.mjs [출력경로]
 *
 * 받는 데이터의 품질이 작업 시간을 좌우합니다.
 * "엑셀로 주세요"라고만 하면 열 이름과 형식이 제각각으로 오므로,
 * 이 양식을 먼저 보내는 편이 빠릅니다.
 */
import ExcelJS from 'exceljs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outPath = process.argv[2] ?? path.join(ROOT, '상품등록_양식.xlsx');

const { default: siteConfig } = await import(pathToFileURL(path.join(ROOT, 'site.config.ts')).href);
const categoryLabels = siteConfig.categories.map((c) => c.label);

const wb = new ExcelJS.Workbook();
wb.creator = siteConfig.company;

// ---------------------------------------------------------------- 안내 시트

const guide = wb.addWorksheet('작성 안내');
guide.columns = [{ width: 18 }, { width: 76 }];

const guideRows = [
  ['항목', '작성 방법'],
  ['제품명', '필수. 화면에 그대로 표시됩니다. 모델명이 있으면 "제품명 (MODEL-123)" 형태로 함께 적어주세요.'],
  ['한줄설명', '필수. 목록에서 보이는 짧은 소개입니다. 120자 이내로 적어주세요.'],
  ['분류', `필수. 다음 중 하나로 적어주세요 — ${categoryLabels.join(' / ')}`],
  ['판매가', '숫자만 적거나 비워두세요. 비우면 "가격 문의"로 표시됩니다. (예: 189000)'],
  ['사진파일', '보내주신 사진 폴더의 파일 이름을 적어주세요. 여러 장이면 세미콜론으로 구분합니다. (예: a.jpg;b.jpg)'],
  ['상태', '판매중 / 단종 / 출시예정 중 하나. 비우면 판매중으로 처리됩니다.'],
  ['대표', '홈 화면에 먼저 보여줄 제품이면 O 를 적어주세요.'],
  ['순서', '목록에서 앞에 두고 싶은 순서. 숫자가 작을수록 앞입니다. 비워도 됩니다.'],
  ['상세설명', '제품 상세 페이지에 들어갈 본문입니다. 줄바꿈은 그대로 반영됩니다.'],
  ['검색키워드', '고객이 검색할 만한 단어를 쉼표로 구분해 적어주세요. (예: 방진, 커버, IP65)'],
  ['', ''],
  ['사양 항목 추가', '무게·크기·재질처럼 사양으로 넣을 항목은 열을 자유롭게 추가하세요.'],
  ['', '위에 없는 열 이름은 전부 제품 사양표에 그대로 들어갑니다.'],
  ['', ''],
  ['사진 보내실 때', '파일 이름을 모델명으로 해주시면 가장 정확합니다. (예: DC-100.jpg)'],
  ['', '한 제품에 여러 장이면 DC-100-1.jpg, DC-100-2.jpg 처럼 번호를 붙여주세요.'],
  ['', '원본 그대로 보내주셔도 됩니다. 크기는 저희가 조정합니다.'],
];

guideRows.forEach((row, i) => {
  const r = guide.addRow(row);
  if (i === 0) {
    r.font = { bold: true, size: 12 };
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4E7EC' } };
  }
  r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  r.getCell(1).font = { bold: i !== 0 ? true : true };
});

// ---------------------------------------------------------------- 입력 시트

const sheet = wb.addWorksheet('상품목록');

const headers = [
  '제품명',
  '한줄설명',
  '분류',
  '판매가',
  '사진파일',
  '상태',
  '대표',
  '순서',
  '검색키워드',
  '상세설명',
  '무게',
  '크기',
  '재질',
];

sheet.columns = headers.map((h) => ({
  header: h,
  width: ['상세설명', '한줄설명'].includes(h) ? 40 : 16,
}));

const headerRow = sheet.getRow(1);
headerRow.font = { bold: true };
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E5FF' } };
headerRow.alignment = { vertical: 'middle' };
sheet.views = [{ state: 'frozen', ySplit: 1 }];

// 예시 한 줄 — 회색으로 넣어 지우고 쓰도록 안내
const example = sheet.addRow([
  '방진 커버 (DC-100)',
  '분진이 많은 현장에서 장비를 보호하는 커버입니다.',
  categoryLabels[0] ?? '산업용',
  89000,
  'DC-100.jpg',
  '판매중',
  'O',
  1,
  '방진, 커버, IP65',
  '## 특징\n\n- 방진 등급 IP65\n- 공구 없이 탈착 가능',
  '1.2 kg',
  '320 × 210 × 95 mm',
  '알루미늄',
]);
example.font = { color: { argb: 'FF9AA4B2' }, italic: true };
example.getCell(10).alignment = { wrapText: true, vertical: 'top' };

// 분류 열에 드롭다운 — 오타로 카테고리가 틀리는 걸 막습니다
for (let row = 2; row <= 400; row += 1) {
  sheet.getCell(`C${row}`).dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: [`"${categoryLabels.join(',')}"`],
    showErrorMessage: true,
    errorTitle: '분류 확인',
    error: `다음 중 하나를 골라주세요: ${categoryLabels.join(', ')}`,
  };
  sheet.getCell(`F${row}`).dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"판매중,단종,출시예정"'],
  };
}

await wb.xlsx.writeFile(outPath);
console.log(`상품 등록 양식을 만들었습니다: ${outPath}`);
console.log('이 파일을 고객사에 보내고, 작성된 파일을 import-products.mjs 로 변환하세요.');
