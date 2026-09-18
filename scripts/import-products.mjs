#!/usr/bin/env node
/**
 * ============================================================
 *  상품 일괄 등록 — 엑셀/CSV → 마크다운
 * ============================================================
 *  고객사는 상품 목록을 엑셀로 줍니다. 50~200개를 손으로
 *  옮기는 건 불가능하므로 이 스크립트가 변환합니다.
 *
 *  사용법
 *    node scripts/import-products.mjs <파일.xlsx|csv> [옵션]
 *
 *  옵션
 *    --images <폴더>   제품 사진이 들어 있는 폴더
 *    --dry-run         파일을 쓰지 않고 결과만 출력
 *    --force           같은 slug의 기존 md를 덮어씀 (기본은 건너뜀)
 *    --placeholder     사진이 없는 상품도 회색 이미지로 만들어 둠 (draft 처리)
 *    --sheet <이름>    엑셀 시트 지정
 *    --max-width <px>  이미지 최대 가로 (기본 1600)
 *
 *  예시
 *    node scripts/import-products.mjs ~/받은자료/상품목록.xlsx --images ~/받은자료/사진 --dry-run
 * ============================================================
 */
import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { readSheet, mapColumns } from './lib/sheet.mjs';
import {
  deriveSlug,
  parsePrice,
  parseBoolean,
  parseStatus,
  parseTags,
  parseImageList,
  matchCategory,
  yamlString,
  toMarkdownBody,
} from './lib/normalize.mjs';
import { indexImageDir, resolveImages, optimizeInto, makePlaceholder } from './lib/images.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CONTENT_DIR = path.join(ROOT, 'src/content/products');
const ASSET_DIR = path.join(ROOT, 'src/assets/products');

// ---------------------------------------------------------------- 인자 파싱

