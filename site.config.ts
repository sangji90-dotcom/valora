/**
 * ============================================================
 *  고객사별 교체 지점 #1 — 사이트 전역 설정
 * ============================================================
 *  새 고객사에 납품할 때 이 파일과 src/styles/tokens.css 두 개만
 *  바꾸면 브랜드 교체가 끝나도록 설계되어 있습니다.
 *  코드(컴포넌트/페이지)는 원칙적으로 건드리지 않습니다.
 * ============================================================
 */

import type {
  NavItem,
  Category,
  LayoutPreset,
  SiteConfig,
} from './src/lib/site-config.types';

// 기존 import 경로(`site.config` 에서 타입을 가져오던 곳)를 위해 다시 내보냅니다
export type { NavItem, Category, LayoutPreset, SiteConfig };

export const siteConfig: SiteConfig = {
  site: 'https://example.com',
  company: {
    ko: '주식회사 발로라',
    // ⚠ 등기된 영문 법인명을 확인해 바꿔야 합니다. 아래는 잠정 표기입니다.
    en: 'VALORA Inc.',
  },
  tagline: {
    ko: '플라스틱 없는 정량 위생',
    en: 'Measured hygiene, without the plastic',
  },
  description: {
    ko: '발로라는 물에 녹는 수용성 필름으로 만든 캡슐 세정제와 전용 디스펜서를 공급합니다. 기업 ESG 판촉물과 숙박업소 어메니티에 맞는 구성을 안내해 드립니다.',
    en: 'VALORA supplies capsule cleansers made with water-soluble film, and the dispensers built for them. We put together configurations for corporate ESG gifting and for hospitality amenities.',
  },
  logo: null,
  ogImage: '/og-default.png',
  lang: 'ko',

  /**
   * 다국어 (요청서 3번).
   * 구조는 다 잡혀 있고, 아래 배열에 'en' 을 넣으면 영문 사이트가
   * /en/ 아래에 통째로 생깁니다. 번역을 받기 전까지는 넣지 마세요.
   */
  i18n: {
    published: ['ko', 'en'],
  },

  layout: {
    // 제품 사진이 확실해서 좌측 문구 + 우측 대표 제품
    hero: 'split',
    productCard: 'card',
    imageRatio: '4:3',
    // 품목이 4종뿐이라 하나씩 설명하는 rows 가 맞습니다
    featured: 'rows',
    /**
     * 요청서 20번의 11단 구성으로 가는 중간 단계입니다.
     * HERO → BRAND MESSAGE → VALORA SYSTEM → PRODUCT → HOW IT WORKS
     *   → SUSTAINABILITY → CATEGORY → CONTACT
     */
    homeSections: [
      'message',
      'system',
      'featured',
      'howItWorks',
      'sustainability',
      'categories',
      'cta',
    ],
  },

  /**
   * 히어로 아래 신뢰 근거 띠.
   * 전부 제안서에 근거가 있는 사실만 적었습니다.
   */
  proof: [
    {
      label: { ko: '특허', en: 'PATENT' },
      value: { ko: '출원 완료', en: 'Application filed' },
      note: {
        ko: '캡슐형 비누 및 그 토출장치 (10-2025-0122876)',
        en: 'Capsule soap and dispensing device (KR 10-2025-0122876)',
      },
    },
    {
      label: { ko: '기술이전', en: 'TECH TRANSFER' },
      value: { ko: '남부대학교 산학협력', en: 'Nambu University' },
      note: {
        ko: '식물추출물 유효성분 포함 조성물',
        en: 'Plant-extract active compound formulation',
      },
    },
    {
      label: { ko: '인증', en: 'CERTIFICATION' },
      value: { ko: '진행 중', en: 'In progress' },
      note: {
        ko: '화장품법 기반 인증 절차',
        en: 'Under the Korean Cosmetics Act',
      },
    },
    {
      label: { ko: '공급 방식', en: 'SUPPLY' },
      value: { ko: '주문 제작', en: 'Made to order' },
      note: {
        ko: '용도와 수량에 맞춰 구성·색상 맞춤',
        en: 'Configuration and colour matched to use and quantity',
      },
    },
  ],

  /**
   * 숫자 띠.
   * ⚠ 기준(basis)과 면책(disclaimer)을 비우지 마세요 —
   *   수치만 크게 써두면 근거 없는 환경 주장이 됩니다.
   */
  /**
   * ⚠ 메인에서 내렸습니다 (요청서 11번).
   *   검증자료를 확보한 뒤 산정근거와 함께 별도 ESG DATA 영역에 씁니다.
   *   homeSections 에 'stats' 를 다시 넣으면 그대로 살아납니다.
   *   환경 수치는 근거 없이 크게 쓰면 부당 표시가 됩니다.
   */
  stats: {
    title: '도입하면 얼마나 줄어드나',
    basis: '캡슐 1만 개를 도입했을 때를 기준으로 한 추정치입니다.',
    items: [
      {
        label: '플라스틱 폐기물',
        value: '80',
        unit: 'kg',
        note: '소형 어메니티 용기·파우치 대체 기준',
      },
      {
        label: '이산화탄소 배출',
        value: '216~280',
        unit: 'kg',
        note: '플라스틱 1kg당 2.7~3.5kg CO₂e 적용',
      },
      {
        label: '세정제 과다 사용',
        value: '20~30',
        unit: '%',
        note: '1회 정량 제공에 따른 남용 감소',
      },
    ],
    disclaimer:
      '도입 수량에 비례한 추정치입니다. 실제 산출 근거가 필요하시면 문의 시 요청해 주세요. UN 지속가능발전목표 12번·13번에 해당하는 항목이라 ESG 보고서에 수치로 적을 수 있습니다.',
  },

  /**
   * ⚠ '용기를 없앴습니다' 라고 쓰면 안 됩니다.
   *   케이스·디스펜서처럼 반복해서 쓰는 용기를 같이 파는 이상 모순입니다.
   *   (요청서 5번) 줄이는 대상은 '매번 버리는 일회용 용기' 입니다.
   */
  brandMessage: {
    title: 'SMALL CAPSULE, BIG CHANGE.',
    body: {
      ko: `발로라는 필요한 만큼의 세정 성분을 수용성 필름 한 알에 담습니다.
물과 만나면 필름은 녹고, 필요한 양만 쓰입니다.
매번 버리는 일회용 용기를 줄입니다.`,
      en: `VALORA puts a single dose of cleanser inside a water-soluble film.
The film dissolves on contact and only the amount needed is used.
Fewer single-use bottles thrown away, every time.`,
    },
  },

  /**
   * VALORA SYSTEM (요청서 6번).
   * 제품을 나열하지 않고 이어지는 하나의 체계로 보여줍니다.
   */
  productSystem: {
    title: { ko: '하나로 이어지는 체계', en: 'One connected system' },
    lead: {
      ko: '캡슐을 쓰려면 담을 것이 필요하고, 담으면 보관할 것이 필요합니다. 제품이 늘어나는 순서가 곧 쓰는 순서입니다.',
      en: 'A capsule needs something to carry it, and carrying it needs somewhere to keep it. The order the range grows in is the order you use it in.',
    },
    items: [
      {
        icon: 'capsule',
        key: 'CAPSULE',
        label: { ko: '수용성 필름에 1회분을 담은 캡슐', en: 'A single dose sealed in water-soluble film' },
      },
      {
        icon: 'carry',
        key: 'CARRY',
        label: { ko: '들고 다니는 휴대용 케이스', en: 'A pocket case to carry them in' },
        note: { ko: '개발 중', en: 'In development' },
      },
      {
        icon: 'store',
        key: 'STORE',
        label: { ko: '쌓아서 쓰는 보관 케이스', en: 'Stacking cases for storage' },
        note: { ko: '개발 중', en: 'In development' },
      },
      {
        icon: 'dispense',
        key: 'DISPENSE',
        label: { ko: '버튼 한 번에 한 알이 나오는 디스펜서', en: 'One press, one capsule' },
        note: { ko: '시안 단계', en: 'Concept stage' },
      },
    ],
    disclaimer: {
      ko: '화면의 그림은 형태를 단순화한 도식이며 실제 제품 사진이 아닙니다. 개발 단계는 항목마다 표시했습니다.',
      en: 'The drawings above are simplified diagrams, not photographs of finished products. Development stage is marked on each item.',
    },
  },

  /**
   * HOW IT WORKS (요청서 9번).
   * ⚠ 한 줄씩만 씁니다. 길어지면 이 섹션을 만든 이유가 사라집니다.
   */
  howItWorks: {
    title: { ko: '쓰는 방법', en: 'How it works' },
    lead: { ko: '네 단계가 전부입니다.', en: 'Four steps, that is all.' },
    items: [
      { icon: 'take', key: 'TAKE', label: { ko: '캡슐 한 알을 꺼냅니다', en: 'Take one capsule' } },
      { icon: 'water', key: 'WATER', label: { ko: '물에 닿게 합니다', en: 'Let it meet water' } },
      { icon: 'dissolve', key: 'DISSOLVE', label: { ko: '3~5초 만에 필름이 녹습니다', en: 'The film dissolves in 3–5 seconds' } },
      { icon: 'clean', key: 'CLEAN', label: { ko: '정량만 그대로 쓰입니다', en: 'Exactly one dose is used' } },
    ],
  },

  /**
   * 지속가능성 3원칙 (요청서 11번).
   * 숫자는 여기 두지 않습니다 — 아래 stats 주석을 보세요.
   */
  sustainability: {
    title: { ko: '구조가 만드는 지속가능성', en: 'Sustainability by design' },
    lead: {
      ko: '캠페인 문구가 아니라 제품이 생긴 방식에서 나옵니다.',
      en: 'Not a slogan — it follows from how the product is made.',
    },
    items: [
      {
        key: 'LESS PACKAGING',
        label: { ko: '불필요한 일회용 포장을 줄입니다', en: 'Less single-use packaging' },
        body: {
          ko: '1회분이 필름 한 알에 들어갑니다. 용량마다 따로 용기를 만들 필요가 없습니다.',
          en: 'One dose fits in one film capsule. No separate bottle per volume.',
        },
      },
      {
        key: 'EXACT DOSE',
        label: { ko: '필요한 만큼 사용합니다', en: 'Only what is needed' },
        body: {
          ko: '한 번에 한 캡슐만 쓰입니다. 펌프처럼 눌린 만큼 나와 남는 일이 없습니다.',
          en: 'One capsule at a time. Nothing is left over the way it is with a pump.',
        },
      },
      {
        key: 'REFILL SYSTEM',
        label: { ko: '케이스와 디스펜서는 반복해 사용합니다', en: 'Cases and dispensers are reused' },
        body: {
          ko: '본체는 그대로 두고 캡슐만 채웁니다. 쓰는 동안 버려지는 것은 필름뿐입니다.',
          en: 'The body stays; you refill the capsules. Only the film is discarded in use.',
        },
      },
    ],
  },

  nav: [
    { label: { ko: '제품', en: 'Products' }, href: '/products' },
    { label: { ko: '회사소개', en: 'About' }, href: '/about' },
    { label: { ko: '문의', en: 'Contact' }, href: '/contact' },
  ],

  utilityNav: {
    left: [{ label: { ko: '발로라 소개', en: 'About VALORA' }, href: '/about/' }],
    right: [
      { label: { ko: '샘플 신청', en: 'Request a sample' }, href: '/contact/' },
      { label: { ko: '도입 문의', en: 'Enquire' }, href: '/contact/' },
      { label: { ko: '개인정보처리방침', en: 'Privacy policy' }, href: '/privacy/' },
    ],
  },

  quickLinks: [
    { label: { ko: '도입 문의', en: 'Enquire' }, href: '/contact/' },
    { label: { ko: '샘플 신청', en: 'Request a sample' }, href: '/contact/' },
  ],

  /**
   * 제품 상세 "유의사항" 탭.
   * 4종 모두에 공통으로 걸리는 안내만 둡니다.
   */
  productNotice: {
    items: [
      { ko: '최소 주문 수량은 제품에 따라 다릅니다. 문의 시 안내해 드립니다.', en: 'Minimum order quantity varies by product. We will confirm it when you enquire.' },
      { ko: '로고 인쇄에는 인쇄용 원본 파일(AI·PDF)이 필요합니다.', en: 'Logo printing requires print-ready artwork (AI or PDF).' },
      { ko: '샘플 제작에 약 2주, 본 양산에 약 4~6주가 걸립니다. 발주 시점에 따라 달라질 수 있습니다.', en: 'Samples take about two weeks and production four to six, depending on when the order is placed.' },
      { ko: '캡슐 색상 맞춤 제작은 발주 수량에 따라 가능 여부가 달라집니다.', en: 'Custom capsule colours depend on the order quantity.' },
      { ko: '이 사이트에서는 결제가 이루어지지 않습니다. 견적과 계약은 별도로 진행됩니다.', en: 'No payment is taken on this site. Quotations and contracts are handled separately.' },
    ],
  },

  categories: [
    {
      id: 'gift',
      label: { ko: '기업 판촉·기프트', en: 'Corporate gifting' },
      description: {
        ko: 'ESG 캠페인 키트와 브랜드 굿즈로 쓰이는 구성입니다. 로고 인쇄와 캡슐 색상 맞춤이 가능합니다.',
        en: 'Kits for ESG campaigns and branded gifts. Logo printing and custom capsule colours are available.',
      },
    },
    {
      id: 'amenity',
      label: { ko: '숙박 어메니티', en: 'Hospitality amenities' },
      description: {
        ko: '객실 욕실의 일회용 어메니티를 대체하는 설비입니다. 설치 후 캡슐만 채우면 됩니다.',
        en: 'Equipment that replaces single-use bathroom amenities. Once installed, you only refill capsules.',
      },
    },
    {
      id: 'refill',
      label: { ko: '리필 캡슐', en: 'Refill capsules' },
      description: {
        ko: '디스펜서와 케이스에 공통으로 들어가는 소모품입니다.',
        en: 'The consumable that goes into both the dispensers and the cases.',
      },
    },
  ],

  contact: {
    // ⚠ 아래는 전부 자리표시자입니다.
    //   실제 의뢰를 받기 전까지 발로라의 실제 연락처를 넣지 않습니다.
    //   특히 대표 개인 휴대전화는 공개 사이트에 올리면 안 됩니다.
    email: 'contact@example.com',
    phone: '000-0000-0000',
    address: { ko: '광주광역시 서구', en: 'Seo-gu, Gwangju, Republic of Korea' },
    businessNumber: '000-00-00000',
    ceo: '000',
  },

  inquiry: {
    mode: 'external',
    // Google Forms → 보내기 → <> 탭의 iframe src 주소를 그대로 붙여넣습니다.
    embedUrl: 'https://docs.google.com/forms/d/e/FORM_ID/viewform?embedded=true',
  },

  productsPerPage: 12,
  featuredCount: 4,
  // 품목이 4종이라 검색창은 필요 없습니다
  enableSearch: false,

  /**
   * 검색엔진에서 제외합니다.
   *
   * 발로라의 의뢰를 받고 만든 사이트가 아니므로, 검색으로 발견되어
   * 공식 사이트처럼 읽히는 일을 막습니다.
   * 회사의 공개 승인을 받으면 이 줄을 지우세요.
   */
  noindex: true,

  verification: {
    // naver: 'abc123...',
    // google: 'xyz789...',
  },

  analytics: {
    // cloudflareToken: '0123456789abcdef...',
  },

  demoBanner: {
    enabled: true,
    text: {
      ko: '이 사이트는 템플릿 시연용으로 제작한 샘플입니다. 주식회사 발로라의 공식 사이트가 아니며, 회사의 의뢰 없이 공개 자료만으로 구성했습니다.',
      en: 'This is a template demonstration built from public information only. It is not an official site of VALORA and was not commissioned by the company.',
    },
  },
};

export default siteConfig;
