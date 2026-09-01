import { useEffect, useState } from 'react';
import { useAccount } from '../account/AccountProvider';
import { useIdentity } from '../account/identity';

export type ArchiveSource = {
  id: string;
  platform: string;
  kind: string;
  label: string;
  handle?: string | null;
  url?: string | null;
  image?: string | null;
  coverImage?: string | null;
  description?: string | null;
  relation?: string | null;
  status?: string | null;
  verified?: boolean;
  nativeId?: string | null;
  metrics?: Record<string, number | string | null | undefined>;
  observedAt?: string | null;
  evidenceUrl?: string | null;
  language?: string | null;
  topics?: string[];
  archived?: boolean;
  updatedAt?: string | null;
};

export type ArchiveTheme = {
  rank?: number;
  title?: string;
  classification?: string;
  summary?: string;
  finding?: string;
  source?: { url?: string; label?: string };
  source_url?: string;
  url?: string;
  [key: string]: unknown;
};

export type ArchiveCompanyData = {
  companyId: string;
  ticker: string;
  generatedFrom: string[];
  sources: ArchiveSource[];
  people: ArchiveSource[];
  counts: Record<string, number>;
  research: null | {
    title: string;
    note: string;
    coverageNote?: string;
    metrics: Array<{ label: string; value: number }>;
    themes: ArchiveTheme[];
  };
};

type ArchiveIndex = {
  schemaVersion: number;
  generatedAt: string;
  companies: Record<string, ArchiveCompanyData>;
};

const indexCache = new WeakMap<object, { expires: number; value: Promise<ArchiveIndex> }>();

export function useArchiveCompany(ticker: string) {
  const { request } = useAccount();
  const identity = useIdentity();
  const [state, setState] = useState<{
    data: ArchiveCompanyData | null;
    loading: boolean;
    error?: string;
  }>({
    data: null,
    loading: true,
  });
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true });
    const load = () => {
      let cached = indexCache.get(request);
      if (!cached || cached.expires < Date.now()) {
        const value = identity.authenticated
          ? request<ArchiveIndex>('/archive-index')
          : fetch('/app-data/archive-index.json').then((response) => {
              if (!response.ok) throw new Error(`Archive index ${response.status}`);
              return response.json() as Promise<ArchiveIndex>;
            });
        cached = { expires: Date.now() + 60_000, value };
        indexCache.set(request, cached);
        void value.catch(() => indexCache.delete(request));
      }
      cached.value
        .then((value: ArchiveIndex) => {
          if (active) setState({ data: value.companies[ticker] || null, loading: false });
        })
        .catch(() => {
          if (active)
            setState({
              data: null,
              loading: false,
              error: 'The source catalog could not be loaded. Reload to try again.',
            });
        });
    };
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ticker, request, identity.authenticated]);
  return state;
}

export function formatMetric(value: unknown) {
  if (typeof value !== 'number') return value == null ? 'Not collected' : String(value);
  return new Intl.NumberFormat('en', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}
