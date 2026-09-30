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

  /* ---------- 화면 곳곳의 고정 문구 ----------
   * ⚠ 컴포넌트에 한국어를 직접 쓰지 마세요. 영문 페이지에서 그 자리만
   *   한국어로 남습니다. 여기 키를 만들고 T.<키> 로 부르세요.
   *   (aria-label 처럼 눈에 안 보이는 것도 화면낭독기는 읽습니다) */
  ui: {
    skipToContent: '본문으로 건너뛰기',
    topOfPage: '맨 위로',
    quickMenu: '빠른 메뉴',
    mainMenu: '주 메뉴',
    utilityMenu: '보조 메뉴',
    customerMenu: '고객 안내',
    languageSelect: '언어 선택',
    menuOpen: '메뉴 열기',
    searchButton: '검색',
    homeOf: (company: string) => `${company} 홈`,
    currentLocation: '현재 위치',
    viewDetail: '자세히 보기',
    listPrice: '정가',
    opensNewWindow: '(새 창에서 열림)',
    moreButton: '더 보기',
    allFilter: '전체',
    categoryFilter: '카테고리 필터',
    contactCta: '문의하기',
    categoriesTitle: '카테고리',
    popularSearches: '인기 검색어',
    promoCta: '보러 가기',
    contactLabel: '연락처',
    privacyPolicy: '개인정보처리방침',
    call: '전화',
    callTo: (phone: string) => `전화 ${phone}`,
    buyLabel: '구매처',
    detailTab: '상세정보',
    noticeTab: '유의사항',
    itemInfo: `${item} 정보`,
    proofAria: '회사 신뢰 근거',
    featuredAria: `대표 ${item}`,
    featuredListAria: `대표 ${item} 목록`,
    featuredDotsAria: `대표 ${item} 넘기기`,
    nthItem: (n: number, title: string) => `${n}번째 ${item} — ${title}`,
    stepN: (n: number) => `${n}단계 — `,
    detailImageAlt: (title: string, n: number) => `${title} 상세 이미지 ${n}`,
    carousel: '캐러셀',
    slide: '슬라이드',
    news: '주요 소식',
    prevSlide: '이전 슬라이드',
    nextSlide: '다음 슬라이드',
    slideSelect: '슬라이드 선택',
    nthSlide: (n: number) => `${n}번 슬라이드`,
    ceoLine: (ceo: string, biz: string) => `대표 ${ceo} · 사업자등록번호 ${biz}`,
    /** 문의 폼을 쓰지 않는 설정일 때의 대체 안내 */
    fallbackLead: '전화 또는 이메일로 문의해 주세요.',
    sendEmail: '이메일 보내기',
    emailNotice:
      '본 사이트에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적 장치를 이용하여 무단으로 수집되는 것을 거부하며, 이를 위반 시 정보통신망법에 의해 형사처벌됨을 유념하시기 바랍니다.',
  },

  /* ---------- 문의 페이지 ---------- */
  contact: {
    title: '문의',
    metaDesc: (company: string) => `${company}에 ${item}·견적을 문의하실 수 있습니다.`,
    lead: `${item}, 견적, 납기 관련 문의를 남겨주시면 영업일 기준 1~2일 내에 답변드립니다.`,
    phone: '전화',
    email: '이메일',
    address: '주소',
    privacyNoteBefore: '문의 시 수집되는 개인정보의 이용 목적과 보관 기간은',
    privacyNoteAfter: '에서 확인하실 수 있습니다.',
    formTitle: '문의 양식',
    formLoading: '양식을 불러오는 중입니다…',
    fieldName: '이름 / 회사명 *',
    fieldEmail: '회신받을 이메일 *',
    fieldPhone: '연락처',
    fieldMessage: '문의 내용 *',
    consent: '개인정보 수집·이용에 동의합니다.',
    consentView: '내용 보기',
    submit: '문의 보내기',
  },

  /* ---------- 404 ---------- */
  notFound: {
    title: '페이지를 찾을 수 없습니다',
    desc: '주소가 변경되었거나 삭제된 페이지입니다.',
    home: '홈으로',
  },
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

  ui: {
    skipToContent: 'Skip to content',
    topOfPage: 'Back to top',
    quickMenu: 'Quick links',
    mainMenu: 'Main menu',
    utilityMenu: 'Secondary menu',
    customerMenu: 'Customer information',
    languageSelect: 'Language',
    menuOpen: 'Open menu',
    searchButton: 'Search',
    homeOf: (company: string) => `${company} home`,
    currentLocation: 'Breadcrumb',
    viewDetail: 'View details',
    listPrice: 'List price',
    opensNewWindow: '(opens in a new window)',
    moreButton: 'Load more',
    allFilter: 'All',
    categoryFilter: 'Filter by category',
    contactCta: 'Contact us',
    categoriesTitle: 'Categories',
    popularSearches: 'Popular searches',
    promoCta: 'Learn more',
    contactLabel: 'Contact',
    privacyPolicy: 'Privacy policy',
    call: 'Call',
    callTo: (phone: string) => `Call ${phone}`,
    buyLabel: 'Where to buy',
    detailTab: 'Details',
    noticeTab: 'Before you order',
    itemInfo: 'Product information',
    proofAria: 'Company credentials',
    featuredAria: 'Featured products',
    featuredListAria: 'Featured product list',
    featuredDotsAria: 'Browse featured products',
    nthItem: (n: number, title: string) => `Product ${n} — ${title}`,
    stepN: (n: number) => `Step ${n} — `,
    detailImageAlt: (title: string, n: number) => `${title} detail image ${n}`,
    carousel: 'carousel',
    slide: 'slide',
    news: 'Highlights',
    prevSlide: 'Previous slide',
    nextSlide: 'Next slide',
    slideSelect: 'Choose a slide',
    nthSlide: (n: number) => `Slide ${n}`,
    ceoLine: (ceo: string, biz: string) =>
      `CEO ${ceo} · Business registration ${biz}`,
    fallbackLead: 'Please reach us by phone or email.',
    sendEmail: 'Send an email',
    emailNotice:
      'Email addresses published on this site may not be collected by automated means. Unauthorised collection is subject to penalty under the Korean Information and Communications Network Act.',
  },

  contact: {
    title: 'Contact',
    metaDesc: (company: string) =>
      `Ask ${company} about products, pricing and lead times.`,
    lead: 'Tell us what you need — product, quantity and timing. We reply within one to two business days.',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    privacyNoteBefore: 'How we use and retain the information you send is described in our',
    privacyNoteAfter: '.',
    formTitle: 'Inquiry form',
    formLoading: 'Loading the form…',
    fieldName: 'Name / Company *',
    fieldEmail: 'Email for our reply *',
    fieldPhone: 'Phone',
    fieldMessage: 'Your message *',
    consent: 'I agree to the collection and use of my information.',
    consentView: 'Read',
    submit: 'Send inquiry',
  },

  notFound: {
    title: 'Page not found',
    desc: 'This address has changed or the page was removed.',
    home: 'Go home',
  },
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
