/**
 * ============================================================
 *  Sanity Studio 스키마 — 절감량 계산기
 * ============================================================
 *  "1만 개 도입 시 플라스틱 80kg 절감" 같은 표를,
 *  읽는 사람이 자기 수량으로 바로 환산해 볼 수 있게 만듭니다.
 *
 *  ⚠ 값은 **선형 비례**로만 계산됩니다.
 *    기준 수량의 2배를 넣으면 절감량도 정확히 2배가 됩니다.
 *    규모에 따라 효과가 달라지는 항목이라면 넣지 마세요.
 *
 *  ⚠ 여기 적는 숫자는 회사가 근거를 댈 수 있어야 합니다.
 *    환경 효과를 실제보다 부풀리면 그린워싱 문제가 됩니다.
 * ============================================================
 */

export const calculator = {
  name: 'calculator',
  title: '절감량 계산기',
  type: 'object',
  fields: [
    {
      name: 'title',
      title: '제목',
      type: 'string',
      description: '예: 도입하면 얼마나 줄어드나',
    },
    {
      name: 'baseQuantity',
      title: '기준 수량 *',
      type: 'number',
      description:
        '아래 절감량이 "몇 개 기준"인지 적습니다. 예: 10000 ' +
        '— 아래 값들은 전부 이 수량에 대한 값이어야 합니다.',
      initialValue: 10000,
      validation: (Rule) =>
        Rule.required().positive().error('필수 항목입니다. 1 이상의 숫자를 넣으세요.'),
    },
    {
      name: 'unitLabel',
      title: '수량 단위',
      type: 'string',
      description: '입력칸 옆에 붙는 단위입니다. 예: 개, 캡슐, 객실',
      initialValue: '개',
    },
    {
      name: 'defaultQuantity',
      title: '처음 보여줄 수량',
      type: 'number',
      description: '비우면 기준 수량이 그대로 들어갑니다.',
    },
    {
      name: 'rows',
      title: '절감 항목 *',
      type: 'array',
      description: '기준 수량을 도입했을 때 줄어드는 양을 항목별로 적습니다.',
      of: [
        {
          type: 'object',
          name: 'calcRow',
          fields: [
            {
              name: 'label',
              title: '항목명 *',
              type: 'string',
              description: '예: 플라스틱 폐기물',
              validation: (Rule) => Rule.required().error('필수 항목입니다.'),
            },
            {
              name: 'valueMin',
              title: '절감량 *',
              type: 'number',
              description: '기준 수량에 대한 값. 범위로 보여주려면 아래도 채우세요.',
              validation: (Rule) => Rule.required().error('필수 항목입니다.'),
            },
            {
              name: 'valueMax',
              title: '절감량 (최대)',
              type: 'number',
              description:
                '비우면 하나의 값으로, 채우면 "80~100" 처럼 범위로 표시됩니다.',
            },
            {
              name: 'unit',
              title: '단위',
              type: 'string',
              description: '예: kg, %, 개',
            },
            {
              name: 'note',
              title: '산출 기준',
              type: 'string',
              description:
                '항목명 아래 작게 붙습니다. 예: 플라스틱 1kg당 2.7~3.5kg CO₂e 적용',
            },
          ],
          preview: {
            select: { title: 'label', subtitle: 'valueMin', unit: 'unit' },
            prepare({ title, subtitle, unit }) {
              return { title, subtitle: `${subtitle ?? '-'} ${unit ?? ''}`.trim() };
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1).error('항목을 하나 이상 넣으세요.'),
    },
    {
      name: 'disclaimer',
      title: '안내 문구 *',
      type: 'text',
      rows: 2,
      description:
        '계산 결과 아래에 작게 표시됩니다. 추정치라는 점과 산출 근거를 밝히세요. ' +
        '이 문구 없이 환경 수치를 내보내면 과장 광고로 문제가 될 수 있습니다.',
      initialValue:
        '위 수치는 도입 수량에 비례한 추정치입니다. 실제 산출 근거가 필요하시면 문의 시 요청해 주세요.',
      validation: (Rule) =>
        Rule.required().error('필수 항목입니다. 추정치임을 반드시 밝혀야 합니다.'),
    },
  ],

  preview: {
    select: { title: 'title', rows: 'rows', base: 'baseQuantity' },
    prepare({ title, rows, base }) {
      return {
        title: title || '절감량 계산기',
        subtitle: `${(rows ?? []).length}개 항목 · ${base ?? '-'} 기준`,
      };
    },
  },
};
