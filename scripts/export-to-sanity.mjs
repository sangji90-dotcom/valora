/**
 * ============================================================
 *  마크다운 → Sanity NDJSON 변환
 * ============================================================
 *
 *   npm run export:sanity
 *   cd sanity-studio && npx sanity dataset import ../.sanity-export/export.ndjson production
 *
 * 왜 필요한가 —
 * CONTENT_SOURCE 를 sanity 로 바꾸는 순간 사이트는 마크다운을 더 이상 읽지
 * 않습니다. 옮겨두지 않으면 전환 직후 상품 0개짜리 빈 사이트가 되고,
 * about/privacy 는 아예 빌드가 실패합니다.
 *
 * 설계 원칙 — **조용히 버리지 않는다.**
 * 이 스크립트는 우리가 지원하는 마크다운 문법만 압니다(제목 h2~h4, 문단,
 * 인용, 글머리/번호 목록, 표, 굵게·기울임·코드·링크). 모르는 문법을 만나면
 * 건너뛰지 않고 **줄 번호와 함께 예외를 던집니다.** 납품 후에 "회사소개
 * 두 문단이 없어졌다"는 연락을 받는 것보다 지금 실패하는 편이 낫습니다.
 *
 * 이미지는 파일을 직접 올리지 않고 `_sanityAsset: 'image@file://...'` 로
 * 참조만 적어둡니다. 실제 업로드는 sanity CLI 가 합니다 —
 * 그래야 우리가 API 토큰을 들고 있을 필요가 없습니다.
 * ============================================================
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src', 'content');
const OUT_DIR = join(ROOT, '.sanity-export');
const OUT_FILE = join(OUT_DIR, 'export.ndjson');

/* ------------------------------------------------------------------ *
 *  키 생성 — Portable Text 의 모든 노드는 _key 가 필요합니다.
 *  랜덤이면 다시 돌릴 때마다 전부 바뀌어 diff 가 무의미해지므로
 *  문서 안에서 증가하는 결정적 값을 씁니다.
 * ------------------------------------------------------------------ */
function makeKeyGen() {
  let n = 0;
  return () => `k${(n += 1).toString(36)}`;
}

/* ------------------------------------------------------------------ *
 *  frontmatter 분리
 * ------------------------------------------------------------------ */
function splitFrontmatter(raw, file) {
  if (!raw.startsWith('---')) {
    throw new Error(`${file}: frontmatter(--- 블록)가 없습니다.`);
  }
  const end = raw.indexOf('\n---', 3);
  if (end === -1) throw new Error(`${file}: frontmatter 가 닫히지 않았습니다.`);

  const head = raw.slice(raw.indexOf('\n') + 1, end);
  const body = raw.slice(raw.indexOf('\n', end + 1) + 1);
  return { data: parseYaml(head) ?? {}, body };
}

/* ------------------------------------------------------------------ *
 *  인라인 파서 — **굵게**, *기울임*, `코드`, [링크](주소)
 * ------------------------------------------------------------------ */
