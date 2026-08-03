import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdentity } from './identity';
import { useAccount } from './AccountProvider';
import { Row, Status } from './SettingsUI';
import { XConnection } from './XConnection';

export function WalletAccess() {
  const identity = useIdentity();
  const account = useAccount();
  const wallets = identity.profile.wallets;
  const [access, setAccess] = useState<{ fullAccess: boolean; wallet?: string } | null>(null);
  useEffect(() => {
    let current = true;
    if (!identity.authenticated) {
      setAccess(null);
      return () => {
        current = false;
      };
    }
    account
      .request<{ fullAccess: boolean; wallet?: string }>('/access')
      .then((value) => {
        if (current) setAccess(value);
      })
      .catch(() => {
        if (current) setAccess({ fullAccess: false });
      });
    return () => {
      current = false;
    };
  }, [identity.authenticated, identity.profile.wallets.join(','), account.request]);
  return (
    <>
      <div className="settings-section-intro">
        <h2>Wallet & access</h2>
      </div>
      <section className="settings-card wallet-access-card">
        <div className="wallet-access-heading">
          <div>
            <h3>Access is verified from your linked wallet.</h3>
          </div>
          <Status>{access?.fullAccess ? 'Full access' : 'Public preview'}</Status>
        </div>
        <div className="wallet-access-action">
          <button
            className="button-primary"
            disabled={
              !identity.configured ||
              !!identity.pending ||
              (identity.authenticated && !identity.methods.wallet)
            }
            onClick={() => (identity.authenticated ? identity.link('wallet') : identity.login())}
          >
            {identity.pending
              ? 'Connecting…'
              : wallets.length
                ? 'Link another wallet'
                : 'Connect wallet'}
            <span>↗</span>
          </button>
        </div>
        {wallets.map((address) => (
          <Row key={address} title="Linked wallet">
            <code className="account-id">{address}</code>
          </Row>
        ))}
        <p>
          {access?.fullAccess
            ? 'This verified wallet can access the complete OMNIA archive.'
            : 'Connect the authorized wallet to unlock the complete archive.'}
        </p>
        <Row title="Access wallet">
          <span>{access?.wallet ?? 'Not authorized'}</span>
        </Row>
      </section>
      <XConnection />
      <section className="settings-card">
        <div className="settings-card-title">
          <h3>Sign-in & security</h3>
        </div>
        <Row title="Recovery email" description={identity.profile.email || 'One-time sign-in code'}>
          <button
            className="button-secondary"
            disabled={!identity.authenticated || !!identity.profile.email || !!identity.pending}
            onClick={() => identity.link('email')}
          >
            {identity.profile.email ? 'Linked' : 'Link email'}
          </button>
        </Row>
        <Row
          title="Passkeys"
          description={
            identity.profile.passkeys
              ? `${identity.profile.passkeys} linked`
              : identity.methods.passkey
                ? 'Biometrics or screen lock'
                : 'Activation pending'
          }
        >
          <button
            className="button-secondary"
            disabled={!identity.authenticated || !identity.methods.passkey || !!identity.pending}
            onClick={() => identity.link('passkey')}
          >
            Add passkey
          </button>
        </Row>
        <Row title="This session">
          <button
            className="button-secondary"
            disabled={!identity.authenticated}
            onClick={() => void identity.logout()}
          >
            Sign out
          </button>
        </Row>
      </section>
      <Link className="settings-related" to="/settings/telegram">
        <strong>Telegram settings</strong>
        <span>→</span>
      </Link>
    </>
  );
}
