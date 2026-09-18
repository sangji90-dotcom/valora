/**
 * CSS 변수 참조 검증.
 *
 *   npm run test:tokens
 *
 * 왜 필요한가 —
 * CSS는 없는 변수를 참조해도 오류를 내지 않습니다. 선언 하나가 조용히
 * 무효가 되고 화면에서만 어긋납니다. 실제로 --space-5 를 쓰면서
 * 토큰에 선언하지 않아, 모바일 배너의 padding 이 통째로 0이 된 적이 있습니다.
 * (빌드도 통과하고 콘솔에도 아무 말이 없었습니다.)
 *
 * 그래서 src/ 에서 쓰는 모든 var(--...) 가 tokens.css 에 선언되어 있는지 봅니다.
 * 컴포넌트 안에서 선언하고 쓰는 지역 변수와, 폴백이 있는 참조는 통과입니다.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');

/** 브라우저가 기본 제공하거나 외부에서 주입되는 변수는 검사 대상이 아닙니다 */
const IGNORE = new Set([]);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(astro|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = await walk(SRC);

// 선언된 변수 모으기 — tokens.css 뿐 아니라 컴포넌트 안의 지역 선언도 포함
const declared = new Set();
const contents = new Map();
for (const f of files) {
  const text = await readFile(f, 'utf8');
  contents.set(f, text);
  for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:/gi)) declared.add(m[1]);
}

const missing = [];
for (const [f, text] of contents) {
  // var(--x) 는 잡고, 폴백이 있는 var(--x, ...) 는 넘어갑니다
  for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)) {
    const name = m[1];
    if (declared.has(name) || IGNORE.has(name)) continue;
    const line = text.slice(0, m.index).split('\n').length;
    missing.push(`${path.relative(ROOT, f)}:${line}  ${name}`);
  }
}

if (missing.length) {
  console.log(`선언되지 않은 CSS 변수 ${missing.length}건:`);
  for (const m of [...new Set(missing)]) console.log(`  ✗ ${m}`);
  console.log('\ntokens.css 에 선언하거나, 폴백을 주세요: var(--x, 기본값)');
  process.exit(1);
}

console.log(`CSS 변수 참조 이상 없음 (선언 ${declared.size}개 / 파일 ${files.length}개)`);
