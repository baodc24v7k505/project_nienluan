import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/momo-connectivity.js';

function response() {
  return { statusCode: 0, headers: {}, body: null, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
test('connectivity probe rejects anonymous calls without accessing the gateway', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network'); });
  const res = response();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetch.mock.callCount(), 0);
});
test('connectivity probe rejects customer tokens before contacting MoMo', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ role: 'CUSTOMER' }));
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer customer' } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(fetch.mock.callCount(), 1);
});
test('ADMIN probe sends only an empty body and exposes only safe metadata', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? Response.json({ role: 'ADMIN' }) : Response.json({ resultCode: 20, message: 'Internal gateway detail' }, { status: 400 });
  });
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer admin' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls[1].options.body, '{}');
  assert.equal(calls[1].options.headers.Authorization, undefined);
  assert.equal(res.body.httpStatus, 400);
  assert.equal(res.body.resultCode, 20);
  assert.equal(res.body.message, undefined);
});
