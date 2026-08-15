export const PRESETS = [
  {
    id: 'beginner',
    name: 'Beginner',
    label: 'Essentials',
    description: 'Key updates · Reddit Top · Daily digest',
    platforms: ['news', 'filings', 'web', 'youtube', 'github', 'reddit'],
    reddit: ['top'],
    frequency: 'daily',
    policy: 'milestones',
  },
  {
    id: 'medium',
    name: 'Medium',
    label: 'Balanced',
    description: 'Adds X and commits · Rising + Top · Hourly digest',
    platforms: ['news', 'filings', 'web', 'youtube', 'github', 'reddit', 'x'],
    reddit: ['rising', 'top'],
    frequency: 'hourly',
    policy: 'all',
  },
  {
    id: 'advanced',
    name: 'Advanced',
    label: 'Full coverage',
    description: 'All sources · All Reddit rankings · Instant alerts',
    platforms: null,
    reddit: ['new', 'hot', 'rising', 'top'],
    frequency: 'instant',
    policy: 'all',
  },
];

// One predicate for the web feed and the Telegram worker. Never changes ingestion.
export function eventAllowedByPreset(prefs, event) {
  if (event.platform === 'reddit' && /comment/i.test(event.eventType || '')) return false;
  if (prefs.eventPolicy !== 'milestones' || event.platform !== 'github') return true;
  return /release|repository_created|new_repository|repository_discovered|repo_created/.test(
    event.eventType || '',
  );
}

export function capturePreset(tracking, settings) {
  return {
    platforms: [
      ...new Set(tracking.following.flatMap((id) => tracking.rules[id]?.feed.platforms || [])),
    ].filter((id) => id !== 'tokens'),
    reddit: tracking.redditViews.feed,
    frequency: settings.telegram.frequency,
    policy: tracking.eventPolicy || 'all',
    rules: structuredClone(tracking.rules),
    redditViews: structuredClone(tracking.redditViews),
    telegram: structuredClone(settings.telegram),
  };
}

export function applyPreset(tracking, settings, preset) {
  const next = structuredClone(tracking);
  next.eventPolicy = preset.policy === 'milestones' ? 'milestones' : 'all';
  next.redditViews = preset.redditViews
    ? structuredClone(preset.redditViews)
    : { feed: [...preset.reddit], telegram: [...preset.reddit] };
  const enabled = (preset.platforms || tracking.platformIds).filter(
    (id) => id !== 'tokens' && tracking.platformIds.includes(id),
  );
  for (const id of Object.keys(next.rules)) {
    for (const channel of ['feed', 'telegram']) {
      const saved = preset.rules?.[id]?.[channel];
      next.rules[id][channel] = saved
        ? structuredClone(saved)
        : {
            platforms: tracking.following.includes(id) ? [...enabled] : [],
            excludedProfileIds: [],
            profileAllowlist: {},
          };
    }
  }
  next.presetChoice = preset.id;
  return {
    tracking: next,
    settings: {
      ...settings,
      telegram: preset.telegram
        ? structuredClone(preset.telegram)
        : { ...settings.telegram, frequency: preset.frequency },
    },
  };
}
