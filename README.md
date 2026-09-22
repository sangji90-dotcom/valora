# 제품 쇼케이스 사이트 템플릿

결제·회원가입 없는 **카탈로그형 기업 사이트** 템플릿입니다.
고객사마다 복제해서 브랜드만 갈아끼워 납품하는 것을 전제로 만들어졌습니다.

- **서버 없음 / DB 없음** — 빌드 결과가 순수 정적 HTML
- **월 고정비 0원** — Cloudflare Pages 무료 플랜
- **납품 후 유지보수 대상 없음** — pause될 서비스도, 패치할 백엔드도 없음

```
Astro 7 (SSG) → Cloudflare Pages
상품 데이터: 마크다운 파일 (나중에 CMS로 교체 가능)
문의 폼: 외부 폼 임베드 / 자체 엔드포인트 / 연락처만 — 3가지 모드 선택
```

---

## 1. 고객사별로 바꾸는 곳은 딱 2개

| 파일 | 바꾸는 것 |
| --- | --- |
| **site.config.ts** | 회사명, 도메인, 연락처, 메뉴, 카테고리, 문의 폼 방식, **레이아웃 프리셋** |
| **src/styles/tokens.css** | 브랜드 색상, 서체, 간격, radius |

> `site.config.ts` 의 **타입 정의는 `src/lib/site-config.types.ts`** 에 있습니다.
> 고객사 프로젝트를 복제해 두면 템플릿에 필드가 추가돼도 복제본이 따라가지 않아
> 조용히 어긋나기 때문에, 타입은 코드와 함께 갱신되도록 분리했습니다.
> 값만 `site.config.ts` 에서 고치세요.

컴포넌트와 페이지 코드는 **원칙적으로 건드리지 않습니다.**
모든 컴포넌트 CSS는 `var(--color-accent)` 같은 토큰만 참조하므로,
`tokens.css`의 값만 바꾸면 사이트 전체 톤이 바뀝니다.

### 레이아웃 프리셋 — 구조를 바꾸는 세 번째 축

토큰은 색과 서체만 바꾸므로, 그것만으로는 고객사마다 **구조가 똑같은 사이트**로 보입니다.
`site.config.ts`의 `layout`에서 구조 자체를 고릅니다.

```ts
layout: {
  hero: 'split',       // stacked | split | minimal | carousel
  productCard: 'card', // card | overlay | list
  featured: 'grid',    // grid | rows
  homeSections: ['featured', 'categories', 'cta'],
}
```

| hero | 구조 | 어울리는 경우 |
| --- | --- | --- |
| `stacked` | 문구 위주 + 그라데이션 배경 | 제품 사진이 약할 때 가장 안전 |
| `split` | 좌측 문구 + 우측 대표 제품 이미지 | 사진이 좋을 때 |
| `minimal` | 큰 타이포만, 배경 없음 | 기술·산업재 톤 |
| `carousel` | 풀블리드 슬라이드 배너 | 국내 쇼핑몰 톤. `src/content/slides` 사용 |

| productCard | 구조 | 어울리는 경우 |
| --- | --- | --- |
| `card` | 테두리 + 4:3 이미지 + 아래 텍스트 | 무난한 기본형 |
| `overlay` | 이미지 위에 텍스트 (3:4) | 사진이 강할 때 |
| `list` | 좌측 정사각 이미지 + 우측 텍스트 | 설명이 긴 제품 |

3 × 3 = 9가지 조합이 나옵니다. 컴포넌트를 새로 짜지 않고 조합으로 해결하므로,
새 고객사에 들어가는 시간은 색·서체 교체와 같습니다.

- `split`은 대표 제품 이미지를 쓰며, 상품이 하나도 없으면 `stacked`로 자동 강등됩니다
- `list`를 고르면 목록 그리드가 1~2열로 자동 전환됩니다
- 상세 페이지의 "함께 보는 제품"은 영역이 좁아 프리셋과 무관하게 항상 기본 카드입니다

### 쇼핑몰처럼 보이게 하는 옵션들

회원가입·장바구니·결제는 없지만, **보이는 형태만** 국내 쇼핑몰에 맞출 수 있습니다.
전부 `site.config.ts`에서 켜고 끄며, 비워두면 해당 요소가 아예 렌더되지 않습니다.

