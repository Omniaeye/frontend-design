import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../src/product/account/request.js';
test('account GET recovers during an API restart without a false empty list', async () => {
  let calls = 0;
  const data = await requestJson(
    '/x/posts',
    { method: 'GET' },
    async () => {
      calls++;
      if (calls === 1) throw Error('connection refused');
      return new Response(JSON.stringify({ posts: [{ id: '123' }] }));
    },
    async () => {},
  );
  assert.equal(calls, 2);
  assert.equal(data.posts.length, 1);
});
test('account reads retry server failures but never retry unauthorized or writes', async () => {
  for (const [method, status, expected] of [
    ['GET', 503, 3],
    ['GET', 401, 1],
    ['GET', 429, 1],
    ['POST', 503, 1],
  ]) {
    let calls = 0;
    await assert.rejects(
      requestJson(
        '/x/posts',
        { method },
        async () => {
          calls++;
          return new Response(JSON.stringify({ error: 'Known failure' }), { status });
        },
        async () => {},
      ),
      /Known failure/,
    );
    assert.equal(calls, expected);
  }
});
