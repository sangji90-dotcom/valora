import { z } from 'astro/zod';
import type { ImageFunction } from 'astro:content';

/**
 * ============================================================
 *  이미지 추상화
 * ============================================================
 *  로컬 마크다운과 CMS는 이미지를 다른 형태로 들고 있습니다.
 *
 *   local  : src/assets 의 파일 → 빌드 시 ImageMetadata (width/height 알고 있음)
 *   sanity : CDN 위의 URL      → 문자열 + 치수 메타데이터
 *
 *  둘을 ProductImage 한 타입으로 합쳐서,
 *  컴포넌트가 데이터 소스를 몰라도 되도록 만듭니다.
 *  소스를 바꿔도 페이지/컴포넌트 코드는 그대로입니다.
 * ============================================================
 */

/** Sanity 이미지 CDN. 여기 없는 호스트의 이미지는 스키마 단계에서 거부됩니다. */
export const ALLOWED_IMAGE_HOSTS = ['cdn.sanity.io'] as const;

export const remoteImageSchema = z
  .object({
    url: z.url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    /** 저해상도 placeholder (Sanity가 제공하는 base64 blur) */
    lqip: z.string().optional(),
    alt: z.string().optional(),
  })
  .refine(
    (v) => {
      try {
        const host = new URL(v.url).hostname;
        return (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(host);
      } catch {
        return false;
      }
    },
    {
      message: `이미지 URL의 호스트가 허용 목록에 없습니다: ${ALLOWED_IMAGE_HOSTS.join(', ')}`,
    }
  )
  .transform((v) => ({ kind: 'remote' as const, ...v }));

export const localImageSchema = (image: ImageFunction) =>
  image().transform((src) => ({ kind: 'local' as const, src }));

/** 두 소스를 합친 최종 타입 — 컴포넌트는 이것만 봅니다. */
export type ProductImage =
  | { kind: 'local'; src: ImageMetadata }
  | {
      kind: 'remote';
      url: string;
      width: number;
      height: number;
      lqip?: string;
      alt?: string;
    };

/**
 * Sanity 이미지 CDN의 변환 파라미터를 붙입니다.
 * 원본을 그대로 내려받지 않도록 폭과 포맷을 지정합니다.
 */
export function sanityImageUrl(
  url: string,
  opts: { width: number; quality?: number } = { width: 800 }
) {
  const u = new URL(url);
  u.searchParams.set('w', String(opts.width));
  u.searchParams.set('q', String(opts.quality ?? 80));
  u.searchParams.set('auto', 'format');
  u.searchParams.set('fit', 'max');
  return u.toString();
}

/** 원격 이미지의 srcset 생성 */
export function sanitySrcSet(url: string, widths: number[]) {
  return widths.map((w) => `${sanityImageUrl(url, { width: w })} ${w}w`).join(', ');
}