| 옵션 | 무엇이 생기나 | 끄는 법 |
| --- | --- | --- |
| `layout.hero: 'carousel'` | 상단 슬라이드 배너 | 다른 hero 값으로 |
| `utilityNav` | 헤더 맨 위 얇은 보조 메뉴 줄 | 항목을 비우면 줄 자체가 사라짐 |
| `quickLinks` | 우측 하단 고정 퀵 메뉴 (+ 맨 위로) | 비우면 표시 안 함 |
| `promo` + `homeSections`에 `'promo'` | 기획전 배너 + 인기 검색어 | 둘 중 하나만 빼도 안 나옴 |
| 상품의 `listPrice` | 정가 취소선 + 할인율 자동 계산 | 필드를 빼면 판매가만 표시 |
| 상품의 `badge` | 카드 좌상단 배지 (BEST/NEW 등) | 필드를 빼면 배지 없음 |
| `enableSearch` | 헤더 검색창 (+ 목록 검색창) | `false` |

주의할 점 세 가지입니다.

- **`utilityNav`에 로그인·장바구니·주문조회를 넣지 마세요.** 이 템플릿에는 회원·결제가
  없어 링크를 걸면 죽은 링크가 됩니다. 고객사가 요청하면 기능부터 논의해야 합니다.
- **`listPrice`는 실제로 그 가격에 판매한 적이 있는 값이어야 합니다.** 할인율을 크게
  보이려고 임의로 올려 적으면 표시광고 문제가 될 수 있습니다. 고객사에 전달하세요.
- 헤더 검색과 인기 검색어는 `/products/?q=...` 로 이동해 **목록 페이지에서** 걸러냅니다.
  검색어는 `value`·`textContent`로만 다루므로 URL로 스크립트를 넣을 수 없습니다.

슬라이드 배너는 설정이 아니라 콘텐츠입니다 (`src/content/slides/*.md`).
이미지가 빌드 시 최적화되어야 하고, 배너는 고객사가 가장 자주 바꾸는 자리라서입니다.
`example.md`를 복사해 `draft: false`로 바꾸면 바로 나옵니다.

> 사진 위 어둡기(`overlay`)는 숫자가 아니라 `none / light / medium / strong` 단계입니다.
> 임의의 숫자는 `style` 속성으로 들어가야 하는데, CSP가 style 속성까지는 해시로 허용하지
> 못해 브라우저가 막아버립니다. 막히면 **조용히 투명해져서** 흰 글자가 안 보입니다.

모든 조합을 한 번에 렌더해 확인하려면:

```bash
node scripts/shoot-presets.mjs
```

빌드 · 스크린샷 · 필터 동작 · 모바일 가로 스크롤 · 콘솔 에러를 조합마다 검사합니다.

### 화면 용어 바꾸기 — "제품"이 아닐 때

템플릿은 취급 품목을 **"제품"** 이라고 부릅니다. 책을 팔면 "도서", 음식점이면 "메뉴",
갤러리면 "작품"이 맞습니다. 컴포넌트를 고치지 말고 `terms` 하나만 바꾸세요.

```ts
terms: {
  item: '도서',            // "제품" 자리에 들어갈 말
  unit: '권',              // 세는 단위 (기본 '개')
  featuredTitle: '이 달의 책',
  searchPlaceholder: '책 제목·지은이 검색',
}
```

이것만으로 헤더 검색창, 목록 제목, 카테고리 개수, 빈 상태 문구,
"이 ○○ 문의하기", "함께 보는 ○○", 브레드크럼이 전부 따라갑니다.

**조사는 자동으로 붙습니다.** "제품이 없습니다" / "도서가 없습니다" 처럼
앞 글자 받침에 따라 이/가, 을/를이 달라지는데, 고객사 단어를 모르는 상태로
문장을 만들어야 하므로 한글 음절 코드로 받침을 계산해 붙입니다
(`src/lib/terms.ts` 의 `withJosa`). 문장 자체가 어색한 자리만
`featuredDesc` · `ctaTitle` 같은 항목으로 따로 덮어쓰세요.

### 이미지 비율 고정

카드 이미지 비율은 카드 모양마다 기본값이 있습니다 (card 4:3 / overlay 3:4 / list 1:1).
취급 품목의 생김새가 정해져 있으면 `layout.imageRatio` 로 고정하세요.

| 값 | 쓰는 곳 |
| --- | --- |
| `2:3` | 책 표지, 포스터 |
| `3:4` | 의류, 인물 |
| `1:1` | 잡화, 식품 |
| `16:9` | 장비, 인테리어 사진 |

