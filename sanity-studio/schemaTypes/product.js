/**
 * ============================================================
 *  Sanity Studio 스키마 — 상품
 * ============================================================
 *  이 파일은 **우리 사이트가 아니라 고객사의 Sanity Studio**에 넣습니다.
 *  (Studio 프로젝트의 schemaTypes/ 아래로 복사)
 *
 *  필드 이름과 검증 규칙이 우리 zod 스키마
 *  (src/lib/content/schema.ts)와 1:1로 맞춰져 있습니다.
 *  한쪽을 바꾸면 **반드시 다른 쪽도 바꾸세요.**
 *  어긋나면 빌드가 실패합니다 — 조용히 깨지지는 않습니다.
 *
 *  제목 끝의 * 는 필수 항목입니다. Studio 는 필수 여부를 미리 보여주지 않고
 *  Publish 를 눌러야 빨간 표시가 뜨기 때문에, 라벨에 직접 표시합니다.
 *
 *  카테고리 목록은 site.config.ts 에서 자동 생성합니다.
 *  손으로 베껴 적으면 반드시 어긋나기 때문입니다.
 *    npm run studio:sync
 * ============================================================
 */

import { CATEGORY_OPTIONS } from './categories.generated.js';

export const product = {
  name: 'product',
  title: '제품',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: '제품명 *',
      type: 'string',
      validation: (Rule) => Rule.required().min(1).error('필수 항목입니다. 제품명을 입력하세요.'),
    },
    {
      name: 'slug',
      title: 'URL 주소 *',
      type: 'slug',
      description:
        '필수. 영문 소문자와 하이픈만 사용하세요. 예: pro-shield-900 — ' +
        '제목이 한글이면 Generate 가 빈 값을 만듭니다. 직접 영문으로 적으세요.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().error('필수 항목입니다. 영문 소문자와 하이픈으로 직접 입력하세요.'),
    },
    {
      name: 'summary',
      title: '한 줄 설명 *',
      type: 'string',
      description: '필수. 목록 카드에 표시됩니다. 120자 이내.',
      validation: (Rule) =>
        Rule.required()
          .error('필수 항목입니다. 한 줄 설명을 입력하세요.')
          .max(120)
          .error('120자를 넘을 수 없습니다.'),
    },
    {
      name: 'category',
      title: '카테고리 *',
      type: 'string',
      options: {
        // site.config.ts 에서 생성된 목록 (npm run studio:sync)
        list: CATEGORY_OPTIONS,
        layout: 'radio',
      },
      validation: (Rule) => Rule.required().error('필수 항목입니다. 카테고리를 고르세요.'),
    },
    {
      name: 'thumbnail',
      title: '대표 이미지 *',
      type: 'image',
      description:
        '필수. 가로 1200px 이상, 4:3 비율 권장. ' +
        '사진이 없으면 목록 카드가 빈 상자로 남아 화면이 망가집니다.',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          title: '대체 텍스트',
          type: 'string',
          description:
            '사진이 안 보일 때 대신 읽히는 설명입니다. 시각장애인용 화면낭독기와 ' +
            '검색엔진이 씁니다. 비우면 제품명이 대신 쓰입니다.',
        },
      ],
      validation: (Rule) => Rule.required().error('필수 항목입니다. 대표 이미지를 올리세요.'),
    },
    {
      name: 'gallery',
      title: '추가 이미지',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
        {
          name: 'alt',
          title: '대체 텍스트',
          type: 'string',
          description:
            '사진이 안 보일 때 대신 읽히는 설명입니다. 시각장애인용 화면낭독기와 ' +
            '검색엔진이 씁니다. 비우면 제품명이 대신 쓰입니다.',
        },
      ],
        },
      ],
    },
    {
      name: 'specs',
      title: '제품 사양',
      type: 'array',
      description: '항목명과 내용을 한 쌍씩 입력합니다. 예: 무게 / 2.4 kg',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'key',
              title: '항목명',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'value',
              title: '내용',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
          ],
          preview: {
            select: { title: 'key', subtitle: 'value' },
          },
        },
      ],
    },
    {
      name: 'tags',
      title: '검색 키워드',
      type: 'array',
      description: '모델명, 별칭 등. 사이트 검색에서 함께 매칭됩니다.',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    },
    {
      name: 'price',
      title: '가격 (원)',
      type: 'number',
      description: '비워두면 아래 "가격 안내 문구"가 대신 표시됩니다.',
      validation: (Rule) => Rule.min(0).integer(),
    },
    {
      name: 'priceNote',
      title: '가격 안내 문구',
      type: 'string',
      initialValue: '가격 문의',
    },
    {
      name: 'listPrice',
      title: '정가 (원)',
      type: 'number',
      description:
        '판매가보다 클 때만 취소선과 할인율이 표시됩니다. ' +
        '실제로 그 가격에 판매한 적이 있는 값만 넣으세요 (표시광고 문제가 됩니다).',
      validation: (Rule) => Rule.min(0).integer(),
    },
    {
      name: 'badge',
      title: '배지 문구',
      type: 'string',
      description: 'BEST, NEW, 한정수량 등. 6자 이내를 권장합니다.',
      validation: (Rule) => Rule.max(12),
    },
    {
      name: 'externalLinks',
      title: '외부 구매처',
      type: 'array',
      description:
        '스마트스토어·오픈마켓 등 실제 판매 페이지. 상세 페이지 하단에 버튼으로 나옵니다.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'label',
              title: '표시 이름',
              type: 'string',
              validation: (Rule) => Rule.required().max(30),
            },
            {
              name: 'url',
              title: '주소',
              type: 'url',
              description: 'https 주소만 넣을 수 있습니다.',
              validation: (Rule) =>
                Rule.required().uri({ scheme: ['https'] }),
            },
          ],
          preview: { select: { title: 'label', subtitle: 'url' } },
        },
      ],
      validation: (Rule) => Rule.max(6),
    },
    {
      name: 'featured',
      title: '홈 대표 제품으로 노출',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'order',
      title: '정렬 순서',
      type: 'number',
      description: '숫자가 작을수록 목록 앞에 나옵니다.',
      initialValue: 999,
    },
    {
      name: 'status',
      title: '판매 상태',
      type: 'string',
      options: {
        list: [
          { title: '판매중', value: 'active' },
          { title: '단종', value: 'discontinued' },
          { title: '출시 예정', value: 'coming-soon' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
    },
    {
      name: 'draft',
      title: '임시 저장 (사이트에 노출 안 함)',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'seoDescription',
      title: '검색엔진용 설명',
      type: 'text',
      rows: 2,
      description: '비워두면 한 줄 설명이 사용됩니다.',
    },
    {
      name: 'body',
      title: '상세 내용',
      type: 'array',
      // 사이트에서 지원하는 블록만 허용합니다.
      // 여기에 없는 타입을 추가하면 사이트에서는 무시됩니다.
      of: [
        {
          type: 'block',
          styles: [
            { title: '본문', value: 'normal' },
            { title: '제목 2', value: 'h2' },
            { title: '제목 3', value: 'h3' },
            { title: '제목 4', value: 'h4' },
            { title: '인용', value: 'blockquote' },
          ],
          lists: [
            { title: '글머리 기호', value: 'bullet' },
            { title: '번호', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: '굵게', value: 'strong' },
              { title: '기울임', value: 'em' },
              { title: '밑줄', value: 'underline' },
              { title: '코드', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                title: '링크',
                type: 'object',
                fields: [
                  {
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (Rule) =>
                      Rule.uri({ scheme: ['http', 'https', 'mailto', 'tel'] }),
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],

  orderings: [
    {
      title: '정렬 순서',
      name: 'orderAsc',
      by: [
        { field: 'order', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'summary',
      media: 'thumbnail',
    },
  },
};

export default product;
