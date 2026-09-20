import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTerminal, standard, panel, newItems } from '../src/product/terminal/model.js';
import { normalizeSettings } from '../src/product/account/model.js';
test('standard has independent news, hot and token panels with sound off', () => {
  const s = standard();
  assert.deepEqual(
    s.workspaces[0].panels.map((p) => p.kind),
    ['news', 'top', 'tokens'],
  );
  assert.ok(s.workspaces[0].panels.every((p) => p.sound === 'off' && p.companies === null));
});
test('account normalization persists workspaces, per-panel filters and custom sounds', () => {
  const s = standard();
  s.workspaces[0].panels[0] = panel({
    id: 'yt',
    name: 'YouTube ten',
    companies: ['a', 'b'],
    platforms: ['youtube'],
    profiles: ['one'],
    types: ['video'],
    sound: 'custom',
    soundData: 'data:audio/wav;base64,AAAA',
    volume: 0,
  });
  s.presets = [s.workspaces[0].panels[0]];
  assert.deepEqual(normalizeSettings({ terminal: s }).terminal, s);
  assert.equal(s.workspaces[0].panels[1].companies, null);
});
test('empty selection stays empty, unsafe custom audio and invalid values rejected', () => {
  const p = panel({
    companies: [],
    volume: 99,
    cooldown: -1,
    soundData: 'https://untrusted.example/audio.mp3',
  });
  assert.deepEqual(p.companies, []);
  assert.equal(p.volume, 1);
  assert.equal(p.cooldown, 5);
  assert.equal(p.soundData, '');
  assert.deepEqual(normalizeTerminal({ workspaces: [] }), standard());
});
test('first load and repeated items do not create alerts', () => {
  const first = newItems(null, [{ id: 'a' }]);
  assert.equal(first.fresh.length, 0);
  assert.equal(newItems(first.ids, [{ id: 'a' }]).fresh.length, 0);
  assert.deepEqual(newItems(first.ids, [{ id: 'b' }, { id: 'a' }]).fresh, [{ id: 'b' }]);
});

import { SOUNDS } from '../src/product/terminal/sounds.js';
import { eventCategories, matchesCategory, movePanel } from '../src/product/terminal/categories.js';
test('all ten sound choices survive account normalization', () => {
  assert.equal(Object.keys(SOUNDS).length, 10);
  for (const sound of Object.keys(SOUNDS)) {
    assert.equal(panel({ sound }).sound, sound);
    assert(SOUNDS[sound].every((hz) => hz > 100 && hz < 2000));
  }
});
test('categorized selection scopes shared post types and ORs Reddit rankings', () => {
  const choices = ['x:social_post', 'reddit:@hot'];
  assert(matchesCategory({ platform: 'x', eventType: 'social_post' }, choices));
  assert(!matchesCategory({ platform: 'instagram', eventType: 'social_post' }, choices));
  assert(
    matchesCategory({ platform: 'reddit', eventType: 'submission', redditView: 'hot' }, choices),
  );
  assert(
    !matchesCategory({ platform: 'reddit', eventType: 'submission', redditView: 'new' }, choices),
  );
  assert.deepEqual(panel({ categories: choices }).categories, choices);
});
test('event groups preserve new observed types and known empty categories', () => {
  const groups = eventCategories(
    [{ platform: 'github', eventType: 'new_observed_type' }],
    [
      { id: 'github', label: 'GitHub' },
      { id: 'x', label: 'X' },
    ],
  );
  assert(groups.find((g) => g.id === 'github').types.includes('new_observed_type'));
  assert(groups.find((g) => g.id === 'x').types.includes('social_quote'));
});
test('panel movement is reversible and respects boundaries without mutating source', () => {
  const original = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const moved = movePanel(original, 'a', 1);
  assert.deepEqual(
    moved.map((x) => x.id),
    ['b', 'a', 'c'],
  );
  assert.deepEqual(movePanel(moved, 'a', -1), original);
  assert.deepEqual(movePanel(original, 'a', -1), original);
  assert.deepEqual(
    movePanel(original, 'a', 2).map((x) => x.id),
    ['c', 'b', 'a'],
  );
});
