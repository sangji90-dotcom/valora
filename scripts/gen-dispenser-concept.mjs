/**
 * 4구 원형 디스펜서 시안 이미지 생성.
 *
 *   node scripts/gen-dispenser-concept.mjs
 *   → src/assets/products/dispenser-4.jpg
 *
 * 왜 사진이 아니라 도면인가 —
 * 아직 실물이 없습니다. 사진처럼 보이게 만들면 없는 제품을 파는 것이 됩니다.
 * 명백한 도면 스타일로 그리고 "시안" 표시를 넣습니다.
 *
 * 형태 —
 *  원판을 4등분해 칸마다 다른 캡슐을 담고, 버튼을 누르면 아래 토출구로
 *  한 알씩 떨어지는 구조입니다. 특정 제품을 참고하지 않은 원본 도면입니다.
 */
import { chromium } from 'playwright';

const W = 1200, H = 900;
const CX = 600, CY = 372, R = 286;

const WEDGES = [
  { label: 'SHAMPOO',     color: '#7fc98a', dark: '#4f9a5d' },
  { label: 'CONDITIONER', color: '#f0a8b4', dark: '#c97686' },
  { label: 'BODY WASH',   color: '#7fbde0', dark: '#4f8fb5' },
  { label: 'HAND WASH',   color: '#f3cf86', dark: '#c8a353' },
];

let seed = 20260922;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const rad = (d) => (d * Math.PI) / 180;
const pt = (a, r) => [CX + r * Math.cos(rad(a)), CY + r * Math.sin(rad(a))];

