import type { SanityEnv } from '../content/source';

/**
 * ============================================================
 *  Sanity 조회 클라이언트
 * ============================================================
 *  @sanity/client 패키지를 쓰지 않고 HTTP API를 직접 호출합니다.
 *  - 빌드 시점에 GROQ 한 번 던지는 게 전부라 SDK가 필요 없음
 *  - 의존성이 하나 줄면 납품 후 취약점 패치 대상도 하나 줄어듦
 *
 *  fetcher를 주입할 수 있게 만들어서, 실제 Sanity 프로젝트 없이도
 *  loader 전체 경로를 테스트할 수 있습니다. (scripts/test-sanity-loader.mjs)
 * ============================================================
 */

export type Fetcher = typeof fetch;

export interface SanityQueryResult<T> {
  result: T;
  ms?: number;
}

export class SanityError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'SanityError';
  }
}

export function buildQueryUrl(env: SanityEnv, query: string): string {
  let base: string;

  if (env.apiHost) {
    // 테스트용 mock 서버. 평문 HTTP는 로컬호스트에만 허용합니다.
    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.apiHost);
    if (!isLocal) {
      throw new SanityError(
        `SANITY_API_HOST는 로컬 테스트 전용입니다. 운영 빌드에서는 설정하지 마세요: ${env.apiHost}`
      );
    }
    base = `http://${env.apiHost}`;
  } else {
    // 공개 dataset은 CDN(apicdn)을 쓰면 빌드가 빨라집니다.
    // 토큰이 필요한 비공개 dataset은 CDN을 우회해야 최신 값을 봅니다.
    const host = env.token ? 'api.sanity.io' : 'apicdn.sanity.io';
    base = `https://${env.projectId}.${host}`;
  }

  const url = new URL(`${base}/v${env.apiVersion}/data/query/${env.dataset}`);
  url.searchParams.set('query', query);
  return url.toString();
}

export async function sanityQuery<T>(
  env: SanityEnv,
  query: string,
  fetcher: Fetcher = fetch
): Promise<T> {
  const url = buildQueryUrl(env, query);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (env.token) headers.Authorization = `Bearer ${env.token}`;

  let res: Response;
  try {
    res = await fetcher(url, { headers });
  } catch (cause) {
    // 네트워크 실패 시 빌드를 중단시킵니다.
    // 빈 사이트가 배포되는 것보다 이전 버전이 유지되는 편이 안전합니다.
    throw new SanityError(
      `Sanity 요청에 실패했습니다 (네트워크): ${(cause as Error).message}`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new SanityError(
      `Sanity 응답 오류 ${res.status}: ${body.slice(0, 300)}`,
      res.status
    );
  }

  const json = (await res.json()) as SanityQueryResult<T>;
  return json.result;
}

/**
 * 상품 목록 GROQ.
 *
 * 이미지는 asset의 메타데이터까지 펼쳐서 가져옵니다.
 * width/height를 알아야 레이아웃 시프트(CLS) 없이 렌더할 수 있습니다.
 */
export function productsQuery(includeDrafts: boolean): string {
  // 기본은 draft 문서 제외. Sanity는 초안을 `drafts.` 접두사 id로 저장합니다.
  const filter = includeDrafts
    ? `_type == "product"`
    : `_type == "product" && !(_id in path("drafts.**"))`;

  return `*[${filter}]{
    "id": slug.current,
    title,
    summary,
    "category": category,
    "thumbnail": thumbnail{
      "url": asset->url,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height,
      "lqip": asset->metadata.lqip,
      alt
    },
    "gallery": gallery[]{
      "url": asset->url,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height,
      "lqip": asset->metadata.lqip,
      alt
    },
    "specs": specs[]{key, value},
    tags,
    price,
    priceNote,
    listPrice,
    badge,
    "externalLinks": externalLinks[]{label, url},
    featured,
    order,
    status,
    draft,
    seoDescription,
    body,
    _updatedAt
  } | order(order asc, title asc)`;
}