목록 카드·상세 이미지·대표 제품 행에 함께 적용됩니다.

### 외부 구매처 링크

이 템플릿에는 장바구니와 결제가 없습니다. 고객사가 이미 스마트스토어나
오픈마켓에서 팔고 있다면 **거기로 보내는 것**이 가장 현실적인 구매 동선입니다.
상품 md에 `externalLinks` 를 넣으면 상세 페이지 하단에 버튼으로 나옵니다.

```yaml
externalLinks:
  - label: 스마트스토어
    url: "https://smartstore.naver.com/..."
```

- **https 만 허용합니다.** `javascript:` · `data:` · `//evil.com` 은 빌드가 실패합니다.
  값이 CMS에서 올 수 있고, 조용히 무시하면 링크가 사라진 걸 아무도 모르기 때문입니다
- 새 창으로 열리며 `rel="noopener noreferrer"` 가 붙습니다
- 최대 6개

### 디자인 작업 순서 (FE / 디자이너)

1. `tokens.css`의 `--brand-*` 를 고객사 CI 색으로 교체
2. `--font-sans` 를 고객사 서체로 교체 (웹폰트는 `global.css` 최상단에 `@import`)
3. 다크 모드가 불필요하면 `tokens.css`의 `@media (prefers-color-scheme: dark)` 블록 통째로 삭제
4. 레이아웃까지 바꿔야 하면 그때만 컴포넌트 수정

> 외부 웹폰트를 추가하면 **astro.config.ts의 `security.csp` directives에 해당 도메인을 추가**해야 폰트가 로드됩니다. 빠뜨리면 폰트만 조용히 적용이 안 됩니다.

---

## 2. 시작하기

```bash
npm install
cp .env.example .env

npm run dev          # http://localhost:4321
npm run build        # dist/ 에 정적 파일 생성
npm run preview      # 빌드 결과 확인
npm run check        # 타입 검사
npm run test:sanity  # CMS 연동 검증 (실제 Sanity 계정 불필요)
npm run test:import  # 엑셀 일괄 등록 검증
npm run test:tokens  # CSS 변수 참조 검증 (선언 안 된 var(--x) 색출)
```

---

## 3. 상품 추가/수정

`src/content/products/` 에 마크다운 파일 하나 = 상품 하나입니다.
**파일명이 그대로 URL**이 됩니다. (`pro-shield-900.md` → `/products/pro-shield-900/`)

```markdown
---
title: 프로쉴드 900              # 필수
summary: 한 줄 설명 (120자 이내)   # 필수
category: industrial            # 필수 — site.config.ts의 categories[].id 중 하나
thumbnail: ../../assets/products/pro-shield-900.jpg  # 필수
gallery: []                     # 상세 추가 이미지
specs:                          # 사양 표 (키: 값)
  모델명: PS-900
  무게: 2.4 kg
tags: [PS-900, 방진]            # 검색 키워드 보강
price: 189000                   # 숫자만. 비우면 priceNote 노출
priceNote: 가격 문의
listPrice: 210000               # 정가. price보다 클 때만 취소선+할인율(자동 계산)
badge: BEST                     # 카드 좌상단 배지. 6자 이내 권장
externalLinks:                  # 외부 구매처 (https만). 없으면 생략
  - label: 스마트스토어
    url: "https://smartstore.naver.com/..." 
featured: true                  # 홈 대표 제품에 노출
order: 1                        # 작을수록 앞
status: active                  # active | discontinued | coming-soon
draft: false                    # true면 빌드에서 제외
---

## 제품 개요

여기부터 상세 페이지 본문 (마크다운)
```

> **스키마(`src/lib/content/schema.ts`)에 필드를 추가한 뒤 빌드가
> `Cannot read properties of undefined` 로 죽으면** 콘텐츠 캐시가 남은 것입니다.
> `.astro` 와 `node_modules/.astro` 를 지우고 다시 빌드하세요.
> Astro는 마크다운 파일이 그대로면 스키마가 바뀌어도 다시 파싱하지 않습니다.

### 잘못 쓰면 빌드가 실패합니다 — 의도된 동작입니다

```
[InvalidContentEntryDataError] products → pro-shield-900 data does not match collection schema.
  category: category는 site.config.ts에 정의된 값이어야 합니다: industrial, office, accessory
```

