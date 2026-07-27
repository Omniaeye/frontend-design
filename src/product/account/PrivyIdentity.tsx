import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PrivyProvider,
  usePrivy,
  useLinkAccount,
  useLogin,
  useIdentityToken,
} from '@privy-io/react-auth';
import { IdentityContext, type Identity } from './identity';
import { identityProfile } from './model.js';

function Session({ children, methods }: { children: ReactNode; methods: Identity['methods'] }) {
  const privy = usePrivy();
  const { identityToken } = useIdentityToken();
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const done = () => setPending('');
  const failed = (code?: string) => {
    setPending('');
    setError(
      code === 'exited_auth_flow' ? '' : 'The connection was not completed. Please try again.',
    );
  };
  const links = useLinkAccount({ onSuccess: done, onError: failed });
  const { login } = useLogin({ onComplete: done, onError: failed });
  const profile = useMemo(() => identityProfile(privy.user), [privy.user]);
  useEffect(() => {
    if (!privy.isModalOpen) setPending('');
  }, [privy.isModalOpen]);
  const value: Identity = {
    configured: true,
    ready: privy.ready,
    authenticated: privy.authenticated,
    profile,
    pending,
    error,
    methods,
    login: () => {
      setError('');
      setPending('login');
      login();
    },
    logout: async () => {
      setError('');
      try {
        await privy.logout();
      } catch {
        setError('Sign out failed. Please try again.');
      }
    },
    getToken: privy.getAccessToken,
    getIdentityToken: async () => identityToken,
    link: (method) => {
      if (!privy.authenticated || !methods[method]) return;
      setError('');
      setPending(method);
      try {
        ({
          x: links.linkTwitter,
          email: links.linkEmail,
          wallet: () => links.linkWallet(),
          passkey: () => links.linkPasskey({ name: 'OMNIA EYE' }),
        })[method]();
      } catch {
        failed();
      }
    },
    unlinkX: async () => {
      if (!profile.x || profile.loginMethods < 2) return;
      setError('');
      setPending('x');
      try {
        await privy.unlinkTwitter(profile.x.id);
        done();
      } catch {
        failed();
      }
    },
  };
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export default function PrivyIdentity({
  appId,
  children,
  methods,
}: {
  appId: string;
  children: ReactNode;
  methods: Identity['methods'];
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: (['wallet', 'email', 'passkey'] as const).filter((method) => methods[method]),
        appearance: { theme: '#101A20', accentColor: '#18E69A', showWalletLoginFirst: true },
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, solana: { createOnLogin: 'off' } },
      }}
    >
      <Session methods={methods}>{children}</Session>
    </PrivyProvider>
  );
}
