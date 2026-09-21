/**
 * Sanity API를 흉내내는 로컬 서버.
 * 실제 Sanity 프로젝트 없이 CONTENT_SOURCE=sanity 경로 전체를 빌드해 볼 때 씁니다.
 *
 *   node scripts/mock-sanity-server.mjs &
 *   CONTENT_SOURCE=sanity SANITY_PROJECT_ID=mock SANITY_API_HOST=localhost:3999 npm run build
 *
 * 픽스처에는 XSS 페이로드가 일부러 섞여 있습니다.
 * 빌드 산출물에 그대로 남으면 안 됩니다.
 */
import { createServer } from 'node:http';

// 카테고리는 고객사마다 바뀌므로 설정에서 읽습니다
const { default: siteConfig } = await import(
  new URL('../site.config.ts', import.meta.url).href
);
const CAT = siteConfig.categories.map((c) => c.id);

const IMG = (name) => ({
  url: `https://cdn.sanity.io/images/mock/production/${name}-1200x900.jpg`,
  width: 1200,
  height: 900,
  lqip: 'data:image/jpeg;base64,/9j/mock',
  alt: `${name} 이미지`,
});

const products = [
  {
    id: 'cms-shield-900',
    title: 'CMS 프로쉴드 900',
    summary: 'CMS에서 불러온 산업용 보호 모듈입니다.',
    category: CAT[0],
    thumbnail: { ...IMG('shield'), alt: 'CMS에서 적은 대체 텍스트' },
    gallery: [IMG('shield-2')],
    specs: [
      { key: '모델명', value: 'PS-900' },
      { key: '보호등급', value: 'IP67' },
      { key: '빈값테스트', value: null },
    ],
    tags: ['PS-900', '방진'],
    price: null,
    priceNote: '가격 문의',
    featured: true,
    order: 1,
    status: 'active',
    draft: false,
    seoDescription: null,
    _updatedAt: '2026-09-01T00:00:00Z',
    body: [
      {
        _type: 'block',
        style: 'h2',
        children: [{ _type: 'span', text: '제품 개요' }],
      },
      {
        _type: 'block',
        style: 'normal',
        markDefs: [{ _key: 'l1', _type: 'link', href: 'https://example.com/spec' }],
        children: [
          { _type: 'span', text: '분진이 많은 현장용 ' },
          { _type: 'span', text: '보호 모듈', marks: ['strong'] },
          { _type: 'span', text: '입니다. ' },
          { _type: 'span', text: '사양서', marks: ['l1'] },
        ],
      },
      // ── XSS 시도 1: 텍스트에 태그 삽입
      {
        _type: 'block',
        style: 'normal',
        children: [
          {
            _type: 'span',
            text: '<script>window.__XSS_TEXT__=1</script><img src=x onerror="window.__XSS_ATTR__=1">',
          },
        ],
      },
      // ── XSS 시도 2: javascript: 스킴 링크
      {
        _type: 'block',
        style: 'normal',
        markDefs: [
          { _key: 'bad', _type: 'link', href: 'javascript:window.__XSS_HREF__=1' },
        ],
        children: [{ _type: 'span', text: '눌러보세요', marks: ['bad'] }],
      },
      // ── XSS 시도 3: 지원하지 않는 raw HTML 블록 (무시되어야 함)
      {
        _type: 'html',
        html: '<script>window.__XSS_RAW__=1</script>',
      },
      {
        _type: 'block',
        listItem: 'bullet',
        children: [{ _type: 'span', text: '첫 번째 항목' }],
      },
      {
        _type: 'block',
        listItem: 'bullet',
        children: [{ _type: 'span', text: '두 번째 항목' }],
      },
    ],
  },
  {
    id: 'cms-lamp-300',
    title: 'CMS 필드램프 300',
    summary: 'CMS에서 불러온 충전식 작업등입니다.',
    category: CAT[1],
    thumbnail: IMG('lamp'),
    gallery: [],
    specs: [{ key: '광량', value: '3,000 lm' }],
    tags: ['FL-300'],
    price: 129000,
    priceNote: null,
    featured: true,
    order: 2,
    status: 'coming-soon',
    draft: false,
    seoDescription: 'SEO 전용 설명',
    _updatedAt: '2026-09-02T00:00:00Z',
    body: [],
  },
  // slug가 없는 문서 — 빌드를 깨지 않고 경고와 함께 건너뛰어야 함
  {
    id: null,
    title: 'slug 없는 문서',
    summary: '이 문서는 건너뛰어져야 합니다.',
    category: CAT[2],
    thumbnail: IMG('noslug'),
    specs: [],
    _updatedAt: '2026-09-03T00:00:00Z',
    body: [],
  },
];

