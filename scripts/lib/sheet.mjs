/**
 * 엑셀/CSV 읽기 + 열 이름 자동 매핑.
 *
 * 고객사가 주는 엑셀은 열 이름이 매번 다릅니다.
 * ("제품명" / "상품명" / "품명" / "품목명" ...)
 * 별칭 테이블로 흡수하고, 못 알아본 열은 전부 사양(specs)으로 넘깁니다.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import iconv from 'iconv-lite';

/** 표준 필드 ← 고객사가 쓸 법한 열 이름들 */
const COLUMN_ALIASES = {
  slug: ['slug', 'url', '주소', '영문명', '영문이름', '파일명'],
  title: ['제품명', '상품명', '품명', '품목명', '제품이름', '상품이름', 'name', 'title'],
  summary: ['한줄설명', '짧은설명', '요약', '간단설명', '소개', 'summary'],
  body: ['상세설명', '상세', '본문', '상세내용', '제품설명', '설명', 'description', 'body'],
  category: ['카테고리', '분류', '제품군', '품목분류', '구분', 'category'],
  price: ['가격', '판매가', '단가', '소비자가', '금액', 'price'],
  priceNote: ['가격문구', '가격안내', '가격표시', 'pricenote'],
  tags: ['태그', '키워드', '검색어', '검색키워드', 'tags', 'keywords'],
  featured: ['대표', '추천', '대표제품', '메인노출', 'featured'],
  order: ['순서', '정렬', '정렬순서', '노출순서', 'order', 'sort'],
  status: ['상태', '판매상태', '제품상태', 'status'],
  image: ['이미지', '사진', '이미지파일', '이미지명', '사진파일', 'image', 'images', 'photo'],
  seoDescription: ['seo설명', 'seo', '검색설명', 'seodescription'],
};

/** 비교용 정규화 — 공백·언더스코어·하이픈·괄호 제거 후 소문자 */
function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\s_\-()[\]{}./]/g, '')
    .trim();
}

const ALIAS_LOOKUP = new Map();
for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const alias of aliases) ALIAS_LOOKUP.set(normalizeKey(alias), field);
}

/**
 * 헤더 배열 → { field: columnIndex } 와 사양으로 넘길 열 목록.
 * 같은 필드에 여러 열이 매칭되면 첫 번째만 씁니다.
 */
export function mapColumns(headers) {
  const fields = {};
  const specColumns = [];
  const duplicates = [];

  headers.forEach((raw, index) => {
    const label = String(raw ?? '').trim();
    if (!label) return;

    const field = ALIAS_LOOKUP.get(normalizeKey(label));

    if (!field) {
      specColumns.push({ index, label });
      return;
    }
    if (fields[field] !== undefined) {
      duplicates.push(label);
      return;
    }
    fields[field] = index;
  });

  return { fields, specColumns, duplicates };
}

/** 따옴표·개행을 처리하는 CSV 파서 (의존성 없이) */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r') {
      // 무시 — \r\n 은 \n 에서 처리
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/**
 * CSV 인코딩 판별.
 * 한글 엑셀에서 "CSV로 저장"하면 EUC-KR(CP949)로 떨어지는 경우가 많습니다.
 * UTF-8로 디코딩했을 때 치환 문자가 섞이면 EUC-KR로 다시 읽습니다.
 */
function decodeCsv(buffer) {
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: buffer.subarray(3).toString('utf8'), encoding: 'utf-8 (BOM)' };
  }

  const asUtf8 = buffer.toString('utf8');
  if (!asUtf8.includes('�')) return { text: asUtf8, encoding: 'utf-8' };

  return { text: iconv.decode(buffer, 'euc-kr'), encoding: 'euc-kr' };
}

/** 엑셀 셀 값을 문자열로 (수식·리치텍스트·하이퍼링크 대응) */
function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join('');
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined) return String(value.result);
    if (value.hyperlink !== undefined) return String(value.hyperlink);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return '';
  }
  return String(value);
}

/**
 * 엑셀 또는 CSV를 읽어 { headers, rows } 로 돌려줍니다.
 * rows는 문자열 배열의 배열입니다.
 */
export async function readSheet(filePath, { sheetName } = {}) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv' || ext === '.tsv' || ext === '.txt') {
    const buffer = await readFile(filePath);
    const { text, encoding } = decodeCsv(buffer);
    const rows = parseCsv(text);
    if (rows.length === 0) throw new Error('빈 파일입니다.');
    return { headers: rows[0], rows: rows.slice(1), source: `CSV (${encoding})` };
  }

  if (ext !== '.xlsx' && ext !== '.xlsm') {
    throw new Error(
      `지원하지 않는 형식입니다: ${ext}\n.xlsx 또는 .csv 로 저장해서 다시 시도하세요. (.xls 는 .xlsx 로 변환 필요)`
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  let sheet;

  if (sheetName) {
    sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      const names = workbook.worksheets.map((w) => w.name).join(', ');
      throw new Error(`시트 "${sheetName}" 를 찾을 수 없습니다. 사용 가능한 시트: ${names}`);
    }
  } else {
    /**
     * 시트가 여러 개면 "제품명"에 해당하는 열이 있는 시트를 고릅니다.
     * 양식 파일처럼 안내 시트가 앞에 오는 경우가 흔해서,
     * 단순히 첫 시트를 쓰면 엉뚱한 시트를 읽게 됩니다.
     */
    for (const candidate of workbook.worksheets) {
      if (candidate.rowCount < 2) continue;
      const header = [];
      const raw = candidate.getRow(1).values;
      const list = Array.isArray(raw) ? raw : [];
      for (let i = 1; i < list.length; i += 1) header.push(cellToString(list[i]).trim());

      if (mapColumns(header).fields.title !== undefined) {
        sheet = candidate;
        break;
      }
    }
    sheet = sheet ?? workbook.worksheets.find((w) => w.rowCount > 1) ?? workbook.worksheets[0];
  }

  if (!sheet) {
    const names = workbook.worksheets.map((w) => w.name).join(', ');
    throw new Error(`읽을 수 있는 시트가 없습니다. 사용 가능한 시트: ${names}`);
  }

  const table = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = [];
    // exceljs의 row.values는 1-based이고 [0]은 비어 있습니다.
    const raw = Array.isArray(row.values) ? row.values : [];
    for (let i = 1; i < Math.max(raw.length, sheet.columnCount + 1); i += 1) {
      values.push(cellToString(raw[i]).trim());
    }
    if (values.some((v) => v !== '')) table.push(values);
  });

  if (table.length === 0) throw new Error(`시트 "${sheet.name}" 가 비어 있습니다.`);

  return {
    headers: table[0],
    rows: table.slice(1),
    source: `엑셀 시트 "${sheet.name}"`,
  };
}

export { COLUMN_ALIASES };
