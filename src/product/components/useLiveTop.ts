import { useEffect, useState } from 'react';
import { useAccount } from '../account/AccountProvider';
import type { ProductEvent } from '../data/repository.js';
type TopPage = { items: ProductEvent[]; total: number; nextCursor: null };
export function useLiveTop(enabled: boolean, query: string) {
  const { request } = useAccount();
  const [state, setState] = useState<{ query: string; page: TopPage | null; error: string }>({
    query: '',
    page: null,
    error: '',
  });
  useEffect(() => {
    if (!enabled) return;
    let current = true,
      running = false;
    const load = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        const page = await request<TopPage>(`/top?${query}`);
        if (current) setState({ query, page, error: '' });
      } catch {
        if (current)
          setState((old) => ({
            query,
            page: old.query === query ? old.page : null,
            error: 'Could not update Top.',
          }));
      } finally {
        running = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    document.addEventListener('visibilitychange', load);
    return () => {
      current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [enabled, query, request]);
  return {
    page: state.query === query ? state.page : null,
    error: state.query === query ? state.error : '',
  };
}
