import { panel } from './model.js';
const entry = (id, name, category, description, rules) => ({
  id,
  name,
  category,
  description,
  panel: panel({ id, name, coverage: 'all', ...rules }),
});
// Explicit, editable vocabulary; a match does not assert affiliation.
export const ROBINHOOD_WORDS =
  'robinhood, robinhoodapp, robinhoodchain, robinhood chain, vlad tenev, vladtenev, baiju bhatt, musebook, musepad, musegram';
export const MUSE_WORDS =
  'musebook, $musebook, musebook.lol, musegram, musegram.lol, musepad, $musepad, musepadlol, muse.ai, @muse';
const MEME_WORDS =
  'meme, memes, memecoin, memecoins, mascot, mascots, coin, coins, pepe, frog, doge, shiba, cat, dog, kitten, puppy, lore, character';
export const PRESETS = [
  entry('global-coin-mascot', 'COIN + MASCOT ANY', 'Global', 'coin OR mascot', {
    anyWords: 'coin, mascot',
  }),
  entry('global-coin', 'Coin Any', 'Global', 'coin', { anyWords: 'coin' }),
  entry('global-mascot', 'Mascot Any', 'Global', 'mascot', { anyWords: 'mascot' }),
  entry('global-reddit', 'Reddit Rising', 'Global', 'Reddit Rising', {
    platforms: ['reddit'],
    categories: ['reddit:@rising'],
  }),
  entry('global-reddit-hot', 'Reddit Hot', 'Global', 'Reddit Hot', {
    platforms: ['reddit'],
    categories: ['reddit:@hot'],
  }),
  entry('rh-vlad', 'Vlad', 'Robinhood', 'Vlad Tenev: posts and mentions', {
    anyWords: 'vlad tenev, vladtenev, vladimir tenev',
    searchFields: ['text', 'author'],
  }),
  entry(
    'rh-founders',
    'Founder Robinhood',
    'Robinhood',
    'Vlad Tenev and Baiju Bhatt: posts and mentions',
    {
      anyWords: 'vlad tenev, vladtenev, vladimir tenev, baiju bhatt, baijubhatt',
      searchFields: ['text', 'author'],
    },
  ),
  entry(
    'rh-ecosystem',
    'Ecosystem Robinhood',
    'Robinhood',
    'Robinhood, its founders and the Muse ecosystem',
    { anyWords: ROBINHOOD_WORDS, searchFields: ['text', 'author'] },
  ),
  entry('rh-meme', 'Meme Robinhood', 'Robinhood', 'Robinhood ecosystem AND meme vocabulary', {
    topicWords: ROBINHOOD_WORDS,
    anyWords: MEME_WORDS,
    searchFields: ['text', 'author'],
    matchScope: 'across',
  }),
  entry('muse', 'Muse', 'Musebook', 'Muse AND AI, Meta or agent context', {
    topicWords: 'muse, @muse, muse.ai',
    anyWords:
      'ai, meta, $meta, agent, agents, assistant, assistants, musebook, musegram, musepad, zuckerberg, alexandr wang',
    searchFields: ['text', 'author'],
    matchScope: 'across',
  }),
  entry('musebook', 'Musebook', 'Musebook', 'Musebook, Musegram, Musepad and Muse references', {
    anyWords: MUSE_WORDS,
    searchFields: ['text', 'author'],
  }),
  entry('muse-launches', 'Muse Launches', 'Musebook', 'Muse ecosystem AND launch activity', {
    topicWords: MUSE_WORDS,
    anyWords:
      'launch, launched, launches, launching, deploy, deployed, token, paired, graduation, graduated, bonding',
    searchFields: ['text', 'author'],
    matchScope: 'across',
  }),
  entry('muse-mascots', 'Muse Mascots', 'Musebook', 'Muse ecosystem AND characters or mascots', {
    topicWords: MUSE_WORDS,
    anyWords: 'mascot, mascots, pet, pets, cat, dog, kitten, puppy, character, frog, pepe',
    searchFields: ['text', 'author'],
    matchScope: 'across',
  }),
  entry('global-pepe', 'Pepe', 'Global', 'pepe or $PEPE', { anyWords: 'pepe, $pepe' }),
];
