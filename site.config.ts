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
  company: '주식회사 발로라',
  tagline: '플라스틱 없는 정량 위생',
  description:
    '발로라는 물에 녹는 수용성 필름으로 만든 캡슐 세정제와 전용 디스펜서를 공급합니다. 기업 ESG 판촉물과 숙박업소 어메니티에 맞는 구성을 안내해 드립니다.',
  logo: null,
  ogImage: '/og-default.png',
  lang: 'ko',

  layout: {
    // 제품 사진이 확실해서 좌측 문구 + 우측 대표 제품
    hero: 'split',
    productCard: 'card',
    imageRatio: '4:3',
    // 품목이 4종뿐이라 하나씩 설명하는 rows 가 맞습니다
    featured: 'rows',
    homeSections: ['message', 'featured', 'categories', 'cta'],
  },

  brandMessage: {
    title: '용기를 없앴습니다',
    body: `세정제를 담기 위해 매번 플라스틱 용기를 만들 필요는 없습니다.
물에 닿으면 3~5초 만에 녹는 필름에 1회분만 담으면, 쓰고 나서 남는 것이 없습니다.
한 번에 한 캡슐만 쓰이니 과다 사용과 교차 오염도 함께 사라집니다.`,
  },

  nav: [
    { label: '제품', href: '/products' },
    { label: '회사소개', href: '/about' },
    { label: '문의', href: '/contact' },
  ],

  utilityNav: {
    left: [{ label: '발로라 소개', href: '/about/' }],
    right: [
      { label: '샘플 신청', href: '/contact/' },
      { label: '도입 문의', href: '/contact/' },
      { label: '개인정보처리방침', href: '/privacy/' },
    ],
  },

  quickLinks: [
    { label: '도입 문의', href: '/contact/' },
    { label: '샘플 신청', href: '/contact/' },
  ],

  /**
   * 제품 상세 "유의사항" 탭.
   * 4종 모두에 공통으로 걸리는 안내만 둡니다.
   */
  productNotice: {
    items: [
      '최소 주문 수량은 제품에 따라 다릅니다. 문의 시 안내해 드립니다.',
      '로고 인쇄에는 인쇄용 원본 파일(AI·PDF)이 필요합니다.',
      '샘플 제작에 약 2주, 본 양산에 약 4~6주가 걸립니다. 발주 시점에 따라 달라질 수 있습니다.',
      '캡슐 색상 맞춤 제작은 발주 수량에 따라 가능 여부가 달라집니다.',
      '이 사이트에서는 결제가 이루어지지 않습니다. 견적과 계약은 별도로 진행됩니다.',
    ],
  },

  categories: [
    {
      id: 'gift',
      label: '기업 판촉·기프트',
      description: 'ESG 캠페인 키트와 브랜드 굿즈로 쓰이는 구성입니다. 로고 인쇄와 캡슐 색상 맞춤이 가능합니다.',
    },
    {
      id: 'amenity',
      label: '숙박 어메니티',
      description: '객실 욕실의 일회용 어메니티를 대체하는 설비입니다. 설치 후 캡슐만 채우면 됩니다.',
    },
    {
      id: 'refill',
      label: '리필 캡슐',
      description: '디스펜서와 케이스에 공통으로 들어가는 소모품입니다.',
    },
  ],

  contact: {
    // ⚠ 아래는 전부 자리표시자입니다.
    //   실제 의뢰를 받기 전까지 발로라의 실제 연락처를 넣지 않습니다.
    //   특히 대표 개인 휴대전화는 공개 사이트에 올리면 안 됩니다.
    email: 'contact@example.com',
    phone: '000-0000-0000',
    address: '광주광역시 서구',
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
    text:
      '이 사이트는 템플릿 시연용으로 제작한 샘플입니다. 주식회사 발로라의 공식 사이트가 아니며, 회사의 의뢰 없이 공개 자료만으로 구성했습니다.',
  },
};

export default siteConfig;
