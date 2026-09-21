# Sanity Studio — 고객사 관리화면

고객사가 **제품·페이지·배너를 직접 등록·수정·삭제**하는 화면입니다.
이 폴더가 곧 Studio 프로젝트라, 프로젝트 ID만 넣으면 바로 돌아갑니다.

붙일지 말지부터 판단하세요. 콘텐츠가 분기에 한두 번 바뀌는 고객사라면
마크다운(`CONTENT_SOURCE=local`) 그대로 두는 편이 관리 포인트가 적습니다.
월 단위로 바뀌면 붙이는 쪽이 맞습니다 — 안 붙이면 우리가 계속 불려 다닙니다.

## 무엇을 고칠 수 있나

| 문서 종류 | 고객사가 고치는 것 |
| --- | --- |
| 제품 | 추가·수정·삭제, 사진, 사양, 가격, 홈 노출 |
| 홈 배너 | 이미지와 문구, 순서, 잠시 숨기기 |
| 페이지 | 회사소개·개인정보처리방침 본문 |

카테고리 자체는 못 만듭니다 (사이트 코드와 함께 바뀌어야 합니다).

## 1. Sanity 프로젝트 생성 — 반드시 고객사 계정으로

```bash
npx sanity@latest login      # ← 고객사 계정으로 로그인
npx sanity@latest projects create "고객사명"
```

> ⚠️ **로그인부터 고객사 계정으로 하세요.** 우리 계정으로 만들면 프로젝트
> 소유권이 우리에게 남고, 결제·권한 문제로 계속 연락이 옵니다. 조직 이전이
> 가능은 하지만 고객사가 결제수단을 등록해야 해서 결국 우리가 처리하게 됩니다.

발급된 **프로젝트 ID**를 적어 두세요.

## 2. Studio 실행

```bash
cd sanity-studio
cp .env.example .env      # SANITY_STUDIO_PROJECT_ID 를 채웁니다
npm install
npm run dev               # http://localhost:3333
```

카테고리 목록은 `site.config.ts` 에서 생성합니다. 카테고리를 바꿨다면
사이트 폴더에서 먼저 돌리세요.

```bash
npm run studio:sync
```

손으로 베껴 적으면 반드시 어긋납니다. 어긋나면 고객사가 고른 값이 사이트
스키마에서 거부되어 빌드가 실패합니다.

## 3. Studio 배포

```bash
npm run deploy            # https://고객사명.sanity.studio
```

이 주소를 고객사에 전달합니다. 함께 `docs/고객사-사용설명서.md` 도 보내세요.

## 3. dataset을 공개로 설정

```bash
npx sanity dataset visibility set production public
```

- 카탈로그는 어차피 공개 콘텐츠라 공개 dataset으로 충분하고, **읽기 토큰이 필요 없어집니다**
- 토큰이 없으면 유출될 토큰도 없고, 만료로 사이트가 멈출 일도 없음
- Sanity 무료 플랜은 어차피 public dataset만 제공합니다

> **문의 내역이나 개인정보는 절대 Sanity에 넣지 마세요.** public dataset은 URL만 알면 누구나 읽을 수 있습니다. 문의는 Google Forms 등 별도 경로로 받습니다.

## 4. 사이트 쪽 전환

`.env` 에 값을 넣고 소스를 바꿉니다.

```bash
CONTENT_SOURCE=sanity
SANITY_PROJECT_ID=abc12345
SANITY_DATASET=production
```

Cloudflare Pages에서는 프로젝트 설정 → Environment variables에 같은 값을 넣습니다.

```bash
npm run build   # 여기서 Sanity를 조회합니다
```

## 5. 상품을 고치면 사이트에 언제 반영되나

정적 사이트이므로 **다시 빌드해야 반영됩니다.** 두 가지 방법이 있습니다.

**(a) 수동 재배포** — Cloudflare Pages 대시보드에서 "Retry deployment"
가장 단순하고, 고장날 게 없습니다. 상품 변경이 드물면 이걸로 충분합니다.

**(b) Sanity Webhook → Cloudflare Deploy Hook (자동)**

1. Cloudflare Pages → Settings → Builds & deployments → Deploy hooks에서 훅 URL 생성
2. Sanity 관리화면 → API → Webhooks → Create webhook
   - URL: 위에서 만든 Deploy hook URL
   - Dataset: production
   - Trigger on: Create, Update, Delete
   - Filter: `_type == "product"`

이러면 고객사가 Studio에서 저장할 때마다 사이트가 자동으로 다시 빌드됩니다.
**빌드 실패 시 이전 버전이 유지**되므로, 잘못된 데이터가 사이트를 깨뜨리지 않습니다.

> 자동 배포를 붙이면 "저장했는데 사이트에 바로 안 보여요" 문의가 사라집니다. 대신 빌드 횟수가 늘어나니 무료 플랜 빌드 한도(월 500회)를 넘지 않는지 확인하세요. 상품을 자주 고치는 고객사라면 수동 재배포가 오히려 나을 수 있습니다.

## 6. 스키마를 바꿀 때 주의

`product.schema.js` 와 `src/lib/content/schema.ts` 는 **같은 필드를 양쪽에서 정의**합니다.
한쪽만 바꾸면 빌드가 실패합니다.

| Studio (JS) | 사이트 (zod) |
| --- | --- |
| `specs` — `[{key, value}]` 배열 | `specs` — `Record<string, string>` (loader가 변환) |
| `slug.current` | 엔트리 `id` (URL) |
| `body` — Portable Text | `rendered.html` (loader가 변환) |
| `category` 의 list 값 | `site.config.ts` 의 `categories[].id` |

특히 **카테고리를 추가할 때는 세 곳을 같이 고쳐야 합니다.**
`site.config.ts` → `product.schema.js` 의 list → (필요하면) 기존 상품 문서의 값.
