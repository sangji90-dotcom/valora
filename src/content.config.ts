import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { createProductSchema, pageSchema, slideSchema } from './lib/content/schema';
import { localImageSchema, remoteImageSchema } from './lib/content/image';
import { getContentSource, getSanityEnv } from './lib/content/source';
import { sanityProductsLoader } from './lib/sanity/loader';

/**
 * ============================================================
 *  콘텐츠 정의
 * ============================================================
 *  CONTENT_SOURCE 환경변수로 데이터 소스를 고릅니다.
 *
 *    local  (기본) — src/content/products/*.md
 *    sanity        — Sanity CMS
 *
 *  **바뀌는 건 loader와 이미지 필드뿐입니다.**
 *  나머지 스키마, 페이지, 컴포넌트는 두 경우 모두 동일하게 동작합니다.
 *
 *  스키마 위반(필드 누락·오타)은 어느 소스에서든 빌드를 실패시킵니다.
 *  Cloudflare Pages는 빌드 실패 시 이전 버전을 유지하므로,
 *  깨진 데이터가 고객사 사이트에 반영되지 않습니다.
 * ============================================================
 */

const source = getContentSource();

const products =
  source === 'sanity'
    ? defineCollection({
        loader: sanityProductsLoader({ env: getSanityEnv() }),
        schema: createProductSchema(remoteImageSchema),
      })
    : defineCollection({
        loader: glob({ base: './src/content/products', pattern: '**/*.md' }),
        schema: ({ image }) => createProductSchema(localImageSchema(image)),
      });

/**
 * 회사소개·개인정보처리방침 등 단일 페이지 본문.
 * 상품만 CMS로 옮기고 이 페이지들은 마크다운으로 두는 경우가 대부분이라
 * 소스 분기 없이 로컬 파일로 고정했습니다.
 */
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: pageSchema,
});

/**
 * 홈 상단 슬라이드 배너.
 * hero 프리셋이 'carousel' 일 때만 쓰입니다.
 *
 * 설정 파일이 아니라 콘텐츠로 둔 이유:
 *  - 이미지가 빌드 시 최적화되어야 하고
 *  - 배너는 자주 바뀌는 데다 고객사가 직접 고치는 경우가 많습니다
 */
const slides = defineCollection({
  loader: glob({ base: './src/content/slides', pattern: '**/*.md' }),
  schema: ({ image }) => slideSchema(image),
});

export const collections = { products, pages, slides };
