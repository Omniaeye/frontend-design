import { useEffect, useRef, useState } from 'react';
import { useAccount } from '../account/AccountProvider';
import { TokenMark } from '../tokens/Tokens';
import './related-tokens.css';

type Token = {
  id: string;
  address: string;
  ticker?: string;
  name?: string;
  logo: string | null;
  sourceUrl: string;
  gmgnUrl?: string;
};
type Page = { items: Token[]; total: number; nextCursor: string | null };
export function RelatedTokens({ eventId, count }: { eventId: string; count: number }) {
  const { request } = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [page, setPage] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    const run = ++generation.current;
    if (!open) {
      dialog.current?.close();
      return;
    }
    dialog.current?.showModal();
    setPage(null);
    setBusy(true);
    setError('');
    request<Page>(`/related-tokens?eventId=${encodeURIComponent(eventId)}`)
      .then((value) => {
        if (generation.current === run) setPage(value);
      })
      .catch(() => {
        if (generation.current === run)
          setError('Could not load related tokens. Please try again.');
      })
      .finally(() => {
        if (generation.current === run) setBusy(false);
      });
    return () => {
      generation.current++;
    };
  }, [open, eventId, request]);
  const more = async () => {
    if (busy || !page?.nextCursor) return;
    const run = generation.current;
    setBusy(true);
    setError('');
    try {
      const next = await request<Page>(
        `/related-tokens?eventId=${encodeURIComponent(eventId)}&cursor=${encodeURIComponent(page.nextCursor)}`,
      );
      if (generation.current === run)
        setPage((previous) => ({
          ...next,
          items: [...(previous?.items || []), ...next.items].filter(
            (item, i, all) => all.findIndex((t) => t.id === item.id) === i,
          ),
        }));
    } catch {
      if (generation.current === run) setError('Could not load more tokens. Try again.');
    } finally {
      if (generation.current === run) setBusy(false);
    }
  };
  return (
    <>
      <button className="activity-token-count" onClick={() => setOpen(true)}>
        {count} related {count === 1 ? 'token' : 'tokens'}
      </button>
      <dialog
        ref={dialog}
        className="related-tokens-dialog"
        aria-label="Related tokens"
        onCancel={() => setOpen(false)}
      >
        <header>
          <h2>Related tokens {page && <small>{page.total}</small>}</h2>
          <button onClick={() => setOpen(false)} aria-label="Close related tokens">
            ×
          </button>
        </header>
        <div className="related-tokens-list">
          {page?.items.map((token) => (
            <article key={token.id}>
              <TokenMark src={token.logo} />
              <div>
                <strong>{token.name || token.ticker || 'Token'}</strong>
                <small>{token.ticker}</small>
                <code>{token.address}</code>
                <footer>
                  <a href={token.sourceUrl} target="_blank" rel="noreferrer">
                    Matched source ↗
                  </a>
                  {token.gmgnUrl && (
                    <a href={token.gmgnUrl} target="_blank" rel="noreferrer">
                      Market ↗
                    </a>
                  )}
                </footer>
              </div>
            </article>
          ))}
        </div>
        {busy && <p role="status">Loading tokens…</p>}
        {error && <p role="alert">{error}</p>}
        {page?.total === 0 && <p>No tokens currently link to this source.</p>}
        {page?.nextCursor && (
          <button className="button-secondary" disabled={busy} onClick={() => void more()}>
            Load more
          </button>
        )}
      </dialog>
    </>
  );
}
