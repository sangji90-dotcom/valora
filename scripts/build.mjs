/**
 * 빌드 진입점.
 *
 * 왜 astro build 를 바로 부르지 않고 한 겹 씌웠나 —
 *
 * Cloudflare 대시보드에 CONTENT_SOURCE=sanity 가 남아 있습니다.
 * 그 값이면 페이지 본문과 제품 이미지가 마크다운이 아니라 CMS 에서
 * 옵니다. 거기 든 것은 9월 export 본이라, git push 로 자동 빌드가
 * 돌 때마다 사이트가 그 시점으로 되돌아갔습니다.
 *
 * 실제로 두 번 겪었습니다. 처리방침을 12항목으로 고쳤는데 화면은
 * 8항목이었고, 제품 상세에 그림을 넣었는데 화면에는 하나도 없었습니다.
 * 둘 다 "배포가 안 됐나" 로 한참 헤맸습니다. 수동 배포는 멀쩡히
 * 올라갔고, 그 뒤 자동 빌드가 덮고 있었습니다.
 *
 * 발로라는 아직 고객사 Sanity 프로젝트가 없습니다. 본문의 출처는
 * 마크다운입니다. 그래서 여기서 못을 박습니다.
 *
 * 고객사 Sanity 가 연결되고 거기 내용이 최신이 되면, 그때
 * USE_SANITY=1 을 주고 빌드하세요. 그 경우에만 CMS 를 봅니다.
 *
 *   USE_SANITY=1 npm run build
 *
 * 바꾼 뒤에는 npm run test:leak 으로 항목 수가 맞는지 꼭 확인하세요.
 * 그 검사가 소스와 빌드 결과를 대조합니다.
 */
import { spawnSync } from 'node:child_process';

if (process.env.USE_SANITY === '1') {
  console.log('[build] USE_SANITY=1 — CONTENT_SOURCE 를 그대로 둡니다');
} else {
  if (process.env.CONTENT_SOURCE && process.env.CONTENT_SOURCE !== 'local') {
    console.log(
      `[build] CONTENT_SOURCE=${process.env.CONTENT_SOURCE} 를 무시하고 local 로 빌드합니다.` +
        ' 고객사 Sanity 를 쓰려면 USE_SANITY=1 을 주세요 (scripts/build.mjs 참고)'
    );
  }
  process.env.CONTENT_SOURCE = 'local';
}

const r = spawnSync('npx', ['astro', 'build'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
process.exit(r.status ?? 1);
