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
