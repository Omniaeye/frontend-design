import { matchRules } from './rules.js';
import { PRESETS } from './catalog.js';
import { SOUNDS, SOUND_LABELS } from './sounds.js';
import { eventCategories, typeLabel, matchesCategory, movePanel } from './categories.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount } from '../account/AccountProvider';
import { useIdentity } from '../account/identity';
import { EventStream } from '../components/EventStream';
import { CompanyLogo } from '../components/CompanyLogo';
import { useLiveTop } from '../components/useLiveTop';
import { TokenCards } from '../tokens/Tokens';
import type { ProductRepository, ProductEvent } from '../data/repository.js';
import {
  normalizeTerminal,
  panel,
  standard,
  newItems,
  type Panel,
  type TerminalState,
} from './model.js';
import './terminal.css';

let audio: AudioContext | undefined;
async function play(p: Panel, custom: string) {
  if (p.sound === 'off') return;
  audio ??= new AudioContext();
  await audio.resume();
  if (p.sound === 'custom') {
    if (!custom) throw Error('Choose an audio file.');
    const bytes = Uint8Array.from(atob(custom.split(',')[1]), (c) => c.charCodeAt(0));
    const buffer = await audio.decodeAudioData(bytes.buffer);
    const source = audio.createBufferSource(),
      gain = audio.createGain();
    source.buffer = buffer;
    gain.gain.value = p.volume;
    source.connect(gain);
    gain.connect(audio.destination);
    source.start();
    source.stop(audio.currentTime + Math.min(buffer.duration, 10));
    return;
  }
  const tones = SOUNDS[p.sound] || SOUNDS.pulse;
  tones.forEach((hz, i) => {
    const oscillator = audio!.createOscillator(),
      gain = audio!.createGain(),
      at = audio!.currentTime + i * 0.12;
    oscillator.type = 'sine';
    oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(p.volume * 0.15, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.35);
    oscillator.connect(gain);
    gain.connect(audio!.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.36);
  });
}
function Gear() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="m9 3-1 3-3 1 1 4-2 2 2 3 3-1 2 3h3l1-3 3-1-1-4 2-2-2-3-3 1-2-3Z" />
      <circle cx="11.5" cy="10.5" r="3" />
    </svg>
  );
}
type Props = { repo: ProductRepository; feedRepo: ProductRepository; following: string[] };
export function Terminal({ repo, feedRepo, following }: Props) {
  const account = useAccount(),
    identity = useIdentity(),
    [params, setParams] = useSearchParams();
  const state = useMemo(
    () => normalizeTerminal(account.settings.terminal),
    [account.settings.terminal],
  );
  const workspaceId = params.get('workspace') || state.active,
    workspace = state.workspaces.find((w) => w.id === workspaceId) || state.workspaces[0];
  const detached = params.get('panel'),
    [editing, setEditing] = useState<Panel | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [muted, setMuted] = useState(true),
    [layoutName, setLayoutName] = useState(''),
    [manage, setManage] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const scope = `omnia-terminal:${identity.profile.id || 'local'}`;
  useEffect(() => {
    const c = new BroadcastChannel(scope);
    channel.current = c;
    c.onmessage = () => {
      void account.refresh().catch(() => {});
    };
    return () => {
      c.close();
      channel.current = null;
    };
  }, [scope]);
  async function commit(change: (s: TerminalState) => TerminalState) {
    setBusy(true);
    setError('');
    try {
      const fresh = identity.authenticated
        ? await account.request<{ settings: typeof account.settings }>('/me')
        : { settings: account.settings };
      const next = normalizeTerminal(change(normalizeTerminal(fresh.settings.terminal)));
      if (JSON.stringify(next).length > 180000)
        throw Error('Workspace storage is full. Remove unused presets or custom audio.');
      await account.save({ ...fresh.settings, terminal: next });
      channel.current?.postMessage('updated');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save workspace.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  function replacePanel(p: Panel) {
    return commit((s) => ({
      ...s,
      workspaces: s.workspaces.map((w) =>
        w.id === workspace.id
          ? { ...w, panels: w.panels.map((old) => (old.id === p.id ? p : old)) }
          : w,
      ),
    }));
  }
  function openWindow(p: Panel) {
    const q = new URLSearchParams({ popout: '1', workspace: workspace.id, panel: p.id });
    let geometry = 'width=640,height=850';
    try {
      const g = JSON.parse(localStorage.getItem(`${scope}:window:${p.id}`) || 'null');
      if (g)
        geometry = `width=${Math.max(360, Math.min(1600, g.width))},height=${Math.max(400, Math.min(1400, g.height))},left=${Number(g.left) || 0},top=${Number(g.top) || 0}`;
    } catch {}
    const win = window.open(
      `${location.origin}${location.pathname}${location.search}#/feed?${q}`,
      `omnia-panel-${workspace.id}-${p.id}`,
      `popup=yes,${geometry},resizable=yes,scrollbars=yes`,
    );
    if (!win) setError('Allow popups to open this panel.');
    else {
      const timer = setInterval(() => {
        if (win.closed) {
          localStorage.removeItem(popupKey(p.id));
          setPopupTick((x) => x + 1);
          clearInterval(timer);
        }
      }, 1500);
    }
  }
  useEffect(() => {
    if (!detached) return;
    const save = () =>
      localStorage.setItem(
        `${scope}:window:${detached}`,
        JSON.stringify({ width: outerWidth, height: outerHeight, left: screenX, top: screenY }),
      );
    window.addEventListener('pagehide', save);
    window.addEventListener('resize', save);
    return () => {
      save();
      window.removeEventListener('pagehide', save);
      window.removeEventListener('resize', save);
    };
  }, [scope, detached]);
  const [popupTick, setPopupTick] = useState(0),
    returned = useRef(false);
  const popupKey = (id: string) => `${scope}:popup:${workspace.id}:${id}`;
  useEffect(() => {
    returned.current = false;
    if (!detached) {
      const update = () => setPopupTick((x) => x + 1);
      const timer = setInterval(update, 1500);
      window.addEventListener('storage', update);
      return () => {
        clearInterval(timer);
        window.removeEventListener('storage', update);
      };
    }
    const key = popupKey(detached),
      beat = () => {
        if (!returned.current) localStorage.setItem(key, String(Date.now()));
      };
    const release = () => localStorage.removeItem(key);
    beat();
    const timer = setInterval(beat, 2000);
    window.addEventListener('pagehide', release);
    return () => {
      clearInterval(timer);
      release();
      window.removeEventListener('pagehide', release);
    };
  }, [scope, workspace.id, detached]);
  function returnPanel() {
    returned.current = true;
    if (detached) localStorage.removeItem(popupKey(detached));
    window.close();
    setParams(new URLSearchParams({ workspace: workspace.id }));
  }
  function removePanel(id: string) {
    void commit((s) => ({
      ...s,
      workspaces: s.workspaces.map((w) =>
        w.id === workspace.id ? { ...w, panels: w.panels.filter((p) => p.id !== id) } : w,
      ),
    }));
  }
  const visible = detached
    ? workspace.panels.filter((p) => p.id === detached)
    : workspace.panels.filter((p) => {
        try {
          return Date.now() - Number(localStorage.getItem(popupKey(p.id)) || 0) > 120000;
        } catch {
          return true;
        }
      });
  return (
    <div className="terminal page">
      {!detached && (
        <header className="terminal-toolbar">
          <select
            aria-label="Workspace"
            value={workspace.id}
            disabled={busy}
            onChange={(e) => {
              const active = e.target.value;
              void commit((s) => ({ ...s, active }));
            }}
          >
            {state.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            title="Manage workspaces"
            aria-label="Manage workspaces"
            onClick={() => {
              setManage(!manage);
              setLayoutName(workspace.name);
            }}
          >
            <Gear />
          </button>
          <span />
          <button
            disabled={busy}
            onClick={() =>
              void commit((s) => ({
                ...s,
                workspaces: s.workspaces.map((w) =>
                  w.id === workspace.id
                    ? {
                        ...w,
                        panels: [
                          ...w.panels,
                          panel({ id: crypto.randomUUID(), name: 'Latest news' }),
                        ],
                      }
                    : w,
                ),
              }))
            }
          >
            + Panel
          </button>
          <button
            aria-pressed={!muted}
            title={muted ? 'Enable sound in this window' : 'Mute this window'}
            onClick={() => {
              audio ??= new AudioContext();
              void audio.resume();
              setMuted(!muted);
            }}
          >
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </header>
      )}
      {detached && (
        <button
          className="terminal-window-sound"
          onClick={() => {
            audio ??= new AudioContext();
            void audio.resume();
            setMuted(!muted);
          }}
        >
          {muted ? 'Enable sound' : 'Mute'}
        </button>
      )}
      {manage && (
        <div className="terminal-manage">
          <input
            aria-label="Workspace name"
            maxLength={80}
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
          />
          <button
            disabled={busy || !layoutName.trim()}
            onClick={() =>
              void commit((s) => ({
                ...s,
                workspaces: s.workspaces.map((w) =>
                  w.id === workspace.id ? { ...w, name: layoutName.trim() } : w,
                ),
              }))
            }
          >
            Rename
          </button>
          <button
            disabled={busy || !layoutName.trim()}
            onClick={() =>
              void commit((s) => {
                const id = crypto.randomUUID();
                return {
                  ...s,
                  active: id,
                  workspaces: [
                    ...s.workspaces,
                    {
                      ...workspace,
                      id,
                      name: layoutName.trim(),
                      panels: workspace.panels.map((p) => ({ ...p, id: crypto.randomUUID() })),
                    },
                  ],
                };
              })
            }
          >
            Save as new
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void commit((s) => {
                const id = crypto.randomUUID();
                return {
                  ...s,
                  active: id,
                  workspaces: [
                    ...s.workspaces,
                    {
                      ...standard().workspaces[0],
                      id,
                      name: 'Standard',
                      panels: standard().workspaces[0].panels.map((p) => ({
                        ...p,
                        id: crypto.randomUUID(),
                      })),
                    },
                  ],
                };
              })
            }
          >
            Add standard
          </button>
          <button
            disabled={busy || state.workspaces.length === 1}
            onClick={() =>
              void commit((s) => {
                const workspaces = s.workspaces.filter((w) => w.id !== workspace.id);
                return { ...s, active: workspaces[0].id, workspaces };
              })
            }
          >
            Delete workspace
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <div className={`terminal-grid${detached ? ' terminal-grid--single' : ''}`}>
        {visible.map((p, index) => (
          <PanelShell
            key={p.id}
            id={`${scope}:${workspace.id}:${p.id}`}
            media={p.media}
            detached={!!detached}
          >
            <header>
              <h2>{p.name}</h2>
              <div>
                {!detached ? (
                  <>
                    {([-1, 1] as const).map((direction) => (
                      <button
                        key={direction}
                        disabled={
                          busy || (direction < 0 ? index === 0 : index === visible.length - 1)
                        }
                        title={direction < 0 ? 'Move left' : 'Move right'}
                        aria-label={`Move ${p.name} ${direction < 0 ? 'left' : 'right'}`}
                        onClick={() =>
                          void commit((s) => ({
                            ...s,
                            workspaces: s.workspaces.map((w) =>
                              w.id === workspace.id
                                ? {
                                    ...w,
                                    panels: movePanel(
                                      w.panels,
                                      p.id,
                                      w.panels.findIndex(
                                        (x) => x.id === visible[index + direction]?.id,
                                      ) - w.panels.findIndex((x) => x.id === p.id),
                                    ),
                                  }
                                : w,
                            ),
                          }))
                        }
                      >
                        {direction < 0 ? '←' : '→'}
                      </button>
                    ))}
                    <button
                      title="Open in window"
                      aria-label={`Open ${p.name} in window`}
                      onClick={() => openWindow(p)}
                    >
                      ↗
                    </button>
                  </>
                ) : (
                  <button
                    title="Return to workspace"
                    aria-label="Return to workspace"
                    onClick={returnPanel}
                  >
                    ↙
                  </button>
                )}
                <button
                  title="Configure"
                  aria-label={`Configure ${p.name}`}
                  onClick={() => setEditing(structuredClone(p))}
                >
                  <Gear />
                </button>
                <button
                  title="Remove panel"
                  aria-label={`Remove ${p.name}`}
                  disabled={busy}
                  onClick={() => removePanel(p.id)}
                >
                  ×
                </button>
              </div>
            </header>
            <div className="terminal-panel-body">
              <PanelContent
                key={JSON.stringify(p)}
                p={p}
                repo={repo}
                feedRepo={feedRepo}
                following={following}
                muted={muted}
                custom={p.soundData || state.soundData}
                scope={scope}
                onError={setError}
              />
            </div>
          </PanelShell>
        ))}
      </div>
      {!visible.length && <p>{detached ? 'This panel was removed.' : 'Add a panel to start.'}</p>}
      {editing && (
        <PanelEditor
          key={editing.id}
          initial={editing}
          repo={repo}
          feedRepo={feedRepo}
          following={following}
          state={state}
          busy={busy}
          close={() => setEditing(null)}
          onTest={(p) => play(p, p.soundData || state.soundData).catch((e) => setError(e.message))}
          onApply={async (p) => {
            if (await replacePanel(p)) setEditing(null);
          }}
          onUpload={async (file) => {
            if (file.size > 65000) throw Error('Choose an audio file under 64 KB.');
            const data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            if (!normalizeTerminal({ ...state, soundData: data }).soundData)
              throw Error('Use MP3, WAV, OGG, M4A or WebM audio.');
            return data;
          }}
          onPreset={(p) =>
            commit((s) => ({ ...s, presets: [...s.presets, { ...p, id: crypto.randomUUID() }] }))
          }
          onDeletePreset={(id) =>
            commit((s) => ({ ...s, presets: s.presets.filter((p) => p.id !== id) }))
          }
          onDuplicate={async (p) => {
            const id = crypto.randomUUID();
            if (
              await commit((s) => ({
                ...s,
                workspaces: s.workspaces.map((w) =>
                  w.id === workspace.id
                    ? { ...w, panels: [...w.panels, { ...p, id, name: p.name }] }
                    : w,
                ),
              }))
            ) {
              setEditing(null);
              if (detached) {
                const q = new URLSearchParams(params);
                q.set('panel', id);
                setParams(q);
              }
            }
          }}
          onRemove={async () => {
            if (
              await commit((s) => ({
                ...s,
                workspaces: s.workspaces.map((w) =>
                  w.id === workspace.id
                    ? { ...w, panels: w.panels.filter((p) => p.id !== editing.id) }
                    : w,
                ),
              }))
            )
              setEditing(null);
          }}
        />
      )}
    </div>
  );
}
function PanelShell({
  id,
  media,
  detached,
  children,
}: {
  id: string;
  media: string;
  detached: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const key = id + ':size';
  useEffect(() => {
    if (detached) return;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && ref.current) {
        ref.current.style.width = Math.max(290, Math.min(1600, saved.width)) + 'px';
        ref.current.style.height = Math.max(400, Math.min(1800, saved.height)) + 'px';
        ref.current.style.flex = '0 0 auto';
      }
    } catch {}
  }, [key, detached]);
  return (
    <section
      ref={ref}
      className={`terminal-panel terminal-media--${media}`}
      onPointerUp={() => {
        if (!ref.current?.style.width || detached) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.flex = '0 0 auto';
        localStorage.setItem(key, JSON.stringify({ width: r.width, height: r.height }));
      }}
    >
      {children}
    </section>
  );
}
function PanelContent({
  p,
  repo,
  feedRepo,
  following,
  muted,
  custom,
  scope,
  onError,
  explain = false,
}: {
  explain?: boolean;
  p: Panel;
  repo: ProductRepository;
  feedRepo: ProductRepository;
  following: string[];
  muted: boolean;
  custom: string;
  scope: string;
  onError: (s: string) => void;
}) {
  const { request } = useAccount(),
    [limit, setLimit] = useState(40),
    [tokens, setTokens] = useState<any>(null),
    [error, setError] = useState('');
  const ids =
    p.companies ?? (p.coverage === 'all' ? repo.listCompanies().map((c) => c.id) : following);
  const query = new URLSearchParams();
  if (p.companies !== null || p.coverage !== 'all')
    ids.forEach((id) => query.append('company', id));
  p.platforms.forEach((x) => query.append('platform', x));
  p.profiles.forEach((x) => query.append('profile', x));
  p.types.forEach((x) => query.append('type', x));
  p.categories.forEach((x) => query.append('category', x));
  p.reddit.forEach((x) => query.append('reddit', x));
  if (p.query) query.set('q', p.query);
  query.set(
    'rules',
    JSON.stringify({
      relationship: p.relationship,
      topicWords: p.topicWords,
      allWords: p.allWords,
      anyWords: p.anyWords,
      phrases: p.phrases,
      notWords: p.notWords,
      searchFields: p.searchFields,
      matchScope: p.matchScope,
      mediaFilter: p.mediaFilter,
    }),
  );
  const globalMode = p.kind === 'news' && p.coverage === 'all';
  const [globalPage, setGlobalPage] = useState<any>(null);
  const searchQuery = query.toString();
  useEffect(() => {
    if (!globalMode) return;
    let active = true,
      running = false;
    const load = async () => {
      if (running) return;
      running = true;
      try {
        let result: any = await request(`/search?${searchQuery}`);
        const found = [...result.items];
        let cursor = result.nextCursor;
        let pages = 0;
        while (
          cursor &&
          (pages < Math.ceil(limit / 40) - 1 || !found.length) &&
          pages++ < Math.max(3, Math.ceil(limit / 40))
        ) {
          result = await request(`/search?${searchQuery}&cursor=${encodeURIComponent(cursor)}`);
          found.push(...result.items);
          cursor = result.nextCursor;
        }
        if (active) {
          setGlobalPage({ ...result, items: found, nextCursor: cursor });
          setError('');
        }
      } catch {
        if (active) setError('Could not load results.');
      } finally {
        running = false;
      }
    };
    setGlobalPage(null);
    void load();
    const refresh = () => {
      if (!document.hidden) void load();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('omnia-live-update', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('omnia-live-update', refresh);
    };
  }, [globalMode, searchQuery, limit, request]);
  const top = useLiveTop(p.kind === 'top' && !!ids.length, query.toString());
  const base =
    p.coverage !== 'all' && p.companies === null && !p.platforms.length && !p.profiles.length
      ? feedRepo
      : repo;
  const page = useMemo(() => {
    let cursor: string | undefined;
    const items: ProductEvent[] = [];
    let total = 0;
    do {
      const batch = base.queryEvents({
        companyIds: p.coverage === 'all' && p.companies === null ? undefined : ids,
        platforms: p.platforms.length ? p.platforms : undefined,
        profileIds: p.profiles.length ? p.profiles : undefined,
        eventTypes: p.types.length ? p.types : undefined,
        redditViews: p.reddit.length ? (p.reddit as any) : undefined,
        query: p.query,
        requirePublication: true,
        limit: 200,
        cursor,
      });
      items.push(...batch.items);
      total = batch.total;
      cursor = batch.nextCursor || undefined;
    } while (cursor);
    return { items, total };
  }, [base, JSON.stringify(p), following.join(',')]);
  useEffect(() => {
    if (p.kind !== 'tokens') return;
    let active = true,
      running = false;
    const load = async () => {
      if (running || document.hidden) return;
      if (!ids.length) {
        setTokens({ items: [], total: 0 });
        return;
      }
      running = true;
      try {
        const q = new URLSearchParams();
        ids.forEach((id) => q.append('company', id));
        let result: any = await request(`/tokens?${q}&limit=50`);
        const items = [...result.items];
        let cursor = result.nextCursor;
        while (cursor && items.length < limit) {
          result = await request(`/tokens?${q}&limit=50&cursor=${encodeURIComponent(cursor)}`);
          items.push(...result.items);
          cursor = result.nextCursor;
        }
        if (active) {
          setTokens({ ...result, items, nextCursor: cursor });
          setError('');
        }
      } catch {
        if (active) setError('Could not update tokens.');
      } finally {
        running = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    window.addEventListener('omnia-live-update', load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('omnia-live-update', load);
    };
  }, [p.kind, ids.join(','), limit, request]);
  const source =
    p.kind === 'tokens'
      ? tokens?.items
      : p.kind === 'top'
        ? top.page?.items
        : globalMode
          ? globalPage?.items
          : page.items;
  const terms = p.exclude
    .toLowerCase()
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const filtered = useMemo(
    () =>
      (source || []).filter((e: any) => {
        const text = [e.title, e.body, e.name, e.ticker, e.description].join(' ').toLowerCase();
        return (
          matchRules(p.kind === 'tokens' ? { ...e, kind: 'token' } : e, p).matched &&
          (p.kind === 'tokens' || matchesCategory(e, p.categories)) &&
          !terms.some((x) => text.includes(x)) &&
          (p.kind !== 'tokens' || !p.query || text.includes(p.query.toLowerCase()))
        );
      }),
    [source, JSON.stringify(p)],
  );
  const seen = useRef<Set<string> | null>(null),
    last = useRef(0),
    born = useRef(Date.now());
  useEffect(() => {
    if (!source) return;
    const result = newItems(seen.current, filtered);
    seen.current = new Set([...(seen.current || []), ...result.ids]);
    const fresh = result.fresh.filter((e: any) => {
      const item = filtered.find((x: any) => x.id === e.id);
      const stamp = Date.parse(
        item.hotActivityAt || item.createdAt || item.publishedAt || item.observedAt || '',
      );
      return stamp >= born.current;
    });
    if (
      muted ||
      p.sound === 'off' ||
      !fresh.length ||
      Date.now() - last.current < p.cooldown * 1000
    )
      return;
    const key = `${scope}:alert:${p.id}:${fresh[0].id}`;
    void navigator.locks.request(key, async () => {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, String(Date.now()));
      last.current = Date.now();
      try {
        await play(p, custom);
      } catch {
        onError('Enable sound in this window to hear alerts.');
      }
    });
  }, [source, muted, p.sound]);
  if (error || top.error) return <p role="alert">{error || top.error}</p>;
  if (!source && (p.kind !== 'news' || globalMode)) return <p role="status">Loading…</p>;
  const items = filtered.slice(0, limit);
  return (
    <>
      {p.kind === 'tokens' ? (
        <TokenCards items={items} companies={repo.listCompanies()} />
      ) : (
        <>
          {explain ? (
            items.map((e: any) => (
              <div key={e.id}>
                <p className="preset-match-reason">{matchRules(e, p).reason}</p>
                <EventStream
                  repo={repo}
                  page={{ items: [e], total: 1, nextCursor: null }}
                  compact
                  hideFooter
                />
              </div>
            ))
          ) : (
            <EventStream
              repo={repo}
              page={{ items: items as ProductEvent[], total: filtered.length, nextCursor: null }}
              compact
              hideFooter
            />
          )}
        </>
      )}
      {!items.length && <p>No matching items.</p>}
      {(filtered.length > limit ||
        (p.kind === 'tokens' && tokens?.nextCursor) ||
        (globalMode && globalPage?.nextCursor)) && (
        <button className="button-secondary" onClick={() => setLimit((n) => n + 40)}>
          Load more
        </button>
      )}
    </>
  );
}
function PanelEditor({
  initial,
  repo,
  feedRepo,
  following,
  state,
  busy,
  close,
  onApply,
  onTest,
  onUpload,
  onPreset,
  onDeletePreset,
  onDuplicate,
  onRemove,
}: {
  initial: Panel;
  repo: ProductRepository;
  feedRepo: ProductRepository;
  following: string[];
  state: TerminalState;
  busy: boolean;
  close: () => void;
  onApply: (p: Panel) => void;
  onTest: (p: Panel) => void;
  onUpload: (f: File) => Promise<string>;
  onPreset: (p: Panel) => Promise<boolean>;
  onDeletePreset: (id: string) => Promise<boolean>;
  onDuplicate: (p: Panel) => void;
  onRemove: () => void;
}) {
  const [browse, setBrowse] = useState(false),
    [presetSearch, setPresetSearch] = useState(''),
    [presetCategory, setPresetCategory] = useState('All'),
    [preview, setPreview] = useState(false);
  const [p, set] = useState(initial),
    [companySearch, setCompanySearch] = useState(''),
    [profileSearch, setProfileSearch] = useState(''),
    [error, setError] = useState(''),
    [presetId, setPresetId] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const patch = (v: Partial<Panel>) => set((old) => ({ ...old, ...v }));
  const choose = (key: 'platforms' | 'types' | 'profiles' | 'reddit', id: string) =>
    patch({ [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id] });
  const companies = repo.listCompanies(),
    profiles = repo
      .listProfiles({})
      .filter(
        (x) =>
          (!p.platforms.length || p.platforms.includes(x.platform)) &&
          (p.companies === null || x.companyIds.some((id) => p.companies!.includes(id))) &&
          `${x.label} ${x.url}`.toLowerCase().includes(profileSearch.toLowerCase()),
      );
  const groups = useMemo(() => {
    const result: ProductEvent[] = [];
    let cursor: string | undefined;
    do {
      const batch = repo.queryEvents({ limit: 200, cursor });
      result.push(...batch.items);
      cursor = batch.nextCursor || undefined;
    } while (cursor);
    return eventCategories(result, repo.platforms);
  }, [repo]);
  return (
    <dialog ref={dialog} className="terminal-editor" onCancel={close}>
      <header>
        <h2>Panel settings</h2>
        <button onClick={close} aria-label="Close panel settings">
          ×
        </button>
      </header>
      <div className="terminal-editor-fields">
        <label>
          Name
          <input value={p.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} />
        </label>
        <div className="terminal-preset">
          <button onClick={() => setBrowse(!browse)}>Browse presets</button>
          <select
            aria-label="Panel preset"
            value={presetId}
            onChange={(e) => {
              setPresetId(e.target.value);
              const saved = state.presets.find((x) => x.id === e.target.value);
              if (saved) set({ ...saved, id: p.id });
            }}
          >
            <option value="">Custom</option>
            {state.presets.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <button disabled={busy} onClick={() => void onPreset(p)}>
            Save preset
          </button>
          {presetId && (
            <button
              disabled={busy}
              onClick={() => void onDeletePreset(presetId).then(() => setPresetId(''))}
            >
              Delete preset
            </button>
          )}
        </div>
        {browse && (
          <section className="preset-browser" aria-label="Preset library">
            <input
              aria-label="Search presets"
              placeholder="Search presets"
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
            />
            <nav aria-label="Preset categories">
              {['All', ...new Set(PRESETS.map((x) => x.category)), 'My presets'].map((c) => (
                <button
                  key={c}
                  aria-pressed={presetCategory === c}
                  onClick={() => setPresetCategory(c)}
                >
                  {c}
                </button>
              ))}
            </nav>
            <div className="preset-cards">
              {[
                ...PRESETS,
                ...state.presets.map((x) => ({
                  id: x.id,
                  name: x.name,
                  description: 'Saved configuration',
                  category: 'My presets',
                  panel: x,
                })),
              ]
                .filter(
                  (x) =>
                    (presetCategory === 'All' || x.category === presetCategory) &&
                    `${x.name} ${x.description}`.toLowerCase().includes(presetSearch.toLowerCase()),
                )
                .map((x) => (
                  <button
                    key={x.id}
                    onClick={() => {
                      set({ ...x.panel, id: p.id });
                      setPresetId('');
                      setBrowse(false);
                      setPreview(true);
                    }}
                  >
                    <small>{x.category}</small>
                    <strong>{x.name}</strong>
                  </button>
                ))}
            </div>
          </section>
        )}
        <label>
          Content
          <select
            value={p.kind}
            onChange={(e) =>
              patch({
                kind: e.target.value as Panel['kind'],
                searchFields: e.target.value === 'tokens' ? ['token'] : ['text'],
                relationship: e.target.value === 'tokens' ? 'any' : p.relationship,
              })
            }
          >
            <option value="news">Latest news</option>
            <option value="top">Top today</option>
            <option value="tokens">Tokens</option>
          </select>
        </label>
        <label>
          Coverage
          <select
            value={p.coverage}
            onChange={(e) =>
              patch({ coverage: e.target.value as Panel['coverage'], companies: null })
            }
          >
            <option value="following">Following</option>
            <option value="all">All collected content</option>
          </select>
        </label>
        {p.kind !== 'tokens' && (
          <label>
            Token relationship
            <select
              value={p.relationship}
              onChange={(e) => patch({ relationship: e.target.value as Panel['relationship'] })}
            >
              <option value="any">Any collected content</option>
              <option value="linked">Linked by Robinhood tokens</option>
              <option value="shared">Linked by 2+ Robinhood tokens</option>
            </select>
          </label>
        )}
        <details>
          <summary>
            Companies ·{' '}
            {p.companies === null
              ? p.coverage === 'all'
                ? 'All'
                : 'Following'
              : p.companies.length}
          </summary>
          <label>
            <input
              type="checkbox"
              checked={p.companies === null && p.coverage === 'following'}
              onChange={(e) =>
                patch({
                  companies: e.target.checked ? null : companies.map((c) => c.id),
                  coverage: e.target.checked ? 'following' : p.coverage,
                })
              }
            />
            Use following
          </label>
          {p.companies !== null && (
            <>
              <input
                placeholder="Search companies"
                aria-label="Search panel companies"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
              />
              <div>
                <button onClick={() => patch({ companies: companies.map((c) => c.id) })}>
                  All
                </button>
                <button onClick={() => patch({ companies: [] })}>None</button>
              </div>
              <div className="terminal-options">
                {companies
                  .filter((c) =>
                    `${c.name} ${c.ticker}`.toLowerCase().includes(companySearch.toLowerCase()),
                  )
                  .map((c) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={p.companies!.includes(c.id)}
                        onChange={() =>
                          patch({
                            companies: p.companies!.includes(c.id)
                              ? p.companies!.filter((id) => id !== c.id)
                              : [...p.companies!, c.id],
                          })
                        }
                      />
                      <CompanyLogo company={c} />
                      {c.ticker}
                      <small>{c.name}</small>
                    </label>
                  ))}
              </div>
            </>
          )}
        </details>
        {p.kind !== 'tokens' && (
          <>
            <details>
              <summary>Platforms · {p.platforms.length || 'All'}</summary>
              <div className="terminal-options">
                {repo.platforms
                  .filter((x) => !['tokens', 'people'].includes(x.id))
                  .map((x) => (
                    <label key={x.id}>
                      <input
                        type="checkbox"
                        checked={p.platforms.includes(x.id)}
                        onChange={() => choose('platforms', x.id)}
                      />
                      {x.label}
                    </label>
                  ))}
              </div>
            </details>
            <details>
              <summary>Profiles · {p.profiles.length || 'All'}</summary>
              <input
                placeholder="Search profiles"
                aria-label="Search panel profiles"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
              />
              <button onClick={() => patch({ profiles: [] })}>All profiles</button>
              <div className="terminal-options">
                {profiles.slice(0, 150).map((x) => (
                  <label key={x.id}>
                    <input
                      type="checkbox"
                      checked={p.profiles.includes(x.id)}
                      onChange={() => choose('profiles', x.id)}
                    />
                    {x.label}
                    <small>{x.platform}</small>
                  </label>
                ))}
              </div>
            </details>
            <details>
              <summary>Event types · {p.categories.length || p.types.length || 'All'}</summary>
              <button onClick={() => patch({ categories: [], types: [], reddit: [] })}>
                All events
              </button>
              {groups
                .filter((g) => !p.platforms.length || p.platforms.includes(g.id))
                .map((g) => (
                  <details key={g.id}>
                    <summary>{g.label}</summary>
                    <div className="terminal-options">
                      {[
                        ...g.types,
                        ...(g.id === 'reddit' ? ['@new', '@hot', '@rising', '@top'] : []),
                      ].map((type) => {
                        const key = `${g.id}:${type}`;
                        return (
                          <label key={key}>
                            <input
                              type="checkbox"
                              checked={p.categories.includes(key)}
                              onChange={() =>
                                patch({
                                  types: [],
                                  reddit: [],
                                  categories: p.categories.includes(key)
                                    ? p.categories.filter((x) => x !== key)
                                    : [...p.categories, key],
                                })
                              }
                            />
                            {g.label} ·{' '}
                            {type.startsWith('@') ? typeLabel(type.slice(1)) : typeLabel(type)}
                          </label>
                        );
                      })}
                    </div>
                  </details>
                ))}
            </details>
          </>
        )}
        <fieldset className="keyword-rules">
          <legend>Keywords</legend>
          {(
            [
              ['topicWords', 'Topic · any word'],
              ['allWords', 'All words'],
              ['anyWords', 'Any word'],
              ['phrases', 'Exact phrases'],
              ['notWords', 'Exclude words'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={p[key]}
                placeholder="Comma-separated"
                maxLength={300}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </label>
          ))}
          <details>
            <summary>Search fields</summary>
            {(p.kind === 'tokens'
              ? [['token', 'Token name, symbol and description']]
              : [
                  ['text', 'Post text'],
                  ['context', 'Quoted and replied-to posts'],
                  ['author', 'Author name and handle'],
                ]
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={p.searchFields.includes(key)}
                  onChange={() =>
                    patch({
                      searchFields: p.searchFields.includes(key)
                        ? p.searchFields.filter((x) => x !== key)
                        : [...p.searchFields, key],
                    })
                  }
                />
                {label}
              </label>
            ))}
            <label>
              Match across
              <select
                value={p.matchScope}
                onChange={(e) => patch({ matchScope: e.target.value as Panel['matchScope'] })}
              >
                <option value="same">Same content field</option>
                <option value="across">Selected content fields</option>
              </select>
            </label>
          </details>
        </fieldset>
        <label>
          Required media
          <select
            value={p.mediaFilter}
            onChange={(e) => patch({ mediaFilter: e.target.value as Panel['mediaFilter'] })}
          >
            <option value="all">Any</option>
            <option value="any">Image or video</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </label>
        <details>
          <summary>Legacy text filters</summary>
          <label>
            Search
            <input value={p.query} onChange={(e) => patch({ query: e.target.value })} />
          </label>
          <label>
            Exclude
            <input
              placeholder="Comma-separated words"
              value={p.exclude}
              onChange={(e) => patch({ exclude: e.target.value })}
            />
          </label>
        </details>
        <label>
          Media
          <select
            value={p.media}
            onChange={(e) => patch({ media: e.target.value as Panel['media'] })}
          >
            <option value="compact">Compact</option>
            <option value="full">Full</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label>
          Sound
          <select
            value={p.sound}
            onChange={(e) => patch({ sound: e.target.value as Panel['sound'] })}
          >
            {['off', ...Object.keys(SOUNDS), 'custom'].map((x) => (
              <option key={x} value={x}>
                {SOUND_LABELS[x] || x[0].toUpperCase() + x.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {p.sound !== 'off' && (
          <>
            <label>
              Volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={p.volume}
                onChange={(e) => patch({ volume: Number(e.target.value) })}
              />
            </label>
            <label>
              Minimum interval
              <select
                value={p.cooldown}
                onChange={(e) => patch({ cooldown: Number(e.target.value) })}
              >
                {[5, 15, 30, 60, 300].map((n) => (
                  <option key={n} value={n}>
                    {n} seconds
                  </option>
                ))}
              </select>
            </label>
            {p.sound === 'custom' && (
              <label>
                {p.soundName || 'Audio file'}
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      void onUpload(f)
                        .then((data) => patch({ soundData: data, soundName: f.name }))
                        .catch((e) => setError(e.message));
                  }}
                />
                <small>Up to 64 KB</small>
              </label>
            )}
            <button onClick={() => onTest(p)}>Test sound</button>
          </>
        )}
        <button aria-expanded={preview} onClick={() => setPreview(!preview)}>
          {preview ? 'Hide preview' : 'Preview results'}
        </button>
        {preview && (
          <section className="preset-preview" aria-label="Preset preview">
            <PanelContent
              p={p}
              repo={repo}
              feedRepo={feedRepo}
              following={following}
              muted={true}
              custom=""
              scope="preview"
              onError={setError}
            />
          </section>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      <footer>
        <button disabled={busy} onClick={() => onDuplicate({ ...p, name: p.name })}>
          Add panel
        </button>
        <button disabled={busy} onClick={onRemove}>
          Remove
        </button>
        <span />
        <button onClick={close}>Cancel</button>
        <button
          className="button-primary"
          disabled={busy || !p.name.trim() || !p.searchFields.length}
          onClick={() => onApply(panel(p))}
        >
          Apply
        </button>
      </footer>
    </dialog>
  );
}
