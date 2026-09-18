import { UsageTracker, Analytics } from './Usage';
import { SocialTracker } from './components/SocialTracker';
import { Terminal } from './terminal/Terminal';
import { RecordMedia } from './components/RecordMedia';
import { SocialContext } from './components/SocialContext';
import { PresetControl } from './components/PresetControl';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  HashRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import gsap from 'gsap';
import {
  createProductRepository,
  createProductRepositoryAsync,
  loadProductRepository,
} from './data/repository.js';
import {
  PREFERENCES_KEY,
  toggleQueryValue,
  setQuerySelection,
  toggleQuerySelection,
  feedCompanyIds,
  selectFeedRepository,
  withoutEvent,
  queryEventPages,
  currentTracker,
  setTrackerSelection,
} from './state.js';
import './product.css';
import { CompanyLogo as Logo } from './components/CompanyLogo';
import { PlatformIcon } from './components/PlatformIcon';
import { AccessBoot } from './components/AccessBoot';
import { EventStream as EventList } from './components/EventStream';
import { TrackingProvider, TrackingControl, BulkTracking } from './components/TrackingControls';
import {
  parseTrackingPreferences,
  serializeTrackingPreferences,
  createTrackingRepository,
  getCompanyRule,
  TRACKING_PREFERENCES_KEY as TRACKING_KEY,
} from './tracking-preferences.js';
import type { TrackingPreferences } from './tracking-preferences.js';
import './workspace-refinements.css';
import { IdentityProvider, useIdentity } from './account/identity';
import { AccountProvider, useAccount } from './account/AccountProvider';
import { AccountMenu, WalletShortcut } from './account/AccountMenu';
import { Settings } from './account/Settings';
import { queryDailyTop } from './daily-feed.js';
import { useLiveTop } from './components/useLiveTop';
import { Bags } from './bags/Bags';
import { Tokens, CompanyTokens } from './tokens/Tokens';
import './account/account.css';
import './feed-layout.css';
import './modern-panel.css';
import { PreviewGate, PrivateAccess } from './waitlist/WaitlistGate';
import { youtubeEmbedUrl } from './youtube.mjs';
const ArchiveAtlas = React.lazy(() =>
  import('./archive/Archive').then((module) => ({ default: module.ArchiveAtlas })),
);
const CompanyArchive = React.lazy(() =>
  import('./archive/Archive').then((module) => ({ default: module.CompanyArchive })),
);

type Repository = Awaited<ReturnType<typeof loadProductRepository>>;
type Company = ReturnType<Repository['listCompanies']>[number];
type Event = NonNullable<ReturnType<Repository['getEvent']>>;
type Page = ReturnType<Repository['queryEvents']>;
type Query = NonNullable<Parameters<Repository['queryEvents']>[0]>;
type Shared = {
  repo: Repository;
  following: string[];
  prefs: TrackingPreferences;
  feedRepo: Repository;
  telegramRepo: Repository;
  previewLocked: boolean;
  fullAccess: boolean;
};
type IconName =
  | 'top'
  | 'bags'
  | 'companies'
  | 'archive'
  | 'feed'
  | 'following'
  | 'search'
  | 'arrow'
  | 'close'
  | 'check'
  | 'plus'
  | 'external'
  | 'back'
  | 'filter';

async function fetchInitialRepository(signal?: AbortSignal) {
  try {
    return await loadProductRepository({
      ...(signal ? { signal } : {}),
      ...(import.meta.env.MODE === 'website' ? { url: '/api/public/preview' } : {}),
    });
  } catch (failure) {
    if ((failure as Error).name === 'AbortError') throw failure;
    if (import.meta.env.MODE === 'website')
      return loadProductRepository({
        ...(signal ? { signal } : {}),
        url: '/website-data/panel-sample.json',
      });
    throw failure;
  }
}
const preloadedRepository = fetchInitialRepository()
  .then((repo) => ({ repo, error: false as const }))
  .catch(() => ({ repo: null, error: true as const }));

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    top: (
      <>
        <path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2L2.9 9.6l6.3-.9L12 3Z" />
      </>
    ),
    bags: (
      <>
        <path d="M5 8h14l2 12H3L5 8Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2M9 13l2 2 4-4" />
      </>
    ),
    companies: (
      <>
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="15" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <rect x="15" y="15" width="6" height="6" rx="1" />
      </>
    ),
    archive: (
      <>
        <path d="M4 7h16v13H4zM3 4h18v3H3z" />
        <path d="M9 11h6" />
      </>
    ),
    feed: (
      <>
        <path d="M3 5h18M3 12h18M3 19h12" />
      </>
    ),
    following: (
      <>
        <path d="m4 12 5 5L20 6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h15m-6-6 6 6-6 6" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M6 18 18 6" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6m0-6-10 10M10 4H4v16h16v-6" />
      </>
    ),
    back: (
      <>
        <path d="M20 12H5m6-6-6 6 6 6" />
      </>
    ),
    filter: (
      <>
        <path d="M3 6h18M6 12h12M9 18h6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function useReducedMotion() {
  const read = () =>
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.motion === 'reduced';
  const [reduced, setReduced] = useState(read);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(read());
    query.addEventListener('change', update);
    window.addEventListener('omnia-motion-change', update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('omnia-motion-change', update);
    };
  }, []);
  return reduced;
}

function useReveal(key: string, x = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced || !ref.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0.55, x, y: x ? 0 : 8 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.28,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          overwrite: true,
        },
      );
    });
    return () => context.revert();
  }, [key, x, reduced]);
  return ref;
}

function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        <Icon name="search" size={26} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Icon name="search" size={18} />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange('')}>
          <Icon name="close" size={16} />
        </button>
      )}
    </label>
  );
}

