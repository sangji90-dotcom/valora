# 배포 가이드

Cloudflare Pages에 올리는 전체 절차입니다.
**처음 한 번은 데모 사이트로 리허설**하고, 고객사 납품 때는 같은 절차를 고객사 계정으로 반복합니다.

소요 시간은 처음이 20~30분, 익숙해지면 10분입니다.

---

## 0. 먼저 확인

```bash
npm install
npm run build     # 성공해야 함
npm run preview   # 눈으로 확인
```

빌드가 실패하면 배포해도 실패합니다. 여기서 먼저 잡으세요.

---

## 1. GitHub 저장소에 올리기

Cloudflare Pages는 저장소를 연결해 자동 배포하는 방식이라 GitHub이 필요합니다.
이 폴더에는 이미 git 저장소와 첫 커밋이 준비되어 있습니다.

GitHub에서 **빈 저장소를 새로 만들고**(README·gitignore 체크 해제), 나온 주소를 넣으세요.

```bash
git remote add origin https://github.com/<계정>/<저장소>.git
git branch -M main
git push -u origin main
```

- 데모는 공개(public)로 두면 포트폴리오로도 쓸 수 있습니다
- 고객사 사이트는 비공개(private)로 만들고, 납품 시 고객사 조직으로 이전합니다

---

## 2. Cloudflare Pages 연결

