import type { APIRoute } from 'astro';
import siteConfig from '../../site.config';

/** 빌드 시 /robots.txt 로 정적 생성됩니다. */
export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /privacy/

Sitemap: ${new URL('sitemap-index.xml', siteConfig.site).href}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
