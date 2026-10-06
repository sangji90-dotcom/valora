/**
 * 내부 메모가 고객 화면으로 새지 않았는지.
 *
 *   npm run test:leak
 *
 * 왜 필요한가 —
 * `src/content/pages/*.md` 의 본문은 **그대로 고객 화면에 나옵니다.**
 * 그런데 그 파일에는 담당자에게 할 말도 같이 적고 싶어집니다. markdown
 * 의 blockquote 가 "메모" 처럼 보여서 더 그렇습니다.
 *
 * 실제로 처리방침 페이지에 이런 것이 떠 있었습니다 —
 *
 *   "납품 전 반드시 확인하세요. … (scripts/go-live.mjs 가 같이 채웁니다)"
 *   "상시 근로자가 적은 사업장은 보호책임자를 따로 지정하지 않아도 …"
 *
 * 앞의 것은 저장소 파일 경로를 고객에게 보여주고, 뒤의 것은 **회사 규모를
 * 알려줍니다.** 보호책임자는 성명과 연락처만 적으면 되고 왜 대표자가
 * 책임자인지 설명할 의무는 없습니다.
 *
 * 눈으로는 안 걸립니다. 처리방침은 아무도 끝까지 읽지 않으니까요.
 * 그래서 빌드 결과의 **보이는 글자**만 긁어서 기계로 셉니다.
 *
 * 담당자용 메모는 frontmatter 의 YAML 주석(`# …`)에 적으세요.
 * 그쪽은 렌더되지 않습니다.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

/*
 * 새면 안 되는 말.
 *
 * ⚠ 흔한 단어를 넣지 마세요. '납품' 은 도입 절차 설명에 정당하게 쓰이고,
 *   '담당자' 는 안전성 확보 조치 문구에 들어갑니다. 넣는 순간 검사가
 *   늘 빨간색이 되어 아무도 안 봅니다. 내부에서만 쓰는 말만 넣습니다.
 */
const LEAKS = [
  // 저장소 내부
  ['scripts/', '저장소 경로'],
  ['.mjs', '스크립트 파일명'],
  ['npm run', '명령어'],
  ['site.config', '설정 파일명'],
  ['git 기록', '버전관리 이야기'],
  ['TODO', '미완 표시'],
  ['FIXME', '미완 표시'],
  // 회사 사정
  ['상시 근로자', '회사 규모가 드러납니다'],
  // 담당자용 메모 특유의 말투
  ['법률 자문', '담당자용 메모'],
  ['고객사', '담당자용 메모'],
  ['확인·확정', '담당자용 메모'],
  ['시연용', '데모 흔적'],
  ['템플릿', '데모 흔적'],
];

/** 자리표시자 — 공개 전에는 남아 있어도 되지만 공개하면 안 됩니다 */
const PLACEHOLDER = [/\(\S*\s*기재\)/, /\(enter [a-z ]+\)/i];

/*
 * 자리표시자의 등급은 지금이 공개 상태인지에 달려 있습니다.
 *
 *   noindex: true  — 아직 작업 중. "(시행일 기재)" 가 남아 있어도 됩니다
 *   noindex: false — 검색에 올라갑니다. 남아 있으면 그게 사고입니다
 *
 * 한 가지 기준으로 고정하면 둘 중 하나가 늘 틀립니다. 작업 중에 오류로
 * 두면 매번 빨간색이라 아무도 안 보고, 공개 뒤에 경고로 두면 "(시행일
 * 기재)부터 적용됩니다" 가 그대로 공개됩니다.
 */
const config = await readFile(path.join(ROOT, 'site.config.ts'), 'utf8');
const LIVE = config.match(/^\s*noindex:\s*(true|false)/m)?.[1] === 'false';

let bad = 0;
let warned = 0;
const fail = (m) => { console.log(`  ✗ ${m}`); bad += 1; };

/** 보이는 글자만 남깁니다 — script·style·태그·주석을 떼고 엔티티를 풉니다 */
function visibleText(html) {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const ent = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  t = t.replace(/&(#?\w+);/g, (m, k) => ent[k] ?? m);
  return t.replace(/\s+/g, ' ');
}

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = await htmlFiles(DIST);
if (!files.length) {
  console.log('dist 가 비어 있습니다. npm run build 를 먼저 하세요.');
  process.exit(1);
}

for (const f of files) {
  const text = visibleText(await readFile(f, 'utf8'));
  const rel = path.relative(DIST, f);

  for (const [word, why] of LEAKS) {
    const i = text.indexOf(word);
    if (i === -1) continue;
    const around = text.slice(Math.max(0, i - 50), i + word.length + 50).trim();
    fail(`${rel} — "${word}" (${why})\n      …${around}…`);
  }

  for (const re of PLACEHOLDER) {
    const m = text.match(re);
    if (!m) continue;
    if (LIVE) fail(`${rel} — 자리표시자 ${m[0]} 가 화면에 남아 있는데 검색 공개 상태입니다`);
    else {
      console.log(`  ! ${rel} — 자리표시자 ${m[0]} 가 화면에 남아 있습니다 (공개 전이라 넘어갑니다)`);
      warned += 1;
    }
  }
}

const mode = LIVE ? '공개' : '공개 전';
console.log(
  bad
    ? `\n${bad}건 (${mode} 상태 기준) — 내부 메모는 frontmatter 의 YAML 주석(# …)으로 옮기세요`
    : `\n내부 메모 누출 없음 — ${mode} 상태, HTML ${files.length}개 검사${warned ? `, 자리표시자 ${warned}건은 넘어갔습니다` : ''}`
);
process.exit(bad ? 1 : 0);
