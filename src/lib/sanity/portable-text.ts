/**
 * ============================================================
 *  Portable Text → HTML
 * ============================================================
 *  Sanity는 본문을 Portable Text(구조화된 JSON)로 저장합니다.
 *  이 파일이 그것을 HTML로 바꿉니다.
 *
 *  보안 전제: **CMS 입력값은 신뢰 경계 밖입니다.**
 *  고객사 담당자 계정이 털리거나, 실수로 스크립트를 붙여넣거나,
 *  퇴사자가 악의적으로 입력할 수 있습니다.
 *  → 모든 텍스트는 이스케이프하고, 링크 스킴은 화이트리스트로 검사합니다.
 *  → raw HTML 블록은 아예 지원하지 않습니다 (무시).
 * ============================================================
 */

export interface PortableTextSpan {
  _type: 'span';
  _key?: string;
  text?: string;
  marks?: string[];
}

export interface PortableTextMarkDef {
  _key: string;
  _type: string;
  href?: string;
}

export interface PortableTextBlock {
  _type: string;
  _key?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
}

/**
 * 표 블록.
 * Portable Text 기본에는 표가 없어서 직접 정의했습니다.
 * 회사소개의 절차 안내, 제품의 사양 비교처럼 표가 필요한 자리가 흔합니다.
 */
interface PortableTextTable {
  _type: 'table';
  hasHeader?: boolean;
  rows?: { cells?: string[] }[];
}

/**
 * 절감량 계산기 블록.
 *
 * 왜 필요한가 —
 * "1만 개 도입 시 플라스틱 80kg 절감" 같은 표는 읽는 사람이 자기 수량으로
 * 환산해야 합니다. 그 한 단계가 이탈 지점이 됩니다. 수량을 넣으면 바로
 * 숫자가 나오게 하면, 담당자가 그 값을 그대로 보고서에 옮겨 적습니다.
 *
 * ⚠ 값은 **선형 비례**로만 환산합니다. 규모에 따라 달라지는 효과는 반영하지
 *   않습니다. 그래서 면책 문구(note)를 필수로 받습니다.
 */
interface PortableTextCalculator {
  _type: 'calculator';
  _key?: string;
  title?: string;
  unitLabel?: string;
  baseQuantity?: number;
  defaultQuantity?: number;
  rows?: {
    _key?: string;
    label?: string;
    valueMin?: number;
    valueMax?: number;
    unit?: string;
    note?: string;
  }[];
  disclaimer?: string;
}

