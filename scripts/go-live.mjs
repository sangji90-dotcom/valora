/**
 * 공개 전환.
 *
 *   npm run go-live -- --domain https://valora.kr
 *   npm run go-live -- --domain https://valora.kr --date 2026-11-01
 *   npm run go-live -- --check     (지금 상태가 어긋나지 않았는지만 봅니다)
 *   npm run go-live -- --domain ... --dry   (바꾸지 않고 바뀔 내용만 보여줍니다)
 *
 * 왜 스크립트로 하는가 —
 * 공개할 때 같이 바뀌어야 하는 것이 네 군데입니다.
 *
 *   1. site.config.ts  site              → 정식 도메인
 *   2. site.config.ts  demoBanner.enabled → false
 *   3. site.config.ts  noindex            → false
 *   4. privacy.md / privacy.en.md  시행일  → 공개일
 *
 * 손으로 하면 꼭 하나가 남습니다. 그리고 남는 것이 하필 noindex 면
 * **데모 띠가 달린 화면이 검색 결과에 올라갑니다.** 고객사가 그걸
 * 먼저 발견하는 순서가 가장 나쁩니다. 반대로 noindex 만 끄고 site 를
 * 안 바꾸면 모든 페이지의 대표 주소(canonical)가 임시 주소를 가리켜
 * 정식 도메인이 검색에서 밀립니다.
 *
 * 그래서 넷을 한 번에 바꾸고, 끝나고 나서 남은 것이 없는지 다시 셉니다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, 'site.config.ts');
const PRIVACY = [
  path.join(ROOT, 'src/content/pages/privacy.md'),
  path.join(ROOT, 'src/content/pages/privacy.en.md'),
];

// ---------- 인자 ----------

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : (argv[i + 1] ?? '');
};
const has = (name) => argv.includes(`--${name}`);

const CHECK_ONLY = has('check');
const DRY = has('dry');
const domain = flag('domain');
const date = flag('date') ?? new Date().toISOString().slice(0, 10);

let bad = 0;
const fail = (m) => { console.log(`  ✗ ${m}`); bad += 1; };
const warn = (m) => console.log(`  ! ${m}`);
const ok = (m) => console.log(`  ✓ ${m}`);

// ---------- 지금 상태 ----------

const config = await readFile(CONFIG, 'utf8');

const readSite = (s) => s.match(/^\s*site:\s*'([^']*)'/m)?.[1];
const readNoindex = (s) => s.match(/^\s*noindex:\s*(true|false)/m)?.[1];
const readBanner = (s) => s.match(/demoBanner:\s*\{\s*\n\s*enabled:\s*(true|false)/)?.[1];

const now = {
  site: readSite(config),
  noindex: readNoindex(config),
  banner: readBanner(config),
  phone: config.match(/^\s*phone:\s*'([^']*)'/m)?.[1],
  embed: config.match(/^\s*embedUrl:\s*'([^']*)'/m)?.[1],
  mode: config.match(/^\s*mode:\s*'([^']*)'/m)?.[1],
};

for (const [k, v] of Object.entries({ site: now.site, noindex: now.noindex, banner: now.banner })) {
  if (v === undefined) {
    console.log(`site.config.ts 에서 ${k} 를 읽지 못했습니다. 서식이 바뀌었는지 확인하세요.`);
    process.exit(1);
  }
}

const isTemp = /\.workers\.dev$/.test(new URL(now.site).hostname);

console.log('\n지금 상태');
console.log(`  site            ${now.site}${isTemp ? '  (임시 주소)' : ''}`);
console.log(`  noindex         ${now.noindex}`);
console.log(`  demoBanner      ${now.banner}`);
console.log(`  contact.phone   ${now.phone === '' ? '(비움)' : now.phone}`);
console.log('');

// ---------- 어긋난 조합 ----------

/*
 * 세 값은 같이 움직여야 합니다. 어느 하나만 바뀐 상태가 전부 사고입니다.
 */
console.log('짝이 맞는지');
if (now.noindex === 'false' && now.banner === 'true') {
  fail('검색 공개인데 데모 띠가 켜져 있습니다 — 검색 결과에 "검토용" 이라고 뜹니다');
} else if (now.noindex === 'false' && isTemp) {
  fail('검색 공개인데 site 가 임시 주소입니다 — 정식 도메인이 검색에서 밀립니다');
} else if (now.noindex === 'true' && now.banner === 'false') {
  warn('데모 띠는 꺼졌는데 검색은 아직 막혀 있습니다 — 공개 직전이면 맞습니다');
} else {
  ok('세 값이 어긋나지 않았습니다');
}

// ---------- 시행일 ----------

const privacy = [];
for (const p of PRIVACY) {
  const text = await readFile(p, 'utf8');
  privacy.push({ p, text, blank: /\((?:시행일 기재|enter effective date)\)/.test(text) });
}
const blanks = privacy.filter((x) => x.blank);
if (blanks.length) {
  if (now.noindex === 'false') fail(`처리방침 시행일이 비어 있는데 검색 공개 상태입니다 (${blanks.length}개 파일)`);
  else ok(`처리방침 시행일 ${blanks.length}개 파일이 비어 있습니다 — 공개할 때 채웁니다`);
} else {
  ok('처리방침 시행일이 채워져 있습니다');
}

if (CHECK_ONLY) {
  console.log(bad ? `\n${bad}건 어긋남` : '\n이상 없음');
  process.exit(bad ? 1 : 0);
}