필드 누락·오타가 있으면 **배포 자체가 중단**되므로, 깨진 페이지가 고객사 사이트에 올라가지 않습니다.
Cloudflare Pages는 빌드 실패 시 이전 버전을 그대로 유지합니다.

### 상품이 많으면 엑셀로 한 번에 등록

고객사는 상품 목록을 **엑셀로 줍니다.** 50~200개를 손으로 옮기는 건 불가능하므로 변환 스크립트를 씁니다.

```bash
# 1) 고객사에 보낼 양식을 만든다 (분류·상태는 드롭다운으로 고정)
npm run make-template

# 2) 받은 파일을 먼저 미리보기 — 파일을 쓰지 않고 문제만 보여줍니다
npm run import -- ~/받은자료/상품목록.xlsx --images ~/받은자료/사진 --dry-run

# 3) 경고를 정리한 뒤 실제 변환
npm run import -- ~/받은자료/상품목록.xlsx --images ~/받은자료/사진
```

| 옵션 | 설명 |
| --- | --- |
| `--images <폴더>` | 제품 사진 폴더 |
| `--dry-run` | 파일을 쓰지 않고 결과만 출력 |
| `--force` | 같은 slug의 기존 md 덮어쓰기 (기본은 건너뜀) |
| `--placeholder` | 사진 없는 상품도 회색 이미지로 만들고 `draft: true` 처리 |
| `--sheet <이름>` | 엑셀 시트 지정 |
| `--max-width <px>` | 이미지 최대 가로 (기본 1600) |

**고객사 엑셀은 통제할 수 없는 입력**이라 다음을 자동으로 흡수합니다.

- 열 이름이 제각각 — `품명` `상품명` `품목명` 을 전부 제품명으로 인식. **모르는 열은 전부 사양표로** 들어가므로 `무게` `재질` 열을 추가하면 그대로 스펙이 됩니다
- 한글 엑셀이 뱉는 **EUC-KR CSV** 자동 판별 (UTF-8 BOM도 처리)
- `189,000원` → `189000`, `판매중`/`단종`/`출시예정` → status, `O`/`예` → featured
- 카테고리를 한글 이름(`산업용`)으로 적어도 id(`industrial`)로 변환
- 사진 파일명의 **대소문자·공백 차이 무시**, 여러 장이면 첫 장이 대표·나머지는 갤러리
- 4000px 원본 사진을 1600px로 자동 축소 (EXIF 회전 반영)
- 제품명에 콜론·따옴표가 있어도 frontmatter가 깨지지 않도록 YAML 인용

**사람이 판단해야 하는 것은 만들지 않고 리포트로 남깁니다.**

- 한글 제품명뿐이라 URL을 만들 수 없으면 `item-001` 임시 주소 + 경고 (모델명이 있으면 `방진 커버 (DC-100)` → `dc-100` 자동 추출)
- slug 중복은 `-2` 를 붙이고 어느 행인지 알려줌
- 카테고리를 못 알아본 상품은 **아예 만들지 않음** — 만들면 빌드가 실패하고 원인 행을 찾기 어려워짐
- 사진 없는 상품은 기본적으로 건너뛰고 목록으로 보여줌

검증은 `npm run test:import` 로 돌립니다. 인코딩·열 매핑·YAML 이스케이프·이미지 축소·빌드 통과까지 35개 항목을 확인하고, 테스트가 만든 파일은 스스로 지웁니다.

### 이미지

- `src/assets/products/` 에 원본을 넣으면 빌드 시 **WebP 변환 + 반응형 srcset**이 자동 생성됩니다
- 권장 원본: 가로 1200px 이상, 4:3 비율
- `public/` 에 넣으면 최적화되지 않으니 상품 이미지는 반드시 `src/assets/` 에 둘 것

---

## 4. 문의 폼 — 3가지 모드

`site.config.ts`의 `inquiry` 에서 선택합니다.

### `external` (권장)

Google Forms 등 외부 폼을 임베드합니다.

```ts
inquiry: { mode: 'external', embedUrl: 'https://docs.google.com/forms/d/e/FORM_ID/viewform?embedded=true' }
```

- 문의 데이터가 **고객사 계정**에 쌓입니다 → 개인정보 보관·파기 책임이 처음부터 고객사에 귀속
- 스팸 차단, 알림 메일, 스프레드시트 정리를 전부 구글이 처리 → 우리가 유지보수할 게 없음
- Google Forms 외 서비스를 쓰면 `astro.config.ts`의 `frame-src` / `form-action` 도메인을 교체

