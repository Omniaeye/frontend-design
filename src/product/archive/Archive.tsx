import { useAccount } from '../account/AccountProvider';
import { SocialTracker } from '../components/SocialTracker';
import { ArchiveImage, archiveImage } from './media';
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import type { CSSProperties } from 'react';
import type { Company, ProductEvent, ProductRepository } from '../data/repository.js';
import { CompanyLogo } from '../components/CompanyLogo';
import { PlatformIcon } from '../components/PlatformIcon';
import {
  formatMetric,
  useArchiveCompany,
  type ArchiveCompanyData,
  type ArchiveSource,
} from './archiveData';
import './archive.css';

const RelationshipGraph = lazy(() =>
  import('./RelationshipGraph').then((module) => ({ default: module.RelationshipGraph })),
);
const featured = [
  'NVDA',
  'AAPL',
  'MSFT',
  'TSLA',
  'GOOGL',
  'AMZN',
  'META',
  'COIN',
  'NFLX',
  'AMD',
  'INTC',
  'IBM',
];
const coordinates = [
  [50, 42],
  [22, 22],
  [78, 18],
  [18, 67],
  [82, 65],
  [36, 12],
  [65, 78],
  [35, 75],
  [68, 12],
  [9, 43],
  [91, 39],
  [50, 84],
];
const platformOrder = [
  'x',
  'reddit',
  'youtube',
  'web',
  'github',
  'instagram',
  'threads',
  'tiktok',
  'linkedin',
  'facebook',
  'bluesky',
  'discord',
  'twitch',
  'snapchat',
  'weibo',
  'truthsocial',
  'news',
  'filings',
  'people',
];
type ArchiveView = 'activity' | 'relationships' | 'sources' | 'narratives' | 'social';

const archiveDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
function date(value: string | null | undefined) {
  return value && Number.isFinite(Date.parse(value))
    ? archiveDate.format(new Date(value)) + ' UTC'
    : 'Time not recorded';
}
function eventKind(event: ProductEvent) {
  return event.eventType.replaceAll('_', ' ').replaceAll('-', ' ');
}
function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ArchiveAtlas({ repo }: { repo: ProductRepository }) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const companies = repo.listCompanies({ query });
  const field = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(featured[0]);
  const focus = repo.listCompanies().find((company) => company.ticker === focused) || companies[0];
  const nodes = useMemo(() => {
    const all = repo.listCompanies();
    const preferred = featured
      .map((t) => all.find((c) => c.ticker === t))
      .filter((company): company is Company => Boolean(company));
    const ordered = [...preferred, ...all.filter((c) => !featured.includes(c.ticker))];
    return (query ? companies : ordered).slice(0, 12);
  }, [repo, query, companies]);
  useLayoutEffect(() => {
    if (!field.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.archive-atlas-copy>*',
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.07, ease: 'power3.out' },
      );
      gsap.fromTo(
        '.atlas-node',
        { opacity: 0, scale: 0.72 },
        { opacity: 1, scale: 1, duration: 0.8, stagger: 0.045, ease: 'power3.out' },
      );
    }, field);
    return () => ctx.revert();
  }, []);
  const update = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };
  return (
    <div className="archive-atlas" ref={field}>
      <div className="archive-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header className="archive-atlas-copy">
        <p className="archive-overline">OMNIA / ARCHIVE</p>
        <h1>
          Every signal
          <br />
          <em>leaves a trace.</em>
        </h1>
        <p className="archive-lead">
          Explore companies through the public sources, people and records preserved by OMNIA.
        </p>
        <label className="archive-command">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => update(event.target.value)}
            placeholder="Search a company or ticker"
            aria-label="Search the company archive"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="archive-scope">
          <span>{repo.meta.companyCount ?? repo.listCompanies().length} companies & funds</span>
          <span>{repo.meta.sourceCount ?? repo.listProfiles().length} mapped sources</span>
          <span>{repo.meta.eventCount ?? repo.queryEvents({ limit: 1 }).total} loaded records</span>
        </div>
      </header>
      <section className="atlas-field" aria-label="Company index">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M50 42 C35 28 31 26 22 22M50 42 C63 27 70 23 78 18M50 42 C31 49 25 59 18 67M50 42 C69 48 74 57 82 65M50 42 C45 26 39 17 36 12M50 42 C57 57 62 69 65 78M50 42 C42 57 38 67 35 75M50 42 C55 25 62 17 68 12M50 42 C31 39 19 41 9 43M50 42 C70 38 80 39 91 39M50 42 C50 61 50 72 50 84" />
        </svg>
        {nodes.map((company, index) => {
          const point = coordinates[index % coordinates.length];
          const count = repo.queryEvents({ companyIds: [company.id], limit: 1 }).total;
          return (
            <Link
              to={`/archive/${encodeURIComponent(company.id)}`}
              onMouseEnter={() => setFocused(company.ticker)}
              onFocus={() => setFocused(company.ticker)}
              className={`atlas-node ${focused === company.ticker ? 'is-focused' : ''}`}
              style={{ '--x': `${point[0]}%`, '--y': `${point[1]}%` } as CSSProperties}
              key={company.id}
            >
              <CompanyLogo company={company} />
              <span>
                <strong>{company.name}</strong>
                <small>
                  {company.ticker} · {count} loaded records
                </small>
              </span>
            </Link>
          );
        })}
        {!nodes.length && <p className="atlas-empty">No company matches this search.</p>}
        {focus && (
          <aside className="atlas-focus">
            <span>SELECTED COMPANY</span>
            <strong>{focus.name}</strong>
            <p>
              {
                new Set(
                  repo.listProfiles({ companyId: focus.id }).map((profile) => profile.platform),
                ).size
              }{' '}
              source categories mapped
            </p>
            <Link to={`/archive/${encodeURIComponent(focus.id)}`}>Open archive ↗</Link>
          </aside>
        )}
      </section>
      <footer className="archive-pulse">
        <span>COMPANY INDEX / UTC</span>
        <div />
        <span>{date(repo.meta.capturedAt)}</span>
      </footer>
    </div>
  );
}

function SourceAvatar({ source }: { source: ArchiveSource }) {
  const [failed, setFailed] = useState<string>();
  const image = archiveImage(source.image);
  return (
    <span className={`archive-source-avatar archive-source-avatar--${source.platform}`}>
      {image && failed !== image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(image)}
        />
      ) : (
        <PlatformIcon platform={source.kind === 'person' ? 'people' : source.platform} size={22} />
      )}
      <i>
        <PlatformIcon platform={source.platform} size={10} />
      </i>
    </span>
  );
}

function matchedSource(event: ProductEvent, archive: ArchiveCompanyData | null) {
  if (!archive) return null;
  const needle = `${event.sourceLabel} ${event.url}`.toLowerCase();
  return (
    archive.sources.find(
      (source) =>
        source.platform === event.platform &&
        (needle.includes((source.handle || source.label).replace(/^@/, '').toLowerCase()) ||
          (source.url && needle.includes(source.url.toLowerCase()))),
    ) || null
  );
}

