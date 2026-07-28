import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useIdentity } from './identity';
import { requestJson } from './request.js';
import { readUpdates } from './live-updates.mjs';
import { createCredentials } from './credentials.js';
import { normalizeSettings, settingsStorageKey, type AccountSettings } from './model.js';
import type { TrackingPreferences } from '../tracking-preferences.js';
import { AccessBoot } from '../components/AccessBoot';

export type TelegramState = {
  connected: boolean;
  username?: string | null;
  firstName?: string;
  userId?: string;
  connectedAt?: string;
  lastTestAt?: string | null;
  pending?: { username: string | null; firstName: string; userId: string } | null;
};
type Remote = {
  settings: AccountSettings;
  tracking: TrackingPreferences | null;
  telegram: TelegramState;
  telegramAvailable: boolean;
  revision?: number;
};
type AccountContextValue = {
  settings: AccountSettings;
  loaded: boolean;
  sync: string;
  remoteTracking: TrackingPreferences | null;
  telegram: TelegramState;
  telegramAvailable: boolean;
  save: (settings: AccountSettings) => Promise<void>;
  syncTracking: (tracking: TrackingPreferences) => Promise<boolean>;
  request: <T>(path: string, body?: unknown, method?: string) => Promise<T>;
  refresh: () => Promise<void>;
};
const AccountContext = createContext<AccountContextValue | null>(null);
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('AccountProvider is required');
  return value;
}

