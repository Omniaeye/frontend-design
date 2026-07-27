import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { identityProfile, type IdentityProfile } from './model.js';
import { AccessBoot } from '../components/AccessBoot';

export type Identity = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  profile: IdentityProfile;
  methods: { wallet: boolean; email: boolean; x: boolean; passkey: boolean };
  pending: string;
  error: string;
  login: () => void;
  logout: () => Promise<void>;
  link: (method: 'x' | 'email' | 'wallet' | 'passkey') => void;
  unlinkX: () => Promise<void>;
  getToken: () => Promise<string | null>;
  getIdentityToken: () => Promise<string | null>;
};
const inactive: Identity = {
  configured: false,
  ready: true,
  authenticated: false,
  profile: identityProfile(null),
  pending: '',
  error: '',
  methods: { wallet: false, email: false, x: false, passkey: false },
  login: () => {},
  logout: async () => {},
  link: () => {},
  unlinkX: async () => {},
  getToken: async () => null,
  getIdentityToken: async () => null,
};
export const IdentityContext = createContext<Identity>(inactive);
export const useIdentity = () => useContext(IdentityContext);
const PrivyIdentity = lazy(() => import('./PrivyIdentity'));

export function IdentityProvider({ children }: { children: ReactNode }) {
  return <ConfiguredIdentityProvider>{children}</ConfiguredIdentityProvider>;
}
function ConfiguredIdentityProvider({ children }: { children: ReactNode }) {
  const [appId, setAppId] = useState<string | null>(import.meta.env.VITE_PRIVY_APP_ID || null);
  const [methods, setMethods] = useState(inactive.methods);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      import.meta.env.MODE === 'website' ? '/website-data/auth-config.json' : '/api/account/config',
      { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (config?.appId) setAppId(config.appId);
        if (config?.methods) setMethods(config.methods);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setChecked(true);
      });
    return () => controller.abort();
  }, []);
  if (!checked) return <AccessBoot stage="session" />;
  if (!PrivyIdentity || !appId || !Object.values(methods).some(Boolean))
    return <IdentityContext.Provider value={inactive}>{children}</IdentityContext.Provider>;
  return (
    <Suspense fallback={<AccessBoot stage="session" />}>
      <PrivyIdentity appId={appId} methods={methods}>
        {children}
      </PrivyIdentity>
    </Suspense>
  );
}
