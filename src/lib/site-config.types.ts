/**
 * ============================================================
 *  site.config.ts 의 타입 정의
 * ============================================================
 *  값(site.config.ts)과 타입을 나눠 둔 이유 —
 *  고객사마다 프로젝트를 복제하면 site.config.ts 는 각자 달라지는데,
 *  타입까지 그 안에 있으면 템플릿이 필드를 추가해도 복제본에는
 *  따라가지 않습니다. 실제로 하루담 데모가 그렇게 어긋났고,
 *  빌드는 통과하는데 astro check 만 에러를 냈습니다.
 *
 *  타입을 src/ 안에 두면 코드와 함께 갱신되므로 그럴 일이 없습니다.
 *  **여기는 고객사마다 고치는 파일이 아닙니다.** 값은 site.config.ts 에서.
 * ============================================================
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface Category {
  /** 상품 md의 category 필드에 쓰는 값 + URL 경로에 쓰이는 값 */
  id: string;
  /** 화면에 표시되는 이름 */
  label: string;
  /** 카테고리 페이지 상단 설명 (선택) */
  description?: string;
}

/**
 * 레이아웃 프리셋.
 *
 * tokens.css는 색·서체만 바꾸므로, 그것만으로는 고객사마다
 * "구조가 똑같은 사이트"로 보입니다. 구조 자체를 바꾸는 축을
 * 여기서 고릅니다. 컴포넌트를 새로 짜지 않고 조합으로 해결합니다.
 *
 * hero (3종) × productCard (3종) = 9가지 조합.
 */
export interface LayoutPreset {
  /**
   * 홈 히어로 구조.
   *  stacked — 문구 위주, 그라데이션 배경. 제품 이미지가 약할 때 안전
   *  split   — 좌측 문구 + 우측 대표 제품 이미지. 사진이 좋을 때
   *  minimal — 큰 타이포만, 배경 없음. 기술·산업재 느낌
   *  carousel — 풀블리드 슬라이드 배너. 국내 쇼핑몰에서 흔한 형태로,
   *             src/content/slides 의 내용을 사용합니다
   */
  hero: 'stacked' | 'split' | 'minimal' | 'carousel';

  /**
   * 상품 카드 구조.
   *  card    — 테두리 + 4:3 이미지 + 아래 텍스트. 무난한 기본형
   *  overlay — 이미지 위에 텍스트를 얹음. 사진이 강할 때
   *  list    — 좌측 이미지 + 우측 텍스트 가로형. 사양 설명이 긴 제품
   */
  productCard: 'card' | 'overlay' | 'list';

  /**
   * 카드 이미지 비율. 비워두면 카드 모양별 기본값을 씁니다.
   *  card → 4:3, overlay → 3:4, list → 1:1
   *
   * 취급 품목의 생김새가 정해져 있으면 여기서 고정하세요.
   *  2:3  — 책 표지, 포스터
   *  3:4  — 의류, 인물
   *  1:1  — 잡화, 식품
   *  16:9 — 장비, 인테리어 사진
   *
   * 숫자를 직접 받지 않는 이유: 임의 값은 style 속성으로 들어가야 하는데,
   * CSP가 style 속성을 해시로 허용하지 못해 브라우저가 막아버립니다.
   */
  imageRatio?: '4:3' | '1:1' | '3:4' | '2:3' | '16:9';

  /**
   * 홈의 대표 제품 섹션 구성.
   *  grid — 카드 4개를 한 줄에. 규격품이 많고 "목록"을 빨리 보여줄 때
   *  rows — 제품 하나씩 이미지와 설명을 좌우로. 제품 수가 적고
   *         하나하나 설명할 게 있는 브랜드(화장품·식품·가구 등)
   */
  featured: 'grid' | 'rows';

  /**
   * 홈에 어떤 섹션을 어떤 순서로 놓을지.
   *
   * 색과 카드 모양만 바꾸면 고객사마다 "같은 사이트"로 보입니다.
   * 인상을 가장 크게 바꾸는 건 **홈이 무엇을 먼저 보여주는가**이므로,
   * 섹션 자체를 배열로 조립합니다. 빼고 싶은 섹션은 목록에서 지우면 됩니다.
   *
   *  message    — 브랜드 한마디 (config 의 brandMessage 사용)
   *  featured   — 대표 제품
   *  categories — 카테고리 카드
   *  cta        — 문의 유도 박스
   *
   * 히어로는 항상 맨 위에 옵니다.
   */
  homeSections: Array<'message' | 'featured' | 'categories' | 'promo' | 'cta'>;
}

