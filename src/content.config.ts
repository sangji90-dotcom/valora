import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { createProductSchema, createSlideSchema, pageSchema } from './lib/content/schema';
import { localImageSchema, remoteImageSchema } from './lib/content/image';
import { getContentSource, getSanityEnv } from './lib/content/source';
import {
  sanityProductsLoader,
  sanityPagesLoader,
  sanitySlidesLoader,
} from './lib/sanity/loader';

/**
 * ============================================================
 *  콘텐츠 정의
 * ============================================================
 *  CONTENT_SOURCE 환경변수로 데이터 소스를 고릅니다.
 *
 *    local  (기본) — src/content/**\/*.md
 *    sanity        — Sanity CMS (고객사가 직접 편집)
 *
 *  **바뀌는 건 loader와 이미지 필드뿐입니다.**
 *  나머지 스키마, 페이지, 컴포넌트는 두 경우 모두 동일하게 동작합니다.
 *
 *  세 컬렉션이 한꺼번에 갈립니다. 상품만 CMS로 옮기고 회사소개는
 *  마크다운에 두면 "주소 바뀌었어요" 연락이 계속 오기 때문입니다.
 *
 *  스키마 위반(필드 누락·오타)은 어느 소스에서든 빌드를 실패시킵니다.
 *  Cloudflare는 빌드 실패 시 이전 버전을 유지하므로,
 *  고객사가 CMS에서 실수해도 사이트가 깨진 채로 배포되지 않습니다.
 * ============================================================
 */

const source = getContentSource();

/** sanity 모드에서만 환경변수를 읽습니다 (local 모드에서 불필요한 검증을 피함) */
const sanityEnv = source === 'sanity' ? getSanityEnv() : null;

const products =
  sanityEnv
    ? defineCollection({
        loader: sanityProductsLoader({ env: sanityEnv }),
        schema: createProductSchema(remoteImageSchema),
      })
    : defineCollection({
        loader: glob({ base: './src/content/products', pattern: '**/*.md' }),
        schema: ({ image }) => createProductSchema(localImageSchema(image)),
      });

/**
 * 회사소개·개인정보처리방침 등 단일 페이지 본문.
 *
 * slug 가 곧 페이지 주소입니다 (about, privacy). 라우트가 미리 정해져
 * 있으므로, CMS에서 새 slug 를 만들어도 화면에는 나오지 않습니다.
 */
const pages = sanityEnv
  ? defineCollection({
      loader: sanityPagesLoader({ env: sanityEnv }),
      schema: pageSchema,
    })
  : defineCollection({
      loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
      schema: pageSchema,
    });

/**
 * 홈 상단 슬라이드 배너.
 * hero 프리셋이 'carousel' 일 때만 쓰입니다.
 *
 * 설정 파일이 아니라 콘텐츠로 둔 이유:
 *  - 이미지가 최적화를 거쳐야 하고
 *  - 배너는 가장 자주 바뀌는 데다 고객사가 직접 고치는 자리입니다
 */
const slides = sanityEnv
  ? defineCollection({
      loader: sanitySlidesLoader({ env: sanityEnv }),
      schema: createSlideSchema(remoteImageSchema),
    })
  : defineCollection({
      loader: glob({ base: './src/content/slides', pattern: '**/*.md' }),
      schema: ({ image }) => createSlideSchema(localImageSchema(image)),
    });

export const collections = { products, pages, slides };
