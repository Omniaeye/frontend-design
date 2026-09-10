import { type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useIdentity } from '../account/identity';
import { useAccount } from '../account/AccountProvider';
import { AccountAvatar } from '../account/AccountMenu';
import { PlatformIcon } from '../components/PlatformIcon';
import './bags.css';
import {
  XPosts,
  XLeaderboard,
  XContributionSummary,
  XBestThree,
  ContributionProvider,
} from '../x/XPosts';

import './editorial.css';

const tabs = [
  ['overview', 'Overview'],
  ['posts', 'My posts'],
  ['leaderboard', 'Leaderboard'],
  ['rewards', 'Rewards'],
] as const;
const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

function Metric({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="bags-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function BagsWorkspace() {
  const identity = useIdentity();
  const account = useAccount();
  const [params, setParams] = useSearchParams();
  const view = tabs.some(([id]) => id === params.get('view')) ? params.get('view')! : 'overview';
  const x = identity.profile.x;
  const name =
    account.settings.displayName ||
    x?.name ||
    x?.username ||
    (identity.authenticated ? 'Your account' : 'Your profile');
  function select(next: string) {
    setParams(next === 'overview' ? {} : { view: next });
  }

  return (
    <div className="page bags-page">
      <header className="bags-editorial-heading">
        <div>
          <p className="bags-eyebrow">OMNIA / CONTRIBUTORS</p>
          <h1>
            Work for
            <br />
            <em>Your Bags.</em>
          </h1>
          <p className="bags-intro">Your perspective. Your contribution.</p>
        </div>
        <div className="bags-heading-action">
          <span className="bags-tag">
            <i />
            Pre-launch
          </span>
          <button className="bags-submit" onClick={() => select('posts')}>
            Submit a post <span>↗</span>
          </button>
        </div>
      </header>
      {identity.error && (
        <p className="settings-error" role="alert">
          {identity.error}
        </p>
      )}
      <section className="bags-profile" aria-label="Participant profile">
        <div className="bags-profile-person">
          <AccountAvatar name={name} photo={x?.photo} />
          <div>
            <strong>{name}</strong>
            {x?.username ? (
              <a
                href={`https://x.com/${encodeURIComponent(x.username)}`}
                target="_blank"
                rel="noreferrer"
              >
                <PlatformIcon platform="x" size={11} />@{x.username} ↗
              </a>
            ) : (
              <span>X not connected</span>
            )}
          </div>
        </div>
        <div className="bags-profile-actions">
          {identity.authenticated ? (
            <>
              <Link className={`bags-connect ${x ? 'is-linked' : ''}`} to="/settings/wallet">
                <PlatformIcon platform="x" size={13} />
                {x ? 'Connected' : 'Connect X'}
                <span>↗</span>
              </Link>
              {identity.profile.wallets.length ? (
                <Link
                  className="bags-connect is-linked"
                  to="/settings/wallet"
                  title={identity.profile.wallets[0]}
                >
                  {shortAddress(identity.profile.wallets[0])}
                  <span>↗</span>
                </Link>
              ) : (
                <button
                  className="bags-connect"
                  disabled={!identity.methods.wallet || !!identity.pending}
                  onClick={() => identity.link('wallet')}
                >
                  {identity.pending === 'wallet' ? 'Connecting…' : 'Connect wallet'}
                  <span>↗</span>
                </button>
              )}
            </>
          ) : (
            <button
              className="button-primary"
              disabled={!identity.ready || !identity.configured || !!identity.pending}
              onClick={identity.login}
            >
              {identity.pending ? 'Connecting…' : 'Sign in'}
              <span>↗</span>
            </button>
          )}
          <Link className="bags-profile-edit" to="/settings/account" aria-label="Edit profile">
            Edit profile
          </Link>
        </div>
      </section>
      <XContributionSummary />
      <nav className="bags-tabs" aria-label="Bags views">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => select(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="bags-view" key={view}>
        {view === 'overview' ? (
          <div className="bags-editorial-overview">
            <XBestThree onSubmit={() => select('posts')} />
            <div className="bags-program">
              <section>
                <p className="bags-eyebrow">REWARDS</p>
                <h2>A share in what we build.</h2>
                <p>The reward round has not been scheduled yet.</p>
                <button className="bags-text-link" onClick={() => select('rewards')}>
                  Rewards & rules <span>↗</span>
                </button>
              </section>
              <section className="bags-program-status">
                <div>
                  <span>Reward asset</span>
                  <strong>USDG</strong>
                </div>
                <div>
                  <span>Round</span>
                  <strong>Not scheduled</strong>
                </div>
                <details>
                  <summary>
                    Eligibility <span>+</span>
                  </summary>
                  <p>
                    A linked X account and wallet are required. Minimum holding: 100,000 tokens.
                    Token balance has not been verified.
                  </p>
                  <Link to="/settings/wallet">Manage connections ↗</Link>
                </details>
              </section>
            </div>
          </div>
        ) : view === 'posts' ? (
          <XPosts />
        ) : view === 'leaderboard' ? (
          <XLeaderboard />
        ) : (
          <div className="bags-grid">
            <section className="bags-card">
              <div className="bags-card-head">
                <h2>Your rewards</h2>
                <span className="bags-tag">Pending</span>
              </div>
              <div className="bags-reward-totals">
                <Metric
                  label="Estimated"
                  value={
                    <>
                      — <em>USDG</em>
                    </>
                  }
                />
                <Metric
                  label="Paid"
                  value={
                    <>
                      — <em>USDG</em>
                    </>
                  }
                />
              </div>
              <div className="bags-empty">
                <strong>No payouts yet</strong>
                <span>Final amounts and transactions will appear here.</span>
              </div>
            </section>
            <section className="bags-card bags-rules">
              <div className="bags-card-head">
                <h2>Program rules</h2>
              </div>
              <dl>
                <div>
                  <dt>Minimum holding</dt>
                  <dd>100,000 tokens</dd>
                </div>
                <div>
                  <dt>Counted posts</dt>
                  <dd>Best 3</dd>
                </div>
                <div>
                  <dt>Reward asset</dt>
                  <dd>USDG</dd>
                </div>
                <div>
                  <dt>Holding multiplier</dt>
                  <dd>None</dd>
                </div>
              </dl>
              <p>
                100% of the fees the project receives from pons are allocated to eligible
                participants, proportionally to performance.
              </p>
              <details>
                <summary>
                  Pending configuration <span>+</span>
                </summary>
                <p>Token, network, eligibility snapshots, round dates and payment method.</p>
              </details>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export function Bags() {
  const identity = useIdentity();
  return (
    <ContributionProvider key={identity.profile.id || 'guest'}>
      <BagsWorkspace />
    </ContributionProvider>
  );
}