export interface SiteConfig {
  /** 배포 도메인. sitemap / canonical URL / OG URL 생성에 사용 */
  site: string;
  /** 회사명 (헤더 로고 텍스트, 푸터, SEO title 접미사) */
  company: string;
  /** 사이트 대표 문구 — 홈 히어로 제목 */
  tagline: string;
  /** SEO description 기본값 */
  description: string;
  /** 로고 이미지 경로. null이면 company 텍스트를 로고로 사용 */
  logo: string | null;
  /** OG 기본 이미지 (public/ 기준 절대경로) */
  ogImage: string;
  /** 기본 언어 (html lang) */
  lang: string;

  /** 레이아웃 프리셋 — 고객사마다 구조를 다르게 가져가는 축 */
  layout: LayoutPreset;

  /**
   * 홈의 'message' 섹션에 들어갈 브랜드 한마디.
   * homeSections 에 'message' 가 없으면 쓰이지 않습니다.
   */
  brandMessage?: {
    title: string;
    body: string;
  };

  nav: NavItem[];

  /**
   * 헤더 맨 위 얇은 줄 (공지·FAQ·고객센터 등).
   * 국내 쇼핑몰에서 흔한 형태입니다. 비우면 줄 자체가 안 나옵니다.
   *
   * ⚠ 로그인·장바구니·주문조회는 넣지 마세요.
   *   이 템플릿에는 회원·결제 기능이 없어 링크만 걸면 죽은 링크가 됩니다.
   */
  utilityNav?: {
    left?: NavItem[];
    right?: NavItem[];
  };

  /**
   * 화면 우측에 고정되는 퀵 메뉴.
   * 비우면 표시하지 않습니다. 맨 위로 버튼은 자동으로 붙습니다.
   */
  quickLinks?: NavItem[];

  /**
   * 홈의 'promo' 섹션 — 기획전 배너 하나와 인기 검색어.
   * homeSections 에 'promo' 가 없으면 쓰이지 않습니다.
   */
  promo?: {
    title: string;
    description?: string;
    href: string;
    cta?: string;
    /** public/ 기준 절대경로. 예: /promo-summer.jpg */
    image?: string;
    /** 인기 검색어 — 누르면 제품 목록에서 해당 키워드로 검색됩니다 */
    keywords?: string[];
  };

  /**
   * 화면에 쓰는 용어.
   *
   * 템플릿은 취급 품목을 "제품"이라고 부릅니다. 고객사가 책을 팔면 "도서",
   * 음식점이면 "메뉴", 갤러리면 "작품"이 맞습니다. 컴포넌트를 고치는 대신
   * 여기서 바꾸면 화면 전체 문구가 따라갑니다.
   *
   * 조사(이/가, 을/를)는 단어의 받침을 보고 자동으로 붙습니다.
   * 파생 문장이 어색한 자리만 아래에서 따로 덮어쓰세요.
   */
  terms?: {
    /** 취급 품목을 부르는 말. 기본 '제품' */
    item?: string;
    /** 세는 단위. 책은 '권', 옷은 '벌'. 기본 '개' */
    unit?: string;
    /** 홈 대표 섹션 제목. 기본 '대표 {item}' */
    featuredTitle?: string;
    featuredDesc?: string;
    /** 홈 카테고리 섹션 설명 */
    categoriesDesc?: string;
    /** 문의 유도 박스 */
    ctaTitle?: string;
    ctaDesc?: string;
    /** 검색창 안내 문구. 기본 '{item}명·모델명 검색' */
    searchPlaceholder?: string;
  };

  /**
   * 상품 카테고리 정의.
   * 상품 md의 category 값은 반드시 여기 id 중 하나여야 하며,
   * 아니면 빌드가 실패합니다 (오타로 깨진 페이지가 배포되는 것을 차단).
   */
  categories: Category[];

  contact: {
    email: string;
    phone: string;
    address: string;
    /** 사업자등록번호 — 푸터 표기 (국내 사이트 관행) */
    businessNumber: string;
    /** 대표자명 */
    ceo: string;
  };

