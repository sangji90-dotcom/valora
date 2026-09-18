/**
 * 데이터 소스 선택.
 *
 *   CONTENT_SOURCE=local   (기본) — src/content/products/*.md
 *   CONTENT_SOURCE=sanity         — Sanity CMS
 *
 * .env 또는 Cloudflare Pages의 환경변수로 지정합니다.
 * 소스를 바꿔도 페이지·컴포넌트 코드는 수정하지 않습니다.
 */

export type ContentSource = 'local' | 'sanity';

export function getContentSource(): ContentSource {
  const raw = (import.meta.env.CONTENT_SOURCE ?? process.env.CONTENT_SOURCE ?? 'local')
    .toString()
    .trim()
    .toLowerCase();

  if (raw === 'sanity') return 'sanity';
  if (raw === 'local') return 'local';

  throw new Error(
    `CONTENT_SOURCE 값이 올바르지 않습니다: "${raw}" (local 또는 sanity만 허용)`
  );
}

export interface SanityEnv {
  projectId: string;
  dataset: string;
  apiVersion: string;
  /** 비공개 dataset일 때만 필요. 공개 dataset이면 비워 둡니다. */
  token?: string;
  /** true면 초안(draft) 문서도 가져옵니다. 미리보기 빌드 전용. */
  includeDrafts: boolean;
  /**
   * API 호스트 override. 평소에는 비워 둡니다.
   * 로컬 mock 서버로 연동 테스트할 때만 사용합니다 (예: localhost:3999).
   */
  apiHost?: string;
}

export function getSanityEnv(): SanityEnv {
  const env = { ...process.env, ...import.meta.env } as Record<string, string | undefined>;

  const projectId = env.SANITY_PROJECT_ID;
  const dataset = env.SANITY_DATASET ?? 'production';

  if (!projectId) {
    throw new Error(
      'CONTENT_SOURCE=sanity 인데 SANITY_PROJECT_ID 가 없습니다. .env 를 확인하세요.'
    );
  }

  return {
    projectId,
    dataset,
    apiVersion: env.SANITY_API_VERSION ?? '2024-01-01',
    token: env.SANITY_READ_TOKEN,
    includeDrafts: env.SANITY_INCLUDE_DRAFTS === 'true',
    apiHost: env.SANITY_API_HOST,
  };
}
