import { eventAllowedByPreset } from './presets.js';
export const TRACKING_PREFERENCES_KEY = 'omnia.product.tracking.v2';
export const LEGACY_PREFERENCES_KEY = 'omnia.product.following.v1';

const unique = (values) => [
  ...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === 'string')),
];
export const REDDIT_VIEWS = ['new', 'hot', 'rising', 'top'];
const redditViews = (value) => unique(value).filter((view) => REDDIT_VIEWS.includes(view));
const emptyRule = () => ({ platforms: [], excludedProfileIds: [], profileAllowlist: {} });
const allRule = (platforms) => ({
  platforms: [...platforms],
  excludedProfileIds: [],
  profileAllowlist: {},
});
const validChannel = (channel) => channel === 'feed' || channel === 'telegram';
const channelPlatformAllowed = (platform) => platform !== 'tokens';
const profilePlatform = (id) => /^profile:([^:]+):/.exec(id)?.[1] ?? null;
const copy = (prefs) => ({
  version: 2,
  eventPolicy: prefs.eventPolicy || 'all',
  presetChoice: prefs.presetChoice || null,
  platformIds: [...prefs.platformIds],
  following: [...prefs.following],
  redditViews: {
    feed: [...getRedditViews(prefs, 'feed')],
    telegram: [...getRedditViews(prefs, 'telegram')],
  },
  rules: Object.fromEntries(
    Object.entries(prefs.rules).map(([id, channels]) => [
      id,
      {
        feed: {
          platforms: [...channels.feed.platforms],
          excludedProfileIds: [...channels.feed.excludedProfileIds],
          profileAllowlist: Object.fromEntries(
            Object.entries(channels.feed.profileAllowlist ?? {}).map(([platform, ids]) => [
              platform,
              [...ids],
            ]),
          ),
        },
        telegram: {
          platforms: [...channels.telegram.platforms],
          excludedProfileIds: [...channels.telegram.excludedProfileIds],
          profileAllowlist: Object.fromEntries(
            Object.entries(channels.telegram.profileAllowlist ?? {}).map(([platform, ids]) => [
              platform,
              [...ids],
            ]),
          ),
        },
      },
    ]),
  ),
});

export function createTrackingPreferences(companyIds, platformIds) {
  const companies = unique(companyIds),
    platforms = unique(platformIds);
  const trackedPlatforms = platforms.filter(channelPlatformAllowed);
  return {
    version: 2,
    platformIds: platforms,
    following: companies,
    redditViews: { feed: [...REDDIT_VIEWS], telegram: [...REDDIT_VIEWS] },
    rules: Object.fromEntries(
      companies.map((id) => [
        id,
        {
          feed: allRule(trackedPlatforms),
          telegram: emptyRule(),
        },
      ]),
    ),
  };
}

