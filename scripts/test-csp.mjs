/**
 * CSP 회귀 테스트 — 빌드 결과에 style 속성이 남아 있는지 검사합니다.
 *
 *   npm run test:csp        (dist/ 를 검사)
 *
 * 왜 필요한가 —
 * 이 템플릿은 해시 기반 CSP로 운영합니다('unsafe-inline' 없음).
 * 해시는 <style> 요소에만 걸리고, **style 속성**에는 걸 수단이 없습니다
 * ('unsafe-hashes'를 여는 순간 CSP를 켠 의미가 절반 사라집니다).
 *
 * 그래서 style="..." 을 쓰면 브라우저가 조용히 무시합니다.
 * 에러 페이지도 안 뜨고 빌드도 통과합니다. 콘솔을 안 보면 모릅니다.
 *
 * 실제로 두 번 당했습니다.
 *   1) 배너 overlay 불투명도 → 투명해져서 흰 글자가 안 보였음
 *   2) CMS 이미지 lqip 블러 → 전량 차단, 제품 페이지마다 CSP 오류
 *
 * 사람이 기억해서 피할 수 있는 종류가 아니라 테스트로 막습니다.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] ?? 'dist';

if (!existsSync(ROOT)) {
  console.error(`${ROOT} 가 없습니다. 먼저 npm run build 를 실행하세요.`);
  process.exit(1);
}

/** style 속성만 잡습니다. <style> 요소는 해시가 걸리므로 정상입니다. */
const STYLE_ATTR = /<[a-z][^>]*?\sstyle\s*=\s*["'][^"']*["']/gi;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const hits = [];

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(STYLE_ATTR)) {
    hits.push({ file: relative(ROOT, file), snippet: m[0].slice(0, 100) });
  }
}

if (hits.length) {
  console.error(`style 속성이 ${hits.length}곳 남아 있습니다. CSP가 전부 막습니다.\n`);
  for (const h of hits.slice(0, 10)) {
    console.error(`  ${h.file}`);
    console.error(`    ${h.snippet}…\n`);
  }
  if (hits.length > 10) console.error(`  … 외 ${hits.length - 10}곳\n`);
  console.error('CSS 클래스로 바꾸세요. 값이 몇 가지로 정해진다면 enum + 클래스가 정석입니다.');
  process.exit(1);
}

console.log(`style 속성 없음 (HTML ${files.length}개 검사)`);
