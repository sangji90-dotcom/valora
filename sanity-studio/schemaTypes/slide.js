/**
 * ============================================================
 *  Sanity Studio 스키마 — 홈 배너
 * ============================================================
 *  홈 최상단 슬라이드 배너입니다.
 *  사이트의 hero 설정이 'carousel' 일 때만 화면에 나옵니다.
 *
 *  필드는 src/lib/content/schema.ts 의 createSlideSchema 와 1:1입니다.
 * ============================================================
 */

export const slide = {
  name: 'slide',
  title: '홈 배너',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: '큰 제목',
      type: 'text',
      rows: 2,
      description: '줄바꿈이 화면에 그대로 반영됩니다. 두 줄까지가 읽기 좋습니다.',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: '구분용 이름',
      type: 'slug',
      description: '화면에는 안 나옵니다. 목록에서 배너를 구분하기 위한 값입니다.',
      options: { source: 'title', maxLength: 60 },
    },
    {
      name: 'eyebrow',
      title: '윗줄 작은 문구',
      type: 'string',
      description: 'NEW, NOTICE 처럼 짧게. 비우면 표시하지 않습니다.',
    },
    {
      name: 'subtitle',
      title: '보조 설명',
      type: 'string',
      description: '제목 아래 한 줄. 비우면 표시하지 않습니다.',
    },
    {
      name: 'image',
      title: '배경 이미지',
      type: 'image',
      description:
        '가로로 아주 넓게 잘립니다. 가로 1920px 이상을 권장하고, ' +
        '중요한 내용은 사진 가운데에 두세요. 좌우 끝은 화면에 따라 잘립니다.',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'href',
      title: '눌렀을 때 이동할 주소',
      type: 'string',
      description: '사이트 안의 주소를 넣으세요. 예: /products/ 또는 /about/',
      initialValue: '/products/',
    },
    {
      name: 'cta',
      title: '버튼 문구',
      type: 'string',
      description: '비우면 버튼을 만들지 않습니다. 예: 제품 보기',
    },
    {
      name: 'align',
      title: '문구 위치',
      type: 'string',
      options: {
        list: [
          { title: '왼쪽', value: 'left' },
          { title: '가운데', value: 'center' },
          { title: '오른쪽', value: 'right' },
        ],
        layout: 'radio',
      },
      description: '사진에서 비어 있는 쪽에 문구를 두세요.',
      initialValue: 'right',
    },
    {
      name: 'textColor',
      title: '글자 색',
      type: 'string',
      options: {
        list: [
          { title: '어두운 글자 (밝은 사진)', value: 'dark' },
          { title: '밝은 글자 (어두운 사진)', value: 'light' },
        ],
        layout: 'radio',
      },
      initialValue: 'dark',
    },
    {
      name: 'overlay',
      title: '사진 어둡게',
      type: 'string',
      options: {
        list: [
          { title: '없음', value: 'none' },
          { title: '약하게', value: 'light' },
          { title: '보통', value: 'medium' },
          { title: '강하게', value: 'strong' },
        ],
        layout: 'radio',
      },
      description: '글자가 사진에 묻혀 안 읽힐 때만 올리세요.',
      initialValue: 'none',
    },
    {
      name: 'order',
      title: '순서',
      type: 'number',
      description: '숫자가 작을수록 먼저 나옵니다.',
      initialValue: 1,
    },
    {
      name: 'draft',
      title: '숨기기',
      type: 'boolean',
      description: '켜면 화면에 나오지 않습니다. 지우지 않고 잠시 내릴 때 쓰세요.',
      initialValue: false,
    },
  ],

  orderings: [
    {
      title: '순서',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],

  preview: {
    select: { title: 'title', media: 'image', order: 'order', draft: 'draft' },
    prepare({ title, media, order, draft }) {
      const clean = (title ?? '').replace(/\n/g, ' ');
      return {
        title: draft ? `[숨김] ${clean}` : clean,
        subtitle: `순서 ${order ?? '-'}`,
        media,
      };
    },
  },
};
