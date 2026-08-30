const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { createServer, resolveRequestPath } = require('../dev-server.cjs');

test('resolves public files inside the project root', () => {
  assert.equal(resolveRequestPath('/'), path.resolve(__dirname, '..', 'index.html'));
  assert.equal(resolveRequestPath('/styles.css'), path.resolve(__dirname, '..', 'styles.css'));
});

test('rejects malformed encoded paths', () => {
  assert.equal(resolveRequestPath('/%E0%A4%A'), null);
});

test('serves the app with security headers', async (context) => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();

  const response = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/`, resolve).on('error', reject);
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.match(response.headers['content-security-policy'], /default-src 'self'/);
  response.resume();
});
