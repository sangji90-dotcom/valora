import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes/index.js';

/**
 * ============================================================
 *  Sanity Studio 설정 — 고객사 관리화면
 * ============================================================
 *  이 폴더는 **사이트와 별개의 프로젝트**입니다.
 *  사이트는 여기서 저장된 내용을 빌드 시점에 읽어갈 뿐입니다.
 *
 *  아래 projectId 는 고객사 Sanity 프로젝트 ID로 바꿔야 합니다.
 *  (Sanity 대시보드 → 프로젝트 → Settings 에서 확인)
 * ============================================================
 */

export default defineConfig({
  name: 'default',
  title: '사이트 관리',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'PROJECT_ID를_넣으세요',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    /**
     * 좌측 메뉴 구성.
     * 기본 목록을 그대로 쓰면 "제품 / 페이지 / 배너"가 알파벳 순으로 섞입니다.
     * 고객사가 가장 자주 쓰는 순서로 고정합니다.
     */
    structureTool({
      structure: (S) =>
        S.list()
          .title('사이트 관리')
          .items([
            S.documentTypeListItem('product').title('제품'),
            S.divider(),
            S.documentTypeListItem('slide').title('홈 배너'),
            S.documentTypeListItem('page').title('페이지 (회사소개 등)'),
          ]),
    }),

    /**
     * Vision — GROQ 쿼리를 직접 실행해 보는 개발자 도구입니다.
     * 고객사 담당자에게는 필요 없고, 있으면 오히려 헷갈립니다.
     * 문제를 들여다봐야 할 때만 아래 주석을 푸세요.
     */
    // visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
});