### `endpoint`

디자인 통일이 꼭 필요할 때만 씁니다. Cloudflare Worker 등으로 직접 받습니다.

```ts
inquiry: { mode: 'endpoint', endpoint: 'https://form.example.workers.dev', turnstileSiteKey: '0x...' }
```

- Turnstile 사이트 키를 넣으면 봇 차단 위젯이 자동 삽입됩니다
- **Worker에서 문의를 DB에 저장하지 말고 메일/Slack으로 흘려보내세요.** 저장하는 순간 파기 정책·접근통제 책임이 생깁니다
- Turnstile 사용 시 `astro.config.ts`의 `security.csp` 에 `https://challenges.cloudflare.com` 추가 필요

### `none`

폼 없이 전화·이메일만 안내합니다.

---

## 5. 개인정보처리방침 — 납품 전 필수 확인

`src/content/pages/privacy.md` 는 **초안**입니다. 그대로 납품하면 안 됩니다.

- 실제 수집 항목, 보관 기간, 수탁업체(Google 등)를 고객사 상황에 맞게 수정
- 개인정보 보호책임자 성명·연락처 기재
- 최종본은 **고객사가 확인·확정**해야 합니다 (법률 자문 영역)

결제가 없으므로 통신판매업 신고는 불필요하지만, 문의 폼으로 개인정보를 받는 이상 방침 페이지와 동의 체크박스는 필요합니다.

---

## 6. Cloudflare Pages 배포

대시보드에서 저장소를 연결하고 아래만 설정하면 끝입니다.

| 항목 | 값 |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 이상 |

- `public/_headers` 가 보안 헤더를 적용합니다 (X-Frame-Options, nosniff 등)
- CSP는 `astro.config.ts`의 `security.csp` 가 빌드 시 **해시를 계산해 자동 생성**합니다 — `unsafe-inline` 없이 동작
- 커밋하면 자동 재배포, 빌드 실패 시 이전 버전 유지

배포 후 `site.config.ts`의 `site` 값을 실제 도메인으로 반드시 교체하세요.
sitemap, canonical URL, OG 태그가 전부 이 값을 기준으로 생성됩니다.

### 검색등록 — 배포 후에 합니다

사이트를 올려도 네이버·구글은 그 사이트가 생긴 걸 모릅니다. 등록해야 검색에 노출됩니다.

1. **네이버** 서치어드바이저 / **구글** 서치콘솔에 사이트 주소 등록
2. 소유확인에서 **HTML 태그** 방식을 고르고, 나온 `content` 값을 `site.config.ts`의 `verification` 에 넣고 재배포
3. 사이트맵 제출 — `https://도메인/sitemap-index.xml` (빌드 시 자동 생성됨)

값을 비워두면 메타태그는 출력되지 않습니다.

> ⚠️ 등록은 **고객사 계정으로** 하세요. 우리 계정으로 하면 나중에 고객사가 검색 현황을 직접 확인할 수 없습니다.

### 방문자 통계

`analytics.cloudflareToken` 에 Cloudflare Web Analytics 토큰을 넣으면 스크립트가 자동 삽입되고, CSP도 그때만 열립니다.

**쿠키를 쓰지 않아서** 동의 배너나 개인정보처리방침 추가 문구가 필요 없습니다. GA4를 쓰면 쿠키 동의 절차와 방침 수정이 따라오므로, 굳이 요구받지 않는 한 이쪽이 낫습니다.

---

## 7. CMS(Sanity) 연동 — 이미 구현되어 있습니다

고객사가 상품을 직접 등록하겠다고 하면, **코드를 짜지 않고 환경변수만 바꾸면 됩니다.**

```bash
CONTENT_SOURCE=sanity
SANITY_PROJECT_ID=abc12345
SANITY_DATASET=production
```

페이지, 컴포넌트, 스키마는 그대로입니다. 바뀌는 것은 loader와 이미지 필드 타입뿐이고,
그 차이는 `ProductImage` 컴포넌트가 흡수합니다.

| | local | sanity |
| --- | --- | --- |
| 데이터 | `src/content/products/*.md` | Sanity 문서 |
| 이미지 | 빌드 시 WebP 변환 | Sanity CDN 변환 파라미터 |
| 본문 | 마크다운 | Portable Text → HTML |
| 스키마 검증 | 동일 | 동일 |
| 페이지/컴포넌트 | 동일 | 동일 |

