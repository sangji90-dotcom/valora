import siteConfig from '../../site.config';
import { DEFAULT_LOCALE, type Locale } from './i18n';

/**
 * ============================================================
 *  화면 문구
 * ============================================================
 *  템플릿은 기본적으로 취급 품목을 "제품"이라고 부릅니다.
 *  고객사가 책을 팔면 "도서", 음식점이면 "메뉴", 갤러리면 "작품"이
 *  맞습니다. 컴포넌트마다 흩어진 문자열을 고치게 하지 않으려고
 *  site.config.ts 의 terms 하나로 모았습니다.
 *
 *  대부분은 item 한 단어에서 파생되고,
 *  문장이 어색해지는 자리만 따로 덮어쓸 수 있게 열어 뒀습니다.
 * ============================================================
 */

const t = siteConfig.terms ?? {};

/** 취급 품목을 부르는 말 */
const item = t.item ?? '제품';

/** 세는 단위. 책은 '권', 옷은 '벌', 기본은 '개' */
const unit = t.unit ?? '개';

/**
 * 영문판에서 품목을 부르는 말.
 * 한국어처럼 조사 계산이 필요 없어 훨씬 단순합니다.
 */
const itemEn = t.itemEn ?? 'product';

/**
 * 한국어 조사 붙이기.
 *
 * "제품이 없습니다" / "도서가 없습니다" — 앞 글자의 받침 유무로 달라집니다.
 * 고객사 단어를 모르는 상태로 문장을 만들어야 하므로 계산해서 붙입니다.
 * 받침 판정: 한글 음절은 (코드 - 0xAC00) % 28 이 0이 아니면 받침이 있습니다.
 *
 * 한글이 아닌 글자로 끝나면(영문·숫자) 판정할 수 없으므로
 * 받침 있는 쪽으로 둡니다 — 어느 쪽이든 틀리는 경우라, 덜 어색한 쪽입니다.
 */
export function withJosa(word: string, pair: '이/가' | '은/는' | '을/를' | '과/와'): string {
  const [withFinal, withoutFinal] = pair.split('/');
  const last = word.at(-1) ?? '';
  const code = last.charCodeAt(0);

  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangul) return word + withFinal;

  const hasFinal = (code - 0xac00) % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}

const KO = {
  item,
  unit,

  /** 목록·내비게이션 */
  itemList: `${item} 목록`,
  viewItems: `${item} 보기`,
  viewAll: `전체 ${item} 보기`,

  /** 홈 대표 섹션 */
  featuredTitle: t.featuredTitle ?? `대표 ${item}`,
  featuredDesc: t.featuredDesc ?? `가장 많이 찾는 ${withJosa(item, '을/를')} 모았습니다.`,

  /** 홈 카테고리 섹션 */
  categoriesDesc: t.categoriesDesc ?? `용도별로 ${withJosa(item, '을/를')} 찾아보세요.`,

  /** 문의 유도 박스 */
  ctaTitle: t.ctaTitle ?? `찾는 ${withJosa(item, '이/가')} 없으신가요?`,
  ctaDesc:
    t.ctaDesc ?? `용도와 수량을 알려주시면 적합한 ${withJosa(item, '을/를')} 안내해 드립니다.`,

  /** 목록 페이지 */
  listPageDesc: `전체 ${item} 목록입니다. 카테고리와 검색으로 원하는 ${withJosa(item, '을/를')} 찾아보세요.`,
  listPageLead: `카테고리를 선택하거나 검색해 원하는 ${withJosa(item, '을/를')} 찾아보세요.`,

  /** 검색 */
  searchLabel: `${item} 검색`,
  searchPlaceholder: t.searchPlaceholder ?? `${item}명·모델명 검색`,

  /** 개수 표시 — 클라이언트 스크립트가 {n} 을 숫자로 바꿉니다 */
  countAllTemplate: `전체 {n}${unit}`,
  countTemplate: `{n}${unit}`,
  countOf: (n: number) => `${n}${unit}`,

  /** 빈 상태 */
  empty: `조건에 맞는 ${withJosa(item, '이/가')} 없습니다. 검색어나 카테고리를 바꿔보세요.`,
  emptyShort: `표시할 ${withJosa(item, '이/가')} 없습니다.`,

  /** 상세 페이지 */
  askThis: `이 ${item} 문의하기`,
  related: `함께 보는 ${item}`,
  specCaption: (title: string) => `${title} 사양`,
  /** 상세 탭 이름 */
  specTab: '사양',
  inquiryOf: (title: string) => `문의 ${item}: ${title}`,

  /** 카테고리 페이지 */
  categoryDesc: (label: string) => `${label} ${item} 목록입니다.`,
};

/**
 * 영문 문구.
 *
 * ⚠ 한국어를 기계적으로 옮기지 않았습니다. 존댓말 종결(~습니다)을
 *   그대로 옮기면 영문에서는 장황해집니다. 영문 카탈로그의 관례대로
 *   짧은 명사구·명령형으로 씁니다.
 *
 * ⚠ 키 이름과 모양(함수인지 문자열인지)은 KO 와 정확히 같아야 합니다.
 *   어긋나면 영문 페이지에서 그 자리만 비어 버립니다.
 *   아래 satisfies 가 빌드 때 잡습니다.
 */
const EN = {
  item: itemEn,
  unit: '',

  itemList: 'Products',
  viewItems: 'View products',
  viewAll: 'View all products',

  featuredTitle: 'Featured',
  featuredDesc: 'The products we are asked about most.',

  categoriesDesc: 'Browse by where it is used.',

  ctaTitle: 'Looking for something else?',
  ctaDesc: 'Tell us the use case and quantity and we will suggest a fit.',

  listPageDesc:
    'The full product list. Filter by category or search to find what you need.',
  listPageLead: 'Filter by category or search to find what you need.',

  searchLabel: 'Search products',
  searchPlaceholder: 'Search by name or model',

  countAllTemplate: 'All {n}',
  countTemplate: '{n}',
  countOf: (n: number) => String(n),

  empty: 'No products match. Try another search term or category.',
  emptyShort: 'Nothing to show.',

  askThis: 'Ask about this product',
  related: 'See also',
  specCaption: (title: string) => `${title} specifications`,
  specTab: 'Specifications',
  inquiryOf: (title: string) => `Inquiry — ${title}`,

  categoryDesc: (label: string) => `Products for ${label}.`,
} satisfies typeof KO;

const DICT: Record<Locale, typeof KO> = { ko: KO, en: EN };

/**
 * 화면 문구를 가져옵니다.
 *
 *   const T = getTerms(localeFromPath(Astro.url.pathname));
 *
 * 컴포넌트는 Astro.url 만 있으면 어느 깊이에서든 언어를 알 수 있어
 * prop 으로 언어를 내려보낼 필요가 없습니다.
 */
export function getTerms(locale: Locale = DEFAULT_LOCALE) {
  return DICT[locale] ?? KO;
}

export const T = KO;
export default KO;
