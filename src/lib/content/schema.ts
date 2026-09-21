import { z } from 'astro/zod';
import siteConfig from '../../../site.config';

/**
 * ============================================================
 *  상품 스키마 (데이터 소스 중립)
 * ============================================================
 *  로컬 마크다운과 CMS가 **같은 스키마**를 공유합니다.
 *  소스를 바꿔도 페이지/컴포넌트는 손대지 않습니다.
 *
 *  유일한 차이는 이미지 필드입니다.
 *   - local  : image() 헬퍼 (빌드 시 최적화)
 *   - sanity : URL + 치수 객체
 *  그래서 이미지 필드만 인자로 주입받습니다.
 * ============================================================
 */

const CATEGORY_IDS = siteConfig.categories.map((c) => c.id);

export const categoryField = z.string().refine((v) => CATEGORY_IDS.includes(v), {
  message: `category는 site.config.ts에 정의된 값이어야 합니다: ${CATEGORY_IDS.join(', ')}`,
});

export function createProductSchema<T extends z.ZodType>(imageField: T) {
  return z.object({
    title: z.string().min(1),
    summary: z.string().min(1).max(120),
    category: categoryField,

    thumbnail: imageField,
    gallery: z.array(imageField).default([]),

    specs: z.record(z.string(), z.string()).default({}),
    tags: z.array(z.string()).default([]),

    price: z.number().int().nonnegative().optional(),
    priceNote: z.string().default('가격 문의'),

    /**
     * 정가. price 보다 클 때만 취소선과 할인율이 함께 표시됩니다.
     *
     * ⚠ 표시광고 관련 —
     *   정가는 "실제로 그 가격에 판매한 적이 있는 값"이어야 합니다.
     *   할인율을 크게 보이려고 임의로 올려 적으면 부당 표시에 해당할 수 있습니다.
     *   고객사에 이 점을 반드시 전달하세요.
     */
    listPrice: z.number().int().nonnegative().optional(),

    /** 카드 좌상단 배지 문구 (BEST, NEW, 한정수량 등). 6자 이내 권장 */
    badge: z.string().max(12).optional(),

    /**
     * 외부 구매처 링크 (상세 페이지 하단에 버튼으로 노출).
     *
     * 이 템플릿에는 장바구니·결제가 없습니다. 고객사가 이미 네이버 스마트스토어나
     * 오픈마켓에서 팔고 있다면, 거기로 보내는 것이 가장 현실적인 구매 동선입니다.
     *
     * https 만 허용합니다 —
     *  - 값이 CMS에서 올 수 있고(신뢰 경계 밖), javascript:/data: 가 들어오면
     *    링크를 누르는 순간 스크립트가 실행됩니다.
     *  - //evil.com 같은 프로토콜 상대 주소도 URL 파싱에서 걸러집니다.
     *  - http 를 막는 이유는, 결제 페이지로 보내는 링크가 평문이면 안 되기 때문입니다.
     *
     * 형식이 틀리면 빌드가 실패합니다. 조용히 무시하면 링크가 사라진 걸
     * 아무도 모른 채 배포되기 때문에 일부러 실패시킵니다.
     */
    externalLinks: z
      .array(
        z.object({
          label: z.string().min(1).max(30),
          url: z.string().refine(
            (v) => {
              try {
                return new URL(v).protocol === 'https:';
              } catch {
                return false;
              }
            },
            { message: 'externalLinks.url 은 https:// 로 시작하는 절대 주소여야 합니다' }
          ),
        })
      )
      .max(6)
      .default([]),

    featured: z.boolean().default(false),
    order: z.number().default(999),
    status: z.enum(['active', 'discontinued', 'coming-soon']).default('active'),
    draft: z.boolean().default(false),

    seoDescription: z.string().optional(),
  });
}

/**
 * 홈 슬라이드 배너.
 * 이미지 위에 문구를 얹으므로 대비를 확보할 수단(overlay, textColor)을 둡니다.
 */
export function createSlideSchema<T extends z.ZodType>(imageField: T) {
  return z.object({
    /** 작은 윗줄 문구 (영문 제품명 등). 없으면 생략 */
    eyebrow: z.string().optional(),
    /** 큰 제목 — 줄바꿈은 그대로 반영됩니다 */
    title: z.string().min(1),
    /** 보조 설명 */
    subtitle: z.string().optional(),
    image: imageField,
    /** 배너를 누르면 이동할 주소 */
    href: z.string().default('/products/'),
    /** 버튼 문구. 비우면 버튼을 만들지 않습니다 */
    cta: z.string().optional(),
    /** 문구를 놓을 위치 */
    align: z.enum(['left', 'center', 'right']).default('right'),
    /** 배경 사진이 밝으면 dark, 어두우면 light */
    textColor: z.enum(['dark', 'light']).default('dark'),
    /**
     * 사진 위에 깔 어둡기. 글자가 안 읽힐 때만 올리세요.
     *
     * 숫자가 아니라 단계로 둔 이유 —
     * 임의의 숫자를 받으면 style 속성으로 넣어야 하는데,
     * CSP는 해시로 style 속성까지 허용하지 못해 브라우저가 막아버립니다.
     * (막히면 조용히 투명해져서 흰 글자가 안 보이게 됩니다.)
     * 단계로 고정하면 CSS 클래스로 처리되어 그런 일이 없습니다.
     */
    overlay: z.enum(['none', 'light', 'medium', 'strong']).default('none'),
    order: z.number().default(999),
    draft: z.boolean().default(false),
  });
}

export const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  showHero: z.boolean().default(true),
  /**
   * CMS에서 작성 중인 페이지를 감추기 위한 값입니다.
   * 마크다운 모드에서는 쓸 일이 거의 없습니다.
   *
   * ⚠ 개인정보처리방침은 draft 로 두면 안 됩니다 —
   *   문의 폼을 운영하는 동안에는 항상 접근 가능해야 합니다.
   */
  draft: z.boolean().default(false),
});
