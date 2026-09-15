import { useEffect, useState, type FormEvent } from 'react';
import { useIdentity } from '../account/identity';
import './waitlist.css';

const POST = 'https://x.com/Omniaeye/status/2100668153877733746';
const PREVIEW_MS = 5_000;
const ACTIONS = [
  {
    id: 'follow',
    index: '01',
    label: 'Follow @Omniaeye',
    detail: 'Stay close to the signal.',
    href: 'https://x.com/intent/follow?screen_name=Omniaeye',
  },
  {
    id: 'like',
    index: '02',
    label: 'Like the launch post',
    detail: 'Mark your place early.',
    href: POST,
  },
  {
    id: 'comment',
    index: '03',
    label: 'Join the conversation',
    detail: 'Tell us what you want to see.',
    href: 'https://x.com/intent/post?in_reply_to=2100668153877733746',
  },
];

export function WaitlistForm({
  source = 'panel',
  compact = false,
}: {
  source?: 'header' | 'portal' | 'footer' | 'panel';
  compact?: boolean;
}) {
  const [opened, setOpened] = useState<string[]>([]),
    [xHandle, setXHandle] = useState(''),
    [wallet, setWallet] = useState(''),
    [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle'),
    [message, setMessage] = useState('');
  const open = (id: string) => setOpened((value) => (value.includes(id) ? value : [...value, id]));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState('sending');
    setMessage('');
    try {
      const response = await fetch('/api/account/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xHandle, wallet, source, company: '' }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'We could not reserve your access.');
      setState('done');
      setMessage(
        'You are on the OMNIA early-access list. We will verify public activity before invitations go out.',
      );
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'We could not reserve your access.');
    }
  };
  if (state === 'done')
    return (
      <div className="waitlist-success" role="status">
        <span>ACCESS REQUEST RECEIVED</span>
        <strong>Your signal is registered.</strong>
        <p>{message}</p>
        <a href={POST} target="_blank" rel="noreferrer">
          Return to the launch post ↗
        </a>
      </div>
    );
  return (
    <form className={`waitlist-form${compact ? ' is-compact' : ''}`} onSubmit={submit}>
      <div className="waitlist-actions" aria-label="Early access steps">
        {ACTIONS.map((action) => (
          <a
            key={action.id}
            className={opened.includes(action.id) ? 'is-opened' : ''}
            href={action.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => open(action.id)}
          >
            <span>{action.index}</span>
            <div>
              <strong>{action.label}</strong>
              <small>{action.detail}</small>
            </div>
            <b>{opened.includes(action.id) ? '✓' : '↗'}</b>
          </a>
        ))}
      </div>
      <div className="waitlist-fields">
        <label>
          <span>X PROFILE</span>
          <div>
            <i>@</i>
            <input
              required
              autoComplete="off"
              maxLength={16}
              value={xHandle}
              onInvalid={(event) => event.currentTarget.setCustomValidity('Enter your X profile.')}
              onChange={(event) => {
                event.currentTarget.setCustomValidity('');
                setXHandle(event.target.value.replace(/^@/, ''));
              }}
              placeholder="yourhandle"
            />
          </div>
        </label>
        <label>
          <span>EVM WALLET</span>
          <input
            required
            autoComplete="off"
            spellCheck={false}
            pattern="0x[a-fA-F0-9]{40}"
            value={wallet}
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(
                event.currentTarget.validity.valueMissing
                  ? 'Enter your EVM wallet.'
                  : 'Enter a valid EVM wallet address (0x + 40 hexadecimal characters).',
              )
            }
            onChange={(event) => {
              event.currentTarget.setCustomValidity('');
              setWallet(event.target.value);
            }}
            placeholder="0x…"
          />
        </label>
        <input
          className="waitlist-trap"
          tabIndex={-1}
          autoComplete="off"
          name="company"
          aria-hidden="true"
        />
        <button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'RESERVING…' : 'REQUEST EARLY ACCESS'}
          <span>↗</span>
        </button>
      </div>
      <p className={`waitlist-message${state === 'error' ? ' is-error' : ''}`} role="status">
        {message}
      </p>
    </form>
  );
}

export function PreviewGate({ active }: { active: boolean }) {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!active) {
      setLocked(false);
      return;
    }
    const lock = () => {
      setLocked(true);
      window.dispatchEvent(new Event('omnia:preview-lock'));
    };
    setLocked(false);
    const timer = window.setTimeout(lock, PREVIEW_MS);
    return () => window.clearTimeout(timer);
  }, [active]);
  if (!active || !locked) return null;
  return (
    <div
      className="preview-gate"
      role="dialog"
      aria-modal="true"
      aria-describedby="preview-gate-copy"
    >
      <div className="preview-gate-backdrop" />
      <section>
        <p className="waitlist-eyebrow">EARLY ACCESS</p>
        <p className="preview-gate-copy" id="preview-gate-copy">
          OMNIA is in private beta. Join the waitlist to be among the first inside.
        </p>
        <WaitlistForm source="panel" />
      </section>
    </div>
  );
}

export function PrivateAccess() {
  const identity = useIdentity();
  const action = () => (identity.authenticated ? identity.link('wallet') : identity.login());
  return (
    <section className="private-access" aria-labelledby="private-access-title">
      <p className="waitlist-eyebrow">SECURE ACCESS</p>
      <h1 id="private-access-title">Enter your workspace.</h1>
      <p>Continue with the wallet assigned to this private beta.</p>
      <button disabled={!identity.configured || !!identity.pending} onClick={action}>
        {identity.pending ? 'VERIFYING…' : 'CONTINUE WITH WALLET'}
        <span>↗</span>
      </button>
      {identity.error && <small role="alert">{identity.error}</small>}
    </section>
  );
}