function FilterMenu({
  label,
  count,
  children,
  onSelectAll,
  onDeselectAll,
}: {
  label: string;
  count?: number;
  children: React.ReactNode | (() => React.ReactNode);
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector('summary')?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  return (
    <details ref={ref} className="filter-menu" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        {label}
        {!!count && <span className="filter-count">{count}</span>}
        <span className="chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="filter-options">
        {onSelectAll && onDeselectAll && (
          <div className="filter-bulk-actions">
            <button
              type="button"
              onClick={onSelectAll}
              aria-label={`Select all ${label.toLowerCase()}`}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              aria-label={`Deselect all ${label.toLowerCase()}`}
            >
              Deselect all
            </button>
          </div>
        )}
        {open && (typeof children === 'function' ? children() : children)}
      </div>
    </details>
  );
}

function ProfileOptions({
  profiles,
  selected,
  toggle,
}: {
  profiles: { id: string; label: string; platform: string }[];
  selected: string[] | null;
  toggle: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const results = useMemo(
    () => profiles.filter((p) => p.label.toLowerCase().includes(search.toLowerCase())),
    [profiles, search],
  );
  return (
    <>
      <input
        type="search"
        aria-label="Search profiles"
        placeholder="Search profiles"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
      />
      {results.slice(page * 60, (page + 1) * 60).map((p) => (
        <label key={p.id}>
          <input
            type="checkbox"
            checked={selected === null || selected.includes(p.id)}
            onChange={() => toggle(p.id)}
          />
          <PlatformIcon platform={p.platform} size={14} />
          <span>{p.label}</span>
        </label>
      ))}
      <div className="filter-bulk-actions">
        <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>{results.length} profiles</span>
        <button disabled={(page + 1) * 60 >= results.length} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </>
  );
}

function Catalog({ repo, following, feedRepo }: Shared) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const rawCategory = params.get('kind') || 'all';
  const category = ['company', 'fund'].includes(rawCategory) ? rawCategory : 'all';
  const trackedOnly = params.get('tracked') === '1';
  const companies = repo
    .listCompanies({ query })
    .filter(
      (company) =>
        (!trackedOnly || following.includes(company.id)) &&
        (category === 'all' || company.category === category),
    );
  const all = repo.listCompanies();
  const ref = useReveal('catalog');
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  return (
    <div ref={ref} className="page catalog-page">
      <div className="compact-heading">
        <h1>
          Companies{' '}
          <span className="heading-count">
            {companies.length === all.length ? all.length : `${companies.length} / ${all.length}`}
          </span>
        </h1>
        <Link className="catalog-feed-access text-link" to="/feed">
          My Feed
          <Icon name="arrow" size={15} />
        </Link>
      </div>
      <div className="catalog-layout">
        <section className="catalog-universe" aria-label="Company catalog">
          <div className="catalog-toolbar">
            <SearchField
              value={query}
              onChange={(value) => change('q', value)}
              placeholder="Search companies or tickers"
            />
            <div className="segmented" aria-label="Catalog category">
              <button aria-pressed={category === 'all'} onClick={() => change('kind', '')}>
                All
              </button>
              <button
                aria-pressed={category === 'company'}
                onClick={() => change('kind', 'company')}
              >
                Companies
              </button>
              <button aria-pressed={category === 'fund'} onClick={() => change('kind', 'fund')}>
                Funds
              </button>
            </div>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={trackedOnly}
                onChange={(e) => change('tracked', e.target.checked ? '1' : '')}
              />
              Following
            </label>
          </div>
          <div className="catalog-selection">
            <span>{companies.length} companies in this view</span>
            <BulkTracking
              companyIds={companies.map((company) => company.id)}
              scopeLabel="Visible companies"
            />
          </div>
          {companies.length ? (
            <div className="company-grid">
              {companies.map((company) => (
                <article
                  className={`company-tile ${following.includes(company.id) ? 'tile-following' : ''}`}
                  key={company.id}
                >
                  <Link
                    className="company-open"
                    aria-label={`Explore ${company.name} (${company.ticker})`}
                    title={company.name}
                    to={`/companies/${encodeURIComponent(company.id)}`}
                    state={{ companyReturn: `/companies?${params.toString()}` }}
                  >
                    <Logo company={company} large />
                    <span className="company-ticker">{company.ticker}</span>
                  </Link>
                  <TrackingControl company={company} />
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="No matching companies."
              action={
                <button className="button-secondary" onClick={() => setParams({})}>
                  Reset filters
                </button>
              }
            >
              Try another name or clear your filters.
            </Empty>
          )}
        </section>
        <CatalogFeed repo={feedRepo} following={following} />
      </div>
    </div>
  );
}

function CatalogFeed({ repo, following }: Pick<Shared, 'repo' | 'following'>) {
  const [params, setParams] = useSearchParams();
  const platforms = params.getAll('feedPlatform');
  const page = repo.queryEvents({
    companyIds: following,
    platforms: platforms.length ? platforms : undefined,
    limit: 15,
  });
  const feedParams = new URLSearchParams();
  for (const platform of platforms) feedParams.append('platform', platform);
  const fullFeed = `/feed${feedParams.size ? `?${feedParams}` : ''}`;
  return (
    <aside className="catalog-feed" aria-labelledby="catalog-feed-title">
      <div className="catalog-feed-heading">
        <h2 id="catalog-feed-title">
          My Feed <span className="heading-count">{following.length}</span>
        </h2>
        <span className="status-tag">Archived</span>
      </div>
      <div className="catalog-feed-toolbar">
        <FilterMenu label="Platforms" count={platforms.length}>
          {repo.platforms.map((platform) => (
            <label key={platform.id}>
              <input
                type="checkbox"
                checked={platforms.includes(platform.id)}
                onChange={() =>
                  setParams(toggleQueryValue(params, 'feedPlatform', platform.id), {
                    replace: true,
                  })
                }
              />
              <PlatformIcon platform={platform.id} size={14} />
              {platform.label}
            </label>
          ))}
        </FilterMenu>
        <Link className="text-link" to={fullFeed}>
          Open feed
          <Icon name="arrow" size={14} />
        </Link>
      </div>
      <div className="catalog-feed-content">
        {!following.length ? (
          <div className="compact-empty">
            <Icon name="feed" size={22} />
            <h3>Track a company to start.</h3>
          </div>
        ) : page.items.length ? (
          <EventList repo={repo} page={page} preferredCompanyIds={following} compact hideFooter />
        ) : (
          <div className="compact-empty">
            <h3>No records in this view.</h3>
            <p>
              {platforms.length
                ? 'Try another platform or clear the filter.'
                : 'These companies have no records in the available archive.'}
            </p>
            {platforms.length > 0 && (
              <button
                className="text-link"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.delete('feedPlatform');
                  setParams(next, { replace: true });
                }}
              >
                Clear platforms
              </button>
            )}
          </div>
        )}
      </div>
      {page.items.length > 0 && (
        <Link className="catalog-feed-footer" to={fullFeed}>
          <span>
            {page.total} {page.total === 1 ? 'record' : 'records'}
          </span>
          <span>
            View all
            <Icon name="arrow" size={14} />
          </span>
        </Link>
      )}
    </aside>
  );
}

function dateLabel(value: string | null | undefined, withTime = true) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded';
  return (
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
      timeZone: 'UTC',
    }).format(new Date(value)) + (withTime ? ' UTC' : '')
  );
}

function eventLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}
function platformLabel(repo: Repository, id: string) {
  return repo.platforms.find((platform) => platform.id === id)?.label || eventLabel(id);
}

function useEventPage(repo: Repository, query: Query) {
  const signature = JSON.stringify(query);
  const [pagination, setPagination] = useState({ signature, pages: 1 });
  const count = pagination.signature === signature ? pagination.pages : 1;
  const page = useMemo(() => queryEventPages(repo, query, count), [repo, signature, count]);
  return { page, more: () => setPagination({ signature, pages: count + 1 }) };
}

function eventTypeOptions(repo: Repository, companyIds: string[]) {
  const types = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = repo.queryEvents({ companyIds, cursor, limit: 200 });
    for (const event of page.items) types.add(event.eventType);
    cursor = page.nextCursor;
  } while (cursor);
  return [...types].sort();
}