/**
 * 네거티브 시나리오 — 스키마가 정말로 빌드를 막는지 증명하기 위한 픽스처.
 * MOCK_SCENARIO 환경변수로 선택합니다.
 */
/**
 * 페이지 픽스처.
 * about / privacy 는 사이트에 라우트가 있어야 하므로 반드시 둘 다 필요합니다.
 */
const pages = [
  {
    id: 'about',
    title: 'CMS 회사소개',
    description: 'CMS에서 불러온 회사소개입니다.',
    showHero: true,
    draft: false,
    _updatedAt: '2026-09-01T00:00:00Z',
    body: [
      { _type: 'block', style: 'h2', children: [{ _type: 'span', text: '우리가 하는 일' }] },
      {
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', text: 'CMS 본문이 정상적으로 렌더되는지 확인합니다.' }],
      },
      // XSS 시도 — 페이지 본문도 상품과 같은 경로로 이스케이프되어야 합니다
      {
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', text: '<img src=x onerror=alert("page-xss")>' }],
      },
      // 표 — 고객사가 Studio에서 넣는 블록. 셀은 평문이므로 반드시 이스케이프되어야 합니다.
      {
        _type: 'table',
        hasHeader: true,
        rows: [
          { _type: 'row', cells: ['단계', '걸리는 시간'] },
          { _type: 'row', cells: ['샘플 제작', '약 2주'] },
          { _type: 'row', cells: ['<b onmouseover=alert("cell-xss")>양산</b>', '약 6주'] },
        ],
      },
    ],
  },
  {
    id: 'privacy',
    title: 'CMS 개인정보처리방침',
    description: null,
    showHero: true,
    draft: false,
    _updatedAt: '2026-09-01T00:00:00Z',
    body: [
      {
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', text: '개인정보처리방침 본문입니다.' }],
      },
    ],
  },
];

/** 홈 배너 픽스처 */
const slides = [
  {
    id: 'cms-banner-1',
    eyebrow: 'NOTICE',
    title: 'CMS에서 온 배너\n두 줄까지 나옵니다',
    subtitle: '보조 설명입니다.',
    image: IMG('banner'),
    href: '/products/',
    cta: '제품 보기',
    align: 'right',
    textColor: 'dark',
    overlay: 'light',
    order: 1,
    draft: false,
    _updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    // 이미지가 없는 배너 — 빌드를 죽이지 않고 건너뛰어야 합니다
    id: 'cms-banner-broken',
    title: '이미지 없는 배너',
    image: null,
    order: 2,
    draft: false,
    _updatedAt: '2026-09-01T00:00:00Z',
  },
];

const scenarios = {
  ok: products,

  // 허용 목록에 없는 호스트의 이미지 → 스키마에서 거부되어야 함
  'evil-image': [
    {
      ...products[0],
      thumbnail: {
        url: 'https://evil.example.com/payload.jpg',
        width: 1200,
        height: 900,
      },
    },
  ],

  // site.config.ts에 없는 카테고리 → 스키마에서 거부되어야 함
  'bad-category': [{ ...products[0], category: '존재하지-않는-카테고리' }],

  // 필수 필드 누락 → 스키마에서 거부되어야 함
  'missing-title': [{ ...products[0], title: null }],
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (!url.pathname.includes('/data/query/')) {
    res.writeHead(404).end('not found');
    return;
  }

  /**
   * 어떤 컬렉션을 묻는 쿼리인지 판별합니다.
   * 예전에는 무엇을 물어도 상품을 돌려줬는데, 컬렉션이 셋이 되면서
   * 페이지 로더가 상품 문서를 받아 엉뚱하게 실패했습니다.
   */
  const query = url.searchParams.get('query') ?? '';
  const type = query.includes('"page"')
    ? 'page'
    : query.includes('"slide"')
      ? 'slide'
      : 'product';

  if (type === 'page') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result: pages, ms: 1 }));
    return;
  }

  if (type === 'slide') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result: slides, ms: 1 }));
    return;
  }

  const scenario = process.env.MOCK_SCENARIO ?? 'ok';
  const result = scenarios[scenario];

  if (!result) {
    res.writeHead(400).end(`unknown scenario: ${scenario}`);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ result, ms: 1 }));
});

const port = Number(process.env.MOCK_PORT ?? 3999);
server.listen(port, () => {
  console.log(`mock sanity listening on http://localhost:${port}`);
});
