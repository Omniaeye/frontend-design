import { SOUNDS } from './sounds.js';
const audioData = (value) =>
  typeof value === 'string' &&
  value.length <= 90000 &&
  /^data:audio\/(?:mpeg|mp3|wav|x-wav|ogg|mp4|webm);base64,[A-Za-z0-9+/=]+$/.test(value)
    ? value
    : '';
const strings = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .filter((x) => typeof x === 'string')
      .map((x) => x.slice(0, 300)),
  ),
];
export function panel(value = {}) {
  return {
    coverage: value.coverage === 'all' ? 'all' : 'following',
    relationship: ['linked', 'shared'].includes(value.relationship) ? value.relationship : 'any',
    topicWords: String(value.topicWords || '').slice(0, 300),
    allWords: String(value.allWords || '').slice(0, 300),
    anyWords: String(value.anyWords || '').slice(0, 300),
    phrases: String(value.phrases || '').slice(0, 300),
    notWords: String(value.notWords || '').slice(0, 300),
    searchFields: Array.isArray(value.searchFields)
      ? strings(value.searchFields).filter((x) =>
          ['text', 'context', 'author', 'token'].includes(x),
        )
      : ['text'],
    matchScope: value.matchScope === 'across' ? 'across' : 'same',
    mediaFilter: ['image', 'video', 'any'].includes(value.mediaFilter) ? value.mediaFilter : 'all',
    id: String(value.id || 'panel').slice(0, 80),
    name: String(value.name || 'Latest news').slice(0, 80),
    kind: ['news', 'top', 'tokens'].includes(value.kind) ? value.kind : 'news',
    soundData: audioData(value.soundData),
    soundName: String(value.soundName || '').slice(0, 80),
    companies: value.companies == null ? null : strings(value.companies),
    platforms: strings(value.platforms),
    profiles: strings(value.profiles),
    types: strings(value.types),
    categories: strings(value.categories),
    reddit: strings(value.reddit).filter((x) => ['new', 'hot', 'rising', 'top'].includes(x)),
    query: String(value.query || '').slice(0, 300),
    exclude: String(value.exclude || '').slice(0, 300),
    media: ['full', 'compact', 'hidden'].includes(value.media) ? value.media : 'compact',
    sound: ['off', ...Object.keys(SOUNDS), 'custom'].includes(value.sound) ? value.sound : 'off',
    volume: Math.max(0, Math.min(1, Number.isFinite(value.volume) ? value.volume : 0.4)),
    cooldown: Math.max(5, Math.min(300, Number(value.cooldown) || 15)),
  };
}
export function standard() {
  return {
    version: 1,
    active: 'standard',
    presets: [],
    soundData: '',
    soundName: '',
    workspaces: [
      {
        id: 'standard',
        name: 'Standard',
        panels: [
          panel({ id: 'latest', name: 'Latest news' }),
          panel({ id: 'hot', name: 'Top today', kind: 'top' }),
          panel({ id: 'tokens', name: 'Tokens', kind: 'tokens' }),
        ],
      },
    ],
  };
}
export function normalizeTerminal(value) {
  const base = standard();
  if (!value || !Array.isArray(value.workspaces) || !value.workspaces.length) return base;
  const seen = new Set();
  base.workspaces = value.workspaces
    .filter((w) => w && typeof w.id === 'string' && !seen.has(w.id) && seen.add(w.id))
    .map((w) => {
      const ids = new Set();
      return {
        id: w.id.slice(0, 80),
        name: String(w.name || 'Workspace').slice(0, 80),
        panels: (Array.isArray(w.panels) ? w.panels : [])
          .filter((p) => p && typeof p.id === 'string' && !ids.has(p.id) && ids.add(p.id))
          .map(panel),
      };
    });
  if (!base.workspaces.length) return standard();
  base.active = base.workspaces.some((w) => w.id === value.active)
    ? value.active
    : base.workspaces[0].id;
  base.presets = (Array.isArray(value.presets) ? value.presets : [])
    .filter((p) => p && typeof p.id === 'string')
    .map(panel);
  if (
    typeof value.soundData === 'string' &&
    value.soundData.length <= 90000 &&
    /^data:audio\/(?:mpeg|mp3|wav|x-wav|ogg|mp4|webm);base64,[A-Za-z0-9+/=]+$/.test(value.soundData)
  ) {
    base.soundData = value.soundData;
    base.soundName = String(value.soundName || 'Custom sound').slice(0, 80);
  }
  return base;
}
export function newItems(previous, items) {
  const ids = new Set(items.map((i) => i.id));
  return { ids, fresh: previous ? items.filter((i) => !previous.has(i.id)) : [] };
}