function CompanyDetail({ repo }: Shared) {
  const { companyId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const company = repo.getCompany(companyId);
  const { request } = useAccount();
  const [counts, setCounts] = useState<{
    eventCounts: Record<string, number>;
    tokenCount: number;
    totalEvents: number;
  } | null>(null);
  useEffect(() => {
    let active = true;
    setCounts(null);
    request<{ eventCounts: Record<string, number>; tokenCount: number; totalEvents: number }>(
      `/company-counts?company=${encodeURIComponent(companyId)}`,
    )
      .then((value) => {
        if (active) setCounts(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [companyId, request]);
  const rawPlatform = params.get('tab') || '';
  const platform = repo.platforms.some((item) => item.id === rawPlatform) ? rawPlatform : '';
  const profileIds = params.getAll('profile');
  const query = params.get('q') || '';
  const { page: events, more } = useEventPage(repo, {
    companyIds: [companyId],
    platforms: platform ? [platform] : undefined,
    profileIds: profileIds.length ? profileIds : undefined,
    query,
  });
  const [remote, setRemote] = useState<{ items: Event[]; nextCursor: string | null } | null>(null),
    [remoteError, setRemoteError] = useState(''),
    [remoteBusy, setRemoteBusy] = useState(false);
  const remoteKey = companyId + '|' + platform + '|' + query + '|' + profileIds.join(',');
  const remoteGeneration = useRef(0);
  useEffect(() => {
    const generation = ++remoteGeneration.current;
    setRemote(null);
    setRemoteError('');
    if (platform === 'tokens') return;
    setRemoteBusy(true);
    const query = new URLSearchParams({ company: companyId, limit: '40' });
    if (platform) query.set('platform', platform);
    if (params.get('q')) query.set('q', params.get('q')!);
    for (const profile of profileIds) query.append('profile', profile);
    request<{ items: Event[]; nextCursor: string | null }>(`/archive-events?${query}`)
      .then((page) => {
        if (generation === remoteGeneration.current) setRemote(page);
      })
      .catch(() => {
        if (generation === remoteGeneration.current)
          setRemoteError('Could not load the full archive. Showing available records.');
      })
      .finally(() => {
        if (generation === remoteGeneration.current) setRemoteBusy(false);
      });
    return () => {
      remoteGeneration.current++;
    };
  }, [remoteKey, request]);
  const moreRemote = async () => {
    if (!remote?.nextCursor || remoteBusy) return;
    const generation = remoteGeneration.current;
    setRemoteBusy(true);
    const query = new URLSearchParams({
      company: companyId,
      limit: '40',
      cursor: remote.nextCursor,
    });
    if (platform) query.set('platform', platform);
    if (params.get('q')) query.set('q', params.get('q')!);
    for (const profile of profileIds) query.append('profile', profile);
    try {
      const next = await request<{ items: Event[]; nextCursor: string | null }>(
        `/archive-events?${query}`,
      );
      if (generation === remoteGeneration.current)
        setRemote((old) => ({
          ...next,
          items: [
            ...new Map(
              [...(old?.items || []), ...next.items].map((event) => [event.id, event]),
            ).values(),
          ],
        }));
    } catch {
      if (generation === remoteGeneration.current) setRemoteError('Could not load more records.');
    } finally {
      if (generation === remoteGeneration.current) setRemoteBusy(false);
    }
  };
  const displayed = remote
    ? {
        ...remote,
        total:
          counts && !query && !profileIds.length
            ? platform
              ? counts.eventCounts[platform] || 0
              : counts.totalEvents
            : remote.items.length,
      }
    : events;
  const displayMore = remote ? () => void moreRemote() : more;
  const profiles = repo.listProfiles({ companyId, platform: platform || undefined });
  const reveal = useReveal(companyId);
  const sourceReveal = useReveal(platform, 10);
  const location = useLocation();
  if (!company)
    return (
      <Empty
        title="Company not found."
        action={
          <Link className="button-primary" to="/companies">
            Explore companies
          </Link>
        }
      >
        This link does not match an entity in the current catalog.
      </Empty>
    );
  const changeTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.delete('event');
    next.delete('profile');
    if (id) next.set('tab', id);
    else next.delete('tab');
    setParams(next, { replace: true });
  };
  const changeQuery = (value: string) => {
    const next = new URLSearchParams(params);
    next.delete('event');
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };
  return (
    <div ref={reveal} className="page company-page">
      <Link className="back-link" to={location.state?.companyReturn || '/companies'}>
        <Icon name="back" size={15} />
        All companies
      </Link>
      <div className="company-heading">
        <Logo company={company} large />
        <div>
          <p className="eyebrow">
            {company.ticker} <span className="heading-dot">/</span>{' '}
            {company.category === 'fund' ? 'FUND / ETF' : 'COMPANY'}
          </p>
          <h1>{company.name}</h1>
        </div>
        <TrackingControl company={company} />
      </div>
      <div className="company-summary">
        <span>
          {counts?.totalEvents ?? repo.queryEvents({ companyIds: [companyId], limit: 1 }).total}{' '}
          {counts ? 'available records' : 'loaded records'}
        </span>
        <span>{repo.listProfiles({ companyId }).length} profiles & sources</span>
        <span>Browse all company activity</span>
      </div>
      <div
        className="source-tabs"
        role="tablist"
        aria-label="Company sources"
        onKeyDown={(e) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
          e.preventDefault();
          const tabs = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
          const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? tabs.length - 1
                : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          tabs[next]?.focus();
          tabs[next]?.click();
        }}
      >
        {[{ id: '', label: 'All activity' }, ...repo.platforms].map((tab) => (
          <button
            role="tab"
            id={`tab-${tab.id || 'overview'}`}
            aria-selected={platform === tab.id}
            aria-controls="company-tab-panel"
            tabIndex={platform === tab.id ? 0 : -1}
            key={tab.id}
            onClick={() => changeTab(tab.id)}
          >
            <PlatformIcon platform={tab.id || 'all'} size={15} />
            <span>{tab.label}</span>
            <small>
              {tab.id === 'tokens'
                ? (counts?.tokenCount ?? '…')
                : counts
                  ? tab.id
                    ? counts.eventCounts[tab.id] || 0
                    : counts.totalEvents
                  : repo.queryEvents({
                      companyIds: [companyId],
                      platforms: tab.id ? [tab.id] : undefined,
                      limit: 1,
                    }).total}
            </small>
          </button>
        ))}
      </div>
      <div
        ref={sourceReveal}
        role="tabpanel"
        id="company-tab-panel"
        aria-labelledby={`tab-${platform || 'overview'}`}
        className="company-content"
      >
        {platform !== 'tokens' && (
          <div className="activity-toolbar">
            <SearchField
              value={query}
              onChange={changeQuery}
              placeholder="Search company activity"
            />
            <FilterMenu label="Profiles" count={profileIds.length}>
              {profiles.length ? (
                profiles.map((profile) => (
                  <label key={profile.id}>
                    <input
                      type="checkbox"
                      checked={profileIds.includes(profile.id)}
                      onChange={() =>
                        setParams(toggleQueryValue(params, 'profile', profile.id), {
                          replace: true,
                        })
                      }
                    />
                    <PlatformIcon platform={profile.platform} size={14} />
                    <span>{profile.label}</span>
                    <small>{profile.eventCount}</small>
                  </label>
                ))
              ) : (
                <span className="filter-empty">No profiles available yet.</span>
              )}
            </FilterMenu>
          </div>
        )}
        <div className="content-heading activity-heading">
          <h2>
            {platform === 'tokens'
              ? 'Tokens'
              : platform
                ? `${platformLabel(repo, platform)} activity`
                : 'Company activity'}{' '}
            <span className="heading-count">
              {platform === 'tokens' ? (counts?.tokenCount ?? '…') : displayed.total}
              {platform !== 'tokens' && (query || profileIds.length > 0) && remote?.nextCursor
                ? '+'
                : ''}
            </span>
          </h2>
          <span className="status-tag">Available archive</span>
        </div>
        {remoteError && platform !== 'tokens' && <p role="alert">{remoteError}</p>}
        {remoteBusy && !remote && platform !== 'tokens' && <p role="status">Loading archive…</p>}
        {platform === 'tokens' ? (
          <CompanyTokens key={company.id} company={company} />
        ) : displayed.items.length ? (
          <EventList
            repo={repo}
            page={displayed}
            onMore={displayMore}
            preferredCompanyIds={[companyId]}
          />
        ) : (
          <Empty
            title={
              query || profileIds.length
                ? 'No activity matches these filters.'
                : `No ${platform ? platformLabel(repo, platform) + ' ' : ''}activity archived yet.`
            }
            action={
              query || profileIds.length ? (
                <button
                  className="button-secondary"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete('q');
                    next.delete('profile');
                    setParams(next, { replace: true });
                  }}
                >
                  Clear filters
                </button>
              ) : undefined
            }
          >
            {query || profileIds.length
              ? 'Choose another profile or clear your search.'
              : 'You can configure this category in Tracking. Records will appear here when available.'}
          </Empty>
        )}
      </div>
    </div>
  );
}

type TrackerId = keyof typeof trackerDetails;
const TRACKER_KEY = 'omnia.product.pinned-trackers.v1';
const trackerDetails = {
  reddit: {
    label: 'Reddit Tracker',
    icon: 'reddit',
    description: 'Topics in New, Hot, Rising and Top.',
  },
  x: {
    label: 'X Tracker',
    icon: 'x',
    description: 'Tracked public profiles and reviewed X activity connected to each company.',
  },
  youtube: {
    label: 'YouTube Tracker',
    icon: 'youtube',
    description:
      'New videos from monitored official channels, with native embeds and provider thumbnails.',
  },
  website: {
    label: 'Website Tracker',
    icon: 'web',
    description: 'Official newsroom releases and monitored website changes.',
  },
  github: {
    label: 'GitHub Tracker',
    icon: 'github',
    description: 'New commits and newly created public repositories from monitored organizations.',
  },
  instagram: { label: 'Instagram', icon: 'instagram', description: 'Posts, profiles and links.' },
  truthsocial: {
    label: 'Truth Social',
    icon: 'truthsocial',
    description: 'Posts, profiles and links.',
  },
  telegram: {
    label: 'Telegram',
    icon: 'telegram',
    description: 'Channel posts, profiles and links.',
  },
  binance_square: {
    label: 'Binance Square',
    icon: 'binance_square',
    description: 'Posts, profiles and changes.',
  },
  tiktok: { label: 'TikTok', icon: 'tiktok', description: 'Videos, profiles and links.' },
  facebook: { label: 'Facebook', icon: 'facebook', description: 'Posts, profiles and links.' },
  linkedin: { label: 'LinkedIn', icon: 'linkedin', description: 'Posts, profiles and links.' },
  bluesky: { label: 'Bluesky', icon: 'bluesky', description: 'Posts, profiles and links.' },
} as const;
const allTrackerIds = Object.keys(trackerDetails) as TrackerId[];
function readPinnedTrackers(): TrackerId[] {
  try {
    const value = JSON.parse(localStorage.getItem(TRACKER_KEY) || 'null');
    return Array.isArray(value)
      ? value.filter((id): id is TrackerId => allTrackerIds.includes(id))
      : ['reddit', 'x', 'youtube', 'website', 'github', 'instagram', 'truthsocial'];
  } catch {
    return ['reddit', 'x', 'youtube', 'website', 'github', 'instagram', 'truthsocial'];
  }
}
function FeedTabs({ fullAccess }: { fullAccess: boolean }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'feed';
  const active = currentTracker(params) as '' | TrackerId;
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState<TrackerId[]>(readPinnedTrackers);
  function save(ids: TrackerId[]) {
    setPinned(ids);
    try {
      localStorage.setItem(TRACKER_KEY, JSON.stringify(ids));
    } catch {
      /* URL navigation remains available. */
    }
  }
  function togglePin(id: TrackerId) {
    save(pinned.includes(id) ? pinned.filter((item) => item !== id) : [...pinned, id]);
  }
  function openTracker(id: TrackerId) {
    const next = active === id ? new URLSearchParams(params) : setTrackerSelection(params, id);
    next.set(
      'view',
      ['reddit', 'x', 'youtube', 'website', 'github'].includes(id) ? 'my' : 'network',
    );
    setParams(next, { replace: true });
    setOpen(false);
  }
  return (
    <div className="feed-nav-shell">
      <nav className="feed-tabs tracker-tabs" aria-label="Feed views">
        <Link
          to="/feed"
          aria-current={(view === 'feed' || view === 'my') && !active ? 'page' : undefined}
        >
          Recent
        </Link>
        <Link to="/feed?view=top" aria-current={view === 'top' && !active ? 'page' : undefined}>
          Top
        </Link>
        <Link to="/feed?view=tokens" aria-current={view === 'tokens' ? 'page' : undefined}>
          Tokens
        </Link>
        {pinned.map((id) => (
          <button
            key={id}
            className="tracker-tab"
            aria-pressed={active === id}
            onClick={() => openTracker(id)}
          >
            <PlatformIcon platform={trackerDetails[id].icon} size={14} />
            <span>{trackerDetails[id].label}</span>
          </button>
        ))}
        <button
          className="tracker-add"
          aria-label="Choose source trackers"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name="plus" size={15} />
          <span>Trackers</span>
        </button>
      </nav>
      {open && (
        <section className="tracker-picker" role="dialog" aria-label="Choose source trackers">
          <header>
            <div>
              <small>SOURCE TRACKERS</small>
              <strong>Choose what stays in your navigation.</strong>
            </div>
            <button aria-label="Close tracker selector" onClick={() => setOpen(false)}>
              <Icon name="close" size={14} />
            </button>
          </header>
          <div>
            {allTrackerIds.map((id) => (
              <div className="tracker-picker-row" key={id}>
                <label>
                  <input
                    type="checkbox"
                    checked={pinned.includes(id)}
                    onChange={() => togglePin(id)}
                  />
                  <span className="tracker-picker-icon">
                    <PlatformIcon platform={trackerDetails[id].icon} size={17} />
                  </span>
                  <span>
                    <strong>{trackerDetails[id].label}</strong>
                    <small>{trackerDetails[id].description}</small>
                  </span>
                </label>
                <button type="button" onClick={() => openTracker(id)}>
                  Open
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
function Feed(shared: Shared) {
  const [params] = useSearchParams();
  const view = params.get('view'),
    popout = params.get('popout') === '1';
  const platform = (currentTracker(params) ||
    (params.get('platform') === 'website' ? 'website' : '')) as TrackerId;
  if (view === 'j7' || view === 'gmgn')
    return <Navigate to="/feed?view=network&platform=x" replace />;
  if (shared.fullAccess && (!view || view === 'feed'))
    return (
      <>
        {!popout && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <FeedTabs fullAccess />
          </div>
        )}
        <Terminal repo={shared.repo} feedRepo={shared.feedRepo} following={shared.following} />
      </>
    );
  return (
    <>
      {!popout && (
        <div className="page" style={{ paddingBottom: 0 }}>
          <FeedTabs fullAccess={shared.fullAccess} />
        </div>
      )}
      {view === 'tokens' ? (
        <div className="page">
          <Tokens companies={shared.repo.listCompanies()} previewLocked={shared.previewLocked} />
        </div>
      ) : shared.fullAccess && view === 'network' && platform ? (
        <div className="page">
          <SocialTracker key={platform} platform={platform} repo={shared.repo} />
        </div>
      ) : (
        <NewsFeed {...shared} popout={popout} />
      )}
    </>
  );
}
function NewsFeed({
  repo: fullRepo,
  feedRepo,
  following,
  previewLocked,
  fullAccess,
  popout = false,
}: Shared & { popout?: boolean }) {
  const [params, setParams] = useSearchParams();
  const repo = selectFeedRepository(fullRepo, feedRepo, params);
  const combined = !params.get('view') || params.get('view') === 'feed';
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const selected = params.getAll('company');
  const platforms = params.getAll('platform');
  const eventTypes = params.getAll('type');
  const redditTracker = params.get('view') === 'my' && currentTracker(params) === 'reddit';
  const rawRedditView = redditTracker ? params.get('reddit') : null;
  const redditView =
    rawRedditView && ['new', 'hot', 'rising', 'top'].includes(rawRedditView)
      ? (rawRedditView as 'new' | 'hot' | 'rising' | 'top')
      : '';
  const profileIds = params.getAll('profile');
  const profiles = useMemo(
    () =>
      repo
        .listProfiles({})
        .filter((profile) => profile.companyIds.some((id) => following.includes(id))),
    [repo, following],
  );
  const rawPeriod = 'all';
  const period = ['all', '1', '7', '30', '90'].includes(rawPeriod) ? rawPeriod : 'all';
  const query = params.get('q') || '';
  const companies = repo.listCompanies({ ids: following });
  const ids = feedCompanyIds(following, selected);
  const ref = useReveal('feed');
  const since = useMemo(
    () => (period === 'all' ? undefined : new Date(now - Number(period) * 86400000).toISOString()),
    [period, now],
  );
  const { page: latestPage, more } = useEventPage(repo, {
    companyIds: ids,
    platforms: platforms.length ? platforms : undefined,
    eventTypes: eventTypes.length ? eventTypes : undefined,
    redditViews: redditView ? [redditView] : undefined,
    profileIds: profileIds.length ? profileIds : undefined,
    query,
    since,
    requirePublication: true,
  });
  const localTop = useMemo(
    () =>
      !combined && params.get('view') !== 'top'
        ? { items: [], total: 0, nextCursor: null }
        : queryDailyTop(
            repo,
            {
              companyIds: ids,
              platforms: platforms.length ? platforms : undefined,
              eventTypes: eventTypes.length ? eventTypes : undefined,
              redditViews: redditView ? [redditView] : undefined,
              profileIds: profileIds.length ? profileIds : undefined,
              query,
            },
            now,
          ),
    [repo, params.toString(), following, now],
  );
  const topQuery = new URLSearchParams({ day: new Date(now).toISOString().slice(0, 10) });
  for (const id of ids) topQuery.append('company', id);
  for (const platform of platforms) topQuery.append('platform', platform);
  for (const type of eventTypes) topQuery.append('type', type);
  for (const profile of profileIds) topQuery.append('profile', profile);
  if (redditView) topQuery.set('reddit', redditView);
  if (query) topQuery.set('q', query);
  const liveTop = useLiveTop(
    fullAccess && ids.length > 0 && (combined || params.get('view') === 'top'),
    topQuery.toString(),
  );
  const topPage = fullAccess
    ? (ids.length ? liveTop.page : null) || { items: [], total: 0, nextCursor: null }
    : localTop;
  function clearFilters() {
    setParams(params.get('view') ? { view: params.get('view')! } : {});
  }
  const types = useMemo(() => eventTypeOptions(repo, following), [repo, following]);
  function value(key: string, nextValue: string) {
    const next = new URLSearchParams(params);
    next.delete('event');
    if (nextValue) next.set(key, nextValue);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  function selectReddit(view: string) {
    const next = new URLSearchParams(params);
    next.delete('event');
    next.delete('platform');
    next.append('platform', 'reddit');
    if (view) next.set('reddit', view);
    else next.delete('reddit');
    setParams(next, { replace: true });
  }
  const tracker = currentTracker(params) as '' | TrackerId;
  function openTrackerWindow() {
    if (!tracker) return;
    const next = new URLSearchParams(params);
    next.set('view', 'my');
    next.set('popout', '1');
    next.delete('event');
    const url = `${window.location.origin}${window.location.pathname}#/feed?${next.toString()}`;
    window.open(
      url,
      `omnia-${tracker}-tracker`,
      'popup=yes,width=620,height=860,resizable=yes,scrollbars=yes',
    );
  }
  const activeCount =
    selected.length +
    platforms.length +
    eventTypes.length +
    profileIds.length +
    (redditView ? 1 : 0) +
    (period !== 'all' ? 1 : 0) +
    (query ? 1 : 0);
  return (
    <div ref={ref} className={`page feed-page${popout ? ' tracker-window-page' : ''}`}>
      <div className="compact-heading">
        <h1>
          {tracker
            ? trackerDetails[tracker].label
            : combined
              ? 'Feed'
              : params.get('view') === 'top'
                ? 'Top Today'
                : import.meta.env.MODE === 'website'
                  ? 'News & Archive'
                  : 'Live News'}
        </h1>
        {tracker &&
          (popout ? (
            <button className="tracker-window-action" onClick={() => window.close()}>
              <Icon name="close" size={14} />
              Close window
            </button>
          ) : (
            <button className="tracker-window-action" onClick={openTrackerWindow}>
              <Icon name="external" size={14} />
              Open in window
            </button>
          ))}
      </div>
      {fullAccess && tracker && (
        <Link className="text-link" to={`/feed?view=network&platform=${tracker}`}>
          Posts, profiles & links
          <Icon name="arrow" size={14} />
        </Link>
      )}
      {!following.length && !combined ? (
        <Empty
          title="Your feed starts with a company."
          action={
            <Link className="button-primary" to="/companies">
              Choose companies
              <Icon name="arrow" size={17} />
            </Link>
          }
        >
          Choose companies to follow.
        </Empty>
      ) : (
        <>
          {!popout && (
            <div className="feed-following">
              <span>Following</span>
              <div className="logo-stack">
                {companies.slice(0, 6).map((company) => (
                  <Link
                    key={company.id}
                    to={`/companies/${encodeURIComponent(company.id)}`}
                    title={company.name}
                  >
                    <Logo company={company} />
                  </Link>
                ))}
              </div>
              <span className="mono">
                {following.length} {following.length === 1 ? 'company' : 'companies'}
              </span>
              <Link to="/following">
                Manage
                <Icon name="arrow" size={14} />
              </Link>
            </div>
          )}
          {!popout && (
            <div className="feed-toolbar">
              <SearchField
                value={query}
                onChange={(q) => value('q', q)}
                placeholder="Search this feed"
              />
              <div className="filter-group">
                <FilterMenu
                  label="Companies"
                  count={selected.filter((id) => id !== '__none__').length}
                  onSelectAll={() =>
                    setParams(
                      setQuerySelection(
                        params,
                        'company',
                        companies.map((company) => company.id),
                      ),
                      { replace: true },
                    )
                  }
                  onDeselectAll={() =>
                    setParams(setQuerySelection(params, 'company', []), { replace: true })
                  }
                >
                  {companies.map((company) => (
                    <label key={company.id}>
                      <input
                        type="checkbox"
                        checked={!params.has('company') || selected.includes(company.id)}
                        onChange={() =>
                          setParams(
                            toggleQuerySelection(
                              params,
                              'company',
                              company.id,
                              companies.map((company) => company.id),
                            ),
                            { replace: true },
                          )
                        }
                      />
                      <span>{company.name}</span>
                      <small>{company.ticker}</small>
                    </label>
                  ))}
                </FilterMenu>
                <FilterMenu
                  label="Platforms"
                  count={platforms.filter((id) => id !== '__none__').length}
                  onSelectAll={() =>
                    setParams(
                      setQuerySelection(
                        params,
                        'platform',
                        repo.platforms.map((platform) => platform.id),
                      ),
                      { replace: true },
                    )
                  }
                  onDeselectAll={() =>
                    setParams(setQuerySelection(params, 'platform', []), { replace: true })
                  }
                >
                  {repo.platforms.map((platform) => (
                    <label key={platform.id}>
                      <input
                        type="checkbox"
                        checked={!params.has('platform') || platforms.includes(platform.id)}
                        onChange={() =>
                          setParams(
                            toggleQuerySelection(
                              params,
                              'platform',
                              platform.id,
                              repo.platforms.map((platform) => platform.id),
                            ),
                            { replace: true },
                          )
                        }
                      />
                      <PlatformIcon platform={platform.id} size={14} />
                      {platform.label}
                    </label>
                  ))}
                </FilterMenu>
                <FilterMenu
                  label="Profiles"
                  count={profileIds.filter((id) => id !== '__none__').length}
                  onSelectAll={() =>
                    setParams(
                      setQuerySelection(
                        params,
                        'profile',
                        profiles.map((profile) => profile.id),
                      ),
                      { replace: true },
                    )
                  }
                  onDeselectAll={() =>
                    setParams(setQuerySelection(params, 'profile', []), { replace: true })
                  }
                >
                  {() => (
                    <ProfileOptions
                      profiles={profiles}
                      selected={params.has('profile') ? profileIds : null}
                      toggle={(id) =>
                        setParams(
                          toggleQuerySelection(
                            params,
                            'profile',
                            id,
                            profiles.map((p) => p.id),
                          ),
                          { replace: true },
                        )
                      }
                    />
                  )}
                </FilterMenu>
                <FilterMenu
                  label="Type"
                  count={eventTypes.filter((id) => id !== '__none__').length}
                  onSelectAll={() =>
                    setParams(setQuerySelection(params, 'type', types), { replace: true })
                  }
                  onDeselectAll={() =>
                    setParams(setQuerySelection(params, 'type', []), { replace: true })
                  }
                >
                  {types.length ? (
                    types.map((type) => (
                      <label key={type}>
                        <input
                          type="checkbox"
                          checked={!params.has('type') || eventTypes.includes(type)}
                          onChange={() =>
                            setParams(toggleQuerySelection(params, 'type', type, types), {
                              replace: true,
                            })
                          }
                        />
                        {eventLabel(type)}
                      </label>
                    ))
                  ) : (
                    <span className="filter-empty">No indexed event types.</span>
                  )}
                </FilterMenu>
              </div>
            </div>
          )}
          {redditTracker && (
            <div className="reddit-view-control">
              <span>
                <PlatformIcon platform="reddit" size={14} />
                Reddit
              </span>
              <div className="segmented" aria-label="Reddit ranking">
                <button aria-pressed={!redditView} onClick={() => selectReddit('')}>
                  All
                </button>
                {['new', 'hot', 'rising', 'top'].map((view) => (
                  <button
                    key={view}
                    aria-pressed={redditView === view}
                    onClick={() => selectReddit(view)}
                  >
                    {eventLabel(view)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeCount > 0 && (
            <div className="feed-clear">
              <button className="text-link" onClick={clearFilters}>
                Clear {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
                <Icon name="close" size={13} />
              </button>
            </div>
          )}
          <div className={`feed-split${combined ? ' feed-overview' : ''}`}>
            {params.get('view') !== 'top' && (
              <section className="feed-column" aria-labelledby="live-news-title">
                <div className="feed-column-heading">
                  <h2 id="live-news-title">
                    <Icon name="feed" size={16} />
                    Latest news <span>{latestPage.total}</span>
                  </h2>
                </div>
                <div
                  className="feed-column-body"
                  tabIndex={0}
                  role="region"
                  aria-label="News and archive list"
                >
                  {latestPage.items.length ? (
                    <EventList
                      repo={repo}
                      page={latestPage}
                      onMore={more}
                      preferredCompanyIds={ids}
                      compact
                      hideFooter
                    />
                  ) : (
                    <div className="feed-empty">
                      <h3>No news matches your filters.</h3>
                      {activeCount > 0 && (
                        <button className="button-secondary" onClick={clearFilters}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
            {(combined || params.get('view') === 'top') && (
              <section className="feed-column" aria-labelledby="top-today-title">
                <div className="feed-column-heading">
                  <h2 id="top-today-title" title="Topics gaining attention today.">
                    <Icon name="top" size={16} />
                    Top today <span>{topPage.total}</span>
                  </h2>
                  <time dateTime={new Date(now).toISOString().slice(0, 10)}>
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    }).format(now)}{' '}
                    · UTC
                  </time>
                </div>
                <div
                  className="feed-column-body"
                  tabIndex={0}
                  role="region"
                  aria-label="Top today list"
                >
                  {fullAccess && liveTop.error && <p role="alert">{liveTop.error}</p>}
                  {topPage.items.length ? (
                    <EventList
                      repo={repo}
                      page={topPage}
                      preferredCompanyIds={ids}
                      compact
                      hideFooter
                    />
                  ) : (
                    <div className="feed-empty">
                      <h3>
                        {fullAccess && ids.length && !liveTop.page && !liveTop.error
                          ? 'Loading Top…'
                          : liveTop.error
                            ? 'Top unavailable for this selection.'
                            : 'No active topics for this selection.'}
                      </h3>
                    </div>
                  )}
                </div>
              </section>
            )}
            {combined && (
              <section
                className="feed-column feed-token-column"
                aria-labelledby="combined-tokens-title"
              >
                <div className="feed-column-heading">
                  <h2 id="combined-tokens-title">
                    <Icon name="bags" size={16} />
                    Tokens
                  </h2>
                </div>
                <div
                  className="feed-column-body"
                  tabIndex={0}
                  role="region"
                  aria-label="Tokens list"
                >
                  <Tokens
                    companies={fullRepo.listCompanies()}
                    compact
                    previewLocked={previewLocked}
                  />
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Following({ repo, following, prefs, telegramRepo }: Shared) {
  const account = useAccount();
  const ref = useReveal('following');
  const [params, setParams] = useSearchParams();
  const telegramPreview = params.get('channel') === 'telegram';
  const trackedIds = repo
    .listCompanies()
    .filter(
      (company) =>
        following.includes(company.id) ||
        getCompanyRule(prefs, company.id, 'telegram').platforms.length > 0,
    )
    .map((company) => company.id);
  const companies = repo.listCompanies({ ids: trackedIds });
  const { page, more } = useEventPage(telegramRepo, {});
  return (
    <div ref={ref} className="page following-page">
      <div className="compact-heading">
        <h1>
          Following <span className="heading-count">{companies.length}</span>
        </h1>
        <Link className="button-secondary" to="/companies">
          Add companies
          <Icon name="plus" size={17} />
        </Link>
      </div>
      <div className="following-controls">
        <div className="segmented">
          <button aria-pressed={!telegramPreview} onClick={() => setParams({})}>
            Tracking preferences
          </button>
          <button aria-pressed={telegramPreview} onClick={() => setParams({ channel: 'telegram' })}>
            <PlatformIcon platform="telegram" size={14} />
            Telegram preview
          </button>
        </div>
        {!telegramPreview && (
          <BulkTracking
            companyIds={repo.listCompanies().map((company) => company.id)}
            scopeLabel="All companies"
          />
        )}
      </div>
      <p className="delivery-note">
        <PlatformIcon platform="telegram" size={15} />
        <span>
          {account.telegram.connected
            ? `Telegram connected · ${{ instant: 'Instant alerts', hourly: 'Hourly digest', daily: 'Daily digest' }[account.settings.telegram.frequency]}`
            : 'Telegram not connected'}
        </span>
      </p>
      {telegramPreview ? (
        <>
          <div className="content-heading">
            <h2>
              Matches your Telegram selection <span className="heading-count">{page.total}</span>
            </h2>
            <span className="status-tag">Preview only</span>
          </div>
          {page.items.length ? (
            <EventList repo={repo} page={page} onMore={more} />
          ) : (
            <Empty
              title="Choose what reaches Telegram."
              action={
                <button className="button-secondary" onClick={() => setParams({})}>
                  Manage tracking
                </button>
              }
            >
              Open a company's Tracking settings, choose Telegram, then select its categories and
              profiles. Matching archived records will appear here. No messages are sent.
            </Empty>
          )}
        </>
      ) : companies.length ? (
        <>
          <div className="following-table channel-table">
            <div className="following-table-head">
              <span>COMPANY</span>
              <span>MY FEED</span>
              <span>TELEGRAM</span>
              <span>SETTINGS</span>
            </div>
            {companies.map((company) => (
              <article key={company.id} className="following-row">
                <Link
                  className="following-company"
                  to={`/companies/${encodeURIComponent(company.id)}`}
                >
                  <Logo company={company} />
                  <div>
                    <strong>{company.name}</strong>
                    <span>{company.ticker}</span>
                  </div>
                </Link>
                {(['feed', 'telegram'] as const).map((channel) => {
                  const rule = getCompanyRule(prefs, company.id, channel);
                  const platforms =
                    channel === 'feed' && !following.includes(company.id) ? [] : rule.platforms;
                  return (
                    <div className="channel-summary" key={channel}>
                      <span className="channel-mobile-label">
                        {channel === 'feed' ? 'My Feed' : 'Telegram'}
                      </span>
                      {platforms.length ? (
                        <>
                          <span className="channel-icons">
                            {platforms.map((platform) => (
                              <PlatformIcon
                                key={platform}
                                platform={platform}
                                size={13}
                                title={platformLabel(repo, platform)}
                              />
                            ))}
                          </span>
                          <small>
                            {rule.excludedProfileIds.length ||
                            Object.keys(rule.profileAllowlist || {}).length
                              ? 'Custom profiles'
                              : 'All profiles'}
                          </small>
                        </>
                      ) : (
                        <small>Off</small>
                      )}
                    </div>
                  );
                })}
                <TrackingControl company={company} />
              </article>
            ))}
          </div>
          <div className="following-footer">
            <span>{account.sync}</span>
            <Link className="text-link" to="/feed">
              Open My Feed
              <Icon name="arrow" size={17} />
            </Link>
          </div>
        </>
      ) : (
        <Empty
          title="Choose your companies."
          action={
            <Link className="button-primary" to="/companies">
              Explore companies
              <Icon name="arrow" size={17} />
            </Link>
          }
        >
          Track a company for your feed or choose specific sources for Telegram.
        </Empty>
      )}
    </div>
  );
}

function SourceBody({ body }: { body: string | null }) {
  if (body && /^https?:\/\/\S+$/i.test(body.trim()))
    return (
      <p>
        <a className="text-link" href={body.trim()} target="_blank" rel="noreferrer">
          View linked source content
          <Icon name="external" size={14} />
        </a>
      </p>
    );
  return <p>{body || 'Full text available at the original source.'}</p>;
}

function EventPanel({ repo }: { repo: Repository }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = params.get('event');
  const account = useAccount();
  const localEvent = id ? repo.getEvent(id) : null;
  const [remoteEvent, setRemoteEvent] = useState<{
    id: string;
    item: ReturnType<Repository['getEvent']>;
  } | null>(null);
  const [eventError, setEventError] = useState('');
  useEffect(() => {
    if (!id || localEvent) return;
    let current = true;
    setEventError('');
    account
      .request<{ item: ReturnType<Repository['getEvent']> }>(
        `/event?eventId=${encodeURIComponent(id)}`,
      )
      .then((result) => {
        if (current) setRemoteEvent({ id, item: result.item });
      })
      .catch(() => {
        if (current) setEventError('Unable to load this record.');
      });
    return () => {
      current = false;
    };
  }, [id, localEvent, account.request]);
  const event = localEvent || (remoteEvent?.id === id ? remoteEvent.item : null);
  const eventLoading = !!id && !localEvent && remoteEvent?.id !== id && !eventError;
  const youtubeEmbed =
    event?.platform === 'youtube' && event.url ? youtubeEmbedUrl(event.url) : null;
  const dialog = useRef<HTMLDialogElement>(null);
  const focusBefore = useRef<HTMLElement | null>(null);
  const ref = useReveal(id || '', 24);
  const close = useCallback(() => {
    if (location.state?.eventOverlay) navigate(-1);
    else {
      const next = new URLSearchParams(params);
      next.delete('event');
      setParams(next, { replace: true });
    }
  }, [location.state, navigate, params, setParams]);
  useLayoutEffect(() => {
    if (!id || !dialog.current) return;
    const node = dialog.current;
    focusBefore.current = document.activeElement as HTMLElement;
    node.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      focusBefore.current?.focus({ preventScroll: true });
    };
  }, [id]);
  if (!id) return null;
  return (
    <dialog
      className="event-dialog"
      ref={dialog}
      aria-labelledby={event ? 'event-panel-title' : undefined}
      aria-label={event ? undefined : 'Record not found'}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            close();
        }
      }}
    >
      <div ref={ref} className="event-panel">
        <div className="panel-top">
          <span className="eyebrow">Source record</span>
          <button className="icon-button" aria-label="Close investigation" onClick={close}>
            <Icon name="close" />
          </button>
        </div>
        {event ? (
          <>
            <div className="panel-company">
              {(event.subjectCompanyIds ?? event.companyIds).map((companyId) => {
                const company = repo.getCompany(companyId);
                return (
                  company && (
                    <span key={companyId}>
                      <Logo company={company} />
                      {company.name}
                    </span>
                  )
                );
              })}
            </div>
            <div className="event-tags">
              <span>
                <PlatformIcon platform={event.platform} size={15} />
                {platformLabel(repo, event.platform)}
              </span>
              <span>{event.eventType === 'social_post' ? '' : eventLabel(event.eventType)}</span>
            </div>
            <h2 id="event-panel-title">{event.title}</h2>

            {youtubeEmbed ? (
              <div className="youtube-embed">
                <iframe
                  src={youtubeEmbed}
                  title={`YouTube preview: ${event.title}`}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <RecordMedia record={event} url={event.url} />
            )}
            <section className="panel-section">
              {event.body !== event.title && <SourceBody body={event.body} />}
              <SocialContext record={event.socialMetadata} />
            </section>
            <section className="panel-section">
              <h3>Evidence</h3>
              <dl className="evidence-facts">
                <div>
                  <dt>Source</dt>
                  <dd>{event.sourceLabel || platformLabel(repo, event.platform)}</dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>
                    {event.publishedAt
                      ? dateLabel(event.publishedAt)
                      : event.publishedDate
                        ? `${dateLabel(event.publishedDate, false)} · time unavailable`
                        : 'Not recorded'}
                  </dd>
                </div>
                <div>
                  <dt>Observed</dt>
                  <dd>{dateLabel(event.observedAt)}</dd>
                </div>
                <div>
                  <dt>Snapshot</dt>
                  <dd>{dateLabel(event.snapshotAt)}</dd>
                </div>
              </dl>
              {event.url && (
                <a
                  className="button-primary source-action"
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open original source
                  <Icon name="external" size={17} />
                </a>
              )}
            </section>

            <section className="panel-section">
              <h3>Companies</h3>
              {(event.subjectCompanyIds ?? event.companyIds).map((companyId) => {
                const company = repo.getCompany(companyId);
                return (
                  company && (
                    <Link
                      className="panel-company-link"
                      key={companyId}
                      to={`/companies/${encodeURIComponent(companyId)}`}
                    >
                      <span>Explore {company.name}</span>
                      <Icon name="arrow" size={17} />
                    </Link>
                  )
                );
              })}
            </section>
          </>
        ) : (
          <Empty title={eventLoading ? 'Loading record…' : eventError || 'Record not found.'}>
            {eventLoading ? 'Opening the archive.' : 'Close this panel to continue exploring.'}
          </Empty>
        )}
      </div>
    </dialog>
  );
}

const scrollPositions = new Map<string, number>();
function ScrollMemory() {
  const location = useLocation();
  const scrollParams = new URLSearchParams(withoutEvent(location.search));
  if (location.pathname === '/companies') scrollParams.delete('feedPlatform');
  const key = location.pathname + '?' + scrollParams.toString();
  useLayoutEffect(() => {
    const position = scrollPositions.get(key) || 0;
    window.scrollTo({ top: position, behavior: 'instant' });
    let lastPosition = window.scrollY;
    const remember = () => {
      lastPosition = window.scrollY;
      scrollPositions.set(key, lastPosition);
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => {
      scrollPositions.set(key, lastPosition);
      window.removeEventListener('scroll', remember);
    };
  }, [key]);
  return null;
}

function Product({ repo, fullAccess = false }: { repo: Repository; fullAccess?: boolean }) {
  const identity = useIdentity();
  const account = useAccount();
  const trackingKey =
    import.meta.env.MODE === 'website' && !identity.authenticated
      ? `${TRACKING_KEY}.public`
      : identity.profile.id
        ? `${TRACKING_KEY}:${encodeURIComponent(identity.profile.id)}`
        : TRACKING_KEY;
  const location = useLocation();
  const navigate = useNavigate();
  const privateEntry = location.pathname === '/private-access';
  const publicPreview = import.meta.env.MODE === 'website' && !fullAccess && !privateEntry;
  const previewLocked = publicPreview;
  const allCompanies = useMemo(() => repo.listCompanies(), [repo]);
  const companyIds = useMemo(() => allCompanies.map((company) => company.id), [allCompanies]);
  const platformIds = useMemo(() => repo.platforms.map((platform) => platform.id), [repo]);
  const readPrefs = () => {
    try {
      return parseTrackingPreferences(
        localStorage.getItem(trackingKey),
        identity.authenticated ? null : localStorage.getItem(PREFERENCES_KEY),
        companyIds,
        platformIds,
      );
    } catch {
      return parseTrackingPreferences(null, null, companyIds, platformIds);
    }
  };
  const isPendingSync = () => {
    try {
      return localStorage.getItem(`${trackingKey}.pending`) === 'true';
    } catch {
      return false;
    }
  };
  const [prefs, setPrefs] = useState<TrackingPreferences>(() =>
    account.remoteTracking && !isPendingSync()
      ? parseTrackingPreferences(
          JSON.stringify(account.remoteTracking),
          null,
          companyIds,
          platformIds,
        )
      : readPrefs(),
  );
  const syncAccountTracking = (next: TrackingPreferences) => {
    if (!identity.authenticated) return;
    const serialized = serializeTrackingPreferences(next);
    localStorage.setItem(`${trackingKey}.pending`, 'true');
    void account.syncTracking(next).then((saved) => {
      try {
        if (saved && localStorage.getItem(trackingKey) === serialized)
          localStorage.removeItem(`${trackingKey}.pending`);
      } catch {
        /* Keep the retry marker if storage is unavailable. */
      }
    });
  };
  const following = prefs.following;
  const feedRepo = useMemo(() => createTrackingRepository(repo, prefs, 'feed'), [repo, prefs]);
  const telegramRepo = useMemo(
    () => createTrackingRepository(repo, prefs, 'telegram'),
    [repo, prefs],
  );
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popout =
    location.pathname === '/feed' && new URLSearchParams(location.search).get('popout') === '1';
  const current =
    location.pathname === '/feed' && new URLSearchParams(location.search).get('view') === 'tokens'
      ? 'Tokens'
      : location.pathname === '/feed' && new URLSearchParams(location.search).get('view') === 'top'
        ? 'Top Today'
        : location.pathname.startsWith('/bags')
          ? 'Work for Your Bags'
          : location.pathname.startsWith('/settings')
            ? 'Settings'
            : location.pathname.startsWith('/following')
              ? 'Following'
              : location.pathname.startsWith('/archive')
                ? 'Archive'
                : location.pathname.startsWith('/companies')
                  ? 'Companies'
                  : 'My Feed';
  useEffect(() => {
    document.title = `${current} — OMNIA EYE`;
  }, [current]);
  useEffect(() => {
    try {
      localStorage.setItem(trackingKey, serializeTrackingPreferences(prefs));
      if (isPendingSync()) syncAccountTracking(prefs);
    } catch {
      setNotice('Preferences could not be saved on this device.');
    }
  }, []);
  useEffect(() => {
    if (!identity.authenticated || !account.remoteTracking || isPendingSync()) return;
    const next = parseTrackingPreferences(
      JSON.stringify(account.remoteTracking),
      null,
      companyIds,
      platformIds,
    );
    try {
      localStorage.setItem(trackingKey, serializeTrackingPreferences(next));
      setPrefs(next);
    } catch {
      setNotice('Account preferences were updated, but could not be cached on this device.');
    }
  }, [account.remoteTracking, identity.authenticated, trackingKey, companyIds, platformIds]);
  useEffect(() => {
    const searchShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navigate('/archive');
        requestAnimationFrame(() =>
          document.querySelector<HTMLInputElement>('.archive-command input')?.focus(),
        );
      }
    };
    const sync = (event: StorageEvent) => {
      if (event.key === trackingKey) setPrefs(readPrefs());
    };
    window.addEventListener('keydown', searchShortcut);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('keydown', searchShortcut);
      window.removeEventListener('storage', sync);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [navigate, companyIds, platformIds]);
  const onChange = (next: TrackingPreferences) => {
    try {
      localStorage.setItem(trackingKey, serializeTrackingPreferences(next));
      setPrefs(next);
      syncAccountTracking(next);
    } catch {
      setNotice('Could not save your preferences. Your previous selection is unchanged.');
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(''), 5000);
    }
  };
  const trackedCount = allCompanies.filter(
    (company) =>
      following.includes(company.id) ||
      getCompanyRule(prefs, company.id, 'telegram').platforms.length > 0,
  ).length;
  const shared = { repo, following, prefs, feedRepo, telegramRepo, previewLocked, fullAccess };
  if (popout)
    return (
      <TrackingProvider repo={repo} prefs={prefs} onChange={onChange}>
        <div className="tracker-window-shell" inert={previewLocked ? true : undefined}>
          <Feed {...shared} />
          <EventPanel repo={repo} />
        </div>
        <PreviewGate active={publicPreview} />
      </TrackingProvider>
    );
  const navigation = fullAccess
    ? [
        { path: '/feed', label: 'My Feed', icon: 'feed' },
        { path: '/companies', label: 'Companies', icon: 'companies' },
        { path: '/archive', label: 'Archive', icon: 'archive' },
        { path: '/following', label: 'Following', icon: 'following' },
        { path: '/bags', label: 'Work for Your Bags', icon: 'bags' },
      ]
    : [{ path: '/feed', label: 'Waitlist preview', icon: 'feed' }];
  return (
    <TrackingProvider repo={repo} prefs={prefs} onChange={onChange}>
      <div inert={previewLocked ? true : undefined}>
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
        >
          Skip to content
        </a>
        <aside className="sidebar">
          <Link className="product-wordmark" to="/feed">
            OMNIA EYE<span>INTELLIGENCE BEFORE CONSENSUS.</span>
          </Link>
          <nav aria-label="Main navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon name={item.icon as IconName} />
                <span>{item.label}</span>
                {item.path === '/following' && trackedCount > 0 && <small>{trackedCount}</small>}
              </NavLink>
            ))}
          </nav>
          {fullAccess && <AccountMenu />}
          <div className="sidebar-bottom">
            <div className="sidebar-rule" />
            <a href="/">
              Back to the experience
              <Icon name="external" size={14} />
            </a>
          </div>
        </aside>
        <div className="product-workspace">
          <header className="product-topbar">
            <span className="breadcrumb">
              <strong>{fullAccess ? current : 'Private beta'}</strong>
              {import.meta.env.MODE === 'website' && (
                <small style={{ display: 'block' }}>
                  {fullAccess ? 'Full access · Verified wallet' : 'Join the waitlist'}
                </small>
              )}
            </span>
            <div className="topbar-actions">
              {fullAccess && (
                <PresetControl
                  prefs={prefs}
                  onApplied={(next) => {
                    setPrefs(next);
                    try {
                      localStorage.setItem(trackingKey, serializeTrackingPreferences(next));
                      localStorage.removeItem(`${trackingKey}.pending`);
                    } catch {
                      /* Account remains authoritative. */
                    }
                  }}
                />
              )}{' '}
              {fullAccess && (
                <button
                  className="topbar-search"
                  aria-label="Search companies"
                  onClick={() => {
                    navigate('/archive');
                    requestAnimationFrame(() =>
                      document.querySelector<HTMLInputElement>('.archive-command input')?.focus(),
                    );
                  }}
                >
                  <Icon name="search" size={17} />
                  <span>Search the Archive</span>
                  <kbd>⌘ K</kbd>
                </button>
              )}
              {fullAccess && <WalletShortcut />}
              {fullAccess && <AccountMenu mobile />}
            </div>
          </header>
          <main id="main-content" tabIndex={-1}>
            <React.Suspense
              fallback={
                <div className="boot-state">
                  <p className="eyebrow">OMNIA EYE</p>
                  <p>Opening the Archive…</p>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Navigate to="/feed" replace />} />
                <Route path="/feed" element={<Feed {...shared} />} />
                {!fullAccess && <Route path="/private-access" element={<PrivateAccess />} />}{' '}
                {fullAccess && (
                  <>
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/companies" element={<Catalog {...shared} />} />
                    <Route path="/companies/:companyId" element={<CompanyDetail {...shared} />} />
                    <Route path="/archive" element={<ArchiveAtlas repo={repo} />} />
                    <Route path="/archive/:companyId" element={<CompanyArchive repo={repo} />} />
                    <Route path="/following" element={<Following {...shared} />} />
                    <Route path="/bags" element={<Bags />} />
                    <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
                    <Route path="/settings/:section" element={<Settings />} />
                  </>
                )}
                <Route path="*" element={<Navigate to="/feed" replace />} />
              </Routes>
            </React.Suspense>
          </main>
          <footer className="product-footer">
            <span>OMNIA EYE</span>
            <span>
              {fullAccess
                ? current === 'Work for Your Bags'
                  ? ''
                  : current === 'Settings'
                    ? ''
                    : current === 'Tokens'
                      ? 'Robinhood Chain · UTC'
                      : 'Archive · UTC'
                : 'Waitlist'}
            </span>
          </footer>
        </div>
        <ScrollMemory />
        <EventPanel repo={repo} />
        <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
          {notice}
        </div>
      </div>
      <PreviewGate active={publicPreview} />
    </TrackingProvider>
  );
}

function AccountWorkspace({ repo }: { repo: Repository }) {
  const account = useAccount();
  const identity = useIdentity();
  const [workspace, setWorkspace] = useState(repo);
  const [fullAccess, setFullAccess] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [stage, setStage] = useState<'session' | 'access' | 'archive'>('session');
  const [accessError, setAccessError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const snapshotStamp = useRef('');
  const [exitDone, setExitDone] = useState(false);
  const finishExit = useCallback(() => setExitDone(true), []);
  useEffect(() => {
    const buildController = new AbortController();
    let current = true,
      timer: ReturnType<typeof setInterval> | undefined,
      running = false,
      loaded = false;
    let refresh = async (_force = false) => {};
    const onVisibility = () => {
      if (!document.hidden) void refresh();
    };
    setAccessReady(false);
    setExitDone(false);
    setAccessError('');
    setStage('access');
    const initialSnapshot =
      account.request<Parameters<typeof createProductRepository>[0]>('/snapshot');
    void initialSnapshot.catch(() => {});
    account
      .request<{ fullAccess: boolean }>('/access')
      .then(async (access) => {
        if (!current || !access.fullAccess) {
          void initialSnapshot.catch(() => {});
          if (current) {
            setWorkspace(repo);
            setFullAccess(false);
            setAccessReady(true);
          }
          return;
        }
        setStage('archive');
        const applySnapshot = async (
          snapshot: Parameters<typeof createProductRepository>[0],
          force = false,
        ) => {
          const stamp = String(snapshot.meta?.revision || snapshot.meta?.capturedAt || '');
          if (current && (force || stamp !== snapshotStamp.current)) {
            const next = await createProductRepositoryAsync(snapshot, {
              signal: buildController.signal,
            });
            if (!current) return;
            snapshotStamp.current = stamp;
            React.startTransition(() => setWorkspace(next));
          }
          if (current) {
            setFullAccess(true);
            setAccessReady(true);
            setAccessError('');
            loaded = true;
          }
        };
        refresh = async (force = false) => {
          if (!current || running || (!force && document.hidden)) return;
          running = true;
          try {
            const snapshot = await account.request<
              Parameters<typeof createProductRepository>[0] | { unchanged: true }
            >(
              `/snapshot${!force && snapshotStamp.current ? `?revision=${encodeURIComponent(snapshotStamp.current)}` : ''}`,
            );
            if (!('unchanged' in snapshot)) await applySnapshot(snapshot, force);
          } catch (error) {
            if (!loaded) throw error;
          } finally {
            running = false;
          }
        };
        const snapshot = await initialSnapshot;
        if (!current) return;
        await applySnapshot(snapshot, true);
        if (!current) return;
        timer = setInterval(() => void refresh(), 15_000);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('omnia-live-update', onVisibility);
      })
      .catch((error) => {
        if (current) {
          setAccessError(
            error instanceof Error ? error.message : 'Access verification is unavailable.',
          );
          setAccessReady(false);
        }
      });
    return () => {
      current = false;
      buildController.abort();
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('omnia-live-update', onVisibility);
    };
  }, [
    identity.authenticated,
    identity.profile.id,
    identity.profile.wallets.join(','),
    repo,
    account.request,
    attempt,
  ]);
  if (!accessReady)
    return (
      <AccessBoot
        stage={stage}
        error={accessError}
        onRetry={accessError ? () => setAttempt((value) => value + 1) : undefined}
      />
    );
  if (fullAccess && !exitDone) return <AccessBoot stage="archive" exiting onExit={finishExit} />;
  return <Product repo={workspace} fullAccess={fullAccess} />;
}

function Boot() {
  const [repo, setRepo] = useState<Repository | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const result =
        attempt === 0
          ? await preloadedRepository
          : await fetchInitialRepository(controller.signal)
              .then((next) => ({ repo: next, error: false as const }))
              .catch((failure) => {
                if ((failure as Error).name === 'AbortError') return null;
                return { repo: null, error: true as const };
              });
      if (!result || controller.signal.aborted) return;
      if (result.repo) {
        setRepo(result.repo);
        setError(false);
      } else setError(result.error);
    };
    void load();
    // The public endpoint is a bounded server-side projection cached for one hour.
    // One request per page load keeps the client from polling private/live services.
    return () => controller.abort();
  }, [attempt]);
  if (error)
    return (
      <div className="boot-state">
        <p className="eyebrow">OMNIA EYE</p>
        <Empty
          title="The archive could not be loaded."
          action={
            <button className="button-primary" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          }
        >
          Check your connection and try again. Your saved following remains on this device.
        </Empty>
      </div>
    );
  if (!repo) return <AccessBoot stage="archive" />;
  return (
    <AccountProvider>
      <HashRouter>
        <UsageTracker />
        <AccountWorkspace repo={repo} />
      </HashRouter>
    </AccountProvider>
  );
}

createRoot(document.getElementById('product-root')!).render(
  <React.StrictMode>
    <IdentityProvider>
      <Boot />
    </IdentityProvider>
  </React.StrictMode>,
);
