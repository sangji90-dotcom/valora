import { getCollection, type CollectionEntry } from 'astro:content';
import siteConfig from '../../site.config';
import { ps, DEFAULT_LOCALE, type Locale } from './i18n';

export type Product = CollectionEntry<'products'>;

/**
 * 상품 조회는 항상 이 함수를 거칩니다.
 * draft 제외 / 정렬 규칙이 한 곳에만 존재하도록 강제하기 위함입니다.
 */
/**
 * 영문 본문 파일(<id>.en.md)은 목록에 끼면 안 됩니다.
 * 제품이 두 배로 보이고 주소도 /products/dispenser.en/ 이 생깁니다.
 */
export const EN_SUFFIX = '.en';

export function isTranslationEntry(id: string) {
  return id.endsWith(EN_SUFFIX);
}

export async function getPublishedProducts(): Promise<Product[]> {
  const all = (await getCollection('products', ({ data }) => !data.draft)).filter(
    (p) => !isTranslationEntry(p.id)
  );

  return all.sort((a, b) => {
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return a.data.title.localeCompare(b.data.title, 'ko');
  });
}

export async function getFeaturedProducts(limit = siteConfig.featuredCount) {
  const products = await getPublishedProducts();
  const featured = products.filter((p) => p.data.featured);
  // featured 지정이 없으면 앞에서부터 채워 빈 홈 화면이 나오지 않도록 함
  const pool = featured.length > 0 ? featured : products;
  return pool.slice(0, limit);
}

export async function getProductsByCategory(categoryId: string) {
  const products = await getPublishedProducts();
  return products.filter((p) => p.data.category === categoryId);
}

/** 같은 카테고리의 다른 상품 (상세 페이지 하단 추천용) */
export async function getRelatedProducts(current: Product, limit = 4) {
  const siblings = await getProductsByCategory(current.data.category);
  return siblings.filter((p) => p.id !== current.id).slice(0, limit);
}

export function getCategory(categoryId: string) {
  return siteConfig.categories.find((c) => c.id === categoryId);
}

export function getCategoryLabel(categoryId: string, locale: Locale = DEFAULT_LOCALE) {
  return ps(getCategory(categoryId)?.label, locale) || categoryId;
}

/** 상품이 하나도 없는 카테고리는 메뉴에 노출하지 않기 위한 집계 */
export async function getCategoriesWithCount() {
  const products = await getPublishedProducts();
  return siteConfig.categories
    .map((c) => ({
      ...c,
      count: products.filter((p) => p.data.category === c.id).length,
    }))
    .filter((c) => c.count > 0);
}

/**
 * 가격 안내 문구·배지·사양표의 언어별 값.
 * 영문이 비어 있으면 한국어로 떨어집니다 (빈 칸보다는 낫습니다).
 */
export function productPriceNote(data: Product['data'], locale: Locale = DEFAULT_LOCALE) {
  return (locale === 'en' && data.priceNoteEn) || data.priceNote;
}

export function productBadge(data: Product['data'], locale: Locale = DEFAULT_LOCALE) {
  return (locale === 'en' && data.badgeEn) || data.badge;
}

export function productSpecs(data: Product['data'], locale: Locale = DEFAULT_LOCALE) {
  const en = data.specsEn ?? {};
  if (locale === 'en' && Object.keys(en).length > 0) return Object.entries(en);
  return Object.entries(data.specs);
}

/**
 * 사이트 검색이 대조하는 문자열.
 * 화면에 보이지 않지만 HTML 에 남으므로, 영문 페이지에는 영문만 넣습니다.
 */
export function productKeywords(product: Product, locale: Locale = DEFAULT_LOCALE) {
  const { data } = product;
  const tags = (locale === 'en' && data.tagsEn.length > 0 ? data.tagsEn : data.tags) ?? [];
  return [productTitle(product, locale), productSummary(product, locale), ...tags]
    .join(' ')
    .toLowerCase();
}

export function formatPrice(
  price: number | undefined,
  fallback: string,
  locale: Locale = DEFAULT_LOCALE
) {
  if (price === undefined) return fallback;
  // 통화는 원 그대로 둡니다 — 환율로 환산해 표시하면 그 값이 곧 틀립니다.
  if (locale === 'en') return `KRW ${price.toLocaleString('en-US')}`;
  return `${price.toLocaleString('ko-KR')}원`;
}

export interface PriceView {
  /** 실제 판매가 문구 (가격이 없으면 priceNote) */
  text: string;
  /** 정가 문구. 할인 중일 때만 존재 */
  listText?: string;
  /** 할인율(%). 할인 중일 때만 존재 */
  discount?: number;
}

/**
 * 가격 표시 계산.
 * 할인율은 정가·판매가에서 자동 계산합니다 — 두 값이 서로 어긋나는
 * 상태(예: 정가만 내리고 할인율은 그대로)가 생기지 않도록 하기 위함입니다.
 *
 * 정가가 판매가보다 크지 않거나 반올림 할인율이 0%면 정가를 표시하지 않습니다.
 */
export function getPriceView(data: Product['data'], locale: Locale = DEFAULT_LOCALE): PriceView {
  const { price, listPrice } = data;
  const priceNote = productPriceNote(data, locale);
  const text = formatPrice(price, priceNote, locale);

  if (price === undefined || listPrice === undefined || listPrice <= price) {
    return { text };
  }

  const discount = Math.round((1 - price / listPrice) * 100);
  if (discount < 1) return { text };

  return { text, listText: formatPrice(listPrice, priceNote, locale), discount };
}

const STATUS_LABELS: Record<Locale, Record<Product['data']['status'], string | null>> = {
  ko: { active: null, discontinued: '단종', 'coming-soon': '출시 예정' },
  en: { active: null, discontinued: 'Discontinued', 'coming-soon': 'Coming soon' },
};

/** 판매 상태 표시. 언어를 넘기지 않으면 한국어입니다. */
export function statusLabel(
  status: Product['data']['status'],
  locale: Locale = DEFAULT_LOCALE
): string | null {
  return (STATUS_LABELS[locale] ?? STATUS_LABELS.ko)[status];
}

/** @deprecated statusLabel(status, locale) 을 쓰세요 — 이건 한국어 고정입니다 */
export const STATUS_LABEL = STATUS_LABELS.ko;

/**
 * 제품의 제목·요약을 언어에 맞춰 꺼냅니다.
 * 영문이 비어 있으면 한국어로 떨어집니다 — 빈 칸보다는 낫습니다.
 */
export function productTitle(product: Product, locale: Locale = DEFAULT_LOCALE) {
  return (locale === 'en' && product.data.titleEn) || product.data.title;
}

export function productSummary(product: Product, locale: Locale = DEFAULT_LOCALE) {
  return (locale === 'en' && product.data.summaryEn) || product.data.summary;
}

/**
 * 영문 본문 항목(<id>.en.md)을 찾습니다. 없으면 한국어 본문을 씁니다.
 * Sanity 모드에서는 로더가 bodyEn 을 같은 방식으로 채웁니다.
 */
export async function getProductBodyEntry(product: Product, locale: Locale) {
  if (locale === DEFAULT_LOCALE) return product;
  const all = await getCollection('products');
  return all.find((p) => p.id === `${product.id}${EN_SUFFIX}`) ?? product;
}