/** 칸 하나의 부채꼴 경로 */
function wedgePath(a0, a1, rIn, rOut) {
  const [x0, y0] = pt(a0, rIn);
  const [x1, y1] = pt(a0, rOut);
  const [x2, y2] = pt(a1, rOut);
  const [x3, y3] = pt(a1, rIn);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0} L${x1} ${y1} A${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${rIn} ${rIn} 0 ${large} 0 ${x0} ${y0} Z`;
}

const R_IN = 88, R_OUT = 240;
const GAP_DEG = 3;

let wedgesSvg = '';
let grains = '';
let labels = '';

WEDGES.forEach((w, i) => {
  const a0 = -135 + i * 90 + GAP_DEG;
  const a1 = -135 + (i + 1) * 90 - GAP_DEG;

  wedgesSvg += `<path d="${wedgePath(a0, a1, R_IN, R_OUT)}" fill="#f2f5f8" stroke="#cfd6de" stroke-width="2"/>`;

  // 칸 안을 캡슐로 채웁니다
  for (let n = 0; n < 150; n++) {
    const a = a0 + 3 + rnd() * (a1 - a0 - 6);
    const r = R_IN + 10 + Math.sqrt(rnd()) * (R_OUT - R_IN - 22);
    const [x, y] = pt(a, r);
    const rr = 6 + rnd() * 3;
    const fill = rnd() > 0.72 ? w.dark : w.color;
    grains += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${fill}" opacity="${(0.8 + rnd() * 0.2).toFixed(2)}"/>`;
  }

  // 라벨은 칸 바깥 테두리 쪽에, 가로로 둡니다 (읽기 쉬우라고)
  const mid = (a0 + a1) / 2;
  const [lx, ly] = pt(mid, (R_IN + R_OUT) / 2);
  labels += `<g>
    <rect x="${lx - 66}" y="${ly - 15}" width="132" height="30" rx="15" fill="#ffffff" opacity="0.92"/>
    <text x="${lx}" y="${ly + 6}" class="lbl">${w.label}</text>
  </g>`;
});

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f8fa"/><stop offset="1" stop-color="#eceff3"/>
    </linearGradient>
    <linearGradient id="case" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2f353d"/><stop offset="1" stop-color="#171b21"/>
    </linearGradient>
    <radialGradient id="glass" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#94a0ad" stop-opacity="0.16"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- 그림자 -->
  <ellipse cx="${CX}" cy="${CY + 18}" rx="${R}" ry="${R}" fill="#0b0e12" opacity="0.10"/>

  <!-- 바깥 케이스 -->
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#case)"/>
  <circle cx="${CX}" cy="${CY}" r="${R - 18}" fill="#0f1319"/>

  <!-- 칸 -->
  ${wedgesSvg}
  ${grains}

  <!-- 칸 구분선 -->
  <g stroke="#0f1319" stroke-width="6" stroke-linecap="round">
    ${[0, 1, 2, 3].map((i) => {
      const a = -135 + i * 90;
      const [x1, y1] = pt(a, R_IN - 4);
      const [x2, y2] = pt(a, R_OUT + 4);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }).join('')}
  </g>

  ${labels}

  <!-- 투명 커버 -->
  <circle cx="${CX}" cy="${CY}" r="${R - 18}" fill="url(#glass)"/>

  <!-- 가운데 허브 + 회전 표시 -->
  <circle cx="${CX}" cy="${CY}" r="${R_IN - 6}" fill="#1b2027" stroke="#39414b" stroke-width="3"/>
  <g stroke="#7c8794" stroke-width="5" fill="none" stroke-linecap="round">
    <path d="M${CX - 34} ${CY - 6} A34 34 0 1 1 ${CX - 20} ${CY + 24}"/>
    <path d="M${CX - 44} ${CY - 16} L${CX - 34} ${CY - 6} L${CX - 24} ${CY - 16}"/>
  </g>
  <text x="${CX}" y="${CY + 58}" class="hub">1회 1캡슐</text>

  <!-- 받침대 — 토출구와 버튼이 한 덩어리로 보이게 -->
  <g>
    <rect x="${CX - 190}" y="${CY + R - 24}" width="380" height="104" rx="26" fill="url(#case)"/>
    <rect x="${CX - 190}" y="${CY + R - 24}" width="380" height="104" rx="26" fill="none" stroke="#39414b" stroke-width="2"/>

    <!-- 토출구 -->
    <rect x="${CX - 150}" y="${CY + R + 20}" width="112" height="18" rx="9" fill="#0b0e12"/>
    <text x="${CX - 94}" y="${CY + R + 8}" class="small">토출구</text>

    <!-- 버튼 -->
    <circle cx="${CX + 90}" cy="${CY + R + 28}" r="40" fill="#e7ebf0" stroke="#aab3bd" stroke-width="3"/>
    <circle cx="${CX + 90}" cy="${CY + R + 25}" r="31" fill="#ffffff" stroke="#d7dde4" stroke-width="2"/>
    <text x="${CX + 90}" y="${CY + R + 31}" class="btn">PUSH</text>
  </g>

  <!-- 떨어지는 캡슐 (모션 표시) -->
  <g>
    <path d="M${CX - 94} ${CY + R + 86} v10 M${CX - 94} ${CY + R + 112} v10 M${CX - 94} ${CY + R + 138} v8"
          stroke="#9aa3ae" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 6"/>
    <circle cx="${CX - 94}" cy="${CY + R + 100}" r="11" fill="#7fbde0" opacity="0.32"/>
    <circle cx="${CX - 94}" cy="${CY + R + 126}" r="13" fill="#7fbde0" opacity="0.62"/>
    <circle cx="${CX - 94}" cy="${CY + R + 154}" r="15" fill="#7fbde0"/>
    <text x="${CX + 60}" y="${CY + R + 160}" class="small">버튼을 누르면 한 알씩</text>
  </g>

  <!-- 4구 표시 -->
  <text x="${CX}" y="${CY - R - 34}" class="dim">4구 · 칸마다 다른 캡슐</text>

  <!-- 시안 표시 -->
  <g transform="translate(56, 52)">
    <rect x="0" y="0" width="148" height="44" rx="22" fill="#111827" opacity="0.88"/>
    <text x="74" y="29" class="chip">시안 CONCEPT</text>
  </g>

  <style>
    text { font-family: 'Noto Sans CJK KR', 'Noto Sans KR', sans-serif; text-anchor: middle; }
    .lbl    { fill: #2b3138; font-size: 15px; font-weight: 700; letter-spacing: 0.6px; }
    .hub    { fill: #c3cad3; font-size: 17px; font-weight: 600; }
    .dim    { fill: #6b7480; font-size: 21px; font-weight: 700; }
    .btn    { fill: #2b3138; font-size: 15px; font-weight: 800; letter-spacing: 1px; }
    .small  { fill: #6b7480; font-size: 15px; font-weight: 600; }
        .chip   { fill: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 1px; }
  </style>
</svg>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await page.setContent(`<body style="margin:0">${svg}</body>`);
await page.waitForTimeout(300);
await page.screenshot({ path: 'src/assets/products/dispenser-4.png' });
await browser.close();
console.log('생성 완료: src/assets/products/dispenser-4.png');
console.log('JPG 로 바꾸려면:');
console.log("  python3 -c \"from PIL import Image; Image.open('src/assets/products/dispenser-4.png').resize((1200,900), Image.LANCZOS).convert('RGB').save('src/assets/products/dispenser-4.jpg', quality=88)\"");
