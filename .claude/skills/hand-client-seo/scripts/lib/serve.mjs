// A throwaway static server so a local build (a client's dist-preview/, a
// folder under web/) can be audited with the same crawler as a live site.
// Mirrors the Netlify basics: index.html for a directory, 404.html for a
// miss, a 301 to the trailing slash for a directory asked without one.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};

// → { origin, port, close() }. `mount` serves the folder under a sub-path
// (web/threehandshealing is published at /threehandshealing/).
export function serveDir(dir, { mount = '/' } = {}) {
  const root = resolve(dir);
  const base = `/${mount.replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
  const server = createServer((req, res) => {
    const send = (status, type, body, extra = {}) => {
      res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...extra });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      return send(400, 'text/plain', 'bad request');
    }
    if (base && path === base) return send(301, 'text/plain', '', { location: `${base}/` });
    if (base && !path.startsWith(`${base}/`)) return send(404, 'text/plain', 'not found');
    const rel = normalize(path.slice(base.length)).replace(/^(\.\.(\/|\\|$))+/, '');
    let file = join(root, rel);
    if (file !== root && !file.startsWith(root + sep)) return send(403, 'text/plain', 'forbidden');
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith('/')) return send(301, 'text/plain', '', { location: `${path}/` });
      file = join(file, 'index.html');
    } else if (!existsSync(file) && existsSync(`${file}.html`)) {
      file = `${file}.html`;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      const notFound = join(root, '404.html');
      return existsSync(notFound) ? send(404, TYPES['.html'], readFileSync(notFound)) : send(404, 'text/plain', 'not found');
    }
    send(200, TYPES[extname(file).toLowerCase()] || 'application/octet-stream', readFileSync(file));
  });
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      done({
        origin: `http://127.0.0.1:${port}`,
        port,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
