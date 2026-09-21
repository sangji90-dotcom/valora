import type { Loader, LoaderContext } from 'astro/loaders';
import type { SanityEnv } from '../content/source';
import {
  sanityQuery,
  productsQuery,
  pagesQuery,
  slidesQuery,
  type Fetcher,
} from './client';
import { portableTextToHtml } from './portable-text';

/**
 * ============================================================
 *  Sanity → Astro Content Layer loader
 * ============================================================
 *  content.config.ts 에서 glob() 대신 이걸 끼우면
 *  스키마와 페이지 코드를 그대로 둔 채 데이터 소스만 바뀝니다.
 *
 *  fetcher를 주입할 수 있어, 실제 Sanity 없이도 테스트가 가능합니다.
 * ============================================================
 */

interface SanitySpecRow {
  key?: string;
  value?: string;
}

interface SanityLinkRow {
  label?: string;
  url?: string;
}

interface SanityImageRow {
  url?: string;
  width?: number;
  height?: number;
  lqip?: string;
  alt?: string;
}

interface SanityProductDoc {
  id?: string;
  title?: string;
  summary?: string;
  category?: string;
  thumbnail?: SanityImageRow | null;
  gallery?: (SanityImageRow | null)[] | null;
  specs?: SanitySpecRow[] | null;
  tags?: string[] | null;
  price?: number | null;
  priceNote?: string | null;
  listPrice?: number | null;
  badge?: string | null;
  externalLinks?: (SanityLinkRow | null)[] | null;
  featured?: boolean | null;
  order?: number | null;
  status?: string | null;
  draft?: boolean | null;
  seoDescription?: string | null;
  body?: unknown;
  _updatedAt?: string;
}

/** Sanity의 배열형 specs를 스키마가 기대하는 Record로 변환 */
function mapSpecs(rows: SanitySpecRow[] | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row?.key && row.value) out[row.key] = row.value;
  }
  return out;
}

/**
 * 라벨과 주소가 모두 있는 항목만 남깁니다.
 * 주소 형식(https 여부) 검증은 스키마가 합니다 — 여기서 걸러버리면
 * 잘못 입력된 링크가 조용히 사라져 아무도 모르게 됩니다.
 */
function mapLinks(rows: (SanityLinkRow | null)[] | null | undefined) {
  return (rows ?? [])
    .filter((row): row is SanityLinkRow => Boolean(row?.label && row?.url))
    .map((row) => ({ label: row.label as string, url: row.url as string }));
}

function mapImage(row: SanityImageRow | null | undefined) {
  if (!row?.url || !row.width || !row.height) return undefined;
  return {
    url: row.url,
    width: row.width,
    height: row.height,
    ...(row.lqip ? { lqip: row.lqip } : {}),
    ...(row.alt ? { alt: row.alt } : {}),
  };
}

/** null을 걷어내고 스키마의 기본값 처리에 맡깁니다 */
function mapProduct(doc: SanityProductDoc) {
  return {
    title: doc.title,
    summary: doc.summary,
    category: doc.category,
    thumbnail: mapImage(doc.thumbnail),
    gallery: (doc.gallery ?? []).map(mapImage).filter(Boolean),
    specs: mapSpecs(doc.specs),
    tags: doc.tags ?? [],
    ...(typeof doc.price === 'number' ? { price: doc.price } : {}),
    ...(doc.priceNote ? { priceNote: doc.priceNote } : {}),
    ...(typeof doc.listPrice === 'number' ? { listPrice: doc.listPrice } : {}),
    ...(doc.badge ? { badge: doc.badge } : {}),
    externalLinks: mapLinks(doc.externalLinks),
    featured: doc.featured ?? false,
    order: doc.order ?? 999,
    status: doc.status ?? 'active',
    draft: doc.draft ?? false,
    ...(doc.seoDescription ? { seoDescription: doc.seoDescription } : {}),
  };
}

interface SanityPageDoc {
  id?: string;
  title?: string;
  description?: string | null;
  showHero?: boolean | null;
  draft?: boolean | null;
  body?: unknown;
  _updatedAt?: string;
}

interface SanitySlideDoc {
  id?: string;
  eyebrow?: string | null;
  title?: string;
  subtitle?: string | null;
  image?: SanityImageRow | null;
  href?: string | null;
  cta?: string | null;
  align?: string | null;
  textColor?: string | null;
  overlay?: string | null;
  order?: number | null;
  draft?: boolean | null;
  _updatedAt?: string;
}

function mapPage(doc: SanityPageDoc) {
  return {
    title: doc.title,
    ...(doc.description ? { description: doc.description } : {}),
    showHero: doc.showHero ?? true,
    draft: doc.draft ?? false,
  };
}

function mapSlide(doc: SanitySlideDoc) {
  return {
    ...(doc.eyebrow ? { eyebrow: doc.eyebrow } : {}),
    title: doc.title,
    ...(doc.subtitle ? { subtitle: doc.subtitle } : {}),
    image: mapImage(doc.image),
    ...(doc.href ? { href: doc.href } : {}),
    ...(doc.cta ? { cta: doc.cta } : {}),
    ...(doc.align ? { align: doc.align } : {}),
    ...(doc.textColor ? { textColor: doc.textColor } : {}),
    ...(doc.overlay ? { overlay: doc.overlay } : {}),
    order: doc.order ?? 999,
    draft: doc.draft ?? false,
  };
}