Studio 설정은 **sanity-studio/README.md**, 넣을 스키마는 **sanity-studio/product.schema.js** 를 보세요.

### 실제 Sanity 없이 검증하기

mock 서버로 연동 경로 전체를 테스트할 수 있습니다. 고객사가 정해지기 전에도 동작을 확인할 수 있고, 나중에 코드를 고칠 때 회귀 테스트로 씁니다.

```bash
npm run test:sanity
```

44개 항목을 확인합니다 — 빌드 성공, Portable Text 변환, 이미지 URL 생성, CSP 반영, **XSS 차단**, 그리고 잘못된 데이터가 빌드를 제대로 막는지(네거티브 케이스)까지.

### CMS 입력값은 신뢰 경계 밖입니다

상품 본문은 고객사 담당자가 CMS에 입력합니다. 계정이 털리거나, 실수로 스크립트를 붙여넣거나, 퇴사자가 악의적으로 넣을 수 있습니다. `src/lib/sanity/portable-text.ts` 가 다음을 강제합니다.

- 모든 텍스트 HTML 이스케이프
- 링크 스킴 화이트리스트 (`http/https/mailto/tel`) — `javascript:` 는 링크를 통째로 제거하고 텍스트만 남김
- 프로토콜 상대 URL(`//evil.com`) 차단
- 외부 링크에 `rel="noopener noreferrer"` 자동 부착
- **raw HTML 블록 미지원** — 지원하지 않는 블록 타입은 조용히 무시
- 이미지 호스트 화이트리스트 (`cdn.sanity.io`) — 다른 호스트면 빌드 실패

여기에 CSP까지 해시 기반으로 적용되므로, 설령 마크업이 새어나가도 스크립트는 실행되지 않습니다.

### 왜 Supabase가 아니라 Sanity인가

Supabase 무료 플랜은 **7일 저활동 시 프로젝트가 자동 pause**됩니다 (Pro는 pause 없음). 방문자가 적은 납품 사이트는 여기 정확히 걸려서, 몇 달 뒤 "사이트가 안 떠요" 연락이 옵니다.

Sanity 무료 플랜은 문서 10,000개 / 20 seats / 월 250,000 API 요청이고 **비활성 pause가 없습니다.**

단, 무료 플랜은 **public dataset만** 제공합니다. 카탈로그는 공개 콘텐츠라 무관하지만 **문의 내역·개인정보는 절대 CMS에 넣지 마세요.**

---

## 7-2. 기존 마크다운을 CMS로 옮기기

`CONTENT_SOURCE=sanity` 로 바꾸는 순간 사이트는 마크다운을 **더 이상 읽지 않습니다.**
먼저 옮겨두지 않으면 상품 0개짜리 빈 사이트가 되고, `about`·`privacy` 는 항목이
없어서 빌드 자체가 실패합니다. 전환 **전에** 반드시 이 단계를 밟으세요.

```bash
npm run studio:sync          # 1) 카테고리를 Studio 스키마로 생성
npm run export:sanity        # 2) 마크다운 → NDJSON
cd sanity-studio
npx sanity dataset import ../.sanity-export/export.ndjson production --replace
```

**`--replace` 는 최초 1회만.** 같은 `_id` 를 덮어쓰므로, 고객사가 Studio에서
고친 내용까지 되돌아갑니다. 두 번째부터는 쓰지 마세요.

이미지는 NDJSON에 경로만 적히고, 실제 업로드는 `sanity` CLI 가 합니다.
그래서 우리가 API 쓰기 토큰을 만들거나 보관할 필요가 없습니다 (`npx sanity login` 만 되어 있으면 됩니다).

### 변환기는 조용히 버리지 않습니다

지원하는 문법만 변환합니다 — 제목 `##`~`####`, 문단, 인용, 글머리·번호 목록,
표, `**굵게**`, `*기울임*`, `` `코드` ``, `[링크](주소)`.

그 밖의 문법(코드 블록, 구분선, 본문 내 이미지, raw HTML)을 만나면 **파일명과 줄
번호를 찍고 예외를 던집니다.** 변환 후에는 원문의 모든 줄이 결과에 남았는지 한 번 더
대조하고, 하나라도 사라졌으면 실패시킵니다. 납품 뒤에 "회사소개 두 문단이 없어졌다"는
연락을 받는 것보다 지금 실패하는 편이 낫습니다.

### 전환 순서

