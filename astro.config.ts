import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import siteConfig from './site.config';
import { getContentSource } from './src/lib/content/source';

// CMS를 쓰면 이미지가 Sanity CDN에서 옵니다. CSP와 이미지 허용 도메인에 반영합니다.
const usesSanity = getContentSource() === 'sanity';
const SANITY_CDN = 'https://cdn.sanity.io';

// 방문자 통계를 켜면 외부 스크립트가 하나 늘어납니다.
// 켠 경우에만 CSP를 열어, 안 쓰는 사이트는 문을 닫아 둡니다.
const usesAnalytics = Boolean(siteConfig.analytics.cloudflareToken);
const CF_INSIGHTS = 'https://static.cloudflareinsights.com';
const CF_BEACON = 'https://cloudflareinsights.com';

// https://astro.build/config
export default defineConfig({
  site: siteConfig.site,
  // 정적 출력. 서버·DB 없이 Cloudflare Pages에 그대로 올라갑니다.
  output: 'static',
  integrations: [sitemap()],
  build: {
    // /products/ 형태의 디렉토리 URL (트레일링 슬래시 일관성)
    format: 'directory',
  },
  image: {
    // 빌드 시 WebP로 변환 + 반응형 srcset 생성
    responsiveStyles: true,
    // 원격 이미지는 허용된 호스트만. (src/lib/content/image.ts 의 목록과 함께 관리)
    domains: usesSanity ? ['cdn.sanity.io'] : [],
  },
  markdown: {
    /**
     * 코드 하이라이팅을 끕니다.
     *
     * 기본값인 Shiki는 색을 style 속성으로 직접 박아 넣는데,
     * 이 템플릿은 CSP를 인라인 없이(해시 기반) 운영하므로 충돌합니다.
     * (빌드 때마다 경고가 뜨고, 켜 두면 코드블록 색이 실제로 막힙니다.)
     *
     * 제품 설명·회사소개에 코드블록이 들어갈 일은 없으므로 끄는 쪽이 맞습니다.
     * 정말 필요하면 'prism' 으로 바꾸고 프리즘 CSS를 직접 넣으세요.
     */
    syntaxHighlight: false,
  },
  security: {
    /**
     * CSP를 빌드 시 자동 생성합니다.
     * Astro가 인라인 스크립트/스타일의 해시를 계산해 넣으므로
     * 'unsafe-inline' 없이 운영됩니다.
     *
     * 외부 리소스를 추가할 때 여기에 directive를 더하세요.
     *  - Turnstile 사용 시: scriptDirective.resources 에
     *    'https://challenges.cloudflare.com' 추가
     *  - 웹폰트 CDN 사용 시: font-src / style-src 에 도메인 추가
     */
    csp: {
      directives: [
        "default-src 'self'",
        `img-src 'self' data:${usesSanity ? ` ${SANITY_CDN}` : ''}`,
        "font-src 'self' data:",
        // 통계를 켜면 비콘 전송을 위해 연결을 허용해야 합니다
        `connect-src 'self'${usesAnalytics ? ` ${CF_BEACON} ${CF_INSIGHTS}` : ''}`,
        // Google Forms 임베드를 쓰지 않으면 아래 두 줄에서 docs.google.com 제거
        'frame-src https://docs.google.com',
        "form-action 'self' https://docs.google.com",
        "base-uri 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        /**
         * resources 를 지정하면 script-src 가 이 목록으로 대체되므로
         * 'self' 를 직접 넣어야 합니다. 빠뜨리면 사이트 자체 스크립트가
         * 차단되어 필터·검색이 조용히 죽습니다.
         */
        resources: usesAnalytics ? ["'self'", CF_INSIGHTS] : ["'self'"],
      },
    },
  },
});