export interface SanityProductsLoaderOptions {
  env: SanityEnv;
  /** 테스트용 주입 지점. 기본은 전역 fetch */
  fetcher?: Fetcher;
}

export function sanityProductsLoader(opts: SanityProductsLoaderOptions): Loader {
  const { env, fetcher } = opts;

  return {
    name: 'sanity-products',

    async load({ store, parseData, generateDigest, logger }: LoaderContext) {
      logger.info(`Sanity에서 상품을 가져옵니다 (dataset: ${env.dataset})`);

      const docs = await sanityQuery<SanityProductDoc[]>(
        env,
        productsQuery(env.includeDrafts),
        fetcher
      );

      // 삭제된 문서가 남지 않도록 매 빌드마다 비우고 다시 채웁니다.
      store.clear();

      let skipped = 0;

      for (const doc of docs ?? []) {
        const id = doc.id?.trim();

        if (!id) {
          // slug가 없으면 URL을 만들 수 없습니다. 빌드를 죽이는 대신 건너뛰고 경고합니다.
          logger.warn(
            `slug가 비어 있어 건너뜁니다: "${doc.title ?? '(제목 없음)'}" — Studio에서 slug를 생성하세요.`
          );
          skipped += 1;
          continue;
        }

        // parseData가 스키마를 적용합니다.
        // 필드가 잘못되면 여기서 예외가 나고 빌드가 중단됩니다 — 의도된 동작입니다.
        const data = await parseData({ id, data: mapProduct(doc) });

        store.set({
          id,
          data,
          digest: generateDigest({ ...doc, _updatedAt: doc._updatedAt }),
          rendered: { html: portableTextToHtml(doc.body) },
        });
      }

      const loaded = (docs?.length ?? 0) - skipped;
      logger.info(`상품 ${loaded}개를 불러왔습니다${skipped ? ` (건너뜀 ${skipped}개)` : ''}`);

      if (loaded === 0) {
        logger.warn(
          '불러온 상품이 0개입니다. dataset 이름과 문서 타입(product)을 확인하세요.'
        );
      }
    },
  };
}

/**
 * 페이지 로더 — 회사소개·개인정보처리방침 등.
 *
 * 상품과 달리 **본문이 페이지의 전부**라서, slug 가 비면 어느 페이지인지
 * 알 수 없습니다. 상품처럼 건너뛰고 경고만 남기면 about 페이지가 통째로
 * 사라진 채 배포될 수 있으므로, 여기서는 빌드를 중단시킵니다.
 */
export function sanityPagesLoader(opts: SanityProductsLoaderOptions): Loader {
  const { env, fetcher } = opts;

  return {
    name: 'sanity-pages',

    async load({ store, parseData, generateDigest, logger }: LoaderContext) {
      const docs = await sanityQuery<SanityPageDoc[]>(
        env,
        pagesQuery(env.includeDrafts),
        fetcher
      );

      store.clear();

      for (const doc of docs ?? []) {
        const id = doc.id?.trim();

        if (!id) {
          throw new Error(
            `page 문서의 slug 가 비어 있습니다: "${doc.title ?? '(제목 없음)'}" — ` +
              'Studio에서 slug 를 생성하세요 (about, privacy 등).'
          );
        }

        const data = await parseData({ id, data: mapPage(doc) });

        store.set({
          id,
          data,
          digest: generateDigest({ ...doc, _updatedAt: doc._updatedAt }),
          rendered: { html: portableTextToHtml(doc.body) },
        });
      }

      logger.info(`페이지 ${docs?.length ?? 0}개를 불러왔습니다`);
    },
  };
}

/**
 * 슬라이드 배너 로더.
 *
 * 배너는 없어도 사이트가 동작하므로(히어로가 통째로 안 나올 뿐),
 * 이미지가 빠진 문서는 빌드를 죽이는 대신 건너뛰고 경고만 남깁니다.
 */
export function sanitySlidesLoader(opts: SanityProductsLoaderOptions): Loader {
  const { env, fetcher } = opts;

  return {
    name: 'sanity-slides',

    async load({ store, parseData, generateDigest, logger }: LoaderContext) {
      const docs = await sanityQuery<SanitySlideDoc[]>(
        env,
        slidesQuery(env.includeDrafts),
        fetcher
      );

      store.clear();
      let skipped = 0;

      for (const [index, doc] of (docs ?? []).entries()) {
        // 배너는 주소가 필요 없으므로 slug 가 없으면 순번으로 대체합니다
        const id = doc.id?.trim() || `slide-${index + 1}`;

        if (!mapImage(doc.image)) {
          logger.warn(
            `이미지가 없어 건너뜁니다: 배너 "${doc.title ?? id}" — Studio에서 이미지를 올려주세요.`
          );
          skipped += 1;
          continue;
        }

        const data = await parseData({ id, data: mapSlide(doc) });

        store.set({
          id,
          data,
          digest: generateDigest({ ...doc, _updatedAt: doc._updatedAt }),
        });
      }

      const loaded = (docs?.length ?? 0) - skipped;
      logger.info(`배너 ${loaded}개를 불러왔습니다${skipped ? ` (건너뜀 ${skipped}개)` : ''}`);
    },
  };
}
