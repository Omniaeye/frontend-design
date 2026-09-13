import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '../account/AccountProvider';
import { useIdentity } from '../account/identity';
import { confirmPost, mergeConfirmedPost } from './confirmation.js';
import './x-posts.css';
import { PlatformIcon } from '../components/PlatformIcon';

type Post = {
  id: string;
  authorId: string;
  username: string | null;
  name: string | null;
  photo?: string | null;
  media?: { url: string; alt: string }[];
  text: string;
  url: string;
  createdAt: string | null;
  metrics: Record<string, number | null>;
  status?: string;
  checkedAt?: string;
  nextCheckAt?: string;
  score?: number | null;
};
type Preview = { previewId: string; expiresAt: string; post: Post };
type Posts = { posts: Post[]; enabled: boolean; access?: { allowed: boolean; mode: string } };
type Entry = {
  xId: string;
  username: string | null;
  name: string | null;
  rank: number;
  score: number;
  counted: number;
  postCount: number;
  bestPosts: { postId: string; score: number; checkedAt: string }[];
};
type Leaderboard = {
  entries: Entry[];
  generatedAt: string;
  scoring: { version: string; formula: string };
};
const number = (value: number | null | undefined) =>
  value == null ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const time = (value: string) =>
  new Date(value).toLocaleString('en-GB', {
    timeZone: 'UTC',
    dateStyle: 'short',
    timeStyle: 'short',
  }) + ' UTC';

function Content({ post }: { post: Post }) {
  return (
    <>
      <div className="x-post-author">
        {post.photo && <PostImage className="x-post-avatar" src={post.photo} />}
        <strong>{post.name || post.username || 'X user'}</strong>
        <a href={post.url} target="_blank" rel="noreferrer">
          {post.username ? `@${post.username}` : 'View on X'} ↗
        </a>
      </div>
      <p className="x-post-text">{post.text}</p>
      {!!post.media?.length && (
        <div className="x-post-media">
          {post.media.map((item) => (
            <a key={item.url} href={post.url} target="_blank" rel="noreferrer">
              <PostImage src={item.url} alt={item.alt} />
            </a>
          ))}
        </div>
      )}
      <div className="x-post-counts">
        {['views', 'likes', 'replies', 'reposts', 'quotes'].map((key) => (
          <span key={key}>
            {number(post.metrics[key])} <small>{key}</small>
          </span>
        ))}
      </div>
    </>
  );
}

