import { runCooperatively, runSynchronously } from './cooperative.mjs';
/** Read-only product data. A snapshot is archived material, never a live connection. */
export async function loadProductRepository({
  signal,
  url = '/app-data/snapshot.json',
  fetcher = globalThis.fetch,
} = {}) {
  const response = await fetcher(url, { signal, cache: 'no-cache', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Unable to load company archive (${response.status}).`);
  return createProductRepositoryAsync(await response.json(), { signal });
}

const text = (value) => String(value ?? '').toLocaleLowerCase('en');
const matchesSet = (selected, values) =>
  selected === undefined || values.some((value) => selected.has(value));
const eventTime = (event) => event.publishedAt ?? event.observedAt;

/** A profile is an exact account/community/repository or an explicitly identified source. */
export function profileDescriptor(record) {
  const platform = record.platform;
  const inputUrl = record.sourceProfileUrl ?? record.url ?? record.sourceUrl;
  let url;
  try {
    url = inputUrl ? new URL(inputUrl) : null;
  } catch {
    url = null;
  }
  const host = url?.hostname.toLowerCase().replace(/^www\./, '') ?? '';
  const parts = url?.pathname.split('/').filter(Boolean) ?? [];
  let identity = url
    ? `${url.origin}${url.pathname.replace(/\/$/, '')}${url.search}`
    : `source:${record.id}`;
  let label = record.sourceLabel || record.title || 'Source record';
  let profileUrl = inputUrl ?? null;
  let kind = 'source';
  let note = 'Source identified by its original record; no account ownership is inferred.';

  if (
    platform === 'x' &&
    ['x.com', 'twitter.com', 'mobile.twitter.com'].includes(host) &&
    /^[a-zA-Z0-9_]{1,15}$/.test(parts[0] ?? '') &&
    !['i', 'home', 'search', 'intent', 'share', 'explore'].includes(parts[0].toLowerCase())
  ) {
    identity = `account:${parts[0].toLowerCase()}`;
    label = `@${parts[0]}`;
    profileUrl = `https://x.com/${parts[0].toLowerCase()}`;
    kind = 'account';
    note =
      'Exact account handle in the source URL. Ownership is not inferred from a shared domain.';
  } else if (
    platform === 'reddit' &&
    (host === 'reddit.com' || host.endsWith('.reddit.com')) &&
    ['r', 'u', 'user'].includes(parts[0]?.toLowerCase()) &&
    parts[1]
  ) {
    const type = parts[0].toLowerCase() === 'r' ? 'community' : 'account';
    identity = `${type}:${parts[1].toLowerCase()}`;
    label = `${type === 'community' ? 'r' : 'u'}/${parts[1]}`;
    profileUrl = `https://www.reddit.com/${type === 'community' ? 'r' : 'user'}/${parts[1].toLowerCase()}/`;
    kind = type;
    note = 'Exact community or user path in the source URL; related communities remain separate.';
  } else if (
    platform === 'github' &&
    host === 'github.com' &&
    parts.length >= 2 &&
    !['orgs', 'users', 'settings', 'search'].includes(parts[0])
  ) {
    identity = `repository:${parts[0].toLowerCase()}/${parts[1].toLowerCase()}`;
    label = `${parts[0]}/${parts[1]}`;
    profileUrl = `https://github.com/${parts[0]}/${parts[1]}`;
    kind = 'repository';
    note =
      'Exact repository path in the source URL. Repositories under the same owner remain separate.';
  } else if (platform === 'youtube' && ['youtube.com', 'm.youtube.com'].includes(host)) {
    if (parts[0]?.startsWith('@') && parts[0].length > 1) {
      identity = `account:${parts[0].slice(1)}`;
      label = parts[0];
      profileUrl = `https://www.youtube.com/${parts[0]}`;
      kind = 'account';
      note = 'Exact handle in the YouTube source URL. Channel ownership is not inferred.';
    } else if (parts[0] === 'channel' && parts[1]) {
      identity = `channel:${parts[1]}`;
      label = `Channel · ${parts[1]}`;
      profileUrl = `https://www.youtube.com/channel/${parts[1]}`;
      kind = 'channel';
      note =
        'Exact case-sensitive channel ID in the YouTube source URL. Channel ownership is not inferred.';
    } else if (parts[0] === 'user' && parts[1]) {
      identity = `user:${parts[1]}`;
      label = `User · ${parts[1]}`;
      profileUrl = `https://www.youtube.com/user/${parts[1]}`;
      kind = 'account';
      note =
        'Exact legacy user path in the YouTube source URL. No channel-ID equivalence is inferred.';
    }
  } else if (platform === 'filings' && host === 'sec.gov') {
    const match = url?.pathname.match(/\/Archives\/edgar\/data\/(\d+)\//i);
    if (match) {
      identity = `registrant:${Number(match[1])}`;
      label = `SEC · CIK ${Number(match[1])}`;
      profileUrl = `https://www.sec.gov/edgar/browse/?CIK=${Number(match[1])}`;
      kind = 'registrant';
      note =
        'Registrant identified in the SEC document path. Fund-series relevance remains unverified.';
    }
  } else if (platform === 'news' && host) {
    identity = `publisher:${host}`;
    label = host;
    profileUrl = url.origin;
    kind = 'publisher';
    note = 'Publisher origin from the archived article URL, not a verified author account.';
  }
  return {
    id: `profile:${platform}:${encodeURIComponent(identity)}`,
    platform,
    label,
    url: profileUrl,
    kind,
    note,
  };
}

export function createProductRepository(snapshot) {
  return runSynchronously(buildRepository(snapshot));
}
export function createProductRepositoryAsync(snapshot, options) {
  return runCooperatively(buildRepository(snapshot), options);
}
function* buildRepository(snapshot) {
  if (snapshot?.meta?.schemaVersion !== 1 || snapshot.meta.mode !== 'snapshot') {
    throw new Error('Unsupported archive format.');
  }
  const { companies, sources, events: inputEvents, platforms: inputPlatforms, meta } = snapshot;
  if (![companies, sources, inputEvents, inputPlatforms].every(Array.isArray))
    throw new Error('Incomplete archive.');
  const platforms = [...inputPlatforms];
  for (const platform of [
    {
      id: 'github',
      label: 'GitHub',
      description: 'New pushes from catalogued company repositories.',
    },
    { id: 'tokens', label: 'Tokens', description: 'New Robinhood Chain tokens.' },
    ...Object.entries({
      instagram: 'Instagram',
      truthsocial: 'Truth Social',
      telegram: 'Telegram',
      binance_square: 'Binance Square',
      tiktok: 'TikTok',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      bluesky: 'Bluesky',
    }).map(([id, label]) => ({ id, label, description: 'Posts and activity.' })),
  ])
    if (!platforms.some((item) => item.id === platform.id)) platforms.push(platform);
  const profiles = new Map();
  function registerProfile(record, source) {
    const descriptor = profileDescriptor(record);
    let profile = profiles.get(descriptor.id);
    if (!profile) {
      profile = { ...descriptor, companyIds: [], sourceIds: [], eventIds: [] };
      profiles.set(profile.id, profile);
    }
    for (const companyId of record.companyIds)
      if (!profile.companyIds.includes(companyId)) profile.companyIds.push(companyId);
    const entries = source ? profile.sourceIds : profile.eventIds;
    if (!entries.includes(record.id)) entries.push(record.id);
    return profile.id;
  }
  let work = 0;
  for (const source of sources) {
    registerProfile(source, true);
    if (++work % 256 === 0) yield;
  }
  const events = [];
  for (const event of inputEvents) {
    events.push({ ...event, profileIds: [registerProfile(event, false)] });
    if (++work % 256 === 0) yield;
  }
  yield;
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const eventMap = new Map(events.map((event) => [event.id, event]));
  if (companyMap.size !== companies.length || eventMap.size !== events.length)
    throw new Error('Duplicate archive identity.');
  const sortedEvents = [...events].sort((a, b) => {
    const left = eventTime(a),
      right = eventTime(b);
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    return (
      (right ? Date.parse(right) : 0) - (left ? Date.parse(left) : 0) || a.id.localeCompare(b.id)
    );
  });

  // Immutable repository revision: share filtered results across cursor pages.
  const queryCache = new Map();
  const immutableSelections = new WeakMap();
  let selectionSequence = 0;
  const selectionKey = (ids) => {
    if (!ids || !Object.isFrozen(ids)) return ids;
    if (!immutableSelections.has(ids)) immutableSelections.set(ids, ++selectionSequence);
    return { selection: immutableSelections.get(ids) };
  };
  return {
    meta,
    platforms,
    listCompanies({ query = '', ids, category } = {}) {
      const needle = text(query).trim();
      return companies.filter(
        (company) =>
          (ids === undefined || ids.includes(company.id)) &&
          (!category || company.category === category) &&
          (!needle || text(`${company.name} ${company.ticker}`).includes(needle)),
      );
    },
    getCompany(id) {
      return companyMap.get(id) ?? null;
    },
    getEvent(id) {
      return eventMap.get(id) ?? null;
    },
    listSources({ companyId, platform } = {}) {
      return sources.filter(
        (source) =>
          (!companyId || source.companyIds.includes(companyId)) &&
          (!platform || source.platform === platform),
      );
    },
    listProfiles({ companyId, platform } = {}) {
      return [...profiles.values()]
        .filter(
          (profile) =>
            (!companyId || profile.companyIds.includes(companyId)) &&
            (!platform || profile.platform === platform),
        )
        .map((profile) => {
          const sourceIds = profile.sourceIds.filter(
            (id) =>
              !companyId ||
              sources.find((source) => source.id === id)?.companyIds.includes(companyId),
          );
          const eventIds = profile.eventIds.filter(
            (id) => !companyId || eventMap.get(id)?.companyIds.includes(companyId),
          );
          return {
            ...profile,
            sourceIds,
            eventIds,
            eventCount: eventIds.length,
            origin: sourceIds.length ? (eventIds.length ? 'source-and-event' : 'source') : 'event',
          };
        });
    },
    queryEvents({
      companyIds,
      platforms: selectedPlatforms,
      eventTypes,
      redditViews,
      profileIds,
      eventIds,
      query = '',
      since,
      until,
      requirePublication = false,
      cursor,
      limit = 40,
    } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 200)
        throw new RangeError('Page size must be between 1 and 200.');
      if (cursor !== undefined && cursor !== null && !/^offset:\d+$/.test(cursor))
        throw new Error('Invalid archive cursor.');
      const offset = cursor ? Number(cursor.slice(7)) : 0;
      if (!Number.isSafeInteger(offset)) throw new Error('Invalid archive cursor.');
      const start = since ? Date.parse(since) : null;
      const end = until ? Date.parse(until) : null;
      if ((since && !Number.isFinite(start)) || (until && !Number.isFinite(end)))
        throw new Error('Invalid time filter.');
      const needle = text(query).trim();
      const cacheKey = JSON.stringify([
        companyIds,
        selectedPlatforms,
        eventTypes,
        redditViews,
        profileIds,
        selectionKey(eventIds),
        needle,
        start,
        end,
        requirePublication,
      ]);
      const cached = queryCache.get(cacheKey);
      if (cached) {
        const items = cached.slice(offset, offset + limit);
        return {
          items,
          total: cached.length,
          nextCursor:
            offset + items.length < cached.length ? `offset:${offset + items.length}` : null,
        };
      }
      const companySet = companyIds === undefined ? undefined : new Set(companyIds);
      const platformSet = selectedPlatforms === undefined ? undefined : new Set(selectedPlatforms);
      const eventTypeSet = eventTypes === undefined ? undefined : new Set(eventTypes);
      const redditViewSet = redditViews === undefined ? undefined : new Set(redditViews);
      const profileSet = profileIds === undefined ? undefined : new Set(profileIds);
      const eventSet = eventIds === undefined ? undefined : new Set(eventIds);
      const unfiltered =
        !requirePublication &&
        companySet === undefined &&
        platformSet === undefined &&
        eventTypeSet === undefined &&
        redditViewSet === undefined &&
        profileSet === undefined &&
        eventSet === undefined &&
        !needle &&
        start === null &&
        end === null;
      if (unfiltered) {
        const items = sortedEvents.slice(offset, offset + limit);
        return {
          items,
          total: sortedEvents.length,
          nextCursor:
            offset + items.length < sortedEvents.length ? `offset:${offset + items.length}` : null,
        };
      }
      let filtered = queryCache.get(cacheKey);
      if (!filtered) {
        filtered = sortedEvents.filter((event) => {
          if (
            requirePublication &&
            !event.publishedAt &&
            !event.publishedDate &&
            !['social_pin', 'social_unpin', 'social_delete'].includes(event.eventType)
          )
            return false;
          if (
            !matchesSet(companySet, event.companyIds) ||
            !matchesSet(platformSet, [event.platform]) ||
            !matchesSet(eventTypeSet, [event.eventType])
          )
            return false;
          if (
            redditViewSet !== undefined &&
            (event.platform !== 'reddit' || !redditViewSet.has(event.redditView))
          )
            return false;
          if (!matchesSet(profileSet, event.profileIds) || !matchesSet(eventSet, [event.id]))
            return false;
          if (
            needle &&
            !text(
              `${event.title} ${event.body ?? ''} ${event.sourceLabel} ${event.companyIds.map((id) => companyMap.get(id)?.name ?? '').join(' ')}`,
            ).includes(needle)
          )
            return false;
          const timestamp = eventTime(event);
          if ((start !== null || end !== null) && timestamp === null) return false;
          const instant = timestamp === null ? null : Date.parse(timestamp);
          return (start === null || instant >= start) && (end === null || instant <= end);
        });
        if (queryCache.size >= 16) queryCache.delete(queryCache.keys().next().value);
        queryCache.set(cacheKey, filtered);
      }
      const items = filtered.slice(offset, offset + limit);
      return {
        items,
        total: filtered.length,
        nextCursor:
          offset + items.length < filtered.length ? `offset:${offset + items.length}` : null,
      };
    },
  };
}