/** 링크에 허용할 스킴. javascript:, data:, vbscript: 등은 전부 차단됩니다. */
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/** 본문에 허용할 블록 스타일. 그 외는 문단으로 강등됩니다. */
const ALLOWED_STYLES: Record<string, string> = {
  normal: 'p',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  blockquote: 'blockquote',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 링크 href 검증.
 * 통과하지 못하면 null을 반환하고, 호출부는 <a> 대신 평문으로 렌더합니다.
 */
export function sanitizeHref(href: string | undefined): string | null {
  if (!href) return null;

  const trimmed = href.trim();

  // 프로토콜 없는 상대경로는 허용 (/products/, #section)
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    // 프로토콜 상대 URL(//evil.com)은 외부로 나가므로 차단
    if (trimmed.startsWith('//')) return null;
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (!ALLOWED_SCHEMES.includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function renderSpan(span: PortableTextSpan, markDefs: PortableTextMarkDef[]): string {
  let html = escapeHtml(span.text ?? '');

  for (const mark of span.marks ?? []) {
    if (mark === 'strong') {
      html = `<strong>${html}</strong>`;
      continue;
    }
    if (mark === 'em') {
      html = `<em>${html}</em>`;
      continue;
    }
    if (mark === 'code') {
      html = `<code>${html}</code>`;
      continue;
    }
    if (mark === 'underline') {
      html = `<u>${html}</u>`;
      continue;
    }

    // 나머지는 markDefs 참조 (주로 link)
    const def = markDefs.find((d) => d._key === mark);
    if (def?._type === 'link') {
      const href = sanitizeHref(def.href);
      if (href) {
        const external = /^https?:/.test(href);
        const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        html = `<a href="${escapeHtml(href)}"${attrs}>${html}</a>`;
      }
      // href가 차단되면 링크 없이 텍스트만 남깁니다
    }
    // 알 수 없는 mark는 무시 (스타일 주입 방지)
  }

  return html;
}

/**
 * 표 렌더링.
 * 셀 내용은 **평문으로만** 다룹니다 — 셀 안에서 굵게·링크를 허용하면
 * CMS 입력을 HTML로 해석해야 하고, 그 순간 이스케이프 구멍이 생깁니다.
 */
function renderTable(table: PortableTextTable): string {
  const rows = (table.rows ?? []).filter((r) => (r.cells ?? []).length > 0);
  if (rows.length === 0) return '';

  const cell = (text: string, tag: 'th' | 'td') =>
    `<${tag}>${escapeHtml(text ?? '')}</${tag}>`;

  const useHeader = table.hasHeader !== false;
  const [first, ...rest] = rows;

  const head = useHeader
    ? `<thead><tr>${(first.cells ?? []).map((c) => cell(c, 'th')).join('')}</tr></thead>`
    : '';
  const bodyRows = useHeader ? rest : rows;

  const body = bodyRows
    .map((r) => `<tr>${(r.cells ?? []).map((c) => cell(c, 'td')).join('')}</tr>`)
    .join('');

  return `<table>${head}<tbody>${body}</tbody></table>`;
}

/**
 * 숫자 포맷 — 1234.5 → "1,234.5"
 * 화면과 스크립트가 같은 규칙을 써야 초기 렌더와 재계산 결과가 어긋나지 않습니다.
 */
function formatNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}

/**
 * 절감량 계산기 렌더링.
 *
 * 설계 —
 *  - **JS 없이도 표로 읽힙니다.** 기준 수량에 대한 값이 이미 HTML에 들어 있고,
 *    스크립트는 그 숫자를 바꾸기만 합니다. 스크립트가 막히거나 실패해도
 *    "1만 개 기준 80kg" 표는 그대로 보입니다.
 *  - 계수는 data-* 속성으로 넘깁니다. style 속성은 쓰지 않습니다(CSP).
 *  - 결과 영역은 aria-live 라서 화면낭독기도 값 변화를 읽습니다.
 */
function renderCalculator(calc: PortableTextCalculator): string {
  const rows = (calc.rows ?? []).filter((r) => r?.label && typeof r.valueMin === 'number');
  if (rows.length === 0) return '';

  const base = calc.baseQuantity && calc.baseQuantity > 0 ? calc.baseQuantity : 10000;
  const initial =
    calc.defaultQuantity && calc.defaultQuantity > 0 ? calc.defaultQuantity : base;
  const unitLabel = calc.unitLabel?.trim() || '개';
  const factor = initial / base;

  const id = `calc-${calc._key ?? Math.random().toString(36).slice(2, 8)}`;

  const rowsHtml = rows
    .map((r, i) => {
      const min = (r.valueMin as number) * factor;
      const max = typeof r.valueMax === 'number' ? r.valueMax * factor : null;
      const shown =
        max !== null && max !== min
          ? `${formatNumber(min)}~${formatNumber(max)}`
          : formatNumber(min);

      return `<tr>
<th scope="row">${escapeHtml(r.label ?? '')}${
        r.note ? `<span class="calc__note">${escapeHtml(r.note)}</span>` : ''
      }</th>
<td><output
  id="${id}-out-${i}"
  class="calc__value"
  data-calc-out
  data-min="${r.valueMin}"
  ${typeof r.valueMax === 'number' ? `data-max="${r.valueMax}"` : ''}
>${shown}</output> <span class="calc__unit">${escapeHtml(r.unit ?? '')}</span></td>
</tr>`;
    })
    .join('');

  const heading = calc.title
    ? `<h3 class="calc__title" id="${id}-title">${escapeHtml(calc.title)}</h3>`
    : '';

  return `<div class="calc" data-calc data-base="${base}"${
    calc.title ? ` aria-labelledby="${id}-title"` : ' aria-label="절감량 계산"'
  }>
${heading}
<div class="calc__field">
<label class="calc__label" for="${id}-qty">도입 수량</label>
<span class="calc__input-wrap">
<input
  id="${id}-qty"
  class="calc__input"
  type="number"
  inputmode="numeric"
  min="1"
  step="1"
  value="${initial}"
  data-calc-input
/>
<span class="calc__unit-label">${escapeHtml(unitLabel)}</span>
</span>
</div>
<table class="calc__table"><tbody>${rowsHtml}</tbody></table>
${
  calc.disclaimer
    ? `<p class="calc__disclaimer">${escapeHtml(calc.disclaimer)}</p>`
    : ''
}
</div>`;
}

function renderBlockInner(block: PortableTextBlock): string {
  const markDefs = block.markDefs ?? [];
  return (block.children ?? []).map((span) => renderSpan(span, markDefs)).join('');
}

/**
 * Portable Text 배열을 HTML 문자열로 변환합니다.
 * 지원: 문단, h2~h4, blockquote, bullet/number 리스트, 링크, 강조, 표, 절감량 계산기
 * 무시: raw HTML, 임의 커스텀 블록 (보안상 의도적으로 제외)
 */
export function portableTextToHtml(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';

  const out: string[] = [];
  let openList: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (openList) {
      out.push(`</${openList}>`);
      openList = null;
    }
  };

  for (const raw of blocks) {
    const block = raw as PortableTextBlock;

    // 표는 명시적으로 지원합니다
    if (block && (block as unknown as PortableTextTable)._type === 'table') {
      closeList();
      out.push(renderTable(block as unknown as PortableTextTable));
      continue;
    }

    // 절감량 계산기
    if (block && (block as unknown as PortableTextCalculator)._type === 'calculator') {
      closeList();
      out.push(renderCalculator(block as unknown as PortableTextCalculator));
      continue;
    }

    // 그 외 커스텀 타입(image, code 등)은 지원하지 않습니다.
    // 필요해지면 여기에 명시적으로 추가하세요 — 기본은 무시입니다.
    if (!block || block._type !== 'block') {
      closeList();
      continue;
    }

    const inner = renderBlockInner(block);
    if (!inner.trim()) {
      closeList();
      continue;
    }

    if (block.listItem) {
      const tag = block.listItem === 'number' ? 'ol' : 'ul';
      if (openList !== tag) {
        closeList();
        out.push(`<${tag}>`);
        openList = tag;
      }
      out.push(`<li>${inner}</li>`);
      continue;
    }

    closeList();
    const tag = ALLOWED_STYLES[block.style ?? 'normal'] ?? 'p';
    out.push(`<${tag}>${inner}</${tag}>`);
  }

  closeList();
  return out.join('\n');
}
