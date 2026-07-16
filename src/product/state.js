export const PREFERENCES_KEY = 'omnia.product.following.v1';

export function parsePreferences(value, companyIds) {
  const allowed = new Set(companyIds);
  try {
    const parsed = JSON.parse(value || '{}');
    if (parsed.version !== 1 || !Array.isArray(parsed.following)) return [];
    return [...new Set(parsed.following.filter((id) => typeof id === 'string' && allowed.has(id)))];
  } catch {
    return [];
  }
}

export function serializePreferences(following) {
  return JSON.stringify({ version: 1, following: [...new Set(following)] });
}

export function toggleFollowing(following, id) {
  return following.includes(id) ? following.filter((item) => item !== id) : [...following, id];
}

export function toggleQueryValue(search, key, value) {
  const next = new URLSearchParams(search);
  const values = next.getAll(key);
  next.delete(key);
  for (const item of values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value])
    next.append(key, item);
  next.delete('event');
  return next;
}

export function feedCompanyIds(following, selected) {
  return selected.length ? following.filter((id) => selected.includes(id)) : following;
}

export const TRACKER_PLATFORMS = Object.freeze({
  reddit: ['reddit'],
  x: ['x'],
  website: ['news', 'web'],
  youtube: ['youtube'],
  github: ['github'],
  instagram: ['instagram'],
  truthsocial: ['truthsocial'],
  telegram: ['telegram'],
  binance_square: ['binance_square'],
  tiktok: ['tiktok'],
  facebook: ['facebook'],
  linkedin: ['linkedin'],
  bluesky: ['bluesky'],
});

export function currentTracker(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const selected = params.getAll('platform').slice().sort();
  return (
    Object.entries(TRACKER_PLATFORMS).find(
      ([, platforms]) => platforms.slice().sort().join('|') === selected.join('|'),
    )?.[0] || ''
  );
}

export function setTrackerSelection(search, tracker) {
  const params = new URLSearchParams(search);
  const next = TRACKER_PLATFORMS[tracker];
  if (!next) throw new Error('Unknown tracker');
  const active = currentTracker(params) === tracker;
  params.delete('event');
  params.delete('platform');
  params.delete('reddit');
  if (!active) for (const platform of next) params.append('platform', platform);
  return params;
}

// Absent filter means all; an explicit empty selection must mean none.
export function setQuerySelection(search, key, values) {
  const next = new URLSearchParams(search);
  next.delete(key);
  next.delete('event');
  for (const value of values.length ? [...new Set(values)] : ['__none__']) next.append(key, value);
  return next;
}

export function toggleQuerySelection(search, key, value, available) {
  const params = new URLSearchParams(search);
  const selected = params.has(key)
    ? params.getAll(key).filter((item) => item !== '__none__')
    : available;
  return setQuerySelection(
    params,
    key,
    selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
  );
}

export function withoutEvent(search) {
  const next = new URLSearchParams(search);
  next.delete('event');
  return next.toString();
}

export function queryEventPages(repository, query, pageCount) {
  let result = repository.queryEvents({ ...query, limit: 40 });
  const items = [...result.items];
  for (let index = 1; index < pageCount && result.nextCursor; index++) {
    result = repository.queryEvents({ ...query, limit: 40, cursor: result.nextCursor });
    items.push(...result.items);
  }
  return { ...result, items };
}

/** Explicit source browsing must not inherit a preset that disables that source. */
export function selectFeedRepository(repository, personalRepository, search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  return params.has('platform') ? repository : personalRepository;
}
