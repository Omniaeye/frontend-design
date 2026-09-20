import test from 'node:test';
import assert from 'node:assert/strict';
import { panel, normalizeTerminal, standard } from '../src/product/terminal/model.js';
import { matchRules, contains } from '../src/product/terminal/rules.js';
import { PRESETS } from '../src/product/terminal/catalog.js';
const event = (text, extra = {}) => ({ title: text, ...extra });
test('all words require boundaries and preserve cashtags', () => {
  const p = panel({ allWords: 'coin, mascot' });
  assert(matchRules(event('Our MASCOT coin!'), p).matched);
  assert(!matchRules(event('mascot Coinbase'), p).matched);
  assert(!matchRules(event('mascot coins'), p).matched);
  assert(!contains('$COIN', 'coin'));
  assert(contains('$COIN', '$coin'));
  assert(contains('[mascot]', '[mascot]'));
});
test('any, phrase and exclusions combine without widening results', () => {
  const p = panel({ anyWords: 'pepe, frog', phrases: 'new mascot', notWords: 'giveaway' });
  assert(matchRules(event('Pepe is the new mascot'), p).matched);
  assert(!matchRules(event('pepe mascot new'), p).matched);
  assert(!matchRules(event('pepe new mascot giveaway'), p).matched);
});
test('full post text wins over a truncated title; separate fields are explicit', () => {
  const e = event('mascot', {
    body: 'coin',
    socialMetadata: { contexts: [{ record: { content: { text: 'mascot' } } }] },
  });
  const p = panel({ allWords: 'coin, mascot', searchFields: ['text', 'context'] });
  assert(!matchRules(e, p).matched);
  assert(matchRules(e, { ...p, matchScope: 'across' }).matched);
  assert(
    !matchRules(e, { ...p, matchScope: 'across', allWords: '', phrases: 'coin mascot' }).matched,
  );
});
test('author search is opt-in and includes third parties only when they match', () => {
  const e = event('Hello', { socialMetadata: { account: { handle: 'vladtenev' } } });
  assert(!matchRules(e, panel({ anyWords: 'vladtenev' })).matched);
  assert(matchRules(e, panel({ anyWords: 'vladtenev', searchFields: ['author'] })).matched);
});
test('direct links are evidence, not keyword guesses; shared needs two tokens', () => {
  assert(!matchRules(event('Robinhood token'), panel({ relationship: 'linked' })).matched);
  assert(
    matchRules(event('Hello', { relatedTokenCount: 1 }), panel({ relationship: 'linked' })).matched,
  );
  assert(
    !matchRules(event('Hello', { relatedTokenCount: 1 }), panel({ relationship: 'shared' }))
      .matched,
  );
  assert(matchRules(event('Hello', { hotScore: 2 }), panel({ relationship: 'shared' })).matched);
});
test('media filters and token fields are explicit', () => {
  assert(!matchRules(event('a video'), panel({ mediaFilter: 'video' })).matched);
  assert(
    matchRules(event('', { media: [{ type: 'video' }] }), panel({ mediaFilter: 'video' })).matched,
  );
  assert(
    matchRules(
      { kind: 'token', name: 'Mascot Coin' },
      panel({ allWords: 'mascot,coin', searchFields: ['token'] }),
    ).matched,
  );
});
test('catalog rules survive saved normalization without changing the library', () => {
  const preset = PRESETS.find((x) => x.id === 'rh-meme');
  const s = standard();
  s.workspaces[0].panels[0] = { ...preset.panel, id: 'latest' };
  const saved = normalizeTerminal(s);
  assert.equal(saved.workspaces[0].panels[0].topicWords, preset.panel.topicWords);
  saved.workspaces[0].panels[0].topicWords = 'other';
  assert.notEqual(preset.panel.topicWords, 'other');
  assert.equal(standard().presets.length, 0);
});
test('topic group intersects meme vocabulary, including an author match', () => {
  const p = PRESETS.find((x) => x.id === 'rh-meme').panel;
  assert(matchRules(event('A new mascot on Robinhood Chain'), p).matched);
  assert(!matchRules(event('A new mascot on Solana'), p).matched);
  assert(!matchRules(event('Robinhood earnings'), p).matched);
  assert(
    matchRules(event('Meet our mascot', { socialMetadata: { account: { handle: 'musebook' } } }), p)
      .matched,
  );
});
test('Vlad does not become every Robinhood mention; Muse avoids generic homonyms', () => {
  const v = PRESETS.find((x) => x.id === 'rh-vlad').panel,
    m = PRESETS.find((x) => x.id === 'musebook').panel;
  assert(!matchRules(event('Robinhood news'), v).matched);
  assert(matchRules(event('Vlad Tenev speaks'), v).matched);
  assert(matchRules(event('New agents on Musebook'), m).matched);
  assert(matchRules(event('Launching on $MUSEBOOK'), m).matched);
  assert(!matchRules(event('Muse is my favourite band'), m).matched);
});
