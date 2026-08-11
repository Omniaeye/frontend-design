import { useEffect, useState } from 'react';
import { useAccount } from '../account/AccountProvider';
import { PlatformIcon } from './PlatformIcon';
import { RecordMedia } from './RecordMedia';
import { SocialContext, socialAction, type SocialRecord } from './SocialContext';
import { eventTime } from '../event-time.mjs';
import './social-tracker.css';
import { StockIdentity } from './StockIdentity';
import type { ProductRepository } from '../data/repository.js';
const platformLabels: Record<string, string> = {
  x: 'X',
  instagram: 'Instagram',
  truthsocial: 'Truth Social',
  telegram: 'Telegram',
  binance_square: 'Binance Square',
  github: 'GitHub',
  youtube: 'YouTube',
  reddit: 'Reddit',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  bluesky: 'Bluesky',
  website: 'Websites',
};
type RecordItem = SocialRecord & {
  id: string;
  provider: string;
  platform: string;
  entityType: string;
  observedAt: string;
  publishedAt?: string;
  account: {
    avatarUrl?: string;
    displayName?: string;
    handle?: string;
    canonicalProfileUrl?: string;
    bio?: string;
  };
  content: { text?: string; canonicalUrl?: string };
  link?: { canonicalUrl?: string };
  companyIds: string[];
  mentionedCompanyIds: string[];
  media?: { type: string; url?: string; posterUrl?: string }[];
  mutation?: { type?: string; before?: unknown; after?: unknown };
  evidenceRef?: { reference?: string };
};
type Page = { items: RecordItem[]; nextCursor: string | null };

function Avatar({ record }: { record: RecordItem }) {
  const [failed, setFailed] = useState<string>();
  const src = record.account.avatarUrl;
  return (
    <span className="social-avatar">
      {src && failed !== src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      ) : (
        <PlatformIcon platform={record.platform} size={24} />
      )}
    </span>
  );
}
export function SocialTracker({
  platform,
  companyId,
  repo,
}: {
  platform?: string;
  companyId?: string;
  repo: ProductRepository;
}) {
  const { request } = useAccount();
  const [kind, setKind] = useState(
      [
        'github',
        'youtube',
        'reddit',
        'website',
        'tiktok',
        'facebook',
        'linkedin',
        'bluesky',
      ].includes(platform || '')
        ? 'link'
        : 'content',
    ),
    [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [cursor, setCursor] = useState(''),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    setCursor('');
    setPage(null);
  }, [platform, companyId]);
  useEffect(() => {
    if (cursor) return;
    const update = () => {
      if (!document.hidden) setRefresh((n) => n + 1);
    };
    const timer = setInterval(update, 15000);
    window.addEventListener('omnia-live-update', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('omnia-live-update', update);
    };
  }, [cursor]);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ limit: '30', type: kind });
    if (platform) params.set('platform', platform);
    if (platform === 'instagram') params.set('stocksOnly', 'true');
    if (companyId) {
      params.set('company', companyId);
      params.set('includeMentions', 'true');
    }
    if (cursor) params.set('cursor', cursor);
    setBusy(true);
    setError('');
    request<Page>(`/social?${params}`)
      .then((next) => {
        if (active)
          setPage((old) =>
            cursor
              ? {
                  ...next,
                  items: [
                    ...new Map(
                      [...(old?.items || []), ...next.items].map((item) => [item.id, item]),
                    ).values(),
                  ],
                }
              : next,
          );
      })
      .catch(() => {
        if (active) setError('Could not refresh this tracker.');
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [platform, companyId, kind, cursor, refresh, request]);
  return (
    <section className="social-tracker">
      <header>
        <h2>{platformLabels[platform || ''] || 'Social activity'}</h2>
        <div>
          <select
            aria-label="Record type"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(null);
              setCursor('');
            }}
          >
            <option value="content">Posts</option>
            <option value="event">Changes</option>
            <option value="account">Profiles</option>
            <option value="link">Links</option>
            <option value="">All records</option>
          </select>
          <button
            disabled={busy}
            onClick={() => {
              setCursor('');
              setRefresh((n) => n + 1);
            }}
          >
            Refresh
          </button>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      {busy && !page && <p role="status">Loading records…</p>}
      {page && !page.items.length && <p>No records match this selection.</p>}
      <div className="social-records">
        {page?.items.map((record) => {
          const timestamp = eventTime(record);
          const url =
            record.content?.canonicalUrl ||
            record.link?.canonicalUrl ||
            record.account.canonicalProfileUrl;
          const stocks = [
            ...new Set([...(record.companyIds || []), ...(record.mentionedCompanyIds || [])]),
          ].flatMap((id) => {
            const c = repo.getCompany(id);
            return c ? [c] : [];
          });
          return (
            <article key={record.id}>
              <div className="social-record-origin">
                <Avatar record={record} />
                <StockIdentity companies={stocks} />
              </div>
              <div className="social-record-body">
                <header>
                  <strong>
                    {record.account.displayName || record.account.handle || record.entityType}
                  </strong>
                  <span>
                    <PlatformIcon platform={record.platform} size={14} />
                    {platformLabels[record.platform] || 'Website'}
                  </span>
                </header>
                {record.account.handle && <small>@{record.account.handle.replace(/^@/, '')}</small>}
                <p>
                  {record.content?.text ||
                    record.account.bio ||
                    socialAction(record) ||
                    record.mutation?.type?.replaceAll('_', ' ') ||
                    record.link?.canonicalUrl ||
                    ''}
                </p>
                <RecordMedia record={record} url={url || ''} />
                <SocialContext record={record} />
                {record.mutation?.before != null && (
                  <details>
                    <summary>View change</summary>
                    <pre>
                      {JSON.stringify(
                        { before: record.mutation.before, after: record.mutation.after },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
                <footer>
                  <time dateTime={timestamp.dateTime} title={timestamp.title}>
                    {timestamp.label}
                  </time>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer">
                      Original source ↗
                    </a>
                  )}
                </footer>
              </div>
            </article>
          );
        })}
      </div>
      {page?.nextCursor && (
        <button
          className="button-secondary"
          disabled={busy}
          onClick={() => setCursor(page.nextCursor!)}
        >
          {busy ? 'Loading…' : 'Load more'}
        </button>
      )}
    </section>
  );
}
