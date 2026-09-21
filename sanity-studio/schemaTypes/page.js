/**
 * ============================================================
 *  Sanity Studio 스키마 — 페이지
 * ============================================================
 *  회사소개·개인정보처리방침처럼 본문 하나로 이루어진 페이지입니다.
 *
 *  ⚠ URL 주소(slug)는 사이트에 미리 만들어 둔 것만 동작합니다.
 *    현재 동작하는 값: about, privacy
 *    새 값을 만들면 저장은 되지만 화면에는 나오지 않습니다.
 *
 *  필드는 src/lib/content/schema.ts 의 pageSchema 와 1:1입니다.
 * ============================================================
 */

export const page = {
  name: 'page',
  title: '페이지',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: '페이지 제목',
      type: 'string',
      description: '화면 상단과 브라우저 탭에 표시됩니다.',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'URL 주소',
      type: 'slug',
      description:
        '사이트에 만들어 둔 주소만 동작합니다: about(회사소개), privacy(개인정보처리방침). ' +
        '임의로 새 값을 넣으면 저장은 되지만 화면에는 나오지 않습니다.',
      options: {
        list: [
          { title: 'about — 회사소개', value: 'about' },
          { title: 'privacy — 개인정보처리방침', value: 'privacy' },
        ],
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: '한 줄 설명',
      type: 'string',
      description: '제목 아래에 표시되고, 검색결과 요약으로도 쓰입니다.',
    },
    {
      name: 'showHero',
      title: '제목을 화면에 표시',
      type: 'boolean',
      description: '끄면 본문만 나옵니다. 본문 첫 줄에 제목을 직접 쓴 경우에 끄세요.',
      initialValue: true,
    },
    {
      name: 'body',
      title: '본문',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: '본문', value: 'normal' },
            { title: '제목 2', value: 'h2' },
            { title: '제목 3', value: 'h3' },
            { title: '인용', value: 'blockquote' },
          ],
          lists: [
            { title: '글머리 기호', value: 'bullet' },
            { title: '번호 매기기', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: '굵게', value: 'strong' },
              { title: '기울임', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: '링크',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: '주소',
                    validation: (Rule) =>
                      Rule.uri({
                        scheme: ['http', 'https', 'mailto', 'tel'],
                        allowRelative: true,
                      }),
                  },
                ],
              },
            ],
          },
        },
      ],
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'draft',
      title: '작성 중 (검색에서 제외)',
      type: 'boolean',
      description:
        '켜면 검색엔진에서 빠집니다. 주소는 그대로 살아 있습니다. ' +
        '⚠ 개인정보처리방침은 켜지 마세요 — 문의를 받는 동안에는 항상 공개되어 있어야 합니다.',
      initialValue: false,
    },
  ],

  preview: {
    select: { title: 'title', subtitle: 'slug.current', draft: 'draft' },
    prepare({ title, subtitle, draft }) {
      return {
        title: draft ? `[작성 중] ${title}` : title,
        subtitle: `/${subtitle ?? ''}/`,
      };
    },
  },
};
