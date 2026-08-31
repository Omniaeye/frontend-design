import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '../account/AccountProvider';
import { useIdentity } from '../account/identity';
import type { Company } from '../data/repository.js';
import { CompanyLogo } from '../components/CompanyLogo';
import { PlatformIcon } from '../components/PlatformIcon';
import './tokens.css';
type Token = {
  id: string;
  address: string;
  companyId?: string;
  company: string;
  pairTicker: string;
  pairLogo: string | null;
  name: string | null;
  ticker: string | null;
  logo: string | null;
  description: string | null;
  createdAt: string | null;
  observedAt: string;
  explorer: string | null;
  links: { label: string; url: string }[];
};
type Page = {
  items: Token[];
  nextCursor: string | null;
  total: number;
  live: boolean;
  updatedAt: string | null;
};
const PUBLIC_SELECTION = 'omnia.public.token-selection.v1';

export function TokenMark({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span className="token-mark">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <PlatformIcon platform="tokens" size={22} />
      )}
    </span>
  );
}

export function TokenCards({ items, companies }: { items: Token[]; companies: Company[] }) {
  return (
    <div className="token-grid">
      {items.map((t) => {
        const paired = companies.find(
          (company) => company.id === t.companyId || company.ticker === t.pairTicker,
        );
        return (
          <article className="token-card" key={t.id}>
            <header>
              <TokenMark src={t.logo} />
              <div>
                <h2>{t.name || t.ticker || 'New token'}</h2>
                <span>{t.ticker || 'Metadata loading'}</span>
                <span className="token-rwa">
                  Paired with{' '}
                  {paired ? (
                    <CompanyLogo company={paired} />
                  ) : t.pairLogo ? (
                    <img src={t.pairLogo} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <PlatformIcon platform="tokens" size={15} />
                  )}
                  <strong>{t.pairTicker}</strong>
                </span>
              </div>
            </header>
            <time>
              {new Date(t.createdAt || t.observedAt).toLocaleString('en-GB', { timeZone: 'UTC' })}{' '}
              UTC{!t.createdAt ? ' · detected' : ''}
            </time>
            <p className="token-address">{t.address}</p>
            {t.description && <p className="token-description">{t.description}</p>}
            <footer>
              {t.explorer && (
                <a href={t.explorer} target="_blank" rel="noreferrer">
                  Explorer ↗
                </a>
              )}
              {t.links
                .filter(
                  (link, index, links) =>
                    links.findIndex((item) => item.url === link.url) === index,
                )
                .map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                    {['gmgn', 'j7'].includes(l.label.toLowerCase()) ? 'Market' : l.label} ↗
                  </a>
                ))}
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function PublicTokens({
  companies,
  compact = false,
  previewLocked = false,
}: {
  companies: Company[];
  compact?: boolean;
  previewLocked?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PUBLIC_SELECTION) || 'null');
      return Array.isArray(saved) ? saved : companies.map((c) => c.id);
    } catch {
      return companies.map((c) => c.id);
    }
  });
  const [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    if (previewLocked) return;
    let active = true,
      running = false;
    const load = async () => {
      if (document.hidden || running) return;
      if (!selected.length) {
        setPage({ items: [], nextCursor: null, total: 0, live: false, updatedAt: null });
        return;
      }
      running = true;
      try {
        const params = new URLSearchParams();
        if (selected.length !== companies.length)
          for (const id of selected) params.append('company', id);
        const response = await fetch(`/api/feed/tokens${params.size ? `?${params}` : ''}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Token source unavailable (${response.status}).`);
        const next = await response.json();
        if (active) {
          setPage((previous) =>
            JSON.stringify(previous?.items) === JSON.stringify(next.items) &&
            previous?.live === next.live
              ? previous
              : next,
          );
          setError('');
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load tokens.');
      } finally {
        running = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    document.addEventListener('visibilitychange', load);
    window.addEventListener('omnia-live-update', load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
      window.removeEventListener('omnia-live-update', load);
    };
  }, [companies.length, selected, previewLocked]);
  const save = (ids: string[]) => {
    setSelected(ids);
    localStorage.setItem(PUBLIC_SELECTION, JSON.stringify(ids));
  };
  return (
    <section className={`token-feed${compact ? ' token-feed-compact' : ''}`}>
      <div className="token-toolbar">
        <strong>New tokens {page ? `· ${page.total}` : ''}</strong>
        <span>{page?.live ? 'Live' : page ? 'Updates delayed' : 'Connecting…'}</span>
      </div>
      <details className="token-selection">
        <summary>RWA selection · {selected.length} enabled</summary>
        <p>Show new tokens paired with these assets.</p>
        <button onClick={() => save(companies.map((c) => c.id))}>Select all</button>{' '}
        <button onClick={() => save([])}>Clear</button>
        <div>
          {companies.map((c) => (
            <label key={c.id}>
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={(e) =>
                  save(
                    e.target.checked ? [...selected, c.id] : selected.filter((id) => id !== c.id),
                  )
                }
              />
              <CompanyLogo company={c} />
              {c.ticker}
              <small>{c.name}</small>
            </label>
          ))}
        </div>
      </details>
      {error && <p role="alert">{error}</p>}
      <TokenCards items={page?.items || []} companies={companies} />
      {page && !page.items.length && (
        <p className="token-notice">
          {selected.length
            ? 'No launches for your selection yet.'
            : 'Enable an RWA above to see its new tokens.'}
        </p>
      )}
    </section>
  );
}

export function Tokens(props: {
  companies: Company[];
  compact?: boolean;
  previewLocked?: boolean;
}) {
  const identity = useIdentity();
  return identity.authenticated ? <PrivateTokens {...props} /> : <PublicTokens {...props} />;
}

function PrivateTokens({
  companies,
  compact = false,
}: {
  companies: Company[];
  compact?: boolean;
  previewLocked?: boolean;
}) {
  const { request } = useAccount(),
    identity = useIdentity();
  const [selected, setSelected] = useState<string[] | null>(null),
    [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [limit, setLimit] = useState(1),
    [older, setOlder] = useState<Token[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const busy = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    if (!identity.authenticated || selected !== null) return;
    let active = true,
      running = false;
    const load = async () => {
      if (document.hidden || running) return;
      running = true;
      try {
        const r = await request<{ companyIds: string[] }>('/tokens/preferences');
        if (active) {
          setSelected(r.companyIds);
          setError('');
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load selection.');
      } finally {
        running = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 10000);
    document.addEventListener('visibilitychange', load);
    window.addEventListener('omnia-live-update', load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
      window.removeEventListener('omnia-live-update', load);
    };
  }, [request, identity.authenticated, selected]);
  useEffect(() => {
    if (selected === null) return;
    let active = true;
    const version = ++generation.current;
    const load = async () => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      try {
        let r = await request<Page>('/tokens?limit=30');
        const gathered = [...r.items];
        let next = r.nextCursor;
        for (let n = 1; n < limit && next; n++) {
          const extra = await request<Page>(`/tokens?limit=30&cursor=${encodeURIComponent(next)}`);
          gathered.push(...extra.items);
          next = extra.nextCursor;
        }
        r = { ...r, items: gathered, nextCursor: next };
        if (active && generation.current === version) {
          setPage(r);
          setOlder([]);
          setCursor(r.nextCursor);
          setError('');
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load tokens.');
      } finally {
        busy.current = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    document.addEventListener('visibilitychange', load);
    window.addEventListener('omnia-live-update', load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
      window.removeEventListener('omnia-live-update', load);
    };
  }, [request, selected, limit]);
  async function save(ids: string[]) {
    setSaving(true);
    setError('');
    try {
      const r = await request<{ companyIds: string[] }>(
        '/tokens/preferences',
        { companyIds: ids },
        'PUT',
      );
      setSelected(r.companyIds);
      setOlder([]);
      setPage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save selection.');
    } finally {
      setSaving(false);
    }
  }
  async function more() {
    if (!cursor || busy.current) return;
    busy.current = true;
    const version = generation.current;
    try {
      const r = await request<Page>(`/tokens?cursor=${encodeURIComponent(cursor)}&limit=30`);
      if (version === generation.current) {
        setOlder((p) => [...p, ...r.items]);
        setCursor(r.nextCursor);
        setLimit((n) => n + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tokens.');
    } finally {
      busy.current = false;
    }
  }
  if (!identity.authenticated)
    return (
      <p className="token-notice">
        <Link to="/settings/account">Sign in to view tokens and save your selection.</Link>
      </p>
    );
  const items = [...new Map([...(page?.items || []), ...older].map((i) => [i.id, i])).values()];
  return (
    <section className={`token-feed${compact ? ' token-feed-compact' : ''}`}>
      <div className="token-toolbar">
        <strong>New tokens {page ? `· ${page.total}` : ''}</strong>
        <span>{page?.live ? 'Live' : page ? 'Updates delayed' : 'Connecting…'}</span>
        <button onClick={() => setSelected((p) => (p ? [...p] : p))}>Refresh</button>
      </div>
      <details className="token-selection">
        <summary>RWA selection · {selected?.length ?? 0} enabled</summary>
        <p>Show new tokens paired with these assets.</p>
        <button
          disabled={saving || selected === null}
          onClick={() => void save(companies.map((c) => c.id))}
        >
          Select all
        </button>{' '}
        <button disabled={saving || selected === null} onClick={() => void save([])}>
          Clear
        </button>
        <div>
          {companies.map((c) => (
            <label key={c.id}>
              <input
                type="checkbox"
                disabled={saving || selected === null}
                checked={selected?.includes(c.id) || false}
                onChange={(e) =>
                  void save(
                    e.target.checked
                      ? [...(selected || []), c.id]
                      : (selected || []).filter((id) => id !== c.id),
                  )
                }
              />
              <CompanyLogo company={c} />
              {c.ticker}
              <small>{c.name}</small>
            </label>
          ))}
        </div>
      </details>
      {error && <p role="alert">{error}</p>}
      <TokenCards items={items} companies={companies} />
      {page && !items.length && (
        <p className="token-notice">
          {selected?.length
            ? 'No launches for your selection yet.'
            : 'Enable an RWA above to see its new tokens.'}
        </p>
      )}
      {cursor && (
        <button className="button-secondary" onClick={() => void more()}>
          Load more
        </button>
      )}
      <p className="token-notice">Pairing does not imply endorsement or backing by the company.</p>
    </section>
  );
}

/** Company browsing is independent of the user's saved discovery selection. */
export function CompanyTokens({ company }: { company: Company }) {
  const { request } = useAccount();
  const [page, setPage] = useState<Page | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setPage(null);
    setBusy(true);
    setError('');
    request<Page>(`/tokens?company=${encodeURIComponent(company.id)}&limit=30`)
      .then((next) => {
        if (active) setPage(next);
      })
      .catch(() => {
        if (active) setError('Could not load company tokens.');
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [company.id, request]);
  async function more() {
    if (!page?.nextCursor || busy) return;
    setBusy(true);
    try {
      const next = await request<Page>(
        `/tokens?company=${encodeURIComponent(company.id)}&limit=30&cursor=${encodeURIComponent(page.nextCursor)}`,
      );
      setPage((old) => ({
        ...next,
        items: [
          ...new Map(
            [...(old?.items || []), ...next.items].map((token) => [token.id, token]),
          ).values(),
        ],
      }));
    } catch {
      setError('Could not load more tokens.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="token-feed">
      <TokenCards items={page?.items || []} companies={[company]} />
      {busy && <p role="status">Loading tokens…</p>}
      {error && <p role="alert">{error}</p>}
      {page && !page.total && <p>No tokens paired with {company.ticker} yet.</p>}
      {page?.nextCursor && (
        <button disabled={busy} className="button-secondary" onClick={() => void more()}>
          Load more
        </button>
      )}
    </section>
  );
}