function Activity({
  events,
  archive,
  onOpen,
  filter,
  onFilter,
}: {
  events: ProductEvent[];
  archive: ArchiveCompanyData | null;
  onOpen: (event: ProductEvent) => void;
  filter: string;
  onFilter: (value: string) => void;
}) {
  const filtered = filter === 'all' ? events : events.filter((event) => event.platform === filter);
  const options = [
    'all',
    ...platformOrder.filter(
      (platform) =>
        ['x', 'reddit', 'youtube', 'web', 'github', 'news', 'filings'].includes(platform) ||
        events.some((event) => event.platform === platform),
    ),
  ];
  return (
    <main className="archive-activity">
      <header className="archive-activity-head">
        <div>
          <span>ACTIVITY</span>
          <h2>Latest public records</h2>
          <p>Authoritative publication time in UTC. Original-language records are preserved.</p>
        </div>
        <div className="archive-filter-row">
          {options.map((item) => (
            <button key={item} aria-pressed={filter === item} onClick={() => onFilter(item)}>
              {item === 'all' ? 'All' : titleCase(item)}
            </button>
          ))}
        </div>
      </header>
      <div className="activity-stream">
        {filtered.map((event, index) => {
          const source = matchedSource(event, archive);
          const image = event.imageUrl || source?.image;
          return (
            <article
              className={`activity-record ${index === 0 ? 'activity-record--lead' : ''}`}
              key={event.id}
            >
              <time>{date(event.publishedAt || event.observedAt)}</time>
              <button onClick={() => onOpen(event)}>
                <header>
                  <SourceAvatar
                    source={
                      source ||
                      ({
                        id: event.id,
                        platform: event.platform,
                        kind: 'source',
                        label: event.sourceLabel,
                        url: event.url,
                      } as ArchiveSource)
                    }
                  />
                  <div>
                    <span>{event.sourceLabel || titleCase(event.platform)}</span>
                    <small>
                      <PlatformIcon platform={event.platform} size={12} />
                      {titleCase(event.platform)} · {titleCase(eventKind(event))}
                    </small>
                  </div>
                  <b>{event.evidenceStatus}</b>
                </header>
                {image && (
                  <ArchiveImage
                    className="activity-record-media"
                    src={image}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.hidden = true;
                    }}
                  />
                )}
                <div className="activity-record-copy">
                  <h3>{event.title}</h3>
                  {event.body && <p>{event.body}</p>}
                  <footer>
                    <span>
                      {event.redditView && `${titleCase(event.redditView)} · `}
                      {event.associationNote}
                    </span>
                    <strong>Open record ↗</strong>
                  </footer>
                </div>
              </button>
            </article>
          );
        })}
      </div>
      {!filtered.length && <p className="archive-empty-state">No records match this source.</p>}
    </main>
  );
}

