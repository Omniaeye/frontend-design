import { useEffect, useState } from 'react';

import { useLocation } from 'react-router-dom';

import { useAccount } from './account/AccountProvider';

import { useIdentity } from './account/identity';

function identifier(storage: Storage, key: string) {
  let value = storage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    storage.setItem(key, value);
  }
  return value;
}

export function UsageTracker() {
  const location = useLocation(),
    account = useAccount(),
    identity = useIdentity();
  useEffect(() => {
    if (!['eyeomnia.com', 'www.eyeomnia.com'].includes(window.location.hostname)) return;

    let visitor: string, session: string;
    try {
      visitor = identifier(localStorage, 'omnia.usage.visitor');
      session = identifier(sessionStorage, 'omnia.usage.session');
    } catch {
      return;
    }

    const path = '/' + (location.pathname.split('/')[1] || '');
    let viewed = false;

    const send = () => {
      if (document.hidden) return;
      const body = { visitor, session, path, view: !viewed };
      viewed = true;
      if (identity.authenticated) void account.request('/usage', body).catch(() => {});
      else
        void fetch('/api/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive: true,
        }).catch(() => {});
    };

    send();
    const timer = setInterval(send, 60000);
    document.addEventListener('visibilitychange', send);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', send);
    };
  }, [location.pathname, identity.authenticated, account.request]);
  return null;
}

export function Analytics() {
  const { request } = useAccount();
  const [data, setData] = useState<any>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () =>
      request('/analytics')
        .then((value) => {
          if (active) {
            setData(value);
            setError('');
          }
        })
        .catch(() => {
          if (active) setError('Admin sign-in required.');
        });
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [request]);
  return (
    <div className="page">
      <h1>Analytics</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : data ? (
        <>
          <p>Last 24 hours</p>
          <div className="terminal-grid">
            {[
              ['Active now', data.active],
              ['Visitors', data.visitors],
              ['Sessions', data.sessions],
              ['Page views', data.views],
            ].map(([label, value]) => (
              <section key={label} className="account-card">
                <h2>{label}</h2>
                <strong>{value}</strong>
              </section>
            ))}
          </div>
          <p>Internal sessions excluded: {data.excluded}</p>
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {data.pages.map((page: any) => (
                <tr key={page.path}>
                  <td>{page.path}</td>
                  <td>{page.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}