function parseArgs(argv) {
  const opts = {
    file: null,
    images: null,
    dryRun: false,
    force: false,
    placeholder: false,
    sheet: null,
    maxWidth: 1600,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--placeholder') opts.placeholder = true;
    else if (arg === '--images') opts.images = argv[++i];
    else if (arg === '--sheet') opts.sheet = argv[++i];
    else if (arg === '--max-width') opts.maxWidth = Number(argv[++i]) || 1600;
    else if (arg.startsWith('--')) throw new Error(`알 수 없는 옵션: ${arg}`);
    else if (!opts.file) opts.file = arg;
  }

  if (!opts.file) {
    throw new Error(
      '변환할 파일을 지정하세요.\n  node scripts/import-products.mjs 상품목록.xlsx --images ./사진 --dry-run'
    );
  }

  return opts;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- 본체

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // site.config.ts 의 카테고리를 가져옵니다 (한글 이름 → id 매칭용)
  const configUrl = pathToFileURL(path.join(ROOT, 'site.config.ts')).href;
  const { default: siteConfig } = await import(configUrl);
  const categories = siteConfig.categories;

  const { headers, rows, source } = await readSheet(opts.file, { sheetName: opts.sheet });
  const { fields, specColumns, duplicates } = mapColumns(headers);

  console.log(`\n읽은 파일: ${path.basename(opts.file)} — ${source}`);
  console.log(`데이터 행: ${rows.length}개\n`);

  console.log('열 인식 결과');
  for (const [field, index] of Object.entries(fields)) {
    console.log(`  ${field.padEnd(15)} ← "${headers[index]}"`);
  }
  if (specColumns.length) {
    console.log(`  사양(specs)으로 처리 ← ${specColumns.map((c) => `"${c.label}"`).join(', ')}`);
  }
  if (duplicates.length) {
    console.log(`  ⚠ 중복 매칭되어 무시한 열: ${duplicates.join(', ')}`);
  }

  if (fields.title === undefined) {
    throw new Error(
      '\n제품명 열을 찾지 못했습니다.\n' +
        '  · 열 이름을 "제품명" 또는 "상품명"으로 바꾸거나\n' +
        '  · --sheet 로 시트를 직접 지정하거나\n' +
        '  · node scripts/make-product-template.mjs 로 양식을 만들어 고객사에 다시 요청하세요.'
    );
  }

  const imageIndex = await indexImageDir(opts.images);
  if (opts.images) {
    console.log(`\n이미지 폴더: ${opts.images} (${imageIndex.files.length}개 파일)`);
  }

  const usedSlugs = new Set();
  const results = [];
  const warnings = [];

  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    const rowNo = r + 2; // 엑셀 기준 행 번호 (헤더가 1행)
    const get = (field) => (fields[field] === undefined ? '' : String(row[fields[field]] ?? '').trim());

    const title = get('title');
    if (!title) {
      warnings.push(`${rowNo}행: 제품명이 비어 있어 건너뜁니다.`);
      continue;
    }

    // 인식하지 못한 열은 전부 사양으로
    const specs = {};
    for (const col of specColumns) {
      const value = String(row[col.index] ?? '').trim();
      if (value) specs[col.label] = value;
    }

    const tags = parseTags(get('tags'));

    // ---- slug
    let { slug, source: slugSource } = deriveSlug({
      slug: get('slug'),
      title,
      specs,
      tags,
    });

    if (!slug) {
      slug = `item-${String(r + 1).padStart(3, '0')}`;
      warnings.push(
        `${rowNo}행 "${title}": 영문 모델명이 없어 임시 주소 "${slug}" 를 부여했습니다. 납품 전 slug를 정하세요.`
      );
    }

    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n += 1;
      warnings.push(`${rowNo}행 "${title}": 주소 중복으로 "${slug}" → "${slug}-${n}" 로 변경했습니다.`);
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);

    // ---- 카테고리
    const rawCategory = get('category');
    const category = matchCategory(rawCategory, categories);
    if (!category) {
      warnings.push(
        `${rowNo}행 "${title}": 카테고리 "${rawCategory || '(비어 있음)'}" 를 인식하지 못했습니다. ` +
          `사용 가능: ${categories.map((c) => `${c.label}(${c.id})`).join(', ')}`
      );
    }

    // ---- 이미지
    const names = parseImageList(get('image'));
    const { found, missing } = resolveImages({ names, slug, title, index: imageIndex });

    if (missing.length) {
      warnings.push(`${rowNo}행 "${title}": 이미지 파일을 찾지 못했습니다 — ${missing.join(', ')}`);
    }

    const summary = get('summary') || `${title} 제품입니다.`;
    if (!get('summary')) {
      warnings.push(`${rowNo}행 "${title}": 한 줄 설명이 없어 임시 문구를 넣었습니다.`);
    }

    results.push({
      rowNo,
      slug,
      slugSource,
      title,
      summary: summary.slice(0, 120),
      category,
      rawCategory,
      specs,
      tags,
      price: parsePrice(get('price')),
      priceNote: get('priceNote') || '가격 문의',
      featured: parseBoolean(get('featured')),
      order: Number.parseInt(get('order'), 10),
      status: parseStatus(get('status')),
      seoDescription: get('seoDescription'),
      body: toMarkdownBody(get('body')),
      images: found,
    });
  }

  // ---------------------------------------------------------------- 쓰기

  const skipped = [];
  const written = [];
  const noImage = [];

  for (const item of results) {
    const mdPath = path.join(CONTENT_DIR, `${item.slug}.md`);

    if (!opts.force && (await exists(mdPath))) {
      skipped.push(`${item.slug}.md (이미 존재)`);
      continue;
    }

    // 카테고리를 인식 못 한 상품은 만들지 않습니다.
    // 만들면 빌드가 실패하고, 어느 행이 문제인지 찾기 어려워집니다.
    if (!item.category) {
      skipped.push(`${item.slug}.md (카테고리 미인식)`);
      continue;
    }

    let thumbnail = null;
    const gallery = [];

    if (item.images.length === 0) {
      if (!opts.placeholder) {
        noImage.push(`${item.slug} — ${item.title}`);
        continue;
      }
      if (!opts.dryRun) {
        const ph = await makePlaceholder(ASSET_DIR, item.slug, item.title);
        thumbnail = ph.fileName;
      } else {
        thumbnail = `${item.slug}.jpg`;
      }
      noImage.push(`${item.slug} — ${item.title} (placeholder 사용, draft 처리)`);
    } else {
      for (let i = 0; i < item.images.length; i += 1) {
        const base = i === 0 ? item.slug : `${item.slug}-${i + 1}`;
        if (opts.dryRun) {
          if (i === 0) thumbnail = `${base}.jpg`;
          else gallery.push(`${base}.jpg`);
          continue;
        }
        const out = await optimizeInto(item.images[i], ASSET_DIR, base, {
          maxWidth: opts.maxWidth,
        });
        if (i === 0) thumbnail = out.fileName;
        else gallery.push(out.fileName);
      }
    }

    const isPlaceholder = item.images.length === 0;

    const front = [
      '---',
      `title: ${yamlString(item.title)}`,
      `summary: ${yamlString(item.summary)}`,
      `category: ${item.category}`,
      `thumbnail: ../../assets/products/${thumbnail}`,
    ];

    if (gallery.length) {
      front.push('gallery:');
      for (const g of gallery) front.push(`  - ../../assets/products/${g}`);
    }

    if (Object.keys(item.specs).length) {
      front.push('specs:');
      for (const [k, v] of Object.entries(item.specs)) {
        front.push(`  ${yamlString(k)}: ${yamlString(v)}`);
      }
    }

    if (item.tags.length) {
      front.push(`tags: [${item.tags.map((t) => yamlString(t)).join(', ')}]`);
    }

    if (item.price !== undefined) front.push(`price: ${item.price}`);
    else front.push(`priceNote: ${yamlString(item.priceNote)}`);

    if (item.featured) front.push('featured: true');
    if (Number.isFinite(item.order)) front.push(`order: ${item.order}`);
    if (item.status !== 'active') front.push(`status: ${item.status}`);
    if (item.seoDescription) front.push(`seoDescription: ${yamlString(item.seoDescription)}`);
    if (isPlaceholder) front.push('draft: true');

    front.push('---');

    const body = item.body || `## 제품 개요\n\n${item.summary}`;
    const content = `${front.join('\n')}\n\n${body}\n`;

    if (!opts.dryRun) {
      await mkdir(CONTENT_DIR, { recursive: true });
      await writeFile(mdPath, content, 'utf8');
    }

    written.push(`${item.slug}.md — ${item.title}`);
  }

  // ---------------------------------------------------------------- 리포트

  console.log(`\n${'='.repeat(56)}`);
  console.log(opts.dryRun ? '미리보기 결과 (파일을 쓰지 않았습니다)' : '변환 완료');
  console.log('='.repeat(56));

  console.log(`\n생성${opts.dryRun ? ' 예정' : ''}: ${written.length}개`);
  for (const w of written.slice(0, 10)) console.log(`  + ${w}`);
  if (written.length > 10) console.log(`  … 외 ${written.length - 10}개`);

  if (skipped.length) {
    console.log(`\n건너뜀: ${skipped.length}개`);
    for (const s of skipped) console.log(`  - ${s}`);
  }

  if (noImage.length) {
    console.log(`\n사진 없음: ${noImage.length}개`);
    for (const n of noImage.slice(0, 15)) console.log(`  ! ${n}`);
    if (noImage.length > 15) console.log(`  … 외 ${noImage.length - 15}개`);
    if (!opts.placeholder) {
      console.log('  → 사진을 받은 뒤 다시 실행하거나, --placeholder 로 임시 생성하세요.');
    }
  }

  if (warnings.length) {
    console.log(`\n확인 필요: ${warnings.length}건`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }

  console.log('\n다음 단계');
  if (opts.dryRun) {
    console.log('  1) 위 경고를 확인하고 엑셀을 정리하세요');
    console.log('  2) --dry-run 을 빼고 다시 실행하세요');
  } else {
    console.log('  1) npm run build 로 스키마 검증을 통과하는지 확인하세요');
    console.log('  2) 임시 주소(item-000)가 있으면 실제 모델명으로 바꾸세요');
    if (noImage.length) console.log('  3) draft: true 인 상품은 사진을 넣은 뒤 draft를 지우세요');
  }
  console.log('');
}

main().catch((err) => {
  console.error(`\n오류: ${err.message}\n`);
  process.exit(1);
});
