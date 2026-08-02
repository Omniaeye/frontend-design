import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useIdentity } from './identity';
import { useAccount } from './AccountProvider';
import { PlatformIcon } from '../components/PlatformIcon';
import { Row, Status, SignIn } from './SettingsUI';
import { useTracking } from '../components/TrackingControls';
import {
  REDDIT_VIEWS,
  getRedditViews,
  setRedditViews,
  type RedditView,
} from '../tracking-preferences.js';
export function TelegramSettings() {
  const account = useAccount();
  const identity = useIdentity();
  const tracking = useTracking();
  const selectedReddit = getRedditViews(tracking.prefs, 'telegram');
  const allReddit = selectedReddit.length === REDDIT_VIEWS.length;
  const toggleReddit = (view: RedditView) =>
    tracking.onChange(
      setRedditViews(
        tracking.prefs,
        'telegram',
        selectedReddit.includes(view)
          ? selectedReddit.filter((item) => item !== view)
          : [...selectedReddit, view],
      ),
    );
  const [draft, setDraft] = useState(account.settings.telegram);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (account.loaded && !dirty) setDraft(account.settings.telegram);
  }, [account.loaded, account.settings.telegram, dirty]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const telegram = account.telegram;
  useEffect(() => {
    if (!link) return;
    let alive = true;
    const timer = setInterval(() => {
      if (Date.now() > Date.parse(link.expiresAt)) {
        setLink(null);
        setMessage('Connection link expired. Please start again.');
        return;
      }
      if (document.visibilityState === 'visible' && alive) void account.refresh().catch(() => {});
    }, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [link]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await action(async () => {
      await account.save({ ...account.settings, telegram: draft });
      setDirty(false);
      setMessage('Preferences saved.');
    });
  }
  return (
    <>
      <div className="settings-section-intro">
        <h2>Telegram</h2>
      </div>
      {!identity.authenticated && <SignIn />}
      <section className="settings-card connection-card">
        <div className="connection-heading">
          <span className="connection-logo">
            <PlatformIcon platform="telegram" size={28} />
          </span>
          <div>
            <h3>Telegram destination</h3>
          </div>
          <Status active={telegram.connected}>
            {telegram.connected ? 'Connected' : 'Not connected'}
          </Status>
        </div>
        {telegram.connected ? (
          <>
            <Row
              title={telegram.firstName || 'Telegram account'}
              description={telegram.username ? `@${telegram.username}` : 'Private Telegram account'}
            >
              <code>{telegram.userId}</code>
            </Row>
            <div className="connection-actions">
              <span>
                {telegram.lastTestAt
                  ? `Last test: ${new Date(telegram.lastTestAt).toLocaleString('en-US')}`
                  : ''}
              </span>
              <button
                className="button-secondary"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await account.request('/telegram/test', {});
                    setMessage('Test message sent to your connected Telegram.');
                    await account
                      .refresh()
                      .catch(() =>
                        setMessage('Test message sent. Reload to update the connection status.'),
                      );
                  })
                }
              >
                Send test message
              </button>
              <button
                className="text-link"
                disabled={busy}
                onClick={() => setConfirmDisconnect(true)}
              >
                Disconnect
              </button>
            </div>
            {confirmDisconnect && (
              <div className="settings-inline-confirm">
                <span>Disconnect this Telegram destination?</span>
                <button className="button-secondary" onClick={() => setConfirmDisconnect(false)}>
                  Cancel
                </button>
                <button
                  className="button-secondary"
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await account.request('/telegram', {}, 'DELETE');
                      await account.refresh();
                      setConfirmDisconnect(false);
                    })
                  }
                >
                  Confirm disconnect
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="connection-description">
              Open the bot, tap Start, then confirm the Telegram profile here.
            </p>
            {telegram.pending ? (
              <div className="telegram-link-step">
                <strong>
                  Confirm {telegram.pending.firstName}
                  {telegram.pending.username ? ` (@${telegram.pending.username})` : ''}
                </strong>
                <span>Telegram ID: {telegram.pending.userId}</span>
                <button
                  className="button-primary"
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await account.request('/telegram/confirm', {
                        userId: telegram.pending!.userId,
                      });
                      await account.refresh();
                      setLink(null);
                      setMessage('Telegram connected.');
                    })
                  }
                >
                  Confirm this account
                </button>
              </div>
            ) : link ? (
              <div className="telegram-link-step">
                <a className="button-primary" href={link.url} target="_blank" rel="noreferrer">
                  Open Telegram ↗
                </a>
                <span>Waiting for Start… This private link expires in 10 minutes.</span>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => void action(account.refresh)}
                >
                  I have tapped Start · Check again
                </button>
              </div>
            ) : (
              <div className="connection-actions">
                <span>
                  {!identity.authenticated
                    ? 'Sign in to connect your Telegram account.'
                    : !account.loaded
                      ? 'Loading account…'
                      : account.telegramAvailable
                        ? ''
                        : 'Connection status will be checked when you connect.'}
                </span>
                <button
                  className="button-primary"
                  disabled={
                    busy ||
                    (!identity.authenticated
                      ? !identity.configured || !!identity.pending
                      : !account.loaded)
                  }
                  onClick={() => {
                    if (!identity.authenticated) {
                      identity.login();
                      return;
                    }
                    void action(async () => {
                      setLink(await account.request('/telegram/link', {}));
                    });
                  }}
                >
                  {identity.authenticated ? 'Connect Telegram ↗' : 'Sign in to connect ↗'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <section className="settings-card">
        <div className="settings-card-title">
          <h3>Reddit ranking</h3>
          <Status active={selectedReddit.length > 0}>
            {selectedReddit.length ? `${selectedReddit.length} selected` : 'Off'}
          </Status>
        </div>
        <Row
          title="Posts that reach Telegram"
          description="Choose the Reddit rankings you want. The same selection is available in the Telegram control panel."
        >
          <div className="reddit-preference-grid" aria-label="Reddit ranking preferences">
            <button
              type="button"
              aria-pressed={allReddit}
              onClick={() =>
                tracking.onChange(
                  setRedditViews(tracking.prefs, 'telegram', allReddit ? [] : [...REDDIT_VIEWS]),
                )
              }
            >
              All
            </button>
            {REDDIT_VIEWS.map((view) => (
              <button
                type="button"
                key={view}
                aria-pressed={selectedReddit.includes(view)}
                onClick={() => toggleReddit(view)}
              >
                {view}
              </button>
            ))}
          </div>
        </Row>
      </section>
      <form className="settings-card" onSubmit={save} onChange={() => setDirty(true)}>
        <div className="settings-card-title">
          <h3>Delivery preferences</h3>
          <Status active={telegram.connected}>
            {telegram.connected ? 'Active' : 'Not connected'}
          </Status>
        </div>
        <Row title="Automatic alerts">
          <span className={telegram.connected ? '' : 'setting-off'}>
            {telegram.connected ? 'Active' : 'Not active'}
          </span>
        </Row>
        <Row title="Frequency">
          <select
            aria-label="Telegram frequency"
            value={draft.frequency}
            onChange={(event) =>
              setDraft({ ...draft, frequency: event.target.value as typeof draft.frequency })
            }
          >
            <option value="instant">As signals arrive</option>
            <option value="hourly">Hourly digest</option>
            <option value="daily">Daily digest</option>
          </select>
        </Row>
        <Row title="Quiet hours">
          <button
            type="button"
            className="setting-switch"
            role="switch"
            aria-label="Quiet hours"
            aria-checked={draft.quietHours}
            onClick={() => {
              setDirty(true);
              setDraft({ ...draft, quietHours: !draft.quietHours });
            }}
          >
            <span />
          </button>
        </Row>
        {draft.quietHours && (
          <Row title="Quiet window">
            <div className="time-window">
              <input
                type="time"
                aria-label="Quiet hours start"
                value={draft.quietStart}
                onChange={(event) => setDraft({ ...draft, quietStart: event.target.value })}
              />
              <span>to</span>
              <input
                type="time"
                aria-label="Quiet hours end"
                value={draft.quietEnd}
                onChange={(event) => setDraft({ ...draft, quietEnd: event.target.value })}
              />
            </div>
          </Row>
        )}
        <Row title="Time zone">
          <select
            aria-label="Telegram time zone"
            value={draft.timezone}
            onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}
          >
            {Array.from(
              new Set([
                'UTC',
                Intl.DateTimeFormat().resolvedOptions().timeZone,
                ...Intl.supportedValuesOf('timeZone'),
              ]),
            ).map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </Row>
        <Row
          title="Companies, platforms & profiles"
          description="Your Telegram selection is independent from My Feed."
        >
          <Link className="button-secondary" to="/following?channel=telegram">
            Review selection →
          </Link>
        </Row>
        <div className="settings-save">
          <span role="status">{message || ''}</span>
          <button className="button-primary" disabled={busy || !account.loaded}>
            {busy ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>
    </>
  );
}
