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

function renderBlockInner(block: PortableTextBlock): string {
  const markDefs = block.markDefs ?? [];
  return (block.children ?? []).map((span) => renderSpan(span, markDefs)).join('');
}

/**
 * Portable Text 배열을 HTML 문자열로 변환합니다.
 * 지원: 문단, h2~h4, blockquote, bullet/number 리스트, 링크, 강조
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

    // block 타입 외의 커스텀 타입(image, code 등)은 지원하지 않습니다.
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