const INLINE_PATTERNS = [
  { name: 'code', re: /`([^`]+)`/ },
  { name: 'strong', re: /\*\*([\s\S]+?)\*\*/ },
  { name: 'em', re: /(?:\*|_)([^*_\n]+)(?:\*|_)/ },
  { name: 'link', re: /\[([^\]]+)\]\(([^)\s]+)\)/ },
];

/** 링크 주소 허용 범위. CMS 로 옮겨간 뒤에도 같은 규칙이 적용됩니다. */
function assertSafeHref(href, where) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return;
  if (href.startsWith('/') || href.startsWith('#')) return;
  throw new Error(`${where}: 허용되지 않는 링크 주소입니다 — ${href}`);
}

function parseInline(text, ctx) {
  const { key, markDefs, where } = ctx;

  if (text.includes('![')) {
    throw new Error(`${where}: 본문 안의 이미지(![...])는 지원하지 않습니다. 갤러리 필드를 쓰세요.`);
  }
  if (/<[a-z/!]/i.test(text)) {
    throw new Error(`${where}: 본문에 HTML 태그가 있습니다. Portable Text 로 옮길 수 없습니다.`);
  }

  const spans = [];

  const walk = (str, marks) => {
    if (!str) return;

    let best = null;
    for (const p of INLINE_PATTERNS) {
      const m = p.re.exec(str);
      if (m && (best === null || m.index < best.m.index)) best = { p, m };
    }

    if (!best) {
      spans.push({ _type: 'span', _key: key(), text: str, marks: [...marks] });
      return;
    }

    const { p, m } = best;
    if (m.index > 0) {
      spans.push({ _type: 'span', _key: key(), text: str.slice(0, m.index), marks: [...marks] });
    }

    if (p.name === 'link') {
      assertSafeHref(m[2], where);
      const defKey = key();
      markDefs.push({ _type: 'link', _key: defKey, href: m[2] });
      walk(m[1], [...marks, defKey]);
    } else if (p.name === 'code') {
      // 코드 안에서는 다른 문법을 해석하지 않습니다.
      spans.push({ _type: 'span', _key: key(), text: m[1], marks: [...marks, 'code'] });
    } else {
      walk(m[1], [...marks, p.name]);
    }

    walk(str.slice(m.index + m[0].length), marks);
  };

  walk(text, []);

  // 빈 문단이 만들어지지 않도록 최소 한 개는 보장합니다.
  return spans.length ? spans : [{ _type: 'span', _key: key(), text: '', marks: [] }];
}

function block(style, text, ctx, extra = {}) {
  const markDefs = [];
  const children = parseInline(text, { ...ctx, markDefs });
  return { _type: 'block', _key: ctx.key(), style, markDefs, children, ...extra };
}

/* ------------------------------------------------------------------ *
 *  블록 파서
 * ------------------------------------------------------------------ */
function markdownToPortableText(body, where) {
  const key = makeKeyGen();
  const ctx = { key, where };
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const out = [];

  let i = 0;
  const lineNo = () => `${where}:${i + 1}`;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      throw new Error(`${lineNo()}: 코드 블록은 지원하지 않습니다.`);
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      throw new Error(`${lineNo()}: 구분선(---)은 지원하지 않습니다. 제목으로 나누세요.`);
    }

    /* 표 ------------------------------------------------------------ */
    if (trimmed.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim());
        i += 1;
      }
      out.push(parseTable(rows, ctx, where));
      continue;
    }

    /* 제목 ---------------------------------------------------------- */
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) {
        throw new Error(
          `${lineNo()}: 본문에 h1(#)을 쓰지 마세요. 제목은 title 필드가 표시합니다.`
        );
      }
      if (level > 4) throw new Error(`${lineNo()}: h5 이하는 지원하지 않습니다.`);
      out.push(block(`h${level}`, heading[2].trim(), ctx));
      i += 1;
      continue;
    }

    /* 인용 ---------------------------------------------------------- */
    if (trimmed.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(block('blockquote', buf.join(' ').trim(), ctx));
      continue;
    }

    /* 목록 ---------------------------------------------------------- */
    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      const listItem = bullet ? 'bullet' : 'number';
      while (i < lines.length) {
        const t = lines[i].trim();
        const b = /^[-*+]\s+(.*)$/.exec(t);
        const n = /^\d+[.)]\s+(.*)$/.exec(t);
        const isSame = listItem === 'bullet' ? Boolean(b) : Boolean(n);
        if (!isSame) {
          if (!t) {
            // 목록 사이의 빈 줄은 목록을 끊지 않습니다(다음 줄이 계속 목록이면).
            const next = lines[i + 1]?.trim() ?? '';
            const cont =
              listItem === 'bullet' ? /^[-*+]\s+/.test(next) : /^\d+[.)]\s+/.test(next);
            if (cont) {
              i += 1;
              continue;
            }
          }
          break;
        }
        let text = (b ?? n)[1];
        i += 1;
        // 들여쓴 이어지는 줄을 같은 항목으로 붙입니다.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*+\d]/.test(lines[i])) {
          text += ` ${lines[i].trim()}`;
          i += 1;
        }
        out.push(block('normal', text.trim(), ctx, { listItem, level: 1 }));
      }
      continue;
    }

    /* 문단 ---------------------------------------------------------- */
    const buf = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        !t ||
        t.startsWith('|') ||
        t.startsWith('>') ||
        /^#{1,6}\s/.test(t) ||
        /^[-*+]\s/.test(t) ||
        /^\d+[.)]\s/.test(t)
      ) {
        break;
      }
      buf.push(t);
      i += 1;
    }
    out.push(block('normal', buf.join(' '), ctx));
  }

  return out;
}

