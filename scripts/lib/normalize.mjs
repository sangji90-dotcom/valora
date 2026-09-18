/**
 * 고객사 엑셀의 값을 스키마가 기대하는 형태로 바꿉니다.
 * "189,000원" → 189000, "판매중" → active, "O" → true 같은 변환.
 */

/** 한글 제품명에서는 URL을 만들 수 없으므로 모델명 패턴을 먼저 찾습니다 */
const MODEL_PATTERN = /\b([A-Za-z]{1,6}[-_ ]?\d{1,5}[A-Za-z0-9-]*)\b/;

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * slug 결정 순서
 *  1) slug 열이 있으면 그 값
 *  2) 제품명 안의 모델명 (예: "프로쉴드 900 (PS-900)" → ps-900)
 *  3) 사양의 모델명 항목
 *  4) 태그 중 영문
 *  5) 실패 → null (호출부에서 item-001 부여 + 경고)
 */
export function deriveSlug({ slug, title, specs, tags }) {
  if (slug) {
    const direct = slugify(slug);
    if (direct) return { slug: direct, source: 'slug 열' };
  }

  const fromTitle = String(title ?? '').match(MODEL_PATTERN);
  if (fromTitle) {
    const s = slugify(fromTitle[1]);
    if (s) return { slug: s, source: '제품명의 모델명' };
  }

  for (const [key, value] of Object.entries(specs ?? {})) {
    if (/모델|model|품번|코드|code/i.test(key)) {
      const s = slugify(value);
      if (s) return { slug: s, source: `사양 "${key}"` };
    }
  }

  for (const tag of tags ?? []) {
    if (/^[A-Za-z0-9\-_ ]+$/.test(tag)) {
      const s = slugify(tag);
      if (s) return { slug: s, source: '태그' };
    }
  }

  const fromTitleAscii = slugify(title);
  if (fromTitleAscii) return { slug: fromTitleAscii, source: '제품명(영문 부분)' };

  return { slug: null, source: null };
}

export function parsePrice(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return undefined;

  // "가격 문의", "별도 문의" 등 숫자가 아예 없는 값은 가격이 아닙니다
  const digits = text.replace(/[^\d]/g, '');
  if (!digits) return undefined;

  // "18.9만원" 같은 표기는 자동 해석하지 않습니다 (잘못 넣으면 더 위험)
  if (/[만천억]/.test(text)) return undefined;

  const n = Number.parseInt(digits, 10);
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
}

const TRUTHY = ['o', 'y', 'yes', 'true', '1', '예', '대표', '추천', 'v', '●', '○', 'ㅇ'];

export function parseBoolean(raw) {
  const text = String(raw ?? '').trim().toLowerCase();
  if (!text) return false;
  return TRUTHY.includes(text);
}

const STATUS_MAP = [
  [/단종|중단|판매종료|discontinued/i, 'discontinued'],
  [/출시예정|준비중|예정|comingsoon|coming-soon/i, 'coming-soon'],
  [/판매중|정상|active|판매/i, 'active'],
];

export function parseStatus(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return 'active';
  const compact = text.replace(/\s/g, '');
  for (const [pattern, value] of STATUS_MAP) {
    if (pattern.test(compact)) return value;
  }
  return 'active';
}

export function parseTags(raw) {
  return String(raw ?? '')
    .split(/[,;|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseImageList(raw) {
  return String(raw ?? '')
    .split(/[,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * 카테고리 매칭.
 * 고객사는 한글 이름("산업용")을 쓰고, 스키마는 id("industrial")를 요구합니다.
 * label과 id 양쪽으로 찾고, 못 찾으면 null을 돌려 호출부가 경고합니다.
 */
export function matchCategory(raw, categories) {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  const compact = text.toLowerCase().replace(/\s/g, '');

  const byId = categories.find((c) => c.id.toLowerCase() === compact);
  if (byId) return byId.id;

  const byLabel = categories.find(
    (c) => c.label.toLowerCase().replace(/\s/g, '') === compact
  );
  if (byLabel) return byLabel.id;

  // 부분 일치 (예: "산업용 제품" → 산업용)
  const partial = categories.find((c) => {
    const label = c.label.toLowerCase().replace(/\s/g, '');
    return compact.includes(label) || label.includes(compact);
  });

  return partial ? partial.id : null;
}

/**
 * YAML 값 인용.
 * 한글 제품명에 콜론이나 따옴표가 섞이면 frontmatter가 깨지므로
 * 안전하지 않은 문자가 있으면 항상 따옴표로 감쌉니다.
 */
export function yamlString(value) {
  const text = String(value ?? '');
  const needsQuote =
    text === '' ||
    /^[\s>|*&!%@`{}[\],#?:-]/.test(text) ||
    /[:#]\s/.test(text) ||
    /[:"'\\\n\r\t]/.test(text) ||
    /\s$/.test(text) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(text) ||
    /^[\d.+-]+$/.test(text);

  if (!needsQuote) return text;
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

/** 상세설명 셀의 줄바꿈을 마크다운 문단으로 */
export function toMarkdownBody(raw) {
  const text = String(raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map((block) => block.split('\n').map((l) => l.trim()).filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n');
}
