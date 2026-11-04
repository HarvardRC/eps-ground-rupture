// The browser lane's static server (docs/app/ddd.md §7.5, Static server).
//
// Serves a built site tree — the strict preview build
// subprojects/mkdocs/site-preview/ — under the path of the site's
// published address, with headers that mirror the published host
// (GitHub Pages). Node.js built-in modules only, no package.
//
//   <node> playwright/serve.mjs --root ../mkdocs/site-preview \
//     --site-url https://harvardrc.github.io/eps-ground-rupture/ --port 4173
//
// Flags: --root (the tree), --site-url (the mkdocs.yml site_url, whose
// path is BASE_PATH), --port, --max-age (Cache-Control, default 600), and
// --host (the bind address, default 127.0.0.1). Started by hand it runs
// in the form of Node.js outside Gradle (§2).

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

// ---- Flags --------------------------------------------------------------

/** Parses `--name value` pairs; an unknown flag or a flag without a value stops the server. */
function parseFlags(argv) {
  const known = new Set(['--root', '--site-url', '--port', '--max-age', '--host']);
  const flags = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i];
    const value = argv[i + 1];
    if (!known.has(name) || value === undefined) {
      throw new Error(`serve.mjs: unknown flag or missing value: ${name}`);
    }
    flags.set(name, value);
  }
  for (const required of ['--root', '--site-url', '--port']) {
    if (!flags.has(required)) throw new Error(`serve.mjs: ${required} is required`);
  }
  return flags;
}

const flags = parseFlags(process.argv.slice(2));
const ROOT = resolve(flags.get('--root'));
const SITE_URL = flags.get('--site-url');
const PORT = Number(flags.get('--port'));
const MAX_AGE = Number(flags.get('--max-age') ?? '600');
const HOST = flags.get('--host') ?? '127.0.0.1';
const BASE_PATH = new URL(SITE_URL).pathname;
const BASE_NO_SLASH = BASE_PATH.replace(/\/$/, '');

if (!Number.isInteger(PORT) || PORT <= 0) throw new Error(`serve.mjs: --port must be a port number`);
if (!Number.isInteger(MAX_AGE) || MAX_AGE < 0) throw new Error(`serve.mjs: --max-age must be a whole number of seconds`);

// ---- Headers mirroring the published host -------------------------------

/** The fixed Content-Type map (§7.5); anything else is application/octet-stream. */
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml',
  '.gz': 'application/gzip',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** The extensions served with gzip Content-Encoding when the request accepts it. */
const COMPRESSED = new Set(['.html', '.js', '.css', '.json', '.xml', '.svg']);

const contentType = (path) => CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';

/** Whether the request's Accept-Encoding includes gzip. */
function acceptsGzip(req) {
  const header = req.headers['accept-encoding'] ?? '';
  return header
    .split(',')
    .map((part) => part.trim().split(';')[0].trim().toLowerCase())
    .includes('gzip');
}

/** The one transformation (§7.5): sitemap.xml with every SITE_URL replaced by this server's origin and BASE_PATH. */
function transform(path, bytes) {
  if (path.endsWith('/sitemap.xml') || path === 'sitemap.xml') {
    const local = `http://127.0.0.1:${PORT}${BASE_PATH}`;
    return Buffer.from(bytes.toString('utf8').split(SITE_URL).join(local), 'utf8');
  }
  return bytes;
}

// ---- Responses ------------------------------------------------------------

/** Ends a response without a body. */
function bare(res, status, headers = {}) {
  res.writeHead(status, { Vary: 'Accept-Encoding', 'Content-Length': '0', ...headers });
  res.end();
}

/**
 * Sends a file's bytes with the published host's headers: Content-Type,
 * Cache-Control, Last-Modified, an ETag over the body a GET returns,
 * Vary, and gzip Content-Encoding for the compressible classes. `status`
 * 200 honours If-None-Match and If-Modified-Since with 304.
 */
function sendFile(req, res, status, file, servedPath) {
  const stat = statSync(file);
  let body = transform(servedPath, readFileSync(file));
  const headers = {
    'Content-Type': contentType(file),
    'Cache-Control': `max-age=${MAX_AGE}`,
    'Last-Modified': new Date(Math.floor(stat.mtimeMs / 1000) * 1000).toUTCString(),
    Vary: 'Accept-Encoding',
  };
  if (COMPRESSED.has(extname(file).toLowerCase()) && acceptsGzip(req)) {
    body = gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
  }
  headers.ETag = `"${createHash('sha256').update(body).digest('hex').slice(0, 32)}"`;
  if (status === 200) {
    const inm = req.headers['if-none-match'];
    const ims = req.headers['if-modified-since'];
    // 304 on a matching If-None-Match or on an If-Modified-Since not earlier than Last-Modified (§7.5).
    let notModified = false;
    if (inm !== undefined) {
      notModified = inm
        .split(',')
        .map((tag) => tag.trim().replace(/^W\//, ''))
        .some((tag) => tag === headers.ETag || tag === '*');
    }
    if (!notModified && ims !== undefined) {
      const since = Date.parse(ims);
      notModified = !Number.isNaN(since) && since >= Date.parse(headers['Last-Modified']);
    }
    if (notModified) {
      const { 'Content-Type': _type, 'Content-Encoding': _encoding, ...kept } = headers;
      res.writeHead(304, kept);
      res.end();
      return;
    }
  }
  headers['Content-Length'] = String(body.length);
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** Whether `file` is an existing regular file / directory. */
const isFile = (file) => {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
};
const isDirectory = (file) => {
  try {
    return statSync(file).isDirectory();
  } catch {
    return false;
  }
};

/** 404 with the bytes of the tree's 404.html. */
function notFound(req, res) {
  const page = join(ROOT, '404.html');
  if (isFile(page)) sendFile(req, res, 404, page, '404.html');
  else bare(res, 404);
}

/** The absolute URL of `path` on the origin the request named. */
function absolute(req, path) {
  const host = req.headers.host ?? `${HOST}:${PORT}`;
  return `http://${host}${path}`;
}

/** Handles one request in the §7.5 order. */
function handle(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    bare(res, 405, { Allow: 'GET, HEAD' });
    return;
  }
  const raw = req.url ?? '/';
  const q = raw.indexOf('?');
  const rawPath = q === -1 ? raw : raw.slice(0, q);
  const query = q === -1 ? '' : raw.slice(q);
  let path;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    bare(res, 400);
    return;
  }
  if (path.includes('\0') || path.split('/').includes('..')) {
    bare(res, 400);
    return;
  }
  if (path === '/' || path === BASE_NO_SLASH) {
    bare(res, 301, { Location: absolute(req, BASE_PATH) });
    return;
  }
  if (!path.startsWith(BASE_PATH)) {
    notFound(req, res);
    return;
  }
  const relative = path.slice(BASE_PATH.length);
  const file = join(ROOT, relative);
  if (path.endsWith('/')) {
    const index = join(file, 'index.html');
    if (isFile(index)) sendFile(req, res, 200, index, `${relative}index.html`);
    else notFound(req, res);
    return;
  }
  if (isDirectory(file)) {
    bare(res, 301, { Location: absolute(req, `${rawPath}/${query}`) });
    return;
  }
  if (isFile(file)) {
    sendFile(req, res, 200, file, relative);
    return;
  }
  notFound(req, res);
}

createServer((req, res) => {
  try {
    handle(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) bare(res, 500);
    else res.end();
  }
}).listen(PORT, HOST, () => {
  console.log(`serve.mjs: ${ROOT} at http://${HOST}:${PORT}${BASE_PATH}`);
});
