import { useState } from 'react';
import { useIdentity } from './identity';
import { AccountAvatar } from './AccountMenu';
import { PlatformIcon } from '../components/PlatformIcon';
import { Row, Status } from './SettingsUI';
export function XConnection() {
  const identity = useIdentity();
  const x = identity.profile.x;
  const [confirm, setConfirm] = useState(false);
  const canUnlink = identity.profile.loginMethods > 1;
  return (
    <>
      <section className="settings-card connection-card">
        <div className="connection-heading">
          <span className="connection-logo">
            <PlatformIcon platform="x" size={26} />
          </span>
          <div>
            <h3>X account</h3>
          </div>
          <Status active={!!x}>{x ? 'Connected' : 'Not connected'}</Status>
        </div>
        {x ? (
          <>
            <div className="connected-profile">
              <AccountAvatar name={x.name || x.username || 'X'} photo={x.photo} />
              <div>
                <strong>{x.name || 'X profile'}</strong>
                {x.username && (
                  <a
                    href={`https://x.com/${encodeURIComponent(x.username)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{x.username} ↗
                  </a>
                )}
              </div>
            </div>
            <div className="connection-facts">
              <Row title="X user ID">
                <code className="account-id">{x.id}</code>
              </Row>
              <Row title="Username">
                <span>{x.username ? `@${x.username}` : 'Not provided by X'}</span>
              </Row>
              <Row title="Display name">
                <span>{x.name || 'Not provided by X'}</span>
              </Row>
            </div>
          </>
        ) : (
          <p className="connection-description">Share your X profile and user ID.</p>
        )}

        <div className="connection-actions">
          {x ? (
            confirm ? (
              <>
                <span>Disconnect this X profile?</span>
                <button className="button-secondary" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
                <button
                  className="button-secondary"
                  disabled={!!identity.pending}
                  onClick={() => {
                    void identity.unlinkX();
                    setConfirm(false);
                  }}
                >
                  Disconnect X
                </button>
              </>
            ) : (
              <>
                <span>
                  {canUnlink ? '' : 'Link an email, wallet or passkey before disconnecting.'}
                </span>
                <button
                  className="button-secondary"
                  disabled={!canUnlink || !!identity.pending}
                  onClick={() => setConfirm(true)}
                >
                  Disconnect X
                </button>
              </>
            )
          ) : (
            <>
              <span>
                {!identity.methods.x
                  ? 'X connection is awaiting activation.'
                  : identity.authenticated
                    ? ''
                    : 'Sign in to connect.'}
              </span>
              <button
                className="button-primary"
                disabled={!identity.authenticated || !identity.methods.x || !!identity.pending}
                onClick={() => identity.link('x')}
              >
                <PlatformIcon platform="x" size={15} />
                {identity.pending === 'x' ? 'Connecting…' : 'Connect X'}
                <span>↗</span>
              </button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
