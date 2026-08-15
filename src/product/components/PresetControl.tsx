import { useEffect, useRef, useState } from 'react';
import { useAccount } from '../account/AccountProvider';
import { useIdentity } from '../account/identity';
import { PRESETS, applyPreset, capturePreset } from '../presets.js';
import type { TrackingPreferences } from '../tracking-preferences.js';
import './presets.css';

type PresetState = {
  saved: { id: string; name: string; description: string }[];
  selected: string | null;
  customized: boolean;
};
export function PresetControl({
  prefs,
  onApplied,
}: {
  prefs: TrackingPreferences;
  onApplied: (prefs: TrackingPreferences) => void;
}) {
  const account = useAccount(),
    identity = useIdentity();
  const local = () => {
    try {
      return JSON.parse(localStorage.getItem('omnia.guest.coverage') || '{"saved":[]}');
    } catch {
      return { saved: [] };
    }
  };
  const localView = (): PresetState => ({
    saved: local().saved.map((p: any) => ({ ...p, description: '' })),
    selected: prefs.presetChoice || 'advanced',
    customized: false,
  });
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<PresetState | null>(null);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [selected, setSelected] = useState('medium'),
    [name, setName] = useState('');
  const load = async () => {
    const next = identity.authenticated
      ? await account.request<PresetState>('/presets')
      : localView();
    setState(next);
    if (
      next.selected &&
      (PRESETS.some((p) => p.id === next.selected) ||
        next.saved.some((p) => p.id === next.selected))
    )
      setSelected(next.selected);
    return next;
  };
  useEffect(() => {
    if (!identity.authenticated) {
      setState(localView());
      return;
    }
    if (!account.loaded) return;
    let active = true;
    account
      .request<PresetState>('/presets')
      .then((next) => {
        if (active) {
          setState(next);
          if (next.selected) setSelected(next.selected);
        }
      })
      .catch(() => {
        if (active) setError('Could not load presets. Try again.');
      });
    return () => {
      active = false;
    };
  }, [account.loaded, account.request, prefs, account.settings.telegram]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const run = async (action: 'apply' | 'save' | 'delete', id?: string) => {
    setBusy(true);
    setError('');
    try {
      if (!identity.authenticated) {
        const saved = local();
        if (action === 'apply') {
          const preset =
            PRESETS.find((p) => p.id === id) || saved.saved.find((p: any) => p.id === id);
          if (!preset) throw Error('Preset unavailable.');
          const result = applyPreset(
            prefs,
            account.settings,
            preset.config ? { ...preset.config, id: preset.id } : preset,
          );
          await account.save(result.settings);
          onApplied(result.tracking);
          setOpen(false);
        }
        if (action === 'save') {
          saved.saved.push({
            id: crypto.randomUUID(),
            name: name.trim(),
            config: capturePreset(prefs, account.settings),
          });
          localStorage.setItem('omnia.guest.coverage', JSON.stringify(saved));
          setName('');
        }
        if (action === 'delete') {
          saved.saved = saved.saved.filter((p: any) => p.id !== id);
          localStorage.setItem('omnia.guest.coverage', JSON.stringify(saved));
        }
        setState(localView());
        return;
      }
      if (!(await account.syncTracking(prefs)))
        throw new Error('Your current filters could not be synced. Please retry.');
      const result = await account.request<{ tracking?: TrackingPreferences }>('/presets', {
        action,
        id,
        name,
      });
      if (action === 'apply' && result.tracking) {
        onApplied(result.tracking);
        await account.refresh();
        setOpen(false);
      } else {
        setName('');
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your preset.');
    } finally {
      setBusy(false);
    }
  };
  const activeName = state?.customized
    ? 'Custom'
    : PRESETS.find((p) => p.id === prefs.presetChoice)?.label ||
      state?.saved.find((p) => p.id === prefs.presetChoice)?.name ||
      (prefs.presetChoice ? 'Custom' : 'Choose');
  const picked = PRESETS.find((p) => p.id === selected);
  return (
    <>
      <button
        className="preset-trigger"
        onClick={() => {
          setOpen(true);
          void load().catch(() => setError('Could not load presets. Try again.'));
        }}
      >
        Preset <span>{activeName}</span>
      </button>
      <dialog
        ref={dialog}
        className="preset-dialog"
        aria-labelledby="preset-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setOpen(false);
        }}
      >
        <header>
          <div>
            <h2 id="preset-title">Presets</h2>
          </div>
          {
            <button aria-label="Close presets" disabled={busy} onClick={() => setOpen(false)}>
              ×
            </button>
          }
        </header>
        <div className="preset-options" role="radiogroup" aria-label="Coverage preset">
          {PRESETS.map((preset, i) => (
            <button
              key={preset.id}
              role="radio"
              aria-checked={selected === preset.id}
              disabled={busy}
              tabIndex={selected === preset.id || (!picked && i === 0) ? 0 : -1}
              onKeyDown={(e) => {
                if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
                  e.preventDefault();
                  const index = (i + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : 2)) % 3;
                  setSelected(PRESETS[index].id);
                  (e.currentTarget.parentElement?.children[index] as HTMLButtonElement)?.focus();
                }
              }}
              onClick={() => setSelected(preset.id)}
            >
              <small>{preset.name}</small>
              <strong>{preset.label}</strong>
              <p>{preset.description}</p>
              <span aria-hidden="true">{selected === preset.id ? '✓' : ''}</span>
            </button>
          ))}
        </div>
        <section className="personal-presets">
          <h3>
            Your presets <small>{state?.saved.length || 0}/20</small>
          </h3>
          {state?.saved.map((p) => (
            <div className="personal-preset" key={p.id}>
              <button
                disabled={busy}
                aria-pressed={selected === p.id}
                onClick={() => setSelected(p.id)}
              >
                <strong>{p.name}</strong>
                <small>{p.description}</small>
              </button>
              <button
                disabled={busy}
                aria-label={`Delete ${p.name}`}
                onClick={() => {
                  if (
                    window.confirm(`Delete “${p.name}”? Your current settings will stay unchanged.`)
                  )
                    void run('delete', p.id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run('save');
            }}
          >
            <label htmlFor="preset-name">Preset name</label>
            <div>
              <input
                id="preset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="My coverage"
                disabled={busy}
              />
              <button disabled={busy || !name.trim() || (state?.saved.length || 0) >= 20}>
                Save preset
              </button>
            </div>
          </form>
        </section>
        <footer>
          <button
            className="preset-apply"
            disabled={busy || !state}
            onClick={() => void run('apply', selected)}
          >
            {busy ? 'Saving…' : 'Apply preset'}
          </button>
        </footer>
        {error && (
          <p role="alert" className="preset-error">
            {error}
          </p>
        )}
      </dialog>
    </>
  );
}
