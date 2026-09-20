import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductRepository,
  createProductRepositoryAsync,
} from '../src/product/data/repository.js';
test('cooperative build yields and preserves queries and profiles', async () => {
  const snapshot = {
    meta: { schemaVersion: 1, mode: 'snapshot' },
    platforms: [],
    companies: [{ id: 'a', name: 'A', ticker: 'A' }],
    sources: [],
    events: Array.from({ length: 5000 }, (_, i) => ({
      id: String(i),
      platform: 'github',
      companyIds: ['a'],
      url: `https://github.com/a/repo/commit/${i}`,
      publishedAt: new Date(1700000000000 + i * 1000).toISOString(),
      title: String(i),
    })),
  };
  let yields = 0;
  const actual = await createProductRepositoryAsync(snapshot, {
    budgetMs: 0,
    yieldTask: async () => {
      yields++;
    },
  });
  const expected = createProductRepository(snapshot);
  assert(yields > 1);
  assert.deepEqual(actual.queryEvents({ limit: 200 }), expected.queryEvents({ limit: 200 }));
  assert.deepEqual(actual.listProfiles(), expected.listProfiles());
  const controller = new AbortController();
  await assert.rejects(
    createProductRepositoryAsync(snapshot, {
      signal: controller.signal,
      budgetMs: 0,
      yieldTask: async () => controller.abort(),
    }),
    { name: 'AbortError' },
  );
});
