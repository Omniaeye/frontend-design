import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryDailyTop } from '../src/product/daily-feed.js';

const now = Date.parse('2026-09-14T12:00:00Z');
const event = (id, publishedAt, companyIds = ['a'], relatedTokenCount = 1) => ({
  id,
  publishedAt,
  publishedDate: null,
  observedAt: null,
  companyIds,
  hotScore: relatedTokenCount,
  hotActivityAt: publishedAt,
});
function repository(items, verify = () => {}) {
  return {
    queryEvents(query) {
      verify(query);
      const offset = Number(query.cursor || 0);
      return {
        items: items.slice(offset, offset + 200),
        nextCursor: offset + 200 < items.length ? String(offset + 200) : null,
      };
    },
  };
}
test('daily feed requires verified activity today, never substitutes observation or publication', () => {
  const items = [
    event('old', '2026-09-13T23:59:59Z'),
    event('today', '2026-09-14T00:00:00Z'),
    event('future', '2026-09-14T13:00:00Z'),
    { ...event('observed', null), observedAt: '2026-09-14T09:00:00Z' },
    { ...event('date-only', null), publishedDate: '2026-09-14' },
  ];
  assert.deepEqual(
    queryDailyTop(repository(items), {}, now).items.map((item) => item.id),
    ['today'],
  );
  assert.equal(queryDailyTop(repository([items[0]]), {}, now).total, 0);
});
test('daily ranking uses verified activity score, then activity recency', () => {
  const items = [
    event('recent', '2026-09-14T11:00:00Z', ['a'], 1),
    event('broad', '2026-09-14T08:00:00Z', ['a', 'b'], 4),
    event('other', '2026-09-14T10:00:00Z', ['a', 'c', 'd'], 1),
  ];
  const result = queryDailyTop(repository(items), { companyIds: ['a', 'b'] }, now);
  assert.deepEqual(
    result.items.map((item) => item.id),
    ['broad', 'recent', 'other'],
  );
  assert.equal(result.items[0].score, undefined);
});

test('Top never fills empty positions with unrelated tokens or zero counts', () => {
  const items = [
    event('zero', '2026-09-14T11:00:00Z', ['a'], 0),
    event('linked', '2026-09-14T10:00:00Z', ['a'], 2),
  ];
  assert.deepEqual(
    queryDailyTop(repository(items), {}, now).items.map((x) => x.id),
    ['linked'],
  );
});
test('daily feed forwards tracking filters, ignores historical period and ranks beyond first page', () => {
  const items = Array.from({ length: 205 }, (_, i) => event(String(i), '2026-09-14T09:00:00Z'));
  items.push(event('winner', '2026-09-14T10:00:00Z', ['a', 'b'], 9));
  const result = queryDailyTop(
    repository(items, (query) => {
      assert.deepEqual(query.companyIds, ['a', 'b']);
      assert.deepEqual(query.platforms, ['x']);
      assert.deepEqual(query.profileIds, ['profile']);
      assert.deepEqual(query.eventTypes, ['post']);
      assert.equal(query.query, 'NVIDIA');
      assert.equal(query.since, undefined);
      assert.equal(query.until, undefined);
    }),
    {
      companyIds: ['a', 'b'],
      platforms: ['x'],
      profileIds: ['profile'],
      eventTypes: ['post'],
      query: 'NVIDIA',
      since: '2026-09-01',
      until: '2026-09-02',
    },
    now,
  );
  assert.equal(result.total, 20);
  assert.equal(result.items[0].id, 'winner');
  assert.equal(result.nextCursor, null);
});

test('old publication can be hot today; publication alone is never hot', () => {
  const item = {
    ...event('resurfaced', '2020-01-01T00:00:00Z'),
    hotActivityAt: '2026-09-14T09:00:00Z',
  };
  assert.deepEqual(
    queryDailyTop(repository([item]), {}, now).items.map((x) => x.id),
    ['resurfaced'],
  );
  assert.equal(queryDailyTop(repository([{ ...item, hotActivityAt: null }]), {}, now).total, 0);
});
