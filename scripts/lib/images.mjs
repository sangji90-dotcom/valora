/**
 * 이미지 찾기 + 최적화.
 *
 * 고객사는 이미지를 "제품사진" 폴더에 던져주고,
 * 엑셀에는 파일명을 적거나 아예 안 적습니다. 둘 다 처리합니다.
 */
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tif', '.tiff']);

/** 파일명 비교용 정규화 — 확장자·공백·특수문자 무시, 대소문자 무시 */
function normalizeName(name) {
  return path
    .basename(name, path.extname(name))
    .toLowerCase()
    .replace(/[\s_\-()[\]]/g, '')
    .trim();
}

/** 이미지 폴더를 재귀 없이 한 번 읽어 색인을 만듭니다 */
export async function indexImageDir(dir) {
  if (!dir) return { byNormalized: new Map(), files: [] };

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    throw new Error(`이미지 폴더를 열 수 없습니다: ${dir}`);
  }

  const byNormalized = new Map();
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) continue;

    const full = path.join(dir, entry.name);
    files.push(full);

    const key = normalizeName(entry.name);
    // 같은 이름이 여러 개면 첫 번째를 씁니다 (a.jpg / a.png 등)
    if (!byNormalized.has(key)) byNormalized.set(key, full);
  }

  return { byNormalized, files };
}

/**
 * 한 상품에 쓸 이미지 파일들을 찾습니다.
 *  1) 엑셀의 이미지 열에 적힌 파일명
 *  2) 없으면 slug / 제품명과 같은 이름의 파일
 *  3) 없으면 "slug-1", "slug-2" 같은 연번 파일
 */
export function resolveImages({ names, slug, title, index }) {
  const found = [];
  const missing = [];

  for (const name of names) {
    const hit = index.byNormalized.get(normalizeName(name));
    if (hit) found.push(hit);
    else missing.push(name);
  }

  if (found.length === 0) {
    for (const candidate of [slug, title]) {
      const hit = candidate && index.byNormalized.get(normalizeName(candidate));
      if (hit) {
        found.push(hit);
        break;
      }
    }
  }

  // 연번 파일 추가 수집 (slug-1, slug-2 …)
  if (slug) {
    for (let i = 1; i <= 9; i += 1) {
      const hit = index.byNormalized.get(normalizeName(`${slug}-${i}`));
      if (hit && !found.includes(hit)) found.push(hit);
    }
  }

  return { found, missing };
}

/**
 * 이미지를 src/assets/products 로 복사하면서 과대 이미지를 줄입니다.
 * 원본이 5000px짜리 사진인 경우가 흔한데, 그대로 두면 빌드가 크게 느려집니다.
 */
export async function optimizeInto(sourcePath, destDir, baseName, { maxWidth = 1600 } = {}) {
  await mkdir(destDir, { recursive: true });

  const image = sharp(sourcePath, { failOn: 'none' });
  const meta = await image.metadata();

  const ext = path.extname(sourcePath).toLowerCase();
  const keepPng = ext === '.png' && meta.hasAlpha;
  const outExt = keepPng ? '.png' : '.jpg';
  const outPath = path.join(destDir, `${baseName}${outExt}`);

  let pipeline = image.rotate(); // EXIF 회전 반영

  if (meta.width && meta.width > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  pipeline = keepPng ? pipeline.png({ compressionLevel: 9 }) : pipeline.jpeg({ quality: 82, mozjpeg: true });

  await pipeline.toFile(outPath);

  return {
    outPath,
    fileName: path.basename(outPath),
    originalWidth: meta.width ?? null,
    resized: Boolean(meta.width && meta.width > maxWidth),
  };
}

/** 이미지가 없는 상품용 — 회색 placeholder를 만들어 작업이 막히지 않게 합니다 */
export async function makePlaceholder(destDir, baseName, label) {
  await mkdir(destDir, { recursive: true });
  const outPath = path.join(destDir, `${baseName}.jpg`);

  const safe = String(label ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 24);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <rect width="1200" height="900" fill="#e4e7ec"/>
    <text x="600" y="440" text-anchor="middle" font-family="Arial, sans-serif"
          font-size="44" fill="#6b7280">${safe}</text>
    <text x="600" y="500" text-anchor="middle" font-family="Arial, sans-serif"
          font-size="28" fill="#9aa4b2">이미지 준비 중</text>
  </svg>`;

  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(outPath);
  return { outPath, fileName: path.basename(outPath) };
}
