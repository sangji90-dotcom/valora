/**
 * dist 를 서빙하는 최소 정적 서버.
 *
 * `astro preview` 를 쓰지 않는 이유:
 * 그 명령은 한 번에 하나만 뜨는 구조라, 다른 터미널에서 이미 켜 두었으면
 * 새 포트를 지정해도 무시되고 검사 스크립트가 연결 실패로 죽습니다.
 * 검사 도구는 남의 환경 상태에 영향을 받으면 안 되므로 직접 띄웁니다.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** 정적 서버를 띄우고 { url, close } 를 돌려줍니다. */
export async function serveDist(root, port = 0) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

      // 상위 경로 탈출 차단
      let file = path.normalize(path.join(root, pathname));
      if (!file.startsWith(path.normalize(root))) {
        res.writeHead(403).end('forbidden');
        return;
      }

      const info = await stat(file).catch(() => null);
      if (info?.isDirectory()) file = path.join(file, 'index.html');

      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      });
      res.end(body);
    } catch {
      // 404 페이지가 있으면 그것을 돌려줍니다 (실제 배포와 같은 동작)
      const notFound = await readFile(path.join(root, '404.html')).catch(() => null);
      if (notFound) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(notFound);
      } else {
        res.writeHead(404).end('not found');
      }
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));
  const actual = server.address().port;

  return {
    url: `http://localhost:${actual}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
