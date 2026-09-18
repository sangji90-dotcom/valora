import { getCollection, type CollectionEntry } from 'astro:content';
import siteConfig from '../../site.config';

export type Product = CollectionEntry<'products'>;

/**
 * 상품 조회는 항상 이 함수를 거칩니다.
 * draft 제외 / 정렬 규칙이 한 곳에만 존재하도록 강제하기 위함입니다.
 */
export async function getPublishedProducts(): Promise<Product[]> {
  const all = await getCollection('products', ({ data }) => !data.draft);

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

export function getCategoryLabel(categoryId: string) {
  return getCategory(categoryId)?.label ?? categoryId;
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

export function formatPrice(price: number | undefined, fallback: string) {
  if (price === undefined) return fallback;
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
export function getPriceView(data: Product['data']): PriceView {
  const { price, listPrice, priceNote } = data;
  const text = formatPrice(price, priceNote);

  if (price === undefined || listPrice === undefined || listPrice <= price) {
    return { text };
  }

  const discount = Math.round((1 - price / listPrice) * 100);
  if (discount < 1) return { text };

  return { text, listText: formatPrice(listPrice, priceNote), discount };
}

export const STATUS_LABEL: Record<Product['data']['status'], string | null> = {
  active: null,
  discontinued: '단종',
  'coming-soon': '출시 예정',
};