1. `npm run export:sanity` → import
2. Studio에서 눈으로 확인 (특히 표와 이미지)
3. `.env` 에 `CONTENT_SOURCE=sanity` + `SANITY_PROJECT_ID` 넣고 로컬 빌드
4. Cloudflare 환경변수에 같은 값 넣고 재배포
5. 웹훅 ↔ 배포 훅 연결
6. `src/content/` 의 마크다운은 **지우지 말고 그대로 두세요** — 이관이 맞는지 나중에 대조할 원본입니다
---

## 8. 납품 체크리스트

### 계정 — 이게 제일 중요합니다

- [ ] 도메인을 **고객사 명의**로 구매 또는 이전 — 결제도 **고객사 카드로 직접 등록** (대납 금지: 대납하는 순간 갱신 관리가 우리 일이 됨)
- [ ] Cloudflare 계정을 **고객사 명의**로 생성하고 우리는 멤버 권한만 받기
- [ ] GitHub 저장소를 고객사 org로 이전
- [ ] (CMS 사용 시) Sanity 프로젝트도 고객사 계정으로 생성

> 우리 계정으로 만들면 2년 뒤에도 전화가 옵니다. 납품 시 권한만 빼면 끝나는 구조로 만들어 두세요.

### 콘텐츠

- [ ] `site.config.ts` 전체 항목 교체 (특히 `site`, `businessNumber`, `ceo`)
- [ ] `layout` 프리셋 선택 (고객사 제품 사진 상태에 맞춰)
- [ ] `tokens.css` 브랜드 색상·서체 적용
- [ ] 샘플 상품 6개 삭제, 실제 상품 투입 (`npm run import` — 먼저 `--dry-run` 으로 경고 확인)
- [ ] 임시 주소(`item-001` 형태)가 남아 있지 않은지 확인
- [ ] `draft: true` 인 상품이 남아 있지 않은지 확인 (사진 미도착분)
- [ ] `src/assets/products/` 샘플 이미지 전부 교체 (SAMPLE 워터마크 확인)
- [ ] `public/og-default.png` 교체
- [ ] `public/favicon.svg` 교체
- [ ] `src/content/pages/about.md` 회사소개 작성
- [ ] `src/content/pages/privacy.md` 확정 (고객사 확인 필수)
- [ ] (carousel 사용 시) `src/content/slides/example.md` 삭제, 실제 배너 투입
- [ ] `utilityNav`에 회원·장바구니·주문조회 링크가 들어가지 않았는지 확인
- [ ] `listPrice`를 쓴 상품은 **실제 판매 이력이 있는 정가**인지 고객사에 확인받기
- [ ] `quickLinks`의 전화번호가 실제 번호인지 (`tel:` 링크)
- [ ] `terms.item` 이 고객사 업종에 맞는지 (제품/도서/메뉴/작품…)
- [ ] `productNotice` 를 고객사 업종에 맞게 교체 (비우면 유의사항 탭이 안 나옴)
- [ ] (계산기 사용 시) 수치의 **산출 근거를 고객사에서 받아두기** — 환경 수치는 과장 시 문제가 됩니다
- [ ] `externalLinks` 주소가 **실제로 열리는지** 한 번씩 눌러볼 것 (죽은 링크 방지)
- [ ] 문의 폼 연결 및 **실제 수신 테스트**
- [ ] (external 모드) `prefillEntry` 설정 — 제품 상세에서 넘어온 제품명이 폼에 채워지는지 확인

### 검증

- [ ] `npm run build` 성공
- [ ] `npm run check` 에러 0
- [ ] `npm run test:import` 전부 통과
- [ ] `npm run test:tokens` 통과 (선언 안 된 CSS 변수 = 무효가 된 스타일)
- [ ] `npm run test:csp` 통과 (style 속성 = CSP가 조용히 막는 스타일)
- [ ] (CMS 사용 시) `npm run test:sanity` 전부 통과
- [ ] (CMS 사용 시) `npm run studio:sync` → `npm run export:sanity` → import 까지 마친 뒤에 `CONTENT_SOURCE` 를 바꿨는지
- [ ] (CMS 사용 시) Studio에서 회사소개·개인정보처리방침 본문과 표가 그대로 옮겨졌는지 눈으로 확인
- [ ] 모바일(390px)에서 가로 스크롤 없음
- [ ] 브라우저 콘솔 에러 0 (CSP 위반 포함)
- [ ] 404 페이지 동작
- [ ] `/robots.txt`, `/sitemap-index.xml` 생성 확인
- [ ] 제품 상세 → "이 제품 문의하기" → 문의 페이지에 제품명이 표시되는지
- [ ] 배포 후 네이버·구글 검색등록 + 사이트맵 제출 (고객사 계정으로)
- [ ] 방문자 통계 토큰 적용 여부 고객사와 합의

