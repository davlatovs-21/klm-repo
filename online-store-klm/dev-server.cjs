const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.KLM_HOST || '127.0.0.1';
const PORT = Number(process.env.KLM_PORT) || 8000;
const PUBLIC_ROOT = path.resolve(__dirname);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function resolveRequestPath(requestUrl = '/') {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }

  if (pathname === '/') pathname = '/index.html';
  const relativePath = pathname.replace(/^[/\\]+/, '');
  const filePath = path.resolve(PUBLIC_ROOT, relativePath);
  const relativeToRoot = path.relative(PUBLIC_ROOT, filePath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) return null;
  return filePath;
}

function send(response, statusCode, body = '') {
  response.writeHead(statusCode, {
    ...securityHeaders,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function handleRequest(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    send(response, 405, 'Method not allowed');
    return;
  }

  const filePath = resolveRequestPath(request.url);
  if (!filePath) {
    send(response, 400, 'Bad request');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      send(response, 404, 'Not found');
      return;
    }

    response.writeHead(200, {
      ...securityHeaders,
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!response.headersSent) send(response, 500, 'Internal server error');
      else response.destroy();
    });
    stream.pipe(response);
  });
}

function createServer() {
  return http.createServer(handleRequest);
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`KLM Manager: http://${HOST}:${PORT}`);
  });
}

module.exports = { createServer, resolveRequestPath, securityHeaders };
