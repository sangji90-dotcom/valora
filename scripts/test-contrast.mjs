/**
 * 글자 대비 검사 (WCAG 2.1 AA).
 *
 *   npm run test:contrast
 *
 * 왜 필요한가 —
 * 색은 토큰 하나만 바꿔도 사이트 전체의 대비가 같이 움직입니다.
 * 그런데 대비가 모자라는 건 **디자이너 눈에는 잘 안 보입니다**.
 * "좀 연하네" 와 "법적으로 읽을 수 없음" 사이에 시각적 차이가 거의
 * 없기 때문입니다. 실제로 --color-text-muted 하나가 어긋나 있어서
 * 74곳이 동시에 기준 미달이었던 적이 있습니다.
 *
 * 그래서 사람 눈이 아니라 브라우저가 계산한 값으로 봅니다.
 * 빌드 결과를 실제로 띄우고, 각 글자의 **계산된 색**과 **실제로 뒤에
 * 깔린 배경색**을 재서 명도 대비를 구합니다.
 *
 * 라이트·다크 두 모드를 모두 봅니다. 다크모드는 보통 나중에 붙이므로
 * 여기서만 깨져 있는 경우가 흔합니다.
 *
 * 기준 (WCAG 2.1, 1.4.3 Contrast Minimum)
 *   - 보통 글자        4.5:1
 *   - 큰 글자          3:1   (18.66px 이상 굵게, 또는 24px 이상)
 *   - 흐린 글자(opacity)는 배경과 섞어서 계산합니다
 *
 * ⚠ 배경 이미지·그라데이션 위의 글자는 건너뜁니다. 픽셀마다 배경이
 *   달라서 한 값으로 판정할 수 없습니다 — 그런 자리는 사람이 봐야 합니다.
 *   건너뛴 개수를 끝에 보고합니다.
 */
import { chromium } from 'playwright';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { serveDist } from './lib/serve.mjs';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('dist 가 없습니다. 먼저 npm run build 를 돌리세요.');
  process.exit(1);
}

/** dist 안의 모든 html 경로를 URL 경로로 */
async function pages(dir = DIST, base = '') {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await pages(p, `${base}/${e.name}`)));
    else if (e.name === 'index.html') out.push(`${base}/`);
    else if (e.name.endsWith('.html')) out.push(`${base}/${e.name}`);
  }
  return out;
}

/*
 * 브라우저 안에서 도는 검사기.
 *
 * 핵심은 "실제로 뒤에 깔린 배경"을 찾는 부분입니다. 글자를 담은 요소가
 * 배경색을 갖고 있는 경우는 드물고, 보통은 몇 단계 위 조상이 갖고 있습니다.
 * 투명한 조상을 건너뛰며 올라가되, 반투명한 배경을 만나면 섞습니다.
 */
const AUDIT = () => {
  const LARGE_PX = 24;
  const LARGE_BOLD_PX = 18.66;

  const parse = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map((v) => parseFloat(v));
    return { r, g, b, a };
  };

  /** 위(src)를 아래(dst)에 얹었을 때의 색 */
  const over = (src, dst) => ({
    r: src.r * src.a + dst.r * (1 - src.a),
    g: src.g * src.a + dst.g * (1 - src.a),
    b: src.b * src.a + dst.b * (1 - src.a),
    a: 1,
  });

  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };

  const results = [];
  let skipped = 0;

  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();

  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    const text = node.textContent.trim();
    if (!text) continue;

    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);

    // 화면에 안 나오는 것은 대상이 아닙니다
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    // 시각적으로 숨긴 접근성 텍스트
    if (box.width <= 1 && box.height <= 1) continue;

    const fg0 = parse(cs.color);
    if (!fg0) continue;

    /*
     * 배경 찾기. 투명하면 부모로 올라갑니다.
     * 배경 이미지·그라데이션을 만나면 한 값으로 판정할 수 없으므로 포기합니다.
     */
    let bg = null;
    let onImage = false;
    let opacity = 1;

    /*
     * 사진 위에 얹은 글자도 건너뜁니다.
     *
     * 배경이 background-image 가 아니라 <img> 인 경우가 있습니다
     * (히어로 배너가 그렇습니다 — 사진은 형제 요소이고 글자는 그 위에
     * 절대 위치로 떠 있습니다). 그러면 조상들의 배경색은 전부 투명이라
     * 문서 배경으로 판정되어, 밝은 사진 위의 어두운 글자가 "어두운 배경
     * 위의 어두운 글자" 로 잘못 잡힙니다.
     *
     * 글자 상자 한가운데에 무엇이 깔려 있는지 직접 봅니다.
     */
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
      const stack = document.elementsFromPoint(cx, cy);
      const below = stack.slice(stack.indexOf(el) + 1);
      if (below.some((n) => /^(IMG|VIDEO|CANVAS|SVG|PICTURE)$/i.test(n.tagName))) {
        skipped += 1;
        continue;
      }
    }

    for (let a = el; a; a = a.parentElement) {
      const acs = getComputedStyle(a);
      opacity *= parseFloat(acs.opacity || '1');
      if (acs.backgroundImage && acs.backgroundImage !== 'none') {
        onImage = true;
        break;
      }
      const c = parse(acs.backgroundColor);
      if (c && c.a > 0) {
        bg = bg ? over(bg, c) : c;
        if (bg.a >= 0.999) break;
      }
    }

    if (onImage) {
      skipped += 1;
      continue;
    }

    // 끝까지 투명하면 문서 배경(보통 흰색/검정)으로 봅니다
    const pageBg = parse(getComputedStyle(document.documentElement).backgroundColor) ??
      { r: 255, g: 255, b: 255, a: 1 };
    const base = bg && bg.a >= 0.999 ? bg : over(bg ?? { r: 0, g: 0, b: 0, a: 0 }, pageBg);

    // opacity 는 글자를 배경 쪽으로 흐리게 만듭니다
    const fg = over({ ...fg0, a: fg0.a * opacity }, base);

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= LARGE_PX || (size >= LARGE_BOLD_PX && weight >= 700);
    const need = large ? 3 : 4.5;

    const got = ratio(fg, base);
    if (got + 0.005 < need) {
      results.push({
        text: text.slice(0, 40),
        selector:
          el.tagName.toLowerCase() +
          (el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : ''),
        got: Math.round(got * 100) / 100,
        need,
        size: Math.round(size),
      });
    }
  }

  return { results, skipped };
};

