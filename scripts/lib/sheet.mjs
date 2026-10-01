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
import JSZip from 'jszip';
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

/**
 * 머리글이 몇 번째 줄인지 찾습니다.
 *
 * 고객사 엑셀은 맨 위에 "2026년 제품 목록" 같은 제목 줄이나 빈 줄이
 * 들어 있는 경우가 흔합니다. 1행을 그냥 머리글로 보면 그 제목이
 * 열 이름이 되어 전부 사양(specs)으로 들어갑니다.
 *
 * 그래서 앞쪽 몇 줄을 훑어 **제품명 열이 있는 줄**을 머리글로 삼습니다.
 * 못 찾으면 첫 줄을 씁니다 (예전과 같은 동작).
 */
const HEADER_SCAN_ROWS = 15;

/**
 * 어떤 줄이 머리글다운 정도.
 *
 * ⚠ "제품명 열이 있으면 머리글" 로만 보면 안 됩니다.
 *   안내 시트에 "제품명 | 필수입니다" 같은 설명 줄이 있으면 그걸 머리글로
 *   잡아버립니다 (실제로 한 번 그렇게 깨졌습니다).
 *   제품명이 있으면서 **알아본 열이 둘 이상**일 때만 머리글로 봅니다.
 */
function headerScore(row) {
  const { fields } = mapColumns(row);
  const n = Object.keys(fields).length;
  if (fields.title === undefined || n < 2) return 0;
  return n;
}

/** 머리글 줄의 위치와 점수. 못 찾으면 index 0, score 0 */
export function findHeaderRow(table) {
  const limit = Math.min(table.length, HEADER_SCAN_ROWS);
  let best = { index: 0, score: 0 };
  for (let i = 0; i < limit; i += 1) {
    const score = headerScore(table[i]);
    if (score > best.score) best = { index: i, score };
  }
  return best;
}

/**
 * exceljs 로 워크북을 엽니다.
 *
 * ⚠ 엑셀에 **메모(코멘트)** 가 들어 있으면 exceljs 4.x 가
 *   "Cannot read properties of undefined (reading 'comments')" 로 죽습니다.
 *   메모를 단 양식이나 고객사가 메모를 남긴 파일에서 그대로 터집니다.
 *   메모는 우리가 읽을 값이 아니므로, 실패하면 메모 관련 부품만 빼고
 *   다시 엽니다. 원본 파일은 건드리지 않습니다.
 */
async function readWorkbook(workbook, filePath) {
  try {
    await workbook.xlsx.readFile(filePath);
    return;
  } catch (err) {
    if (!String(err?.message ?? '').includes('comments')) throw err;
  }

  /*
   * ⚠ 부품 이름으로 지우지 마세요.
   *   만든 프로그램마다 경로가 다릅니다.
   *     엑셀     xl/comments1.xml,          xl/drawings/vmlDrawing1.vml
   *     openpyxl xl/comments/comment1.xml,  xl/drawings/commentsDrawing1.vml
   *   그래서 관계(rel)의 **Type** 으로 걸러냅니다. 이건 규격에 박혀 있어
   *   만든 프로그램이 달라도 같습니다.
   */
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const doomed = new Set();

  for (const name of Object.keys(zip.files)) {
    if (!/_rels\/[^/]*\.rels$/i.test(name)) continue;

    const xml = await zip.file(name).async('string');
    const base = name.replace(/_rels\/[^/]*\.rels$/i, '');
    let changed = false;

    const cleaned = xml.replace(/<Relationship\b[^>]*\/>/gi, (tag) => {
      const type = /Type="([^"]*)"/i.exec(tag)?.[1] ?? '';
      if (!/\/(comments|vmlDrawing)$/i.test(type)) return tag;

      const target = /Target="([^"]*)"/i.exec(tag)?.[1] ?? '';
      // 상대 경로를 압축파일 안의 실제 경로로 바꿉니다 (../ 를 풀어서)
      const parts = (base + target).split('/');
      const abs = [];
      for (const seg of parts) {
        if (seg === '..') abs.pop();
        else if (seg && seg !== '.') abs.push(seg);
      }
      doomed.add(abs.join('/'));
      changed = true;
      return '';
    });

    if (changed) zip.file(name, cleaned);
  }

  for (const name of doomed) zip.remove(name);

  const ct = zip.file('[Content_Types].xml');
  if (ct) {
    const xml = await ct.async('string');
    zip.file(
      '[Content_Types].xml',
      xml.replace(/<Override\b[^>]*\/>/gi, (tag) => {
        const part = (/PartName="([^"]*)"/i.exec(tag)?.[1] ?? '').replace(/^\//, '');
        return doomed.has(part) ? '' : tag;
      })
    );
  }

  await workbook.xlsx.load(await zip.generateAsync({ type: 'nodebuffer' }));
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
  await readWorkbook(workbook, filePath);

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
    /*
     * 머리글이 1행이 아닐 수 있으므로 앞쪽 줄들을 함께 보고,
     * 알아본 열이 가장 많은 시트를 고릅니다. 안내 시트가 앞에 와도
     * 진짜 상품 시트가 이깁니다.
     */
    let bestScore = 0;
    for (const candidate of workbook.worksheets) {
      if (candidate.rowCount < 2) continue;

      for (let r = 1; r <= Math.min(candidate.rowCount, HEADER_SCAN_ROWS); r += 1) {
        const header = [];
        const raw = candidate.getRow(r).values;
        const list = Array.isArray(raw) ? raw : [];
        for (let i = 1; i < list.length; i += 1) header.push(cellToString(list[i]).trim());

        const score = headerScore(header);
        if (score > bestScore) {
          bestScore = score;
          sheet = candidate;
        }
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

  const { index: head } = findHeaderRow(table);

  return {
    headers: table[head],
    rows: table.slice(head + 1),
    source:
      `엑셀 시트 "${sheet.name}"` + (head > 0 ? ` (머리글 ${head + 1}번째 줄)` : ''),
  };
}

export { COLUMN_ALIASES };
