/**
 * OG 이미지 생성.
 * 실제 납품 시에는 고객사 디자이너가 만든 이미지로 교체합니다.
 */
import sharp from 'sharp';

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ff6b00"/><stop offset="100%" stop-color="#b84a00"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="80" y="196" width="64" height="8" fill="rgba(255,255,255,0.9)"/>
  <text x="80" y="310" font-family="Noto Sans CJK KR, sans-serif" font-size="82"
        font-weight="700" fill="#fff" letter-spacing="8">VALORA</text>
  <text x="80" y="382" font-family="Noto Sans CJK KR, sans-serif" font-size="34"
        fill="rgba(255,255,255,0.92)">플라스틱 없는 정량 위생</text>
  <text x="80" y="438" font-family="Noto Sans CJK KR, sans-serif" font-size="26"
        fill="rgba(255,255,255,0.75)">수용성 캡슐 세정제 · 전용 디스펜서</text>
</svg>`;

await sharp(Buffer.from(og))
  .png()
  .toFile(new URL('../public/og-default.png', import.meta.url).pathname);

console.log('OG 이미지를 생성했습니다.');