### 인수인계 문서 3장

- [ ] 상품 등록·수정 매뉴얼 (스크린샷 포함)
- [ ] 계정 목록과 비용 구조
- [ ] 재배포 방법

### 계약

- [ ] **하자보수 기간 명시** — 안 쓰면 무상 무기한이 기본값이 됩니다
- [ ] 기간 이후 수정은 건별 유상임을 문서화

---

## 9. 디렉토리 구조

```
site.config.ts                 ← 고객사별 교체 #1
astro.config.ts                CSP·이미지·sitemap 설정
.env.example                   데이터 소스 설정 예시
src/
├─ styles/
│  ├─ tokens.css               ← 고객사별 교체 #2
│  └─ global.css               기본 스타일 + 유틸리티
├─ content.config.ts           소스 분기 (local / sanity)
├─ content/
│  ├─ products/*.md            상품 1개 = 파일 1개 (local 모드)
│  └─ pages/                   about.md, privacy.md
├─ assets/products/            상품 원본 이미지 (자동 최적화)
├─ lib/
│  ├─ products.ts              조회·정렬·필터 로직 (한 곳에만 존재)
│  ├─ content/
│  │  ├─ schema.ts             상품 스키마 (두 소스 공용)
│  │  ├─ image.ts              로컬/원격 이미지 통합 타입
│  │  └─ source.ts             CONTENT_SOURCE 해석, 환경변수 검증
│  └─ sanity/
│     ├─ client.ts             GROQ 조회 (의존성 없음)
│     ├─ loader.ts             Content Layer loader
│     └─ portable-text.ts      본문 변환 + XSS 방어
├─ components/
│  ├─ Header / Footer / SEO
│  ├─ Hero                     히어로 3종 변형
│  ├─ ProductCard              목록 카드 3종 변형
│  ├─ ProductImage             로컬/CMS 이미지 렌더 분기 흡수
│  ├─ ProductGrid              단순 그리드 (홈)
│  └─ ProductBrowser           필터 + 검색 + 더보기 (목록/카테고리)
├─ layouts/BaseLayout.astro
└─ pages/
   ├─ index.astro              홈
   ├─ products/index.astro     전체 목록
   ├─ products/[id].astro      상세
   ├─ products/category/[category].astro
   ├─ about / contact / privacy / 404
   └─ robots.txt.ts
sanity-studio/                 고객사 Studio용 (사이트 빌드에는 포함 안 됨)
├─ product.schema.js           Studio에 복사할 스키마
└─ README.md                   Studio 생성·연동·자동배포 절차
scripts/
├─ import-products.mjs         엑셀/CSV → 마크다운 일괄 등록
├─ make-product-template.mjs   고객사에 보낼 엑셀 양식 생성
├─ lib/                        시트 읽기·값 정규화·이미지 처리
├─ mock-sanity-server.mjs      실제 Sanity 없이 테스트용
├─ test-sanity-integration.mjs CMS 연동 검증 44항목
├─ export-to-sanity.mjs        마크다운 → Sanity NDJSON 이관
├─ test-import.mjs             일괄 등록 검증 43항목
├─ test-csp.mjs                빌드 결과에 style 속성이 남았는지 검사
├─ shoot-presets.mjs           프리셋 조합 렌더·검사
└─ gen-sample-images.mjs       샘플 이미지 재생성
public/
├─ _headers                    보안 헤더
├─ favicon.svg
└─ og-default.png
```

### 목록 페이지를 페이지네이션하지 않은 이유

상품 200개까지는 한 페이지에 전부 렌더하고 **클라이언트에서 필터·검색**합니다.

- 이미지는 lazy 로딩이라 초기 전송량에 거의 영향이 없음
- 카테고리를 눌렀을 때 페이지 이동 없이 즉시 반응
- 초기에는 `productsPerPage` 개수만 보이고 "더 보기"로 점진 노출
- SEO용 카테고리 URL(`/products/category/office/`)은 별도로 정적 생성

상품이 300개를 넘어가면 그때 페이지네이션을 검토하세요.
