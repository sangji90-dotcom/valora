/**
 * 내부 링크에 언어 접두어가 빠졌는지 검사합니다.
 *
 *   npm run test:i18n
 *
 * 왜 필요한가 —
 * 다국어를 켜면 /en/ 아래에 사이트가 통째로 생깁니다. 그런데 링크를
 * `href="/products/"` 처럼 그대로 두면, 영문 페이지에서 한 번 누르는
 * 순간 한국어 사이트로 빠져나갑니다.
 *
 * 빌드는 통과합니다. astro check 도 통과합니다. 링크는 실제로 살아
 * 있으니 404도 안 납니다. **눈으로만 잡히는 종류**입니다.
 * 실제로 이 검사를 만들기 전 14곳이 그 상태였습니다.
 *
 * 규칙: .astro 안의 내부 링크는 L(...) 을 거쳐야 합니다.
 *   <a href="/products/">            ✗
 *   <a href={L('/products/')}>       ✓
 *   <a href={`/products/${id}/`}>    ✗
 *   <a href={L(`/products/${id}/`)}> ✓
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');

/**
 * 검사에서 빼는 파일.
 * SEO.astro 는 canonical·hreflang 을 절대 URL 로 만들므로 대상이 아닙니다.
 */
const SKIP = new Set([
  'SEO.astro',
  // 404 는 언어 트리 밖의 한 장뿐이라 접두어 개념이 없습니다
  '404.astro',
]);

/** 정적 파일 주소(/favicon.svg 등)는 언어와 무관합니다 */
const IS_ASSET = /\.[a-z0-9]{2,5}$/i;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith('.astro')) out.push(p);
  }
  return out;
}

/** href 가 L( 로 감싸여 있는지 */
const WRAPPED = /href=\{\s*L\(/;
/** 감싸이지 않은 내부 링크 */
const BARE = /href=(?:"(\/[^"]*)"|\{\s*`(\/[^`]*)`\s*\}|\{\s*'(\/[^']*)'\s*\})/g;

const files = (await walk(SRC)).filter((f) => !SKIP.has(path.basename(f)));
const hits = [];

for (const f of files) {
  const text = await readFile(f, 'utf8');
  for (const m of text.matchAll(BARE)) {
    // 같은 자리에 L( 이 있으면 통과
    const around = text.slice(Math.max(0, m.index - 8), m.index + 12);
    if (WRAPPED.test(around)) continue;
    const href = m[1] ?? m[2] ?? m[3];
    if (IS_ASSET.test(href)) continue;
    const line = text.slice(0, m.index).split('\n').length;
    hits.push(`${path.relative(ROOT, f)}:${line}  href="${href}"`);
  }
}

if (hits.length) {
  console.log(`언어 접두어가 빠진 내부 링크 ${hits.length}곳:`);
  for (const h of hits) console.log(`  ✗ ${h}`);
  console.log(
    '\nL() 로 감싸세요:  href={L("/products/")}\n' +
      '  const L = (p: string) => localePath(p, localeFromPath(Astro.url.pathname));'
  );
  process.exit(1);
}

console.log(`내부 링크 전부 언어 접두어 처리됨 (.astro ${files.length}개 검사)`);

/* ============================================================
 *  2) 영문 페이지에 한국어가 남아 있는지
 * ============================================================
 *  빌드 결과가 있을 때만 돕니다 (없으면 조용히 건너뜀).
 *
 *  왜 필요한가 — 화면 문구를 terms.ts 로 옮기는 작업은 한 군데씩
 *  빠지기 쉽고, 빠져도 빌드는 통과합니다. /en/ 을 열어 눈으로 봐야만
 *  드러나는 종류라서, 여기서 기계가 대신 봅니다.
 *
 *  본문뿐 아니라 alt·aria-label·data 속성까지 봅니다. 화면에 안 보이는
 *  자리에 남은 한국어는 스크린리더와 검색엔진에는 그대로 읽힙니다.
 * ============================================================ */
const DIST = path.join(ROOT, 'dist', 'en');
const HANGUL = /[가-힣]/;

/*
 * 영문 페이지에 남아도 되는 한국어.
 *
 * 사람 이름과 법인명은 고유명사라 번역 대상이 아닙니다. 로마자 표기는
 * 본인이 쓰는 철자가 따로 있어서(전소은 → Jeon / Jun / Chun …) 저희가
 * 지어내면 계약서나 명함과 달라집니다. 받기 전까지는 한글 그대로 둡니다.
 *
 * 표기를 받으면 site.config.ts 의 해당 값을 { ko, en } 으로 바꾸고
 * 여기서 이름을 지우세요. 목록이 길어지면 검사가 의미를 잃습니다.
 */
const ALLOW = await (async () => {
  // site.config.ts 는 타입스크립트라 이 스크립트에서 바로 못 읽습니다.
  // 값 하나만 필요하므로 글자로 찾습니다.
  const cfg = await readFile(path.join(ROOT, 'site.config.ts'), 'utf8');
  const ceo = cfg.match(/ceo:\s*'([^']*)'/)?.[1];
  return [ceo].filter((v) => v && HANGUL.test(v));
})();

async function walkHtml(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkHtml(p)));
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

if (existsSync(DIST)) {
  const pages = await walkHtml(DIST);
  const leaks = [];

  for (const f of pages) {
    const html = await readFile(f, 'utf8');
    // 태그 바깥(본문)과 태그 안(속성) 을 모두 훑습니다
    for (const chunk of html.match(/[^<>]+/g) ?? []) {
      if (!HANGUL.test(chunk)) continue;

      // 고유명사만 들어 있는 조각은 넘어갑니다
      let rest = chunk;
      for (const w of ALLOW) rest = rest.split(w).join('');
      if (!HANGUL.test(rest)) continue;

      const at = chunk.search(HANGUL);
      leaks.push(
        `${path.relative(ROOT, f)}  …${chunk.slice(Math.max(0, at - 40), at + 40).trim()}…`
      );
    }
  }

  if (leaks.length) {
    console.log(`\n영문 페이지에 한국어가 남아 있습니다 (${leaks.length}곳):`);
    for (const l of leaks.slice(0, 25)) console.log(`  ✗ ${l}`);
    if (leaks.length > 25) console.log(`  … 외 ${leaks.length - 25}곳`);
    console.log(
      '\n화면 문구는 src/lib/terms.ts, 설정 본문은 site.config.ts 의 { ko, en },\n' +
        '제품·페이지 본문은 <id>.en.md 에 넣으세요.'
    );
    process.exit(1);
  }

  console.log(`영문 페이지에 한국어 없음 (HTML ${pages.length}개 검사)`);
} else {
  console.log('dist/en 이 없어 영문 잔존 검사는 건너뜁니다 (npm run build 후 다시 확인하세요)');
}
