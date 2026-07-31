import type { ReactNode } from 'react';
import { useIdentity } from './identity';
export function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}
export function Status({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span className={`connection-status ${active ? 'is-connected' : ''}`}>
      <i />
      {children}
    </span>
  );
}

export function SignIn() {
  const identity = useIdentity();
  return (
    <div className="settings-signin">
      <div>
        <strong>
          {identity.configured
            ? import.meta.env.MODE === 'website'
              ? 'Sign in to OMNIA'
              : 'Save to your account'
            : 'Sign-in unavailable'}
        </strong>
      </div>
      <button
        className="button-primary"
        disabled={!identity.configured || !!identity.pending}
        onClick={identity.login}
      >
        Sign in<span>↗</span>
      </button>
    </div>
  );
}
