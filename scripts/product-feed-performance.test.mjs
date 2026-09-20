import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductRepository } from '../src/product/data/repository.js';
test('pagination reuses the filtered result instead of rescanning every page', () => {
  let checks = 0;
  const events = Array.from({ length: 600 }, (_, i) => ({
    id: String(i),
    companyIds: ['a'],
    platform: 'news',
    eventType: 'post',
    title: 'post',
    url: 'https://example.com/' + i,
    publishedAt: '2026-09-19T12:00:00Z',
  }));
  const repo = createProductRepository({
    meta: { schemaVersion: 1, mode: 'snapshot' },
    companies: [{ id: 'a' }],
    sources: [],
    platforms: [],
    events,
  });
  for (let i = 0; i < 600; i++) {
    const e = repo.getEvent(String(i));
    Object.defineProperty(e, 'companyIds', {
      get() {
        checks++;
        return ['a'];
      },
    });
  }
  let cursor = null;
  do {
    cursor = repo.queryEvents({ companyIds: ['a'], limit: 200, cursor }).nextCursor;
  } while (cursor);
  assert.equal(checks, 600);
  assert.equal(repo.queryEvents({ companyIds: [], limit: 200 }).total, 0);
  assert.equal(repo.queryEvents({ companyIds: ['a'], query: 'missing' }).total, 0);
  assert.equal(repo.queryEvents({ companyIds: ['a'], limit: 1 }).total, 600);
});