/**
 * 표.
 * 셀은 평문만 담습니다 — Studio 의 table 스키마도 평문 문자열 배열입니다.
 * 셀 안에 굵게·링크가 있으면 사이트에서 이스케이프된 채 그대로 보이므로
 * 조용히 넘기지 않고 실패시킵니다.
 */
function parseTable(rows, ctx, where) {
  const cellsOf = (row) =>
    row
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const parsed = rows.map(cellsOf);
  let hasHeader = true;

  // 두 번째 줄이 구분선(--- 로만 구성)이면 첫 줄이 머리글입니다.
  if (parsed[1] && parsed[1].every((c) => /^:?-{1,}:?$/.test(c))) {
    parsed.splice(1, 1);
    // 머리글이 모두 비어 있으면(| | 기존 | 발로라 | 형태) 그대로 둡니다 — 렌더러가 빈 칸을 그립니다.
  } else {
    hasHeader = false;
  }

  const width = Math.max(...parsed.map((r) => r.length));

  for (const row of parsed) {
    for (const cell of row) {
      if (/\*\*|\[[^\]]+\]\(|`/.test(cell)) {
        throw new Error(
          `${where}: 표 안의 칸에는 굵게·링크·코드를 쓸 수 없습니다 — "${cell}"`
        );
      }
    }
    while (row.length < width) row.push('');
  }

  return {
    _type: 'table',
    _key: ctx.key(),
    hasHeader,
    rows: parsed.map((cells) => ({ _type: 'row', _key: ctx.key(), cells })),
  };
}

/* ------------------------------------------------------------------ *
 *  검증 — 원문의 내용이 한 줄이라도 사라지지 않았는지
 * ------------------------------------------------------------------ */
function plainTextOf(blocks) {
  const parts = [];
  for (const b of blocks) {
    if (b._type === 'table') {
      for (const row of b.rows) parts.push(row.cells.join(' '));
    } else {
      parts.push(b.children.map((c) => c.text).join(''));
    }
  }
  return parts.join('\n');
}

/** 비교용 정규화 — 마크다운 기호와 공백을 걷어냅니다. */
function normalize(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 링크는 표시 문구만 남김
    .replace(/[#>*_`|\-:]/g, '')
    .replace(/\s+/g, '');
}

function assertNothingLost(body, blocks, where) {
  const got = normalize(plainTextOf(blocks));

  for (const [idx, raw] of body.split('\n').entries()) {
    // 목록 기호와 번호는 변환 결과에 남지 않습니다(listItem 속성이 됩니다).
    const line = normalize(raw.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''));
    if (!line) continue;
    if (!got.includes(line)) {
      throw new Error(
        `${where}:${idx + 1}: 변환 후 내용이 사라졌습니다 — "${raw.trim().slice(0, 60)}"`
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 *  이미지 참조
 * ------------------------------------------------------------------ */
function assetRef(relPath, mdFile, where) {
  const abs = resolve(dirname(mdFile), relPath);
  if (!existsSync(abs)) {
    throw new Error(`${where}: 이미지 파일이 없습니다 — ${relPath}`);
  }
  // sanity CLI 가 이 경로를 읽어 업로드합니다. 토큰은 CLI 로그인 정보를 씁니다.
  return { _sanityAsset: `image@${pathToFileURL(abs).href}` };
}

/* ------------------------------------------------------------------ *
 *  문서 변환
 * ------------------------------------------------------------------ */
function readCollection(dir) {
  const full = join(CONTENT, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const file = join(full, f);
      const raw = readFileSync(file, 'utf8');
      const { data, body } = splitFrontmatter(raw, `${dir}/${f}`);
      return { slug: basename(f, '.md'), file, where: `${dir}/${f}`, data, body };
    });
}

function specsToRows(specs, key) {
  return Object.entries(specs ?? {}).map(([k, v]) => ({
    _type: 'object',
    _key: key(),
    key: k,
    value: String(v),
  }));
}

function buildProduct(entry) {
  const { slug, data, body, file, where } = entry;
  const key = makeKeyGen();
  const blocks = markdownToPortableText(body, where);
  assertNothingLost(body, blocks, where);

  const doc = {
    _id: `product-${slug}`,
    _type: 'product',
    title: data.title,
    slug: { _type: 'slug', current: slug },
    summary: data.summary,
    category: data.category,
    thumbnail: assetRef(data.thumbnail, file, where),
    specs: specsToRows(data.specs, key),
    tags: data.tags ?? [],
    priceNote: data.priceNote ?? '가격 문의',
    featured: Boolean(data.featured),
    order: data.order ?? 999,
    status: data.status ?? 'active',
    draft: Boolean(data.draft),
    body: blocks,
  };

  if (Array.isArray(data.gallery) && data.gallery.length) {
    doc.gallery = data.gallery.map((g) => ({ ...assetRef(g, file, where), _key: key() }));
  }
  if (typeof data.price === 'number') doc.price = data.price;
  if (typeof data.listPrice === 'number') doc.listPrice = data.listPrice;
  if (data.badge) doc.badge = data.badge;
  if (data.seoDescription) doc.seoDescription = data.seoDescription;
  if (Array.isArray(data.externalLinks) && data.externalLinks.length) {
    doc.externalLinks = data.externalLinks.map((l) => ({
      _type: 'object',
      _key: key(),
      label: l.label,
      url: l.url,
    }));
  }

  return doc;
}

function buildPage(entry) {
  const { slug, data, body, where } = entry;
  const blocks = markdownToPortableText(body, where);
  assertNothingLost(body, blocks, where);

  return {
    _id: `page-${slug}`,
    _type: 'page',
    title: data.title,
    slug: { _type: 'slug', current: slug },
    ...(data.description ? { description: data.description } : {}),
    showHero: data.showHero ?? true,
    draft: Boolean(data.draft),
    body: blocks,
  };
}

function buildSlide(entry) {
  const { slug, data, file, where } = entry;

  return {
    _id: `slide-${slug}`,
    _type: 'slide',
    title: data.title,
    slug: { _type: 'slug', current: slug },
    ...(data.eyebrow ? { eyebrow: data.eyebrow } : {}),
    ...(data.subtitle ? { subtitle: data.subtitle } : {}),
    image: assetRef(data.image, file, where),
    href: data.href ?? '/products/',
    ...(data.cta ? { cta: data.cta } : {}),
    align: data.align ?? 'right',
    textColor: data.textColor ?? 'dark',
    overlay: data.overlay ?? 'none',
    order: data.order ?? 999,
    draft: Boolean(data.draft),
  };
}

/* ------------------------------------------------------------------ *
 *  실행
 * ------------------------------------------------------------------ */
const docs = [
  ...readCollection('products').map(buildProduct),
  ...readCollection('pages').map(buildPage),
  ...readCollection('slides').map(buildSlide),
];

if (!docs.length) {
  console.error('옮길 문서가 없습니다. src/content/ 아래를 확인하세요.');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, docs.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');

const counts = docs.reduce((acc, d) => ({ ...acc, [d._type]: (acc[d._type] ?? 0) + 1 }), {});

console.log(`${OUT_FILE}`);
for (const [type, n] of Object.entries(counts)) console.log(`  ${type} ${n}개`);
console.log(`
다음 단계 —
  1) cd sanity-studio
  2) npx sanity dataset import ../.sanity-export/export.ndjson production --replace

  --replace 는 같은 _id 의 문서를 덮어씁니다. 여러 번 돌려도 중복되지 않습니다.
  고객사가 Studio에서 고친 내용까지 되돌아가므로, **최초 1회만** 쓰세요.

  이미지는 sanity CLI 가 업로드합니다. 로그인되어 있어야 합니다 (npx sanity login).
`);
