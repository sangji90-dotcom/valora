import siteConfig from '../../site.config';

/**
 * ============================================================
 *  다국어 구조
 * ============================================================
 *  요청서 3번: "영문 홈페이지를 즉시 개발하지 않더라도 향후 추가
 *  가능한 구조로 설계합니다."
 *
 *  그래서 **지금 켜는 것이 아니라, 켤 수 있게** 만들어 둡니다.
 *  site.config.ts 의 i18n.published 에 'en' 을 넣는 순간
 *  /en/ 아래 전체 사이트가 생깁니다. 지금은 ko 하나라 영문 페이지가
 *  한 장도 만들어지지 않습니다 — 번역이 없는 상태로 영문 사이트가
 *  검색에 잡히는 것이 가장 나쁜 결과입니다.
 *
 *  ⚠ 한국어는 접두어가 없습니다 (/products/, /en/products/).
 *    이유 둘 —
 *    1) 이미 나가 있는 주소가 그대로 유지됩니다. /ko/ 를 붙이면
 *       기존 링크와 검색 결과가 전부 끊깁니다.
 *    2) 한국 기업의 대표 주소는 한국어여야 자연스럽습니다.
 * ============================================================
 */

export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

/** 화면에 보이는 언어 이름 (전환 버튼에 씁니다) */
export const LOCALE_LABEL: Record<Locale, string> = {
  ko: 'KR',
  en: 'EN',
};

/** <html lang> 과 og:locale 에 쓰는 값 */
export const LOCALE_TAG: Record<Locale, string> = {
  ko: 'ko',
  en: 'en',
};

export const OG_LOCALE: Record<Locale, string> = {
  ko: 'ko_KR',
  en: 'en_US',
};

/**
 * 실제로 만들어 내보낼 언어.
 * 설정에 없으면 한국어만 만듭니다.
 */
export function publishedLocales(): Locale[] {
  const list = siteConfig.i18n?.published;
  if (!list || list.length === 0) return [DEFAULT_LOCALE];

  const seen = list.filter((l: string): l is Locale => (LOCALES as readonly string[]).includes(l));
  // 기본 언어는 항상 포함합니다 — 빼면 대표 주소가 사라집니다
  return seen.includes(DEFAULT_LOCALE) ? seen : [DEFAULT_LOCALE, ...seen];
}

/** 언어 전환 버튼을 보여줄지. 언어가 하나뿐이면 보여줄 이유가 없습니다 */
export function hasMultipleLocales(): boolean {
  return publishedLocales().length > 1;
}

/**
 * getStaticPaths 에 쓰는 언어 목록.
 * 기본 언어는 params.locale 이 undefined 라 접두어 없는 주소가 됩니다.
 */
export function localeParams(): Array<{
  params: { locale: string | undefined };
  props: { locale: Locale };
}> {
  return publishedLocales().map((locale) => ({
    params: { locale: locale === DEFAULT_LOCALE ? undefined : locale },
    props: { locale },
  }));
}

/**
 * 언어에 맞는 주소를 만듭니다.
 *
 *   localePath('/products/', 'ko') → '/products/'
 *   localePath('/products/', 'en') → '/en/products/'
 *
 * ⚠ 넘기는 경로는 **언어 접두어가 없는** 형태여야 합니다.
 *   site.config 의 nav 나 quickLinks 처럼 설정에 적힌 주소가 그렇습니다.
 */
export function localePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return `/${locale}${clean === '/' ? '/' : clean}`;
}

/**
 * 지금 보고 있는 주소에서 언어 접두어만 떼어냅니다.
 * 언어 전환 버튼이 "같은 페이지의 다른 언어"로 보내려면 필요합니다.
 */
export function stripLocale(pathname: string): string {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (pathname === `/${locale}` || pathname === `/${locale}/`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

/**
 * 현재 주소를 읽어 언어를 알아냅니다.
 *
 * ⚠ Astro.currentLocale 을 쓰지 않는 이유 —
 *   그 값은 astro.config 의 i18n 설정에 의존하는데, 설정과 이 파일이
 *   어긋나면 조용히 기본 언어로 떨어집니다. 주소만 보고 판단하면
 *   한 군데서만 관리됩니다.
 */
export function localeFromPath(pathname: string): Locale {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) return locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * hreflang 용 — 이 페이지의 모든 언어 판본 주소.
 * 검색엔진에 "같은 내용의 다른 언어"라고 알려주는 표시입니다.
 * 언어가 하나뿐이면 빈 배열이라 태그가 나가지 않습니다.
 */
export function alternateLinks(pathname: string): Array<{ locale: Locale; path: string }> {
  if (!hasMultipleLocales()) return [];
  const bare = stripLocale(pathname);
  return publishedLocales().map((locale) => ({ locale, path: localePath(bare, locale) }));
}

/**
 * ============================================================
 *  설정 본문의 다국어
 * ============================================================
 *  site.config.ts 의 문자열은 두 가지 모양을 다 받습니다.
 *
 *    title: '용기를 줄입니다'                       ← 한국어만
 *    title: { ko: '용기를 줄입니다', en: 'Less …' } ← 두 언어
 *
 *  그래서 기존 설정을 한 줄도 안 고쳐도 그대로 돌아가고,
 *  영문이 필요한 항목만 객체로 바꾸면 됩니다.
 *
 *  ⚠ 영문이 비어 있으면 **한국어로 떨어집니다.** 빈 화면보다는 낫지만,
 *    영문 사이트에 한국어가 섞인다는 뜻이기도 합니다. 무엇이 안 채워져
 *    있는지는 npm run test:i18n 이 세어 줍니다.
 * ============================================================
 */
export type Localized<T = string> = T | Partial<Record<Locale, T>>;

/** 설정 값에서 해당 언어를 꺼냅니다 */
export function pick<T>(value: Localized<T> | undefined, locale: Locale): T | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const map = value as Partial<Record<Locale, T>>;
    // ko/en 이외의 키만 있는 평범한 객체는 그대로 돌려줍니다
    if (DEFAULT_LOCALE in map || LOCALES.some((l) => l in map)) {
      return map[locale] ?? map[DEFAULT_LOCALE];
    }
  }
  return value as T;
}

/** pick 의 문자열 전용 축약형 — 없으면 빈 문자열 */
export function ps(value: Localized<string> | undefined, locale: Locale): string {
  return pick(value, locale) ?? '';
}

/**
 * 회사명·주소는 화면 거의 모든 곳(헤더·푸터·SEO·JSON-LD)에 나옵니다.
 * 매번 ps(siteConfig.company, locale) 를 적으면 한 군데씩 빠지므로
 * 전용 헬퍼로 둡니다.
 *
 * ⚠ 법인명 영문 표기는 번역이 아니라 등기 표기입니다.
 *   site.config 에 적힌 값을 그대로 쓰고, 여기서 만들어내지 않습니다.
 */
export function companyName(locale: Locale = DEFAULT_LOCALE): string {
  return ps(siteConfig.company, locale);
}

export function companyAddress(locale: Locale = DEFAULT_LOCALE): string {
  return ps(siteConfig.contact.address, locale);
}