function Catalog({ archive }: { archive: ArchiveCompanyData }) {
  const [platform, setPlatform] = useState('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(40);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sources = useMemo(
    () =>
      archive.sources.filter(
        (source) =>
          (platform === 'all' || source.platform === platform) &&
          (!query ||
            `${source.label} ${source.handle || ''} ${source.description || ''}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [archive, platform, query],
  );
  const selected = archive.sources.find((source) => source.id === selectedId) || sources[0] || null;
  const options = ['all', ...platformOrder.filter((item) => archive.counts[item])];
  return (
    <section className="archive-catalog">
      <header className="archive-section-head">
        <div>
          <span>SOURCES</span>
          <h2>The source registry</h2>
          <p>
            Every monitored identity, community, channel, website and repository with its collection
            state and provenance.
          </p>
        </div>
        <label>
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(40);
              setSelectedId(null);
            }}
            placeholder="Search sources"
          />
        </label>
      </header>
      <div className="archive-category-strip">
        {options.map((item) => (
          <button
            key={item}
            aria-pressed={platform === item}
            onClick={() => {
              setPlatform(item);
              setLimit(40);
              setSelectedId(null);
            }}
          >
            {item === 'all' ? 'All sources' : titleCase(item)}
            <strong>{item === 'all' ? archive.sources.length : archive.counts[item]}</strong>
          </button>
        ))}
      </div>
      <div className="source-registry">
        <div className="source-registry-list">
          {sources.slice(0, limit).map((source) => (
            <button
              className={selected?.id === source.id ? 'is-selected' : ''}
              onMouseEnter={() => setSelectedId(source.id)}
              onFocus={() => setSelectedId(source.id)}
              onClick={() => setSelectedId(source.id)}
              key={source.id}
            >
              <SourceAvatar source={source} />
              <span>
                <strong>{source.label}</strong>
                <small>
                  {source.handle || `${titleCase(source.kind)} · ${titleCase(source.platform)}`}
                </small>
              </span>
              <i>{titleCase(source.platform)}</i>
            </button>
          ))}
          {sources.length > limit && (
            <button className="archive-load-more" onClick={() => setLimit((value) => value + 40)}>
              Show 40 more <span>{sources.length - limit} remaining</span>
            </button>
          )}
        </div>
        {selected && (
          <aside className="source-registry-detail">
            {selected.coverImage && (
              <ArchiveImage
                className="source-registry-cover"
                src={selected.coverImage}
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
            <SourceAvatar source={selected} />
            <span>
              {titleCase(selected.kind)} · {titleCase(selected.platform)}
            </span>
            <h3>{selected.label}</h3>
            {selected.handle && <b>{selected.handle}</b>}
            <p>{selected.description || 'Public source mapped to this company.'}</p>
            <dl>
              {Object.entries(selected.metrics || {})
                .filter(([, value]) => value != null)
                .slice(0, 5)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{titleCase(key)}</dt>
                    <dd>{formatMetric(value)}</dd>
                  </div>
                ))}
              <div>
                <dt>Relationship</dt>
                <dd>{titleCase(selected.relation || 'Mapped source')}</dd>
              </div>
              <div>
                <dt>Last observed</dt>
                <dd>{date(selected.observedAt || selected.updatedAt)}</dd>
              </div>
            </dl>
            {selected.url && (
              <a href={selected.url} target="_blank" rel="noreferrer">
                Open original source ↗
              </a>
            )}
          </aside>
        )}
      </div>
      {!sources.length && (
        <p className="archive-empty-state">No catalog entries match this filter.</p>
      )}
    </section>
  );
}

function Narratives({ archive, events }: { archive: ArchiveCompanyData; events: ProductEvent[] }) {
  const research = archive.research;
  if (!research)
    return (
      <section className="archive-empty-panel">
        <span>NARRATIVES</span>
        <h2>No reviewed narrative package is attached to this company yet.</h2>
        <p>Source records remain available in Activity and Sources.</p>
      </section>
    );
  const images = research.themes.map((theme) => {
    const source = archive.sources.find(
      (source) => source.platform === 'github' && source.handle === theme.repo,
    );
    return source?.image || undefined;
  });
  return (
    <section className="archive-narratives">
      <header className="archive-section-head">
        <div>
          <span>NARRATIVES</span>
          <h2>{research.title}</h2>
          <p>{research.note}</p>
        </div>
      </header>
      <div className="narrative-lead">
        {images[0] && <ArchiveImage src={images[0]} alt="" referrerPolicy="no-referrer" />}
        <div>
          <span>{String(research.themes[0]?.category || 'Reviewed narrative')}</span>
          <h3>{String(research.themes[0]?.title || research.title)}</h3>
          <p>{String(research.themes[0]?.description || research.note)}</p>
          <footer>
            <b>{archive.sources.length} mapped sources</b>
            {research.themes[0]?.url && (
              <a href={String(research.themes[0].url)} target="_blank" rel="noreferrer">
                Open narrative →
              </a>
            )}
          </footer>
        </div>
      </div>
      <div className="narrative-grid">
        {research.themes.slice(1).map((theme, index) => (
          <article key={String(theme.title || index)}>
            {images[index + 1] && (
              <ArchiveImage
                src={images[index + 1]}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <span>{String(theme.category || 'Reviewed narrative')}</span>
              <h3>{String(theme.title || 'Untitled narrative')}</h3>
              <p>{String(theme.description || '')}</p>
              <footer>
                {Boolean(theme.repo) && <code>{String(theme.repo)}</code>}
                {Boolean(theme.url) && (
                  <a href={String(theme.url)} target="_blank" rel="noreferrer">
                    Open narrative →
                  </a>
                )}
              </footer>
            </div>
          </article>
        ))}
      </div>
      <div className="archive-research-metrics">
        {research.metrics.map((item) => (
          <div key={item.label}>
            <strong>{formatMetric(item.value)}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      {research.coverageNote && (
        <p className="archive-coverage-note">
          <strong>Coverage note</strong>
          {research.coverageNote}
        </p>
      )}
    </section>
  );
}

export function CompanyArchive({ repo }: { repo: ProductRepository }) {
  const { companyId = '' } = useParams();
  const company = repo.getCompany(companyId);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const requested = params.get('view');
  const view: ArchiveView =
    requested === 'social'
      ? 'social'
      : requested === 'graph' || requested === 'relationships'
        ? 'relationships'
        : requested === 'catalog' || requested === 'sources'
          ? 'sources'
          : requested === 'themes' || requested === 'narratives'
            ? 'narratives'
            : 'activity';
  const root = useRef<HTMLDivElement>(null);
  const [activityFilter, setActivityFilter] = useState('all');
  const { request } = useAccount();
  const [history, setHistory] = useState<{
      items: ProductEvent[];
      nextCursor: string | null;
    } | null>(null),
    [historyTotal, setHistoryTotal] = useState<number | null>(null),
    [historyError, setHistoryError] = useState(''),
    [historyBusy, setHistoryBusy] = useState(false);
  const historyGeneration = useRef(0);
  useEffect(() => {
    const generation = ++historyGeneration.current;
    setHistory(null);
    setHistoryTotal(null);
    setHistoryError('');
    setHistoryBusy(true);
    request<{ items: ProductEvent[]; nextCursor: string | null }>(
      `/archive-events?company=${encodeURIComponent(companyId)}&limit=40${activityFilter === 'all' ? '' : `&platform=${encodeURIComponent(activityFilter)}`}`,
    )
      .then((next) => {
        if (generation === historyGeneration.current) setHistory(next);
      })
      .catch(() => {
        if (generation === historyGeneration.current)
          setHistoryError('Could not load the full archive.');
      })
      .finally(() => {
        if (generation === historyGeneration.current) setHistoryBusy(false);
      });
    request<{ totalEvents: number }>(`/company-counts?company=${encodeURIComponent(companyId)}`)
      .then((next) => {
        if (generation === historyGeneration.current) setHistoryTotal(next.totalEvents);
      })
      .catch(() => {});
    return () => {
      historyGeneration.current++;
    };
  }, [companyId, request, activityFilter]);
  const moreHistory = async () => {
    if (!history?.nextCursor || historyBusy) return;
    const generation = historyGeneration.current;
    setHistoryBusy(true);
    try {
      const next = await request<{ items: ProductEvent[]; nextCursor: string | null }>(
        `/archive-events?company=${encodeURIComponent(companyId)}&limit=40&cursor=${encodeURIComponent(history.nextCursor)}${activityFilter === 'all' ? '' : `&platform=${encodeURIComponent(activityFilter)}`}`,
      );
      if (generation === historyGeneration.current)
        setHistory((old) => ({
          ...next,
          items: [
            ...new Map(
              [...(old?.items || []), ...next.items].map((event) => [event.id, event]),
            ).values(),
          ],
        }));
    } catch {
      if (generation === historyGeneration.current) setHistoryError('Could not load more records.');
    } finally {
      if (generation === historyGeneration.current) setHistoryBusy(false);
    }
  };
  const eventPage = company ? repo.queryEvents({ companyIds: [company.id], limit: 100 }) : null;
  const events = history?.items || eventPage?.items || [];
  const totalEvents = historyTotal ?? eventPage?.total ?? 0;
  const profiles = company ? repo.listProfiles({ companyId: company.id }) : [];
  const coverage = company
    ? Object.entries(company.coverage || {}).filter(([, value]) => value)
    : [];
  const archiveState = useArchiveCompany(company?.ticker || '');
  const archive = archiveState.data;
  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(
      () =>
        gsap.fromTo(
          '.company-archive-head>*',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.065, ease: 'power3.out' },
        ),
      root,
    );
    return () => ctx.revert();
  }, [companyId]);
  if (!company)
    return (
      <div className="archive-not-found">
        <p>COMPANY NOT FOUND</p>
        <h1>This archive identity is unavailable.</h1>
        <Link to="/archive">Return to Archive</Link>
      </div>
    );
  const changeView = (next: ArchiveView) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'activity') nextParams.delete('view');
    else nextParams.set('view', next);
    setParams(nextParams, { replace: true });
  };
  const open = (event: ProductEvent) => {
    const next = new URLSearchParams(params);
    next.set('event', event.id);
    setParams(next, {
      state: { eventOverlay: true, previous: location.pathname + location.search },
    });
  };
  const latest = events[0];
  const catalogTotal = archive?.sources.length || profiles.length;
  const sourceFamilyCount = archive ? Object.keys(archive.counts).length : coverage.length;
  return (
    <div className={`company-archive company-archive--${view}`} ref={root}>
      <div className="company-archive-grid" aria-hidden="true" />
      <Link className="archive-return" to="/archive">
        ← Company index
      </Link>
      <header className="company-archive-head">
        <p>OMNIA / ARCHIVE / {company.ticker}</p>
        <div className="company-archive-identity">
          <CompanyLogo company={company} large />
          <div>
            <h1>{company.name}</h1>
            <span>{company.ticker} · public-source archive</span>
          </div>
        </div>
        <div className="company-archive-facts">
          <span>
            <strong>{totalEvents}</strong> {historyTotal === null ? 'loaded records' : 'records'}
          </span>
          <span>
            <strong>{archiveState.loading ? '—' : catalogTotal}</strong> mapped sources
          </span>
          <span>
            <strong>{archiveState.loading ? '—' : sourceFamilyCount}</strong> source families
          </span>
          <span>
            <strong>{latest ? date(latest.publishedAt || latest.observedAt) : '—'}</strong> last
            published
          </span>
        </div>
        <nav aria-label="Archive view">
          {(['activity', 'relationships', 'sources', 'narratives', 'social'] as ArchiveView[]).map(
            (item) => (
              <button key={item} aria-pressed={view === item} onClick={() => changeView(item)}>
                {titleCase(item)}
              </button>
            ),
          )}
          <Link to={`/companies/${encodeURIComponent(company.id)}`}>Live workspace ↗</Link>
        </nav>
      </header>
      {archiveState.error && <p role="alert">{archiveState.error}</p>}
      {view === 'social' ? (
        <SocialTracker companyId={company.id} repo={repo} />
      ) : view === 'relationships' ? (
        <Suspense
          fallback={
            <div className="archive-graph-loading">
              <span>LOADING RELATIONSHIPS</span>
              <strong>Connecting identities, sources and narratives…</strong>
            </div>
          }
        >
          <RelationshipGraph repo={repo} company={company} archive={archive} onOpen={open} />
        </Suspense>
      ) : view === 'sources' ? (
        archive ? (
          <Catalog archive={archive} />
        ) : (
          <div className="archive-graph-loading">
            <span>{archiveState.loading ? 'LOADING SOURCES' : 'Source catalog unavailable'}</span>
          </div>
        )
      ) : view === 'narratives' ? (
        archive ? (
          <Narratives archive={archive} events={events} />
        ) : (
          <div className="archive-graph-loading">
            <span>{archiveState.loading ? 'LOADING NARRATIVES' : 'Narratives unavailable'}</span>
          </div>
        )
      ) : (
        <>
          <Activity
            events={events}
            archive={archive}
            onOpen={open}
            filter={activityFilter}
            onFilter={setActivityFilter}
          />
          {historyError && <p role="alert">{historyError}</p>}
          {historyBusy && <p role="status">Loading records…</p>}
          {history?.nextCursor && (
            <button
              className="button-secondary"
              disabled={historyBusy}
              onClick={() => void moreHistory()}
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