// ---------- 여기부터 바꿉니다 ----------

if (!domain) {
  console.log('\n--domain https://정식주소 를 주세요. 보기만 하려면 --check 입니다.');
  process.exit(1);
}

console.log('\n바꾸기 전 확인');

if (!/^https:\/\/[a-z0-9.-]+$/i.test(domain)) {
  fail(`도메인이 https://호스트 형태가 아닙니다: ${domain} (끝에 / 를 붙이지 마세요)`);
}
if (/\.workers\.dev$/.test(domain)) {
  fail('임시 주소를 정식 도메인으로 넣으려 합니다');
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  fail(`공개일이 YYYY-MM-DD 가 아닙니다: ${date}`);
}

/*
 * 문의 양식을 켜 둔 채 주소가 자리표시자면, 공개하는 순간 문의 칸이
 * 깨진 화면이 됩니다. 폼을 안 쓰기로 했으면 mode 를 바꿔야 합니다.
 */
if (now.mode === 'external' && /FORM_ID/.test(now.embed ?? '')) {
  fail("inquiry.embedUrl 이 아직 자리표시자(FORM_ID)입니다 — 폼 주소를 넣거나, 폼을 쓰지 않기로 했으면 inquiry.mode 를 'none' 으로 바꾸세요 (연락처만 표시됩니다)");
}

if (now.phone === '') {
  warn('contact.phone 이 비어 있습니다 — 화면에서 전화 항목이 빠집니다. 의도한 것이면 넘어가세요');
}

/*
 * 작업트리가 더러우면 멈춥니다. 이 스크립트가 바꾼 것과 손으로 바꾼 것이
 * 섞이면 되돌릴 때 무엇을 되돌려야 하는지 알 수 없습니다.
 */
try {
  const dirty = execFileSync('git', ['status', '--porcelain'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'], // git 저장소가 아닐 때 fatal 이 섞여 나오지 않게
  }).trim();
  if (dirty && !DRY) {
    fail('커밋하지 않은 변경이 있습니다 — 공개 전환만 따로 커밋되도록 먼저 정리하세요');
    console.log(dirty.split('\n').map((l) => `      ${l}`).join('\n'));
  }
} catch {
  warn('git 상태를 읽지 못했습니다 — 되돌리려면 직접 확인해야 합니다');
}

if (bad) {
  console.log(`\n${bad}건 때문에 멈췄습니다. 아무것도 바꾸지 않았습니다.`);
  process.exit(1);
}

// ---------- 실제 치환 ----------

let next = config;
next = next.replace(/^(\s*site:\s*)'[^']*'/m, `$1'${domain}'`);
next = next.replace(/^(\s*noindex:\s*)(true|false)/m, '$1false');
next = next.replace(/(demoBanner:\s*\{\s*\n\s*enabled:\s*)(true|false)/, '$1false');

const edits = [
  [CONFIG, config, next],
  ...privacy.map(({ p, text }) => [
    p,
    text,
    text
      .replace(/\(시행일 기재\)/g, date)
      .replace(/\(enter effective date\)/g, date),
  ]),
];

console.log(DRY ? '\n바뀔 내용 (--dry 라 쓰지 않습니다)' : '\n바꿉니다');
for (const [p, before, after] of edits) {
  const rel = path.relative(ROOT, p);
  if (before === after) { console.log(`  - ${rel} 바뀌는 것 없음`); continue; }
  console.log(`  ✎ ${rel}`);
  if (!DRY) await writeFile(p, after);
}

if (DRY) {
  console.log('\n--dry 였습니다. 실제로 바꾸려면 --dry 를 빼고 다시 실행하세요.');
  process.exit(0);
}

// ---------- 바꾼 뒤 다시 셉니다 ----------

const after = await readFile(CONFIG, 'utf8');
console.log('\n바꾼 뒤');
let left = 0;
if (readSite(after) !== domain) { console.log(`  ✗ site 가 ${readSite(after)} 입니다`); left += 1; }
if (readNoindex(after) !== 'false') { console.log('  ✗ noindex 가 아직 true 입니다'); left += 1; }
if (readBanner(after) !== 'false') { console.log('  ✗ demoBanner 가 아직 true 입니다'); left += 1; }
for (const { p } of privacy) {
  const t = await readFile(p, 'utf8');
  if (/\((?:시행일 기재|enter effective date)\)/.test(t)) {
    console.log(`  ✗ ${path.relative(ROOT, p)} 시행일이 아직 비어 있습니다`);
    left += 1;
  }
}
if (left) {
  console.log(`\n${left}건이 남았습니다. 서식이 바뀌어 치환이 빗나간 것이니 손으로 고치세요.`);
  process.exit(1);
}

console.log('  ✓ 네 군데 전부 반영');
console.log(`
다음 순서
  1. npm run build
  2. npm run test:leak && npm run test:csp && npm run test:i18n && npm run test:contrast
     (test:leak 은 noindex 를 보고 판정합니다. 공개 상태에서는 화면에 남은
      자리표시자를 경고가 아니라 오류로 올립니다)
  3. 화면을 한 번 눈으로 보고 (데모 띠가 사라졌는지, 전화 항목이 맞는지)
  4. 커밋 → 배포

되돌리려면 git checkout -- site.config.ts src/content/pages/privacy*.md
검색엔진은 noindex 를 끈 뒤부터 긁어갑니다. 끄는 시점을 고객사와 맞추세요.
`);
