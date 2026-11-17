import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/momo-connectivity.js';

function request(token) {
  return new Request('https://example.test/api/momo-connectivity', {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
test('connectivity probe rejects anonymous calls without accessing the gateway', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network'); });
  const res = await handler(request());
  assert.equal(res.status, 401);
  assert.equal(fetch.mock.callCount(), 0);
});
test('connectivity probe rejects customer tokens before contacting MoMo', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ role: 'CUSTOMER' }));
  const res = await handler(request('customer'));
  assert.equal(res.status, 403);
  assert.equal(fetch.mock.callCount(), 1);
});
test('ADMIN probe sends only an empty body and exposes only safe metadata', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? Response.json({ role: 'ADMIN' }) : Response.json({ resultCode: 20, message: 'Internal gateway detail' }, { status: 400 });
  });
  const res = await handler(request('admin'));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(calls[1].options.body, '{}');
  assert.equal(calls[1].options.headers.Authorization, undefined);
  assert.equal(body.httpStatus, 400);
  assert.equal(body.resultCode, 20);
  assert.equal(body.message, undefined);
});
