// Turkey Escape — tiny static file server for local play-testing.
// Written from scratch in this session (27 Nov 2026 rewrite).
// Serves the game/ directory over plain HTTP with no dependencies.
// Node 22, stdlib only.
//
// Usage: node serve.ts [--port 8080] [--root ./game]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

function flagValue(argv: string[], name: string, fallback: string): string {
  const idx = argv.indexOf(name);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return fallback;
}

const port = Number.parseInt(flagValue(process.argv.slice(2), '--port', '8080'), 10) || 8080;
const root = path.resolve(flagValue(process.argv.slice(2), '--root', path.join(repoRoot, 'game')));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.normalize(path.join(root, pathname));
    // Never serve outside the game directory.
    if (!filePath.startsWith(root + path.sep) && filePath !== root) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('forbidden');
      return;
    }
    const bytes = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'content-length': bytes.length,
      'cache-control': 'no-store',
    });
    res.end(bytes);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} on http://127.0.0.1:${port}`);
});
