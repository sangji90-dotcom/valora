import type { APIRoute } from 'astro';
import siteConfig from '../../site.config';

/** 빌드 시 /robots.txt 로 정적 생성됩니다. */
export const GET: APIRoute = () => {
  // 사이트 전체 검색 제외가 켜져 있으면 전부 막고 사이트맵도 알리지 않습니다
  const body = siteConfig.noindex
    ? `User-agent: *
Disallow: /
`
    : `User-agent: *
Allow: /
Disallow: /privacy/

Sitemap: ${new URL('sitemap-index.xml', siteConfig.site).href}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