  /**
   * 문의 폼 설정.
   * mode: 'external' — Google Forms 등 외부 폼 임베드 (권장: 개인정보가 서버를 거치지 않음)
   * mode: 'endpoint' — 자체 엔드포인트로 POST (Cloudflare Worker 등)
   * mode: 'none'     — 문의 페이지 없이 연락처만 노출
   */
  inquiry:
    | {
        mode: 'external';
        embedUrl: string;
        /**
         * 제품 상세에서 "이 제품 문의하기"로 넘어올 때
         * 폼의 어느 항목에 제품명을 미리 채울지 지정합니다.
         *
         * Google Forms에서 얻는 방법:
         *   폼 편집 → 우측 점 3개 → "미리 채워진 링크 가져오기" →
         *   제품명 칸에 아무 값이나 입력 → 링크 복사 →
         *   링크 안의 entry.숫자 부분이 이 값입니다. (예: entry.1234567890)
         *
         * 비워두면 제품명은 화면에 안내 문구로만 표시됩니다.
         */
        prefillEntry?: string;
      }
    | { mode: 'endpoint'; endpoint: string; turnstileSiteKey?: string }
    | { mode: 'none' };

  /**
   * 상품 목록에서 처음에 보여줄 개수.
   * 나머지는 "더 보기"로 점진 노출됩니다 (이미지는 lazy 로딩).
   * 페이지를 쪼개지 않아 카테고리 필터·검색이 즉시 반응합니다.
   */
  productsPerPage: number;

  /** 홈 화면에 노출할 대표 상품 개수 */
  featuredCount: number;

  /** 상품 목록에 클라이언트 검색창 노출 여부 (상품 50개 이상이면 권장) */
  enableSearch: boolean;

  /**
   * 사이트 전체를 검색엔진에서 제외합니다.
   *
   * 켜면 모든 페이지에 noindex 메타태그가 붙고, robots.txt 가 전체 차단으로
   * 바뀌며, 사이트맵도 생성하지 않습니다.
   *
   * 이럴 때 켭니다 —
   *  - 오픈 전 검수용으로 미리 올려둔 사이트
   *  - 실제 회사 자료로 만들었지만 아직 그 회사의 공개 승인을 받지 못한 경우
   *
   * ⚠ 검색 제외일 뿐 비공개가 아닙니다. 주소를 아는 사람은 그대로 볼 수 있습니다.
   *   정말 가려야 하면 Cloudflare Access 같은 접근 제어를 따로 거세요.
   */
  noindex?: boolean;

  /**
   * 검색엔진 사이트 소유확인.
   *
   * 사이트를 올려도 네이버·구글은 그 사이트가 생긴 걸 모릅니다.
   * 각 도구에 사이트를 등록하고 "내가 주인"임을 증명해야 검색에 노출됩니다.
   * 사이트맵은 빌드 시 자동 생성되므로 주소만 제출하면 됩니다.
   *
   *  네이버: 서치어드바이저 → 사이트 등록 → HTML 태그 방식 선택 → content 값
   *  구글:   서치콘솔 → 속성 추가 → HTML 태그 방식 → content 값
   *
   * 값이 비어 있으면 메타태그를 출력하지 않습니다.
   * ⚠ 등록 작업은 반드시 고객사 계정으로 하세요. 우리 계정으로 하면
   *   나중에 고객사가 검색 현황을 직접 확인할 수 없습니다.
   */
  verification: {
    naver?: string;
    google?: string;
  };

  /**
   * 방문자 통계.
   *
   * Cloudflare Web Analytics를 권장합니다 — 무료이고 **쿠키를 쓰지 않아서**
   * 동의 배너나 개인정보처리방침 추가 문구가 필요 없습니다.
   * (GA4는 쿠키를 쓰므로 동의 절차와 방침 수정이 따라옵니다.)
   *
   * Cloudflare 대시보드 → Analytics & Logs → Web Analytics →
   * 사이트 추가 후 발급되는 토큰을 넣으세요.
   *
   * 비어 있으면 스크립트를 넣지 않습니다.
   */
  analytics: {
    cloudflareToken?: string;
  };

  /**
   * 데모 고지 배너.
   *
   * 영업용 데모 사이트를 공개할 때 켭니다.
   * 가상의 회사임을 명시해 실존 업체로 오인되는 것을 막고,
   * 보는 사람이 "이건 샘플"임을 바로 알 수 있게 합니다.
   *
   * **실제 고객사 납품 시에는 반드시 false 로 두세요.**
   */
  demoBanner: {
    enabled: boolean;
    /** 배너에 띄울 문구 */
    text?: string;
  };
}
