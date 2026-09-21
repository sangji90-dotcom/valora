/**
 * ============================================================
 *  Sanity Studio 스키마 — 표
 * ============================================================
 *  Portable Text 기본에는 표가 없어서 직접 정의했습니다.
 *  회사소개의 절차 안내, 제품 사양 비교처럼 표가 필요한 자리가 흔합니다.
 *
 *  셀은 **평문만** 받습니다. 셀 안에서 굵게·링크를 허용하면 사이트에서
 *  HTML로 해석해야 하고, 그 순간 이스케이프 구멍이 생깁니다.
 * ============================================================
 */

export const table = {
  name: 'table',
  title: '표',
  type: 'object',
  fields: [
    {
      name: 'hasHeader',
      title: '첫 줄을 제목 줄로',
      type: 'boolean',
      description: '켜면 첫 줄이 표의 머리글이 됩니다.',
      initialValue: true,
    },
    {
      name: 'rows',
      title: '줄',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'row',
          title: '줄',
          fields: [
            {
              name: 'cells',
              title: '칸',
              type: 'array',
              of: [{ type: 'string' }],
              description: '왼쪽부터 순서대로. 모든 줄의 칸 수를 같게 맞추세요.',
            },
          ],
          preview: {
            select: { cells: 'cells' },
            prepare({ cells }) {
              return { title: (cells ?? []).join(' | ') || '(빈 줄)' };
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    },
  ],

  preview: {
    select: { rows: 'rows' },
    prepare({ rows }) {
      const count = (rows ?? []).length;
      const first = (rows?.[0]?.cells ?? []).join(' | ');
      return { title: first || '표', subtitle: `${count}줄` };
    },
  },
};
