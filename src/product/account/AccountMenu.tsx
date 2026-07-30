import { Link, NavLink } from 'react-router-dom';
import { useIdentity } from './identity';
import { useAccount } from './AccountProvider';

export function AccountAvatar({ name, photo }: { name: string; photo?: string | null }) {
  return (
    <span className="account-avatar">
      {photo ? (
        <img
          key={photo}
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <span>{name.slice(0, 1).toUpperCase()}</span>
    </span>
  );
}
function SettingsIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="m10 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 2 3-1 1-3 3-1 1-3-2-2 1-3-3-2-3 1-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export function AccountMenu({ mobile = false }: { mobile?: boolean }) {
  const identity = useIdentity();
  const account = useAccount();
  const name =
    account.settings.displayName ||
    identity.profile.x?.name ||
    (identity.authenticated ? 'Your account' : 'Your profile');
  return (
    <div className={`account-dock ${mobile ? 'account-dock--mobile' : 'account-dock--desktop'}`}>
      <Link className="account-dock-profile" to="/settings/account" aria-label="View profile">
        <AccountAvatar name={name} photo={identity.profile.x?.photo} />
        <span>
          <strong>{name}</strong>
          {identity.profile.x?.username && <small>@{identity.profile.x.username}</small>}
        </span>
      </Link>
      <NavLink
        to="/settings"
        className={({ isActive }) => `account-settings-button ${isActive ? 'active' : ''}`}
        aria-label="Settings"
      >
        <SettingsIcon />
        <span>Settings</span>
        <span aria-hidden="true">↗</span>
      </NavLink>
    </div>
  );
}
export function WalletShortcut() {
  const identity = useIdentity();
  const address = identity.profile.wallets[0];
  if (import.meta.env.MODE === 'website' && !identity.authenticated)
    return (
      <button
        className="wallet-shortcut"
        disabled={!identity.configured || !!identity.pending}
        onClick={identity.login}
      >
        Sign in ↗
      </button>
    );
  return (
    <Link className="wallet-shortcut" to="/settings/wallet" aria-label="Connect wallet">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M4 6V4h14v3M3 7h18v14H3V7Zm12 5h6v5h-6v-5Z" />
      </svg>
      <span>
        <strong>
          {address ? `${address.slice(0, 5)}…${address.slice(-4)}` : 'Connect wallet'}
        </strong>
      </span>
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
