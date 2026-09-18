import siteConfig from '../../site.config';

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

export const T = {
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
  inquiryOf: (title: string) => `문의 ${item}: ${title}`,

  /** 카테고리 페이지 */
  categoryDesc: (label: string) => `${label} ${item} 목록입니다.`,
};

export default T;
