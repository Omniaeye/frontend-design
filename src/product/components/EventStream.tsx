import { RecordMedia } from './RecordMedia';
import { eventTime } from '../event-time.mjs';
import { mediaUrl } from '../media.mjs';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { ProductRepository, ProductEvent } from '../data/repository.js';
import { CompanyLogo } from './CompanyLogo';
import { StockIdentity } from './StockIdentity';
import { PlatformIcon } from './PlatformIcon';
import { SocialContext, socialAction } from './SocialContext';
import './event-stream.css';

type Props = {
  repo: ProductRepository;
  page: ReturnType<ProductRepository['queryEvents']>;
  onMore?: () => void;
  preferredCompanyIds?: string[];
  compact?: boolean;
  hideFooter?: boolean;
  context?: string;
};
function sourceName(event: ProductEvent) {
  if (event.sourceLabel && !/^(j7|gmgn)$/i.test(event.sourceLabel)) return event.sourceLabel;
  try {
    return new URL(event.sourceUrl || event.url).hostname.replace(/^www\./, '');
  } catch {
    return 'Original source';
  }
}
function Arrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

function EventArtwork({
  event,
  company,
}: {
  event: ProductEvent;
  company: ReturnType<ProductRepository['getCompany']>;
}) {
  const avatar = mediaUrl(event.socialMetadata?.account?.avatarUrl);
  if (!avatar && company) return null;
  return (
    <span className="event-identity" aria-hidden="true">
      <span className="event-artwork">
        <span className="event-artwork__fallback">
          {company ? (
            <CompanyLogo company={company} />
          ) : (
            <PlatformIcon platform={event.platform} size={24} />
          )}
        </span>
        {avatar && (
          <img
            className="event-author-avatar"
            src={avatar}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
        )}
      </span>
    </span>
  );
}

export function EventStream({
  repo,
  page,
  onMore,
  preferredCompanyIds = [],
  compact = false,
  hideFooter = false,
}: Props) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const open = (event: ProductEvent) => {
    const next = new URLSearchParams(params);
    next.set('event', event.id);
    setParams(next, {
      state: { eventOverlay: true, previous: location.pathname + location.search },
    });
  };
  return (
    <>
      <div className={`activity-stream ${compact ? 'activity-stream--compact' : ''}`}>
        {page.items.map((event) => {
          const subjects = event.subjectCompanyIds ?? event.companyIds;
          const stocks = [...new Set(subjects)].flatMap((id) => {
            const stock = repo.getCompany(id);
            return stock ? [stock] : [];
          });
          const company = repo.getCompany(
            subjects.find((id) => preferredCompanyIds.includes(id)) || subjects[0],
          );
          const platform =
            repo.platforms.find((item) => item.id === event.platform)?.label || event.platform;
          const label = sourceName(event);
          const timestamp = eventTime(event);
          return (
            <article
              className={`activity-row${event.imageUrl ? ' activity-row--media' : ''}`}
              key={event.id}
            >
              <div className="activity-origin">
                <EventArtwork event={event} company={company} />
                <StockIdentity companies={stocks} />
              </div>
              <div className="activity-content">
                <div className="activity-meta">
                  <span className="activity-platform">
                    <PlatformIcon platform={event.platform} size={14} />
                    {platform}
                  </span>
                  <span className="activity-kind">
                    {socialAction(event.socialMetadata) ||
                      (event.eventType === 'social_post'
                        ? ''
                        : event.eventType.replaceAll('_', ' ').replaceAll('-', ' '))}
                  </span>
                  {event.redditView && <span className="activity-kind">{event.redditView}</span>}
                  <time dateTime={timestamp.dateTime} title={timestamp.title}>
                    {timestamp.label}
                  </time>
                </div>
                <button
                  className="activity-open"
                  onClick={() => open(event)}
                  aria-label={`Open ${event.title}`}
                >
                  <strong>{event.title}</strong>
                  <Arrow />
                </button>
                <RecordMedia record={event} url={event.url} />
                <SocialContext record={event.socialMetadata} />
                <div className="activity-attribution">
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open original source: ${label}`}
                  >
                    {label}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M14 4h6v6m0-6L9 15M10 4H4v16h16v-6" />
                    </svg>
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {onMore && page.nextCursor && (
        <div className="load-more">
          <button className="button-secondary" onClick={onMore}>
            Load more <Arrow />
          </button>
        </div>
      )}
      {!hideFooter && (
        <p className="footnote">
          {page.items.length} of {page.total} {page.total === 1 ? 'record' : 'records'} · Available
          archive
        </p>
      )}
    </>
  );
}