1. [dash.cloudflare.com](https://dash.cloudflare.com) 로그인
2. 왼쪽 메뉴에서 **Compute (Workers & Pages)** → **Create** → **Pages** → **Connect to Git**
3. GitHub 계정을 연결하고 방금 만든 저장소를 선택
4. 빌드 설정을 아래처럼 입력

| 항목 | 값 |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (비움) |

5. **Save and Deploy**

Node 버전은 저장소의 `.nvmrc` 파일(22)이 정하므로 대시보드에서 따로 설정하지 않아도 됩니다.
Astro 7은 Node 22.19 이상을 요구하며, Cloudflare 기본값(20)으로는 빌드가 실패합니다.

2~3분 뒤 `<프로젝트명>.pages.dev` 주소가 나옵니다. 여기까지가 배포 완료입니다.

> 커밋을 푸시할 때마다 자동으로 다시 배포됩니다.
> **빌드가 실패하면 이전 버전이 그대로 유지**되므로 사이트가 죽지 않습니다.

---

### Pages 대신 Workers 화면이 나온다면

Cloudflare가 Pages와 Workers를 통합하면서, 신규 프로젝트는 Workers 쪽으로 안내되는 경우가 있습니다.
`npx wrangler deploy` 라는 Deploy command 가 보이면 그 화면입니다.

저장소에 `wrangler.jsonc` 가 들어 있으므로 **그대로 진행해도 됩니다.**
이 파일이 출력 디렉토리(`dist`)를 알려주는 역할을 합니다.
`public/_headers` 의 보안 헤더도 Workers 쪽에서 동일하게 적용됩니다.

주소는 `<프로젝트명>.<계정명>.workers.dev` 형태가 됩니다.

---

## 3. 배포 직후 확인

`.pages.dev` 주소로 들어가 다음을 확인하세요.

- [ ] 홈·제품 목록·상세·문의 페이지가 뜨는가
- [ ] 카테고리 필터와 검색이 동작하는가 (**브라우저 콘솔에 에러가 없는지 F12로 확인**)
- [ ] 휴대폰에서 열어도 가로 스크롤이 없는가
- [ ] `/robots.txt` 와 `/sitemap-index.xml` 이 열리는가
- [ ] 없는 주소(`/없는페이지`)로 들어가면 404 페이지가 뜨는가

콘솔 에러 확인이 중요합니다. CSP 설정이 어긋나면 **화면은 멀쩡한데 필터만 조용히 죽습니다.**

---

## 4. 도메인 연결 (고객사 납품 시)

데모는 `.pages.dev` 주소로 충분합니다. 실제 납품에서만 진행하세요.

1. 도메인을 **고객사 명의로** 구매 (가비아·후이즈 등), 결제도 고객사 카드로
2. Cloudflare에 사이트 추가 → 도메인 입력 → Free 플랜 선택
3. Cloudflare가 알려주는 **네임서버 2개**를 도메인 등록기관 관리 화면에 입력
4. 반영까지 보통 10분~수 시간
5. Pages 프로젝트 → **Custom domains** → 도메인 추가

SSL 인증서는 Cloudflare가 자동 발급·갱신합니다.

도메인이 연결되면 **`site.config.ts` 의 `site` 값을 실제 주소로 바꾸고 다시 푸시**하세요.
sitemap·canonical URL·OG 태그가 전부 이 값을 기준으로 생성됩니다.

---

## 5. 검색등록 (도메인 연결 후)

`.pages.dev` 주소로는 하지 마세요. 실제 도메인이 붙은 뒤에 합니다.

1. **네이버 서치어드바이저** / **구글 서치콘솔**에 사이트 등록
2. 소유확인에서 **HTML 태그** 방식을 고르고, 나온 `content` 값을 `site.config.ts` 의 `verification` 에 넣고 다시 푸시
3. 재배포가 끝나면 소유확인 버튼을 누름
4. 사이트맵 제출 — `https://도메인/sitemap-index.xml`

> 등록은 **고객사 계정으로** 하세요. 우리 계정으로 하면 고객사가 나중에 검색 현황을 직접 볼 수 없습니다.

---

## 6. 방문자 통계 (선택)

Cloudflare 대시보드 → **Analytics & Logs** → **Web Analytics** → 사이트 추가 →
발급된 토큰을 `site.config.ts` 의 `analytics.cloudflareToken` 에 넣고 푸시합니다.

쿠키를 쓰지 않아 동의 배너나 방침 추가 문구가 필요 없습니다.

---

## 자주 막히는 지점

| 증상 | 원인과 해결 |
| --- | --- |
| 빌드 실패 `Node.js vXX is not supported by Astro` | Node 버전 문제. 저장소 루트에 `.nvmrc`(내용 `22`)가 있는지 확인. 대시보드 환경변수 `NODE_VERSION=22` 로도 해결됨 |
| 빌드 실패 `does not match collection schema` | 상품 md의 필드 오류. 로그에 어느 상품인지 나옴 — **의도된 차단이므로 데이터를 고치세요** |
| 화면은 뜨는데 필터가 안 먹음 | CSP 문제. 콘솔에 `Refused to execute` 가 있는지 확인. 외부 스크립트를 추가했다면 `astro.config.ts` 의 `security.csp` 에 도메인 추가 |
| 이미지가 안 보임 | 상품 md의 `thumbnail` 경로 확인. `src/assets/` 기준 상대경로여야 함 |
| 도메인이 안 붙음 | 네임서버 반영 대기 중일 수 있음. `dig <도메인> NS` 로 확인 |
| 폰트만 적용이 안 됨 | 웹폰트 CDN을 CSP에 추가하지 않은 경우. 조용히 실패하므로 놓치기 쉬움 |

---

## 데모에서 고객사 사이트로 전환할 때

데모 저장소를 복제해 쓰는 경우 아래를 반드시 바꾸세요.

- [ ] `site.config.ts` 의 `demoBanner.enabled` 를 **`false`** 로 (안 끄면 고객사 사이트에 "데모" 배너가 뜹니다)
- [ ] `company`·`tagline`·`description`·`contact`·`categories` 교체
- [ ] `verification`·`analytics` 를 고객사 값으로 (또는 비움)
- [ ] 데모 상품 12개 삭제 후 실제 상품 투입
- [ ] `src/assets/products/` 데모 이미지 전부 교체
- [ ] `public/og-default.png`, `public/favicon.svg` 교체
- [ ] `src/content/pages/about.md`, `privacy.md` 실제 내용으로

나머지 체크 항목은 **README.md**의 납품 체크리스트를 따르세요.

## 빌드가 `assets.directory ... does not exist` 로 실패할 때

Cloudflare Workers 신규 프로젝트는 **Build command 칸이 비어 있는 상태로 생성됩니다.**
그러면 `npm install` 직후 바로 `npx wrangler deploy` 로 넘어가고, `dist` 가 없어 이렇게 죽습니다.

```
✘ [ERROR] The directory specified by the "assets.directory" field
  in your configuration file does not exist: /opt/buildhome/repo/dist
```

이 템플릿은 `wrangler.jsonc` 에 빌드 단계를 넣어 두어 그 경우에도 배포됩니다.

```jsonc
"build": { "command": "npm run build" }
```

대시보드에서 **Settings → Build → Build command** 에 `npm run build` 를 넣어도 됩니다.
둘 다 설정하면 빌드가 두 번 돌 뿐 문제가 되지는 않습니다.
