/**
 * CSP 회귀 테스트 — 빌드 결과가 CSP에 실제로 막히지 않는지 검사합니다.
 *
 *   npm run test:csp        (dist/ 를 검사)
 *
 * 왜 필요한가 —
 * 이 템플릿은 해시 기반 CSP로 운영합니다('unsafe-inline' 없음).
 * CSP 위반은 **빌드를 깨지 않습니다.** 브라우저가 조용히 무시할 뿐이라
 * 콘솔을 안 보면 모릅니다. 사람이 기억해서 피할 수 있는 종류가 아닙니다.
 *
 * 검사 1 — style 속성
 *   해시는 <style> 요소에만 걸리고 **style 속성**에는 걸 수단이 없습니다
 *   ('unsafe-hashes'를 여는 순간 CSP를 켠 의미가 절반 사라집니다).
 *   실제로 두 번 당했습니다.
 *     1) 배너 overlay 불투명도 → 투명해져서 흰 글자가 안 보였음
 *     2) CMS 이미지 lqip 블러 → 전량 차단, 제품 페이지마다 CSP 오류
 *
 * 검사 2 — 해시가 빠진 inline <style> / <script>
 *   Astro가 해시를 모아주지만 **전부 모으지는 않습니다.**
 *   <noscript> 안의 <style> 은 세지 않습니다. 그 결과 —
 *     빌드 통과 ✓ / JS 켠 사람 정상 ✓ / **JS 끈 사람만 조용히 차단** ✗
 *   이건 검사 1로는 절대 안 잡힙니다(style 속성이 아니니까).
 *   그래서 문서 안의 모든 inline <style>·<script> 해시를 직접 계산해
 *   meta CSP 목록에 있는지 대조합니다. 브라우저가 하는 일과 같습니다.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.argv[2] ?? 'dist';

if (!existsSync(ROOT)) {
  console.error(`${ROOT} 가 없습니다. 먼저 npm run build 를 실행하세요.`);
  process.exit(1);
}

/** style 속성만 잡습니다. <style> 요소는 해시가 걸리므로 정상입니다. */
const STYLE_ATTR = /<[a-z][^>]*?\sstyle\s*=\s*["'][^"']*["']/gi;

/** inline 요소 — src 가 있는 <script> 는 호스트 허용 문제라 별건입니다. */
const INLINE_STYLE = /<style(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/style>/gi;
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;

/**
 * ⚠ content 값 안에는 'self' 처럼 작은따옴표가 들어갑니다.
 *   따옴표 종류를 역참조(\2)로 고정하지 않으면 첫 ' 에서 잘려서
 *   "해시가 전부 빠졌다"는 거짓 경보가 납니다. (실제로 한 번 냈습니다)
 */
const META_CSP =
  /<meta[^>]+http-equiv=(["'])content-security-policy\1[^>]*\scontent=(["'])([\s\S]*?)\2/i;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

/** CSP 문자열에서 한 지시어의 토큰을 꺼냅니다 */
function directive(csp, name) {
  const m = csp.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]*)`, 'i'));
  return m ? m[1].trim().split(/\s+/) : [];
}

function sha256(text) {
  return 'sha256-' + createHash('sha256').update(text, 'utf8').digest('base64');
}

const files = walk(ROOT);
const attrHits = [];
const hashHits = [];
let noCspPages = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);

  // ---- 검사 1 : style 속성 ----
  for (const m of html.matchAll(STYLE_ATTR)) {
    attrHits.push({ file: rel, snippet: m[0].slice(0, 100) });
  }

  // ---- 검사 2 : 해시 대조 ----
  const cspMatch = html.match(META_CSP);
  if (!cspMatch) {
    noCspPages++;
    continue;
  }
  const csp = cspMatch[3];

  const checks = [
    { kind: 'style', re: INLINE_STYLE, allowed: directive(csp, 'style-src') },
    { kind: 'script', re: INLINE_SCRIPT, allowed: directive(csp, 'script-src') },
  ];

  for (const { kind, re, allowed } of checks) {
    // 'unsafe-inline' 이 열려 있으면 해시를 따질 필요가 없습니다
    if (allowed.includes("'unsafe-inline'")) continue;

    re.lastIndex = 0;
    for (const m of html.matchAll(re)) {
      const body = m[2];
      if (body.trim() === '') continue;

      /**
       * 실행되지 않는 데이터 블록(JSON-LD 등)은 CSP 대상이 아닙니다.
       * 브라우저가 스크립트로 돌리지 않으니 해시를 볼 이유도 없습니다.
       * importmap·speculationrules 는 실행 대상이라 그대로 검사합니다.
       */
      if (kind === 'script') {
        const type = (m[1].match(/\stype\s*=\s*["']([^"']*)["']/i)?.[1] ?? '').toLowerCase();
        const EXECUTED = ['', 'module', 'text/javascript', 'application/javascript', 'importmap', 'speculationrules'];
        if (!EXECUTED.includes(type)) continue;
      }
      const hash = sha256(body);
      if (!allowed.includes(`'${hash}'`)) {
        // <noscript> 안이면 원인이 거의 확실하므로 따로 알려줍니다
        const before = html.slice(Math.max(0, m.index - 300), m.index);
        const inNoscript =
          before.lastIndexOf('<noscript') > before.lastIndexOf('</noscript>');
        hashHits.push({ file: rel, kind, hash, inNoscript, snippet: body.trim().slice(0, 90) });
      }
    }
  }
}

let failed = false;

if (attrHits.length) {
  failed = true;
  console.error(`style 속성이 ${attrHits.length}곳 남아 있습니다. CSP가 전부 막습니다.\n`);
  for (const h of attrHits.slice(0, 10)) {
    console.error(`  ${h.file}`);
    console.error(`    ${h.snippet}…\n`);
  }
  if (attrHits.length > 10) console.error(`  … 외 ${attrHits.length - 10}곳\n`);
  console.error('CSS 클래스로 바꾸세요. 값이 몇 가지로 정해진다면 enum + 클래스가 정석입니다.\n');
}

if (hashHits.length) {
  failed = true;
  console.error(`해시가 빠진 inline 요소가 ${hashHits.length}곳 있습니다. 브라우저가 무시합니다.\n`);
  for (const h of hashHits.slice(0, 10)) {
    console.error(`  ${h.file}  <${h.kind}>${h.inNoscript ? '  ← <noscript> 안' : ''}`);
    console.error(`    ${h.snippet.replace(/\s+/g, ' ')}…`);
    console.error(`    계산된 해시: ${h.hash}\n`);
  }
  if (hashHits.length > 10) console.error(`  … 외 ${hashHits.length - 10}곳\n`);
  console.error(
    '<noscript> 안이라면 <style> 대신 외부 스타일시트를 쓰세요 —\n' +
      '  <noscript><link rel="stylesheet" href="/noscript.css"></noscript>\n' +
      "  (style-src 'self' 로 통과하고, 깜빡임도 없습니다)\n"
  );
}

if (failed) process.exit(1);

const note = noCspPages ? ` / CSP meta 없는 문서 ${noCspPages}개는 건너뜀` : '';
console.log(`style 속성 없음, inline 해시 전부 일치 (HTML ${files.length}개 검사${note})`);
