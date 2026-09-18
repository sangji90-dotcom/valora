import siteConfig from '../../site.config';

/**
 * 검색엔진용 구조화 데이터(JSON-LD).
 *
 * 검색결과에 회사 정보·경로가 함께 표시될 수 있고,
 * 검색엔진이 페이지 간 관계를 이해하는 데 쓰입니다.
 * 화면에는 보이지 않습니다.
 */

const origin = siteConfig.site.replace(/\/$/, '');

const abs = (pathname: string) => `${origin}${pathname}`;

/** 회사 정보 — 홈에만 넣습니다 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.company,
    url: origin,
    description: siteConfig.description,
    logo: abs(siteConfig.logo ?? siteConfig.ogImage),
    ...(siteConfig.contact.phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: siteConfig.contact.phone,
            contactType: 'sales',
            email: siteConfig.contact.email,
            areaServed: 'KR',
            availableLanguage: ['Korean'],
          },
        }
      : {}),
    ...(siteConfig.contact.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: siteConfig.contact.address,
            addressCountry: 'KR',
          },
        }
      : {}),
  };
}

/** 사이트 내 위치(빵부스러기) — 상세·카테고리 페이지 */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}