function AccountScope({ children }: { children: ReactNode }) {
  const identity = useIdentity();
  const remoteEnabled = identity.authenticated;
  const key = settingsStorageKey(identity.profile.id);
  const [settings, setSettings] = useState(() => {
    try {
      return normalizeSettings(JSON.parse(localStorage.getItem(key) || '{}'));
    } catch {
      return normalizeSettings();
    }
  });
  const [loaded, setLoaded] = useState(!remoteEnabled);
  const [sync, setSync] = useState(remoteEnabled ? 'Loading account…' : 'Saved on this device');
  const [remoteTracking, setRemoteTracking] = useState<TrackingPreferences | null>(null);
  const [telegram, setTelegram] = useState<TelegramState>({ connected: false });
  const [telegramAvailable, setTelegramAvailable] = useState(false);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const credentials = useRef(createCredentials());
  const reads = useRef(new Map<string, Promise<unknown>>());
  const alive = useRef(true);
  const queue = useRef(Promise.resolve());
  const latestTracking = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const request = useCallback(<T,>(path: string, body?: unknown, method?: string): Promise<T> => {
    const verb = method || (body === undefined ? 'GET' : 'POST');
    if (verb === 'GET' && reads.current.has(path)) return reads.current.get(path) as Promise<T>;
    const run = async (): Promise<T> => {
      const readPath = path.split('?')[0];
      if (
        verb === 'GET' &&
        [
          '/search',
          '/access',
          '/snapshot',
          '/top',
          '/tokens',
          '/social',
          '/related-tokens',
          '/company-counts',
          '/archive-events',
          '/event',
          '/archive-index',
        ].includes(readPath)
      )
        return requestJson<T>(
          `/api/feed${path}${readPath === '/snapshot' ? `${path.includes('?') ? '&' : '?'}format=columns-v1` : ''}`,
          { method: 'GET' },
        );
      if (!identityRef.current.authenticated) {
        if (verb === 'GET' && readPath === '/me')
          return {
            settings: normalizeSettings(
              JSON.parse(
                localStorage.getItem(settingsStorageKey(identityRef.current.profile.id)) || '{}',
              ),
            ),
            tracking: null,
            telegram: { connected: false },
            telegramAvailable: false,
          } as T;
        throw new Error('Sign in to save this to your account.');
      }
      const [token, identityToken] = await credentials.current.get(identityRef.current);
      if (!alive.current || !token) throw new Error('Your session has expired. Sign in again.');
      const transportPath =
        path.split('?')[0] === '/snapshot'
          ? `${path}${path.includes('?') ? '&' : '?'}format=columns-v1`
          : path;
      const result = await requestJson<T>(`/api/account${transportPath}`, {
        method: verb,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(identityToken ? { 'privy-id-token': identityToken } : {}),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).catch((error) => {
        if (error.status === 401) credentials.current.invalidate();
        throw error;
      });
      if (!alive.current) throw new Error('Your session changed. Please try again.');
      return result;
    };
    const result = run();
    if (verb === 'GET') {
      reads.current.set(path, result);
      void result
        .finally(() => {
          if (reads.current.get(path) === result) reads.current.delete(path);
        })
        .catch(() => {});
    }
    return result;
  }, []);
  const refresh = async () => {
    if (!remoteEnabled) {
      setSettings(normalizeSettings(JSON.parse(localStorage.getItem(key) || '{}')));
      return;
    }
    const result = await request<Remote>('/me');
    const next = normalizeSettings(result.settings);
    setSettings((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
    setRemoteTracking((previous) =>
      JSON.stringify(previous) === JSON.stringify(result.tracking) ? previous : result.tracking,
    );
    setTelegram((previous) =>
      JSON.stringify(previous) === JSON.stringify(result.telegram) ? previous : result.telegram,
    );
    setTelegramAvailable(result.telegramAvailable);
    setSync('Synced to your account');
  };
  const linkedX = identity.profile.x?.id || '';
  useEffect(() => {
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => {
      try {
        if (controller.signal.aborted) return;
        const response = await fetch('/api/feed/updates', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (response.status === 403) return;
        if (response.status === 401) credentials.current.invalidate();
        if (!response.ok || !response.body) throw new Error('Updates unavailable');
        await readUpdates(
          response.body,
          (data) => window.dispatchEvent(new CustomEvent('omnia-live-update', { detail: data })),
          controller.signal,
        );
      } catch {
        /* Existing polling remains the fallback during outages. */
      }
      if (!controller.signal.aborted) retry = setTimeout(() => void connect(), 5000);
    };
    void connect();
    return () => {
      controller.abort();
      if (retry) clearTimeout(retry);
    };
  }, [remoteEnabled, identity.profile.wallets.join(',')]);
  useEffect(() => {
    if (remoteEnabled && loaded) void refresh().catch(() => {});
  }, [linkedX]);
  useEffect(() => {
    if (!remoteEnabled) return;
    let current = true;
    request<Remote>('/me')
      .then((result) => {
        if (!current) return;
        setSettings(normalizeSettings(result.settings));
        setRemoteTracking(result.tracking);
        setTelegram(result.telegram);
        setTelegramAvailable(result.telegramAvailable);
        setSync('Synced to your account');
      })
      .catch(() => {
        if (current) setSync('Account sync unavailable');
      })
      .finally(() => {
        if (current) setLoaded(true);
      });
    return () => {
      current = false;
    };
  }, [identity.authenticated, request]);
  useEffect(() => {
    if (!remoteEnabled) return;
    const update = () => {
      if (document.visibilityState === 'visible') void refresh().catch(() => {});
    };
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [remoteEnabled, request]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = settings.density;
    root.dataset.textSize = settings.textSize;
    root.dataset.motion = settings.motion;
    window.dispatchEvent(new Event('omnia-motion-change'));
  }, [settings]);
  const save = async (value: AccountSettings) => {
    const next = normalizeSettings(value);
    if (remoteEnabled) {
      await request('/settings', next, 'PUT');
      setSettings(next);
      setSync('Synced to your account');
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Server remains authoritative. */
      }
    } else {
      localStorage.setItem(key, JSON.stringify(next));
      setSettings(next);
    }
  };
  const syncTracking = async (tracking: TrackingPreferences) => {
    if (!remoteEnabled) return true;
    const revision = ++latestTracking.current;
    setSync('Syncing tracking…');
    let saved = false;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (!alive.current) return;
        await request('/tracking', tracking, 'PUT');
        saved = true;
        if (alive.current && revision === latestTracking.current) setSync('Synced to your account');
      })
      .catch(() => {
        if (alive.current && revision === latestTracking.current)
          setSync('Tracking saved locally · account sync failed');
      });
    await queue.current;
    return saved;
  };
  return (
    <AccountContext.Provider
      value={{
        settings,
        loaded,
        sync,
        remoteTracking,
        telegram,
        telegramAvailable,
        save,
        syncTracking,
        request,
        refresh,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const identity = useIdentity();
  if (!identity.ready) return <AccessBoot stage="session" />;
  return <AccountScope key={identity.profile.id || 'local'}>{children}</AccountScope>;
}