function parseJSON(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function parseTrackingPreferences(rawV2, rawLegacy, companyIds, platformIds) {
  const defaults = createTrackingPreferences(companyIds, platformIds);
  const allowedCompanies = new Set(defaults.following),
    allowedPlatforms = new Set(defaults.platformIds);
  const parsed = parseJSON(rawV2);
  if (
    parsed?.version === 2 &&
    Array.isArray(parsed.following) &&
    parsed.rules &&
    typeof parsed.rules === 'object' &&
    !Array.isArray(parsed.rules)
  ) {
    const following = unique(parsed.following).filter((id) => allowedCompanies.has(id));
    defaults.following = following;
    defaults.eventPolicy = parsed.eventPolicy === 'milestones' ? 'milestones' : 'all';
    defaults.presetChoice =
      typeof parsed.presetChoice === 'string' ? parsed.presetChoice.slice(0, 80) : null;
    for (const channel of ['feed', 'telegram']) {
      if (Array.isArray(parsed.redditViews?.[channel]))
        defaults.redditViews[channel] = redditViews(parsed.redditViews[channel]);
    }
    for (const id of allowedCompanies) {
      for (const channel of ['feed', 'telegram']) {
        const rule = Object.hasOwn(parsed.rules, id) ? parsed.rules[id]?.[channel] : null;
        if (rule && Array.isArray(rule.platforms) && Array.isArray(rule.excludedProfileIds)) {
          // Extend only an existing all-platform feed. Explicit subsets and alerts stay unchanged.
          const previousPlatforms = unique(parsed.platformIds).filter(channelPlatformAllowed);
          const extendFeed =
            channel === 'feed' &&
            previousPlatforms.length > 0 &&
            previousPlatforms.every((platform) => rule.platforms.includes(platform));
          defaults.rules[id][channel] = {
            platforms: unique(rule.platforms).filter(
              (platform) => allowedPlatforms.has(platform) && channelPlatformAllowed(platform),
            ),
            excludedProfileIds: unique(rule.excludedProfileIds).filter((profileId) =>
              allowedPlatforms.has(profilePlatform(profileId)),
            ),
            profileAllowlist: Object.fromEntries(
              Object.entries(
                rule.profileAllowlist &&
                  typeof rule.profileAllowlist === 'object' &&
                  !Array.isArray(rule.profileAllowlist)
                  ? rule.profileAllowlist
                  : {},
              )
                .filter(([platform, ids]) => allowedPlatforms.has(platform) && Array.isArray(ids))
                .map(([platform, ids]) => [
                  platform,
                  unique(ids).filter((profileId) => profilePlatform(profileId) === platform),
                ]),
            ),
          };
          if (extendFeed)
            defaults.rules[id][channel].platforms = unique([
              ...defaults.rules[id][channel].platforms,
              ...defaults.platformIds.filter(
                (platform) =>
                  channelPlatformAllowed(platform) && !previousPlatforms.includes(platform),
              ),
            ]);
        } else
          defaults.rules[id][channel] =
            channel === 'feed' && following.includes(id)
              ? allRule(defaults.platformIds)
              : emptyRule();
      }
    }
    return defaults;
  }
  const legacy = parseJSON(rawLegacy);
  if (legacy?.version === 1 && Array.isArray(legacy.following)) {
    defaults.following = unique(legacy.following).filter((id) => allowedCompanies.has(id));
    for (const id of allowedCompanies)
      if (!defaults.following.includes(id)) defaults.rules[id].feed = emptyRule();
  }
  return defaults;
}

export function serializeTrackingPreferences(prefs) {
  return JSON.stringify(copy(prefs));
}

export function getRedditViews(prefs, channel = 'feed') {
  if (!validChannel(channel)) return [];
  const selected = redditViews(prefs?.redditViews?.[channel]);
  return prefs?.redditViews && Array.isArray(prefs.redditViews[channel])
    ? selected
    : [...REDDIT_VIEWS];
}

export function setRedditViews(prefs, channel, views) {
  if (!validChannel(channel)) return prefs;
  const next = copy(prefs);
  next.redditViews[channel] = redditViews(views);
  return next;
}

export function getCompanyRule(prefs, companyId, channel = 'feed') {
  if (!validChannel(channel) || !Object.hasOwn(prefs.rules, companyId)) return emptyRule();
  if (channel === 'feed' && !prefs.following.includes(companyId)) return emptyRule();
  return prefs.rules[companyId][channel];
}
export function isCompanyTracked(prefs, companyId, channel = 'feed') {
  return getCompanyRule(prefs, companyId, channel).platforms.length > 0;
}
export function isProfileEnabled(prefs, companyId, channel, profileId) {
  const rule = getCompanyRule(prefs, companyId, channel),
    platform = profilePlatform(profileId);
  if (!rule.platforms.includes(platform)) return false;
  if (Object.hasOwn(rule.profileAllowlist ?? {}, platform))
    return rule.profileAllowlist[platform].includes(profileId);
  return !rule.excludedProfileIds.includes(profileId);
}

/** Explicit select-all/none for these companies and this channel only. */
export function setCompaniesTracked(prefs, companyIds, on, channel = 'feed') {
  if (!validChannel(channel)) return prefs;
  const next = copy(prefs);
  for (const id of unique(companyIds)) {
    if (!Object.hasOwn(next.rules, id)) continue;
    next.rules[id][channel] = on
      ? allRule(next.platformIds.filter(channelPlatformAllowed))
      : emptyRule();
    if (channel === 'feed')
      next.following = on
        ? unique([...next.following, id])
        : next.following.filter((existing) => existing !== id);
  }
  return next;
}

export function setPlatformEnabled(prefs, companyId, channel, platform, on) {
  if (
    !validChannel(channel) ||
    !channelPlatformAllowed(platform) ||
    !Object.hasOwn(prefs.rules, companyId) ||
    !prefs.platformIds.includes(platform)
  )
    return prefs;
  const next = copy(prefs),
    rule = next.rules[companyId][channel];
  rule.platforms = on
    ? unique([...rule.platforms, platform])
    : rule.platforms.filter((id) => id !== platform);
  if (on) {
    rule.excludedProfileIds = rule.excludedProfileIds.filter(
      (id) => profilePlatform(id) !== platform,
    );
    delete rule.profileAllowlist[platform];
  }
  if (channel === 'feed')
    next.following = rule.platforms.length
      ? unique([...next.following, companyId])
      : next.following.filter((id) => id !== companyId);
  return next;
}

export function setProfileEnabled(prefs, companyId, channel, profileId, on, platformProfileIds) {
  const platform = profilePlatform(profileId);
  if (
    !validChannel(channel) ||
    !channelPlatformAllowed(platform) ||
    !Object.hasOwn(prefs.rules, companyId) ||
    !prefs.platformIds.includes(platform)
  )
    return prefs;
  const next = copy(prefs),
    rule = next.rules[companyId][channel];
  if (on) {
    if (!rule.platforms.includes(platform)) rule.profileAllowlist[platform] = [profileId];
    else if (Object.hasOwn(rule.profileAllowlist, platform))
      rule.profileAllowlist[platform] = unique([...rule.profileAllowlist[platform], profileId]);
    rule.platforms = unique([...rule.platforms, platform]);
    rule.excludedProfileIds = rule.excludedProfileIds.filter((id) => id !== profileId);
    if (channel === 'feed') next.following = unique([...next.following, companyId]);
  } else if (Object.hasOwn(rule.profileAllowlist, platform)) {
    rule.profileAllowlist[platform] = rule.profileAllowlist[platform].filter(
      (id) => id !== profileId,
    );
    if (!rule.profileAllowlist[platform].length) {
      rule.platforms = rule.platforms.filter((id) => id !== platform);
      if (channel === 'feed' && !rule.platforms.length)
        next.following = next.following.filter((id) => id !== companyId);
    }
  } else rule.excludedProfileIds = unique([...rule.excludedProfileIds, profileId]);
  return next;
}

export function listTrackingProfiles(repository, companyId, platform) {
  return repository.listProfiles({ companyId, platform });
}

export function getPlatformSelection(prefs, companyId, channel, platform, profiles = []) {
  const rule = getCompanyRule(prefs, companyId, channel);
  if (!rule.platforms.includes(platform)) return 'none';
  const relevant = profiles.filter(
    (profile) => profile.platform === platform && profile.companyIds.includes(companyId),
  );
  if (!relevant.length)
    return Object.hasOwn(rule.profileAllowlist ?? {}, platform) ? 'none' : 'all';
  const enabled = relevant.filter((profile) =>
    isProfileEnabled(prefs, companyId, channel, profile.id),
  ).length;
  return enabled === 0 ? 'none' : enabled === relevant.length ? 'all' : 'some';
}

/** Eligibility is computed before the wrapped repository sorts and paginates. */
export function createTrackingRepository(repository, prefs, channel = 'feed') {
  if (!validChannel(channel)) throw new Error('Unknown tracking channel.');
  const events = [];
  let cursor;
  do {
    const page = repository.queryEvents({ limit: 200, cursor });
    events.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  const eligibilityCache = new Map();
  const selectedRedditViews = new Set(getRedditViews(prefs, channel));
  return {
    ...repository,
    platforms: repository.platforms.filter((platform) => channelPlatformAllowed(platform.id)),
    queryEvents(query = {}) {
      const key = JSON.stringify(query.companyIds ?? null);
      let eligibleIds = eligibilityCache.get(key);
      if (!eligibleIds) {
        eligibleIds = events
          .filter((event) => {
            if (!eventAllowedByPreset(prefs, event)) return false;
            if (event.platform === 'reddit' && !selectedRedditViews.has(event.redditView || 'new'))
              return false;
            return event.companyIds.some((companyId) => {
              if (!channelPlatformAllowed(event.platform)) return false;
              if (query.companyIds !== undefined && !query.companyIds.includes(companyId))
                return false;
              const rule = getCompanyRule(prefs, companyId, channel);
              if (!rule.platforms.includes(event.platform)) return false;
              return (event.profileIds ?? []).some((profileId) =>
                isProfileEnabled(prefs, companyId, channel, profileId),
              );
            });
          })
          .map((event) => event.id);
        if (eligibilityCache.size >= 16)
          eligibilityCache.delete(eligibilityCache.keys().next().value);
        Object.freeze(eligibleIds);
        eligibilityCache.set(key, eligibleIds);
      }
      const ids =
        query.eventIds === undefined
          ? eligibleIds
          : eligibleIds.filter((id) => query.eventIds.includes(id));
      return repository.queryEvents({ ...query, eventIds: ids });
    },
  };
}
