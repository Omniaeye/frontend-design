import { createHash } from 'node:crypto';

const hash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 24);
export const platforms = [
  { id: 'news', label: 'News', description: 'Official releases and provider-associated news.' },
  { id: 'x', label: 'X', description: 'Mapped public accounts and selected archived posts.' },
  {
    id: 'reddit',
    label: 'Reddit',
    description: 'Mapped communities and selected archived discussions.',
  },
  { id: 'web', label: 'Website', description: 'Mapped pages and existing page captures.' },
  { id: 'filings', label: 'Filings', description: 'Indexed SEC registrant documents.' },
  { id: 'youtube', label: 'YouTube', description: 'Mapped public channels.' },
  {
    id: 'people',
    label: 'People',
    description: 'Mapped public people; no employment inference from community participation.',
  },
];

/** Public HTTP links only. Reject credentials/private hosts; allow only known harmless query keys. */
export function safePublicUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (
      !host.includes('.') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^\[/.test(host) ||
      /^\d+(\.\d+){3}$/.test(host)
    )
      return null;
    if (host === 'localhost' || host.endsWith('.localhost')) return null;
    const allowed = new Set(['v', 'id', 'p', 'page', 'storyid', 'articleid']);
    for (const key of [...url.searchParams.keys()])
      if (!allowed.has(key.toLowerCase())) url.searchParams.delete(key);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function safeAssetPath(value) {
  if (
    typeof value !== 'string' ||
    !/^\/assets\/(companies|editorial)\/[a-zA-Z0-9_.-]+\.(svg|png|jpe?g|webp|ico)$/i.test(value) ||
    value.includes('..')
  )
    return null;
  return value;
}

export function normalizeDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return null;
  const day = new Date(value.slice(0, 10));
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value.slice(0, 10))
    return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

const cleanText = (value) =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
    : '';
const dateOnly = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value
    ? value
    : null;
const nativeKinds = new Set([
  'release',
  'release_candidate',
  'newsroom_page',
  'external_news',
  'filing',
]);
const archivedKinds = new Set(['archived_article', 'archived_post', 'archived_community_post']);
const platformIds = new Set(platforms.map((item) => item.id));