export function XPosts({ onUpdate }: { onUpdate?: (posts: Post[]) => void }) {
  const { request } = useAccount();
  const identity = useIdentity();
  const [data, setData] = useState<Posts | null>(null),
    [url, setUrl] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const alive = useRef(true);
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    const next = await request<Posts>('/x/posts');
    if (alive.current) {
      setData(next);
      setError('');
      callback.current?.(next.posts);
    }
  }, [request]);
  useEffect(() => {
    if (!identity.authenticated || !identity.profile.x) return;
    void refresh().catch((e) => {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not load posts.');
    });
    const timer = window.setInterval(() => {
      void refresh().catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [refresh, identity.authenticated, identity.profile.x?.id]);
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setPreview(null);
    try {
      const result = await request<Preview>('/x/preview', { url });
      if (alive.current) setPreview(result);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Post verification failed.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function confirm() {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      await confirmPost<Post>({
        request,
        previewId: preview.previewId,
        refresh,
        onConfirmed: (post) => {
          if (!alive.current) return;
          setData((previous) => ({
            ...previous,
            enabled: previous?.enabled ?? true,
            posts: mergeConfirmedPost(previous?.posts || [], post),
          }));
          setPreview(null);
          setUrl('');
          setMessage('Post confirmed.');
          setError('');
          window.dispatchEvent(new Event('omnia-x-posts-updated'));
        },
      });
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Post confirmation failed.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const connected = identity.authenticated && !!identity.profile.x;
  return (
    <section className="bags-card x-posts" aria-labelledby="x-confirmed-posts">
      <div className="bags-card-head">
        <h2 id="x-confirmed-posts">
          Submitted posts <span>{data?.posts.length ?? 0}</span>
        </h2>
      </div>
      {!connected ? (
        <p className="x-post-notice">
          <Link to="/settings/wallet">Connect X to submit a post ↗</Link>
        </p>
      ) : (
        <>
          <form className="bags-post-form" onSubmit={verify}>
            <label className="bags-url">
              <input
                aria-label="Post URL to verify"
                type="url"
                maxLength={500}
                required
                placeholder="https://x.com/you/status/…"
                value={url}
                disabled={busy || !data?.access?.allowed}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setPreview(null);
                }}
              />
            </label>
            <button
              className="button-primary"
              disabled={busy || data?.enabled === false || !data?.access?.allowed}
              type="submit"
            >
              {busy ? 'Checking…' : 'Verify post'}
            </button>
          </form>
          <p className="x-post-notice">
            {!data
              ? 'Loading your posts…'
              : data?.access?.mode === 'local_test'
                ? 'Local test mode · Mention @Omniaeye.'
                : data?.access?.allowed
                  ? 'Mention @Omniaeye in your post.'
                  : 'Hold 100,000 $OMNIA to submit.'}
          </p>
          {data?.enabled === false && (
            <p className="x-post-notice">Post verification is not configured.</p>
          )}
        </>
      )}
      {error && (
        <p className="bags-message is-error" role="alert">
          {error}{' '}
          <button
            className="button-secondary"
            onClick={() =>
              void refresh().catch((e) =>
                setError(e instanceof Error ? e.message : 'Could not load posts.'),
              )
            }
          >
            Try again
          </button>
        </p>
      )}
      {message && (
        <p className="bags-message" role="status">
          {message}
        </p>
      )}
      {preview && (
        <div className="x-post-preview" role="region" aria-label="Confirm your post">
          <h3>Is this the post you want to submit?</h3>
          <Content post={preview.post} />
          <div className="x-post-actions">
            <button className="button-secondary" disabled={busy} onClick={() => setPreview(null)}>
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={busy || !data?.access?.allowed}
              onClick={() => void confirm()}
            >
              {busy ? 'Confirming…' : 'Confirm post'}
            </button>
          </div>
        </div>
      )}
      {data?.posts.map((post) => (
        <article className="x-post-record" key={post.id}>
          <Content post={post} />
          <div className="x-post-bottom">
            <span>
              {post.status === 'verified'
                ? 'Author verified'
                : post.status === 'needs_confirmation'
                  ? 'Edited · confirm again'
                  : post.status === 'invalid'
                    ? 'Verification failed'
                    : 'Metrics stale'}{' '}
              · {post.checkedAt ? time(post.checkedAt) : 'Pending'}
            </span>
            <strong>{number(post.score)} pts</strong>
          </div>
        </article>
      ))}
      {connected && data && !data.posts.length && !preview && (
        <div className="bags-empty">
          <strong>No confirmed posts yet</strong>
          <span>Verify a post, review its content, then confirm.</span>
        </div>
      )}
    </section>
  );
}

export function XLeaderboard() {
  const { request } = useAccount(),
    identity = useIdentity();
  const [data, setData] = useState<Leaderboard | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    if (!identity.authenticated || !identity.profile.x) return;
    let active = true;
    const load = () =>
      request<Leaderboard>('/x/leaderboard')
        .then((next) => {
          if (active) {
            setData(next);
            setError('');
          }
        })
        .catch(() => {
          if (active) setError('Could not refresh the leaderboard.');
        });
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [request, identity.authenticated, identity.profile.x?.id]);
  return (
    <section className="bags-card x-leaderboard">
      <div className="bags-card-head">
        <h2>Leaderboard</h2>
      </div>
      <p className="x-post-notice">Best 3 posts per X account.</p>
      <details className="x-score-rule">
        <summary>How points work</summary>
        <p>
          1 per like · 2 per reply · 3 per repost · 4 per quote · 1 per 1,000 views. Best 3 scores
          are added. Ties share rank. Incomplete or stale metrics are excluded.
        </p>
      </details>
      {error && (
        <p className="bags-message is-error" role="alert">
          {error}
        </p>
      )}
      {!identity.authenticated || !identity.profile.x ? (
        <p className="x-post-notice">
          <Link to="/settings/wallet">Connect X to view rankings ↗</Link>
        </p>
      ) : !data?.entries.length ? (
        <div className="bags-empty">
          <strong>No rankings yet</strong>
          <span>Confirmed posts with complete metrics appear here.</span>
        </div>
      ) : (
        <div className="x-ranking-scroll">
          <table className="x-ranking">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Profile</th>
                <th>Counted</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.xId}>
                  <td>#{entry.rank}</td>
                  <td>
                    {entry.username ? (
                      <a
                        href={`https://x.com/${encodeURIComponent(entry.username)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        @{entry.username} ↗
                      </a>
                    ) : (
                      entry.name || 'X profile'
                    )}
                  </td>
                  <td>{entry.counted} / 3</td>
                  <td>{number(entry.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <p className="x-post-notice">
          {data.scoring.version} · Snapshot {time(data.generatedAt)}
        </p>
      )}
    </section>
  );
}

function useContributionData() {
  const { request } = useAccount(),
    identity = useIdentity();
  const [data, setData] = useState<{ posts: Posts; entry: Entry | null } | null>(null);
  useEffect(() => {
    if (!identity.authenticated || !identity.profile.x) return;
    let active = true;
    const load = () => {
      void Promise.all([request<Posts>('/x/posts'), request<Leaderboard>('/x/leaderboard')])
        .then(([posts, ranking]) => {
          if (active)
            setData({
              posts,
              entry: ranking.entries.find((entry) => entry.xId === identity.profile.x?.id) || null,
            });
        })
        .catch(() => {
          if (active) setData(null);
        });
    };
    load();
    const timer = window.setInterval(load, 60000);
    window.addEventListener('omnia-x-posts-updated', load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('omnia-x-posts-updated', load);
    };
  }, [request, identity.authenticated, identity.profile.x?.id]);
  return data;
}

type Contribution = ReturnType<typeof useContributionData>;
const ContributionContext = createContext<Contribution>(null);
export function ContributionProvider({ children }: { children: ReactNode }) {
  const data = useContributionData();
  return <ContributionContext.Provider value={data}>{children}</ContributionContext.Provider>;
}
function useContribution() {
  return useContext(ContributionContext);
}

function PostImage({
  src,
  alt = '',
  className = '',
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src)
    return (
      <span className={`bags-media-empty ${className}`} aria-label="Post has no available image">
        <PlatformIcon platform="x" size={80} />
      </span>
    );
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
    />
  );
}

export function XContributionSummary() {
  const data = useContribution();
  return (
    <section className="bags-metrics" aria-label="Your contribution statistics">
      <div className="bags-metric">
        <span>Your score</span>
        <strong>{number(data?.entry?.score)}</strong>
        <small>Best three posts combined</small>
      </div>
      <div className="bags-metric">
        <span>Your rank</span>
        <strong>{data?.entry ? `#${data.entry.rank}` : '—'}</strong>
        <small>Community leaderboard</small>
      </div>
      <div className="bags-metric">
        <span>Counted posts</span>
        <strong>
          {data ? data.entry?.counted || 0 : '—'} <em>/ 3</em>
        </strong>
        <small>{data ? `${data.posts.posts.length} confirmed` : 'No verified score yet'}</small>
      </div>
    </section>
  );
}

export function XBestThree({ onSubmit }: { onSubmit: () => void }) {
  const data = useContribution();
  const identity = useIdentity();
  const best = data?.entry?.bestPosts || [];
  return (
    <section className="bags-editorial-posts">
      <header className="bags-section-heading">
        <div>
          <p className="bags-eyebrow">SELECTED CONTRIBUTIONS</p>
          <h2>
            Your best posts<span>{best.length.toString().padStart(2, '0')}</span>
          </h2>
        </div>
        <button className="bags-text-link" onClick={onSubmit}>
          View all posts ↗
        </button>
      </header>
      {!best.length ? (
        <div className="bags-editorial-empty">
          <div className="bags-empty-art" aria-hidden="true">
            <PlatformIcon platform="x" size={80} />
            <i>01 — 03</i>
          </div>
          <div>
            <p className="bags-eyebrow">YOUR NEXT CONTRIBUTION</p>
            <h3>Make your perspective count.</h3>
            <p>
              {!identity.profile.x
                ? 'Connect your X account, then submit a post about OMNIA.'
                : 'Submit a post mentioning @Omniaeye. Your three highest-scoring posts will appear here.'}
            </p>
            <button className="bags-submit" onClick={onSubmit}>
              {identity.profile.x ? 'Submit your first post' : 'Get started'} <span>↗</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bags-editorial-selection">
          {best.slice(0, 3).map((item, index) => {
            const post = data?.posts.posts.find((p) => p.id === item.postId);
            return (
              <article className={`bags-feature ${index === 0 ? 'is-lead' : ''}`} key={item.postId}>
                <a
                  className="bags-feature-image"
                  href={post?.url || `https://x.com/i/web/status/${item.postId}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open contribution ${index + 1} on X`}
                >
                  <PostImage src={post?.media?.[0]?.url} alt={post?.media?.[0]?.alt} />
                  <span className="bags-feature-number">0{index + 1}</span>
                </a>
                <div className="bags-feature-copy">
                  <p className="bags-eyebrow">
                    {post?.username ? `@${post.username}` : 'YOUR CONTRIBUTION'} <span>· X</span>
                  </p>
                  <h3>
                    <a
                      href={post?.url || `https://x.com/i/web/status/${item.postId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {post?.text || 'View your confirmed post on X'} ↗
                    </a>
                  </h3>
                  <div className="bags-feature-footer">
                    <span>
                      {number(post?.metrics.views)} <small>views</small>
                    </span>
                    <span>
                      {number(post?.metrics.likes)} <small>likes</small>
                    </span>
                    <strong>
                      {number(item.score)} <small>points</small>
                    </strong>
                  </div>
                  <time>
                    {item.checkedAt ? `Checked ${time(item.checkedAt)}` : 'Awaiting metrics'}
                  </time>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
