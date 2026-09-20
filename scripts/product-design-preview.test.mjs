import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResponse } from '../src/design-preview.js';

test('design preview blocks account writes and never claims a live stream', () => {
  assert.equal(previewResponse('/api/account/settings', 'POST', {}).status, 403);
  assert.equal(previewResponse('/api/feed/updates', 'GET', {}).status, 403);
  assert.equal(previewResponse('/api/feed/tokens', 'GET', {}).body.live, false);
  assert.equal(previewResponse('/api/account/config', 'GET', {}).body.appId, undefined);
});

test('design preview uses only the empty supplied snapshot and marks presentation access', () => {
  const snapshot = { events: [] };
  assert.equal(previewResponse('/api/feed/snapshot', 'GET', snapshot).body, snapshot);
  assert.equal(previewResponse('/api/feed/access', 'GET', snapshot).body.designPreview, true);
  assert.equal(previewResponse('/api/account/rewards', 'GET', snapshot).status, 501);
  assert.equal(previewResponse('/assets/logo.svg', 'GET', snapshot), null);
});
