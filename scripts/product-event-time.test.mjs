import test from 'node:test';
import assert from 'node:assert/strict';
import { eventTime } from '../src/product/event-time.mjs';
test('publication includes seconds and converts explicit offsets to UTC', () => {
  const result = eventTime({
    publishedAt: '2026-09-20T12:34:56-03:00',
    observedAt: '2026-09-21T00:00:00Z',
  });
  assert.match(result.label, /20 Sept 2026, 15:34:56 UTC/);
  assert.equal(result.title, 'Published at (UTC)');
});
test('date-only publication never invents midnight', () => {
  assert.match(eventTime({ publishedDate: '2026-09-20' }).label, /time unavailable/);
});
test('missing or invalid publication explicitly identifies received time', () => {
  const result = eventTime({ publishedAt: 'invalid', observedAt: '2026-09-20T15:01:02Z' });
  assert.match(result.label, /^Received .*15:01:02 UTC$/);
  assert.match(result.title, /unverified/);
  assert.equal(eventTime({}).label, 'Time unavailable');
});
