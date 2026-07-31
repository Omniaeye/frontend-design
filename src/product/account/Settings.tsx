import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Navigate, useParams } from 'react-router-dom';
import { useIdentity } from './identity';
import { useAccount } from './AccountProvider';
import { AccountAvatar } from './AccountMenu';
import { Row, SignIn } from './SettingsUI';
import { WalletAccess } from './WalletAccess';
import { TelegramSettings } from './TelegramSettings';
const sections = [
  ['account', 'Account'],
  ['wallet', 'Wallet & access'],
  ['telegram', 'Telegram'],
];

function AccountForm() {
  const account = useAccount();
  const identity = useIdentity();
  const [name, setName] = useState(account.settings.displayName);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      await account.save({ ...account.settings, displayName: name });
      setStatus('Profile saved.');
    } catch {
      setStatus('Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="settings-section-intro">
        <h2>Profile</h2>
      </div>
      {!identity.authenticated && <SignIn />}
      <form onSubmit={submit} className="settings-card">
        <div className="profile-heading">
          <AccountAvatar
            name={name || identity.profile.x?.name || 'O'}
            photo={identity.profile.x?.photo}
          />
          <div>
            <strong>{name || identity.profile.x?.name || 'Your workspace'}</strong>
            {identity.profile.x?.username && <p>@{identity.profile.x.username}</p>}
          </div>
        </div>
        <Row title="Display name">
          <input
            aria-label="Display name"
            value={name}
            maxLength={60}
            placeholder="Your name"
            autoComplete="nickname"
            onChange={(event) => setName(event.target.value)}
          />
        </Row>
        {identity.profile.id && (
          <Row title="Account ID">
            <code className="account-id">{identity.profile.id}</code>
          </Row>
        )}
        <div className="settings-save">
          <span role="status">{status || account.sync}</span>
          <button className="button-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </>
  );
}

export function Settings() {
  const { section = 'account' } = useParams();
  const identity = useIdentity();
  const navigation = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const nav = navigation.current;
    if (!nav) return;
    const revealActive = () => {
      const active = nav.querySelector<HTMLElement>('.active');
      if (active && nav.scrollWidth > nav.clientWidth)
        nav.scrollLeft +=
          active.getBoundingClientRect().left -
          nav.getBoundingClientRect().left -
          (nav.clientWidth - active.offsetWidth) / 2;
    };
    revealActive();
    const observer = new ResizeObserver(revealActive);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [section]);
  const components: Record<string, ReactNode> = {
    account: <AccountForm />,
    wallet: <WalletAccess />,
    telegram: <TelegramSettings />,
  };
  if (section === 'connections' || section === 'security')
    return <Navigate to="/settings/wallet" replace />;
  if (section === 'tracking') return <Navigate to="/following" replace />;
  if (!Object.hasOwn(components, section)) return <Navigate to="/settings/account" replace />;
  return (
    <div className="page settings-page">
      <div className="compact-heading">
        <h1>Settings</h1>
        <Link className="text-link" to="/feed">
          Back to My Feed →
        </Link>
      </div>
      <div className="settings-layout">
        <nav ref={navigation} className="settings-nav" aria-label="Settings navigation">
          {sections.map(([id, label]) => (
            <NavLink key={id} to={`/settings/${id}`}>
              {label}
              <span>›</span>
            </NavLink>
          ))}
        </nav>
        <div className="settings-content" key={section}>
          {identity.error && (
            <p className="settings-error" role="alert">
              {identity.error}
            </p>
          )}
          {components[section]}
        </div>
      </div>
    </div>
  );
}