export function buildSnapshot({
  catalog,
  intelligence,
  editorial,
  registry,
  builtAt,
  inputHashes = {},
}) {
  const groups = new Map(registry.items.map((group) => [group.group_key, group]));
  const sources = new Map(),
    events = new Map();
  const capturedAt = normalizeDate(intelligence.capturedAt);
  const companies = catalog.map((item) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(item.contractAddress))
      throw new Error(`Invalid asset identity: ${item.ticker}`);
    const address = item.contractAddress.toLowerCase();
    const group =
      groups.get(item.ticker) ??
      (['EWY', 'INDA', 'SGOV', 'SLV'].includes(item.ticker) ? groups.get('ISHARES') : null);
    if (!group) throw new Error(`Company is missing registry binding: ${item.ticker}`);
    // Shared issuer groups are not the identity of four separate funds.
    const id = groups.has(item.ticker)
      ? group.company_id
      : `fund_${hash(`eip155:4663:${address}`)}`;
    const logo = safeAssetPath(item.logo);
    return {
      id,
      registryCompanyId: group.company_id,
      name: cleanText(item.name),
      ticker: item.ticker,
      category: item.category === 'ETF/fundo/ETP' ? 'fund' : 'company',
      logo,
      logoUrl: logo,
      logoKind: item.logoKind ?? null,
      monochrome: item.monochrome === true,
      backgroundKey: item.backgroundKey ?? null,
      websiteUrl: safePublicUrl(item.officialWebsite || item.sourceUrl),
      sourceCounts: {},
      coverage: {},
      asset: { chainId: 4663, address, id: `eip155:4663/erc20:${address}` },
    };
  });
  if (new Set(companies.map((item) => item.id)).size !== companies.length)
    throw new Error('Catalog company IDs must be unique.');

  function addSource(company, platform, item, archived = false) {
    const url = safePublicUrl(item.url);
    const title = cleanText(item.title);
    if (!title || (!url && platform !== 'people')) return;
    const id = `source_${platform}_${hash(url ?? `${company.id}:${title}`)}`;
    let source = sources.get(id);
    if (!source) {
      source = {
        id,
        companyIds: [],
        platform,
        title,
        url,
        sourceUrl: url,
        status: archived ? 'archived' : 'mapped',
        availabilityNote: archived
          ? 'Selected archived source material. Collection status is not verified by this snapshot.'
          : 'Mapped source. This snapshot does not contain its event history or verify active collection.',
        imageUrl: safeAssetPath(item.image),
      };
      sources.set(id, source);
    }
    if (!source.companyIds.includes(company.id)) source.companyIds.push(company.id);
    if (archived) {
      source.status = 'archived';
      source.imageUrl ??= safeAssetPath(item.image);
      source.availabilityNote =
        'Selected archived source material. Collection status is not verified by this snapshot.';
    }
  }

  function addEvent(company, platform, item, archived, provenance) {
    const url = safePublicUrl(item.url);
    const title = cleanText(item.title);
    if (!url || !title) return;
    const id = `event_${platform}_${hash(url)}`;
    let event = events.get(id);
    if (!event) {
      const kind = nativeKinds.has(item.kind)
        ? item.kind
        : ({ news: 'article', x: 'post', reddit: 'discussion' }[platform] ?? 'record');
      event = {
        id,
        nativeIds: [],
        companyIds: [],
        platform,
        eventType: kind,
        type: kind,
        title,
        body: cleanText(item.text) || null,
        url,
        sourceUrl: url,
        sourceLabel: cleanText(item.source) || new URL(url).hostname,
        imageUrl: safeAssetPath(item.image),
        publishedAt: normalizeDate(item.date),
        publishedDate: dateOnly(item.date),
        observedAt: null,
        snapshotAt: capturedAt,
        evidenceStatus: archived ? 'archived' : 'indexed',
        provenance: [],
        associationNote:
          platform === 'filings'
            ? 'Registrant association. A filing may concern several fund series; asset-specific relevance is not established.'
            : 'Association is inherited from the reviewed company registry or source catalog; it is not an independent relevance assessment.',
      };
      events.set(id, event);
    }
    if (!event.companyIds.includes(company.id)) event.companyIds.push(company.id);
    if (item.id && !event.nativeIds.includes(item.id)) event.nativeIds.push(String(item.id));
    if (!event.provenance.includes(provenance)) event.provenance.push(provenance);
    event.imageUrl ??= safeAssetPath(item.image);
    event.body ??= cleanText(item.text) || null;
    event.publishedAt ??= normalizeDate(item.date);
    event.publishedDate ??= dateOnly(item.date);
    if (archived) event.evidenceStatus = 'archived';
  }

  for (const company of companies) {
    const channels = intelligence.companies[company.ticker]?.channels ?? {};
    for (const [platform, channel] of Object.entries(channels)) {
      if (!platformIds.has(platform)) continue;
      const mapped = String(channel.unit ?? '').startsWith('mapped');
      company.sourceCounts[platform] = mapped ? Number(channel.count) : 0;
      company.coverage[platform] = {
        status: channel.count > 0 ? (mapped ? 'mapped' : 'indexed') : 'unavailable',
        mappedSourceCount: mapped ? Number(channel.count) : null,
        indexedRecordCount: Number.isFinite(channel.records) ? channel.records : null,
        availableSourceCount: 0,
        availableEventCount: 0,
        note: mapped
          ? 'Registry totals may exceed the selected source links exported here. Active collection is not verified.'
          : 'Indexed totals describe the upstream archive. Only selected records are included here; this is not complete history.',
      };
      for (const item of channel.items ?? []) {
        if (['news', 'filings'].includes(platform) && nativeKinds.has(item.kind))
          addEvent(company, platform, item, false, 'intelligence-index');
        else addSource(company, platform, item);
      }
    }
    for (const item of editorial[company.ticker] ?? []) {
      if (!platformIds.has(item.type) || item.kind === 'future_slot') continue;
      if (archivedKinds.has(item.kind))
        addEvent(company, item.type, item, true, 'editorial-archive');
      else if (item.type !== 'filings')
        addSource(
          company,
          item.type,
          item,
          ['archived_portrait', 'archived_profile', 'browser_capture'].includes(item.kind),
        );
    }
  }

  for (const company of companies) {
    for (const platform of platforms) {
      const availableSources = [...sources.values()].filter(
        (source) => source.platform === platform.id && source.companyIds.includes(company.id),
      );
      const availableEvents = [...events.values()].filter(
        (event) => event.platform === platform.id && event.companyIds.includes(company.id),
      );
      const coverage = company.coverage[platform.id] ?? {
        status: 'unavailable',
        mappedSourceCount: null,
        indexedRecordCount: null,
        note: 'No records are provided for this source in this snapshot.',
      };
      coverage.availableSourceCount = availableSources.length;
      coverage.availableEventCount = availableEvents.length;
      if (
        availableEvents.some((event) => event.evidenceStatus === 'archived') ||
        availableSources.some((source) => source.status === 'archived')
      )
        coverage.status = 'archived';
      company.coverage[platform.id] = coverage;
    }
  }
  return {
    meta: {
      schemaVersion: 1,
      mode: 'snapshot',
      capturedAt,
      builtAt,
      companyCount: companies.length,
      sourceCount: sources.size,
      eventCount: events.size,
      liveConnected: false,
      partial: true,
      notice: 'Selected archived records. Live updates are not connected.',
      limitations: [
        'All 63 catalog assets are present; source links and event histories are selected excerpts, not exhaustive exports.',
        'Archived source material, mapped sources and active collection are different states. No active collection is certified here.',
        'Publication time remains unknown where absent. Snapshot capture time is not event observation time.',
        'Website and YouTube provide mapped sources or captures, not change/video events in this export.',
        'The Reddit collector was documented stopped and YouTube continuous monitoring was not activated. No collector was started for this export.',
        'Newsletter is retired. Private source envelopes, raw HTML, local paths and credentials are not exported.',
      ],
      inputHashes,
    },
    platforms,
    companies,
    sources: [...sources.values()],
    events: [...events.values()],
  };
}