const { url, close } = await serveDist(DIST);
/*
 * 컨테이너에 미리 깔린 Chromium 을 씁니다.
 * playwright 버전이 올라가면 번들 브라우저 경로가 바뀌어 못 찾는데,
 * 검사 스크립트가 브라우저를 새로 내려받기 시작하면 CI 가 멈춥니다.
 * 지정된 실행파일이 있으면 그걸 쓰고, 없으면 기본 동작으로 둡니다.
 */
const PINNED = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(PINNED) ? { executablePath: PINNED } : {}
);

let failures = 0;
let skippedTotal = 0;
/*
 * 같은 문제가 페이지마다 반복됩니다 (푸터·헤더는 모든 페이지에 있으니까).
 * 그래서 끝에 **선택자별로 묶어** 보여줍니다. 고칠 자리 개수는
 * 보통 실패 건수의 1/50 쯤입니다 — 그걸 알아야 손이 안 떨립니다.
 */
const grouped = new Map();
const list = (await pages()).sort();

try {
  for (const scheme of ['light', 'dark']) {
    /*
     * reducedMotion: 'reduce' 로 봅니다.
     *
     * 스크롤 등장(data-reveal)은 화면 밖 요소를 opacity 0 으로 둡니다.
     * 그 상태로 재면 글자색이 배경색과 같아져 전부 1:1 로 잡힙니다.
     * 사이트가 이미 prefers-reduced-motion 에서 등장 효과를 끄고
     * 최종 상태로 두므로, 그 경로를 그대로 씁니다 — 검사용 CSS 를
     * 따로 주입하는 것보다 실제 사용자 환경에 가깝습니다.
     */
    const ctx = await browser.newContext({ colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();

    for (const route of list) {
      await page.goto(url + route, { waitUntil: 'load' });
      const { results, skipped } = await page.evaluate(AUDIT);
      skippedTotal += skipped;

      if (results.length) {
        failures += results.length;
        for (const r of results) {
          const k = `${scheme}\u0000${r.selector}`;
          const g = grouped.get(k) ?? { scheme, selector: r.selector, n: 0, worst: r, text: r.text };
          g.n += 1;
          if (r.got < g.worst.got) g.worst = r;
          grouped.set(k, g);
        }
        console.log(`\n${scheme.toUpperCase()}  ${route}`);
        for (const r of results.slice(0, 12)) {
          console.log(
            `  ✗ ${String(r.got).padStart(5)}:1 (기준 ${r.need}) ${r.size}px  ` +
              `${r.selector}  "${r.text}"`
          );
        }
        if (results.length > 12) console.log(`  … 외 ${results.length - 12}건`);
      }
    }

    await ctx.close();
  }
} finally {
  await browser.close();
  await close();
}

const note = skippedTotal ? ` (배경 이미지 위 ${skippedTotal}곳은 사람이 확인해야 합니다)` : '';

if (failures) {
  console.log(`\n── 고쳐야 할 자리 ${grouped.size}곳 (실패 ${failures}건) ──`);
  for (const g of [...grouped.values()].sort((a, b) => a.worst.got - b.worst.got)) {
    console.log(
      `  ${g.scheme.padEnd(5)} ${String(g.worst.got).padStart(5)}:1 (기준 ${g.worst.need}) ` +
        `${String(g.worst.size).padStart(2)}px  ${g.selector}  ×${g.n}`
    );
  }
  console.log(`\n대비 기준 미달 ${failures}건${note}`);
  console.log('tokens.css 의 색을 고치세요. 개별 컴포넌트에서 색을 덮으면 다음에 또 어긋납니다.');
  process.exit(1);
}

console.log(`대비 기준(AA) 이상 없음 — ${list.length}페이지 × 라이트/다크${note}`);
