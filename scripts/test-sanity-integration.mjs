/**
 * Sanity 연동 레이어 통합 검증.
 * 실제 Sanity 프로젝트 없이 mock 서버로 전체 경로(loader → 스키마 → 렌더)를 확인합니다.
 *
 *   npm run test:sanity
 *
 * 검증 항목
 *  1. CONTENT_SOURCE=sanity 로 빌드가 성공하는가
 *  2. CMS 상품이 실제 페이지로 생성되는가
 *  3. slug 없는 문서를 건너뛰고도 빌드가 끝나는가
 *  4. Portable Text가 올바른 HTML로 변환되는가
 *  5. **XSS 페이로드가 전부 차단되는가** (가장 중요)
 *  6. CSP에 Sanity CDN이 반영되는가
 */
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 3999;
const ROOT = new URL('..', import.meta.url).pathname;

const fail = [];
const pass = [];

function check(name, condition, detail = '') {
  if (condition) pass.push(name);
  else fail.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const mock = spawn('node', ['scripts/mock-sanity-server.mjs'], {
  cwd: ROOT,
  env: { ...process.env, MOCK_PORT: String(PORT) },
  stdio: 'ignore',
});

process.on('exit', () => mock.kill());

try {
  await sleep(700);

  rmSync(`${ROOT}dist`, { recursive: true, force: true });

  const build = spawnSync('npm', ['run', 'build'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      CONTENT_SOURCE: 'sanity',
      SANITY_PROJECT_ID: 'mock',
      SANITY_DATASET: 'production',
      SANITY_API_HOST: `localhost:${PORT}`,
    },
  });

  const log = build.stdout + build.stderr;

  check('빌드 성공', build.status === 0, log.slice(-600));

  if (build.status !== 0) {
    console.log(log);
    throw new Error('빌드 실패로 이후 검증을 중단합니다');
  }

  check('slug 없는 문서 경고 출력', /slug가 비어 있어 건너뜁니다/.test(log));
  check('상품 2개 로드', /상품 2개를 불러왔습니다/.test(log), log.match(/상품 \d+개.*/)?.[0]);

  const detailPath = `${ROOT}dist/products/cms-shield-900/index.html`;
  check('CMS 상품 상세 페이지 생성', existsSync(detailPath));
  check(
    '두 번째 CMS 상품 생성',
    existsSync(`${ROOT}dist/products/cms-lamp-300/index.html`)
  );
  check(
    'slug 없는 문서는 페이지가 생기지 않음',
    !existsSync(`${ROOT}dist/products/null/index.html`) &&
      !existsSync(`${ROOT}dist/products/undefined/index.html`)
  );

  const html = existsSync(detailPath) ? readFileSync(detailPath, 'utf8') : '';

  // ---- Portable Text 변환 ----
  check('h2 블록 변환', html.includes('<h2>제품 개요</h2>'));
  check('strong 마크 변환', html.includes('<strong>보호 모듈</strong>'));
  check('불릿 리스트 변환', /<ul>\s*<li>첫 번째 항목<\/li>/.test(html));
  check(
    '정상 링크는 유지 + rel 보호',
    html.includes('href="https://example.com/spec"') &&
      html.includes('rel="noopener noreferrer"')
  );

  // ---- XSS 방어 (핵심) ----
  check(
    'XSS-1 텍스트 내 script 태그가 이스케이프됨',
    !html.includes('<script>window.__XSS_TEXT__') &&
      html.includes('&lt;script&gt;window.__XSS_TEXT__')
  );
  check(
    'XSS-2 onerror 속성이 실행 불가 형태로 이스케이프됨',
    !/<img src=x onerror=/.test(html)
  );
  check(
    'XSS-3 javascript: 링크가 제거됨',
    !html.includes('javascript:window.__XSS_HREF__') &&
      !html.includes('href="javascript:')
  );
  check(
    'XSS-3b 링크는 막혔지만 텍스트는 남음',
    html.includes('눌러보세요')
  );
  check(
    'XSS-4 지원하지 않는 raw HTML 블록이 무시됨',
    !html.includes('__XSS_RAW__')
  );

  // ---- 이미지 / CSP ----
  check('Sanity CDN 이미지 사용', html.includes('https://cdn.sanity.io/images/mock/'));
  check('이미지 변환 파라미터 적용', /cdn\.sanity\.io[^"]*[?&]w=\d+/.test(html));
  check('srcset 생성', html.includes('srcset='));
  check(
    'CSP img-src에 Sanity CDN 포함',
    /content-security-policy[^>]*img-src[^;]*cdn\.sanity\.io/i.test(html)
  );
  check(
    "CSP에 unsafe-inline 없음",
    !/content-security-policy[^>]*unsafe-inline/i.test(html)
  );

  // ---- 스펙 매핑 ----
  check('specs 배열 → 표 변환', html.includes('IP67'));
  check('값이 빈 spec은 제외', !html.includes('빈값테스트'));

  // ---- 목록/상태 ----
  const listHtml = readFileSync(`${ROOT}dist/products/index.html`, 'utf8');
  check('목록에 CMS 상품 노출', listHtml.includes('CMS 프로쉴드 900'));
  check('출시 예정 배지 렌더', listHtml.includes('출시 예정'));
  check('가격 포맷팅', listHtml.includes('129,000원'));

  // ---- 페이지 (회사소개·개인정보처리방침) ----
  const aboutHtml = readFileSync(`${ROOT}dist/about/index.html`, 'utf8');
  check('페이지: CMS 제목 반영', aboutHtml.includes('CMS 회사소개'));
  check('페이지: CMS 본문 렌더', aboutHtml.includes('CMS 본문이 정상적으로 렌더되는지'));
  check(
    '페이지: 본문 XSS도 이스케이프됨',
    !/<img src=x onerror=/.test(aboutHtml) && !aboutHtml.includes('alert("page-xss")')
  );

  const privacyHtml = readFileSync(`${ROOT}dist/privacy/index.html`, 'utf8');
  check('페이지: 개인정보처리방침도 CMS에서 옴', privacyHtml.includes('CMS 개인정보처리방침'));

  // ---- 홈 배너 ----
  // 배너는 hero 프리셋이 carousel 일 때만 나오므로, 데이터가 들어왔는지는
  // 컬렉션 로딩 로그로 확인합니다 (프리셋을 건드리면 다른 검증이 흔들립니다).
  check('배너: 이미지 없는 문서는 건너뜀', /건너뜀 1개/.test(log));
  check('배너: 정상 문서는 불러옴', /배너 1개를 불러왔습니다/.test(log));
  check('페이지 로딩 로그', /페이지 2개를 불러왔습니다/.test(log));
} finally {
  mock.kill();
}

// ============================================================
//  네거티브 케이스 — 잘못된 데이터가 빌드를 "통과하면" 실패입니다.
//  CMS는 고객사가 입력하는 곳이라, 막히는지 직접 증명해야 합니다.
// ============================================================
const negatives = [
  ['evil-image', '허용 목록 밖 호스트의 이미지', /허용 목록에 없습니다|does not match collection schema/],
  ['bad-category', '정의되지 않은 카테고리', /site\.config\.ts에 정의된 값|does not match collection schema/],
  ['missing-title', '필수 필드(title) 누락', /does not match collection schema|Expected string/],
];

for (const [scenario, label, pattern] of negatives) {
  const neg = spawn('node', ['scripts/mock-sanity-server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, MOCK_PORT: String(PORT), MOCK_SCENARIO: scenario },
    stdio: 'ignore',
  });

  try {
    await sleep(600);
    rmSync(`${ROOT}dist`, { recursive: true, force: true });

    const res = spawnSync('npm', ['run', 'build'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        CONTENT_SOURCE: 'sanity',
        SANITY_PROJECT_ID: 'mock',
        SANITY_DATASET: 'production',
        SANITY_API_HOST: `localhost:${PORT}`,
      },
    });

    const out = res.stdout + res.stderr;
    check(`[차단] ${label} → 빌드 실패`, res.status !== 0);
    check(`[차단] ${label} → 원인이 로그에 드러남`, pattern.test(out), out.slice(-300));
  } finally {
    neg.kill();
  }
}

// 마지막으로 로컬 모드가 여전히 정상인지 회귀 확인
rmSync(`${ROOT}dist`, { recursive: true, force: true });
const localBuild = spawnSync('npm', ['run', 'build'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, CONTENT_SOURCE: 'local' },
});
check('[회귀] 로컬 마크다운 모드 빌드 성공', localBuild.status === 0);
/**
 * 특정 상품 slug 에 의존하면 데모 데이터를 바꿀 때마다 테스트가 깨집니다.
 * 실제 생성된 상품 페이지 중 아무거나 하나를 골라 검사합니다.
 */
const { readdirSync } = await import('node:fs');
const localProducts = existsSync(`${ROOT}dist/products`)
  ? readdirSync(`${ROOT}dist/products`, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'category')
      .map((e) => `${ROOT}dist/products/${e.name}/index.html`)
      .filter((f) => existsSync(f))
  : [];

check('[회귀] 로컬 모드에서 마크다운 상품 페이지 생성', localProducts.length > 0);
check(
  '[회귀] 로컬 모드 CSP에는 Sanity CDN이 없음',
  localProducts.length > 0 &&
    !/img-src[^;]*cdn\.sanity\.io/.test(readFileSync(localProducts[0], 'utf8'))
);

console.log(`\n통과 ${pass.length}건`);
for (const p of pass) console.log(`  ✓ ${p}`);

if (fail.length) {
  console.log(`\n실패 ${fail.length}건`);
  for (const f of fail) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log('\n전부 통과했습니다.');
