const known = {
  x: [
    'social_post',
    'social_reply',
    'social_quote',
    'social_repost',
    'social_pin',
    'social_unpin',
    'social_delete',
  ],
  reddit: ['submission', 'comment', 'ascension'],
  youtube: ['video', 'short', 'livestream'],
  github: ['commit_push', 'release', 'repository_created'],
  instagram: ['social_post'],
  truthsocial: ['social_post', 'social_reply', 'social_repost'],
  news: ['external_news', 'release', 'release_candidate'],
  web: ['newsroom_page'],
  filings: ['filing'],
};
export function eventCategories(events, platforms) {
  const groups = new Map();
  for (const p of platforms) {
    if (['tokens', 'people', 'j7', 'gmgn'].includes(p.id)) continue;
    groups.set(p.id, { id: p.id, label: p.label, types: new Set(known[p.id] || []) });
  }
  for (const e of events) {
    if (!groups.has(e.platform))
      groups.set(e.platform, { id: e.platform, label: e.platform, types: new Set() });
    if (e.eventType) groups.get(e.platform).types.add(e.eventType);
  }
  return [...groups.values()]
    .filter((g) => g.types.size)
    .map((g) => ({ ...g, types: [...g.types].sort() }));
}
export const typeLabel = (value) =>
  ({
    social_post: 'Post',
    social_reply: 'Reply',
    social_quote: 'Quote',
    social_repost: 'Repost',
    social_pin: 'Pinned post',
    social_unpin: 'Unpinned post',
    social_delete: 'Deleted post',
    submission: 'Post',
    ascension: 'Rising position',
    commit_push: 'Commit',
    external_news: 'Article',
    newsroom_page: 'Newsroom',
    short: 'Short',
    livestream: 'Live stream',
    filing: 'Filing',
    repository_created: 'New repository',
  })[value] || value.replaceAll('_', ' ').replace(/^./, (x) => x.toUpperCase());
export function matchesCategory(event, selections) {
  return (
    !selections?.length ||
    selections.some((key) => {
      const [platform, type] = key.split(':');
      return (
        platform === event.platform &&
        (type.startsWith('@') ? event.redditView === type.slice(1) : event.eventType === type)
      );
    })
  );
}
export function movePanel(panels, id, direction) {
  const next = [...panels],
    i = next.findIndex((p) => p.id === id),
    j = i + direction;
  if (i >= 0 && j >= 0 && j < next.length) [next[i], next[j]] = [next[j], next[i]];
  return next;
}
