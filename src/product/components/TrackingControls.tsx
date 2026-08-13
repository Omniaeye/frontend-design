import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { Company, ProductRepository } from '../data/repository.js';
import {
  getPlatformSelection,
  isCompanyTracked,
  isProfileEnabled,
  listTrackingProfiles,
  setCompaniesTracked,
  setPlatformEnabled,
  setProfileEnabled,
  type TrackingPreferences,
} from '../tracking-preferences.js';
import { CompanyLogo } from './CompanyLogo';
import { PlatformIcon } from './PlatformIcon';
import './tracking-controls.css';

type Channel = 'feed' | 'telegram';
type OpenPanel =
  | {
      kind: 'company';
      companyId: string;
      anchor: HTMLElement;
      focusTarget: HTMLElement;
      pinned: boolean;
      initialFocus: boolean;
    }
  | {
      kind: 'bulk';
      companyIds: string[];
      scopeLabel: string;
      anchor: HTMLElement;
      focusTarget: HTMLElement;
      pinned: boolean;
      initialFocus: boolean;
    };
type TrackingContextValue = {
  repo: ProductRepository;
  prefs: TrackingPreferences;
  onChange: (prefs: TrackingPreferences) => void;
  panel: OpenPanel | null;
  openCompany: (companyId: string, anchor: HTMLElement, pinned: boolean) => void;
  openBulk: (companyIds: string[], scopeLabel: string, anchor: HTMLElement) => void;
  scheduleCompany: (companyId: string, anchor: HTMLElement) => void;
  scheduleClose: () => void;
  keepOpen: () => void;
  pin: () => void;
  close: (restoreFocus?: boolean) => void;
};

const TrackingContext = createContext<TrackingContextValue | null>(null);
const categoryOrder = ['reddit', 'web', 'x', 'news', 'filings', 'youtube', 'people', 'github'];
const labels: Record<string, string> = {
  reddit: 'Reddit',
  web: 'Website',
  x: 'X',
  news: 'News',
  filings: 'Filings',
  youtube: 'YouTube',
  people: 'People',
  github: 'GitHub',
};

export function useTracking() {
  const context = useContext(TrackingContext);
  if (!context) throw new Error('Tracking controls must be rendered inside TrackingProvider.');
  return context;
}

function Mark({
  name,
  size = 14,
}: {
  name: 'plus' | 'check' | 'chevron' | 'close' | 'external';
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'plus' ? (
        <path d="M12 5v14M5 12h14" />
      ) : name === 'check' ? (
        <path d="m5 12 4 4L19 6" />
      ) : name === 'chevron' ? (
        <path d="m7 10 5 5 5-5" />
      ) : name === 'external' ? (
        <path d="M14 4h6v6m0-6-10 10M10 4H4v16h16v-6" />
      ) : (
        <path d="m6 6 12 12M6 18 18 6" />
      )}
    </svg>
  );
}

export function TrackingProvider({
  repo,
  prefs,
  onChange,
  children,
}: {
  repo: ProductRepository;
  prefs: TrackingPreferences;
  onChange: (prefs: TrackingPreferences) => void;
  children: ReactNode;
}) {
  const [panel, setPanel] = useState<OpenPanel | null>(null);
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepOpen = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const close = useCallback(
    (restoreFocus = true) => {
      keepOpen();
      const current = panelRef.current;
      setPanel(null);
      if (restoreFocus && current?.focusTarget.isConnected)
        current.focusTarget.focus({ preventScroll: true });
    },
    [keepOpen],
  );
  const openCompany = useCallback(
    (companyId: string, anchor: HTMLElement, pinned: boolean) => {
      keepOpen();
      const focusTarget =
        anchor.querySelector<HTMLElement>(
          pinned ? 'button[aria-haspopup="dialog"]' : '.tracking-main',
        ) || anchor;
      setPanel({ kind: 'company', companyId, anchor, focusTarget, pinned, initialFocus: pinned });
    },
    [keepOpen],
  );
  const openBulk = useCallback(
    (companyIds: string[], scopeLabel: string, anchor: HTMLElement) => {
      keepOpen();
      const focusTarget =
        anchor.querySelector<HTMLElement>('button[aria-haspopup="dialog"]') || anchor;
      setPanel({
        kind: 'bulk',
        companyIds,
        scopeLabel,
        anchor,
        focusTarget,
        pinned: true,
        initialFocus: true,
      });
    },
    [keepOpen],
  );
  const scheduleCompany = useCallback(
    (companyId: string, anchor: HTMLElement) => {
      keepOpen();
      if (panelRef.current?.pinned) return;
      if (panelRef.current?.kind === 'company' && panelRef.current.companyId === companyId) return;
      timer.current = setTimeout(() => openCompany(companyId, anchor, false), 200);
    },
    [keepOpen, openCompany],
  );
  const scheduleClose = useCallback(() => {
    keepOpen();
    if (panelRef.current?.pinned) return;
    timer.current = setTimeout(() => close(false), 220);
  }, [keepOpen, close]);
  const pin = useCallback(() => {
    keepOpen();
    setPanel((current) => (current ? { ...current, pinned: true } : null));
  }, [keepOpen]);
  useEffect(() => keepOpen, [keepOpen]);
  const context = {
    repo,
    prefs,
    onChange,
    panel,
    openCompany,
    openBulk,
    scheduleCompany,
    scheduleClose,
    keepOpen,
    pin,
    close,
  };
  return (
    <TrackingContext.Provider value={context}>
      {children}
      {panel && (
        <TrackingPopover key={panel.kind === 'company' ? panel.companyId : 'bulk'} panel={panel} />
      )}
    </TrackingContext.Provider>
  );
}

export function TrackingControl({ company }: { company: Company }) {
  const { prefs, onChange, panel, openCompany, scheduleCompany, scheduleClose, close } =
    useTracking();
  const ref = useRef<HTMLDivElement>(null);
  const tracked = isCompanyTracked(prefs, company.id, 'feed');
  const telegram = isCompanyTracked(prefs, company.id, 'telegram');
  const expanded = panel?.kind === 'company' && panel.companyId === company.id;
  return (
    <div
      ref={ref}
      className={`tracking-control ${tracked ? 'tracking-control--active' : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' && tracked && ref.current)
          scheduleCompany(company.id, ref.current);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') scheduleClose();
      }}
    >
      <button
        className="tracking-main"
        aria-label={`${tracked ? 'Stop tracking' : 'Track'} ${company.name} in My Feed`}
        aria-pressed={tracked}
        onClick={() => onChange(setCompaniesTracked(prefs, [company.id], !tracked, 'feed'))}
      >
        <Mark name={tracked ? 'check' : 'plus'} size={12} />
        <span>{tracked ? 'Tracking' : 'Track'}</span>
        {telegram && (
          <span className="tracking-telegram-indicator" title="Telegram preferences selected">
            <PlatformIcon platform="telegram" size={9} />
          </span>
        )}
      </button>
      <button
        className="tracking-options-trigger"
        aria-label={`Tracking options for ${company.name}`}
        title="Choose platforms and profiles"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        onClick={() => {
          if (expanded && panel.pinned) close();
          else if (ref.current) openCompany(company.id, ref.current, true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && ref.current) {
            event.preventDefault();
            openCompany(company.id, ref.current, true);
          }
        }}
      >
        <Mark name="chevron" size={12} />
      </button>
    </div>
  );
}

export function BulkTracking({
  companyIds,
  scopeLabel,
}: {
  companyIds: string[];
  scopeLabel: string;
}) {
  const { prefs, onChange, panel, openBulk, close } = useTracking();
  const ref = useRef<HTMLDivElement>(null);
  const expanded = panel?.kind === 'bulk' && panel.anchor === ref.current;
  return (
    <div className="tracking-control tracking-control--bulk" ref={ref}>
      <button
        className="tracking-main"
        disabled={!companyIds.length}
        aria-label={`Track all ${scopeLabel} in My Feed`}
        onClick={() => onChange(setCompaniesTracked(prefs, companyIds, true, 'feed'))}
      >
        <Mark name="plus" size={12} />
        <span>Track all</span>
      </button>
      <button
        className="tracking-clear-all"
        disabled={!companyIds.length}
        aria-label={`Stop tracking all ${scopeLabel} in My Feed`}
        onClick={() => onChange(setCompaniesTracked(prefs, companyIds, false, 'feed'))}
      >
        Clear all
      </button>
      <button
        className="tracking-options-trigger"
        disabled={!companyIds.length}
        aria-label={`Bulk tracking options for ${scopeLabel}`}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        onClick={() => {
          if (expanded) close();
          else if (ref.current) openBulk(companyIds, scopeLabel, ref.current);
        }}
      >
        <Mark name="chevron" size={12} />
      </button>
    </div>
  );
}

function useMobilePopover() {
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width: 700px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return mobile;
}

function TrackingPopover({ panel }: { panel: OpenPanel }) {
  const { repo, close, keepOpen, scheduleClose, pin } = useTracking();
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useMobilePopover();
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  const titleId = useId();
  const company = panel.kind === 'company' ? repo.getCompany(panel.companyId) : null;
  useLayoutEffect(() => {
    const popover = ref.current;
    if (!popover) return;
    let frame = 0;
    const reposition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!panel.anchor.isConnected) {
          close(false);
          return;
        }
        if (mobile) {
          setPosition({ visibility: 'visible' });
          return;
        }
        const anchor = panel.anchor.getBoundingClientRect();
        const width = Math.min(400, window.innerWidth - 24);
        const maxHeight = window.innerHeight - 28;
        const height = Math.min(popover.scrollHeight, maxHeight);
        const rightSide = anchor.right + 12;
        const leftSide = anchor.left - width - 12;
        const left =
          rightSide + width <= window.innerWidth - 12
            ? rightSide
            : leftSide >= 12
              ? leftSide
              : Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12));
        const top = Math.max(12, Math.min(anchor.top, window.innerHeight - height - 12));
        setPosition({ left, top, width, maxHeight, visibility: 'visible' });
      });
    };
    reposition();
    const resizeObserver = new ResizeObserver(reposition);
    resizeObserver.observe(popover);
    const anchorObserver = new MutationObserver(() => {
      if (!panel.anchor.isConnected) close(false);
    });
    anchorObserver.observe(document.getElementById('product-root') || document.body, {
      childList: true,
      subtree: true,
    });
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      anchorObserver.disconnect();
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [panel.anchor, mobile, close]);
  useEffect(() => {
    if (!panel.initialFocus) return;
    const frame = requestAnimationFrame(() =>
      ref.current
        ?.querySelector<HTMLButtonElement>('[data-tracking-initial]')
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [panel.initialFocus]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !mobile || !ref.current) return;
      const targets = [
        ...ref.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length > 0);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || !ref.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !panel.anchor.contains(target)) close(false);
    };
    const focusOutside = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!mobile && !ref.current?.contains(target) && !panel.anchor.contains(target)) close(false);
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('pointerdown', outside);
    window.addEventListener('focusin', focusOutside);
    const overflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('focusin', focusOutside);
      if (mobile) document.body.style.overflow = overflow;
    };
  }, [panel.anchor, mobile, close]);
  return createPortal(
    <>
      {mobile && <div className="tracking-backdrop" onClick={() => close()} aria-hidden="true" />}
      <div
        className={`tracking-popover ${mobile ? 'tracking-popover--mobile' : ''}`}
        style={position}
        ref={ref}
        role="dialog"
        aria-modal={mobile ? true : undefined}
        aria-labelledby={titleId}
        onPointerEnter={keepOpen}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') scheduleClose();
        }}
        onPointerDown={pin}
        onFocusCapture={pin}
      >
        <div className="tracking-panel-heading">
          {company ? (
            <>
              <CompanyLogo company={company} />
              <div>
                <h2 id={titleId}>{company.name}</h2>
                <span>{company.ticker} · Tracking preferences</span>
              </div>
            </>
          ) : (
            <div>
              <h2 id={titleId}>Bulk tracking</h2>
              <span>
                {panel.kind === 'bulk'
                  ? `${panel.companyIds.length} ${panel.scopeLabel}`
                  : 'Choose your sources'}
              </span>
            </div>
          )}
          <button
            className="tracking-close"
            aria-label="Close tracking preferences"
            onClick={() => close()}
          >
            <Mark name="close" size={16} />
          </button>
        </div>
        {company ? (
          <CompanyTrackingSettings company={company} />
        ) : panel.kind === 'bulk' ? (
          <BulkTrackingSettings companyIds={panel.companyIds} />
        ) : (
          <p className="tracking-note">This company is not in the current catalog.</p>
        )}
      </div>
    </>,
    document.body,
  );
}

function ChannelTabs({
  channel,
  setChannel,
  id,
}: {
  channel: Channel;
  setChannel: (channel: Channel) => void;
  id: string;
}) {
  return (
    <div
      className="tracking-channel-tabs"
      role="tablist"
      aria-label="Tracking destination"
      onKeyDown={(event) => {
        if (
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight' ||
          event.key === 'Home' ||
          event.key === 'End'
        ) {
          event.preventDefault();
          const next: Channel =
            event.key === 'Home'
              ? 'feed'
              : event.key === 'End'
                ? 'telegram'
                : channel === 'feed'
                  ? 'telegram'
                  : 'feed';
          setChannel(next);
          event.currentTarget.querySelector<HTMLButtonElement>(`[data-channel="${next}"]`)?.focus();
        }
      }}
    >
      {(['feed', 'telegram'] as const).map((value) => (
        <button
          data-channel={value}
          id={`${id}-${value}`}
          key={value}
          role="tab"
          aria-selected={channel === value}
          aria-controls={`${id}-panel`}
          tabIndex={channel === value ? 0 : -1}
          data-tracking-initial={channel === value ? '' : undefined}
          onClick={() => setChannel(value)}
        >
          <PlatformIcon platform={value === 'feed' ? 'feed' : 'telegram'} size={14} />
          {value === 'feed' ? 'My Feed' : 'Telegram'}
        </button>
      ))}
    </div>
  );
}

function CompanyTrackingSettings({ company }: { company: Company }) {
  const { repo, prefs, onChange } = useTracking();
  const [channel, setChannel] = useState<Channel>('feed');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const id = useId();
  const profiles = useMemo(() => listTrackingProfiles(repo, company.id), [repo, company.id]);
  const platforms = useMemo(
    () => [
      ...new Set([
        ...categoryOrder,
        ...repo.platforms.map((platform) => platform.id),
        ...prefs.platformIds,
      ]),
    ],
    [repo, prefs.platformIds],
  );
  const destination = channel === 'feed' ? 'My Feed' : 'Telegram';
  const setAll = (enabled: boolean) =>
    onChange(setCompaniesTracked(prefs, [company.id], enabled, channel));
  return (
    <>
      <ChannelTabs channel={channel} setChannel={setChannel} id={id} />
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${channel}`}
        className="tracking-settings-body"
      >
        <div className="tracking-section-actions">
          <span>Platforms & profiles</span>
          <div>
            <button
              onClick={() => setAll(true)}
              aria-label={`Select all platforms for ${company.name} in ${destination}`}
            >
              All
            </button>
            <span aria-hidden="true">/</span>
            <button
              onClick={() => setAll(false)}
              aria-label={`Select no platforms for ${company.name} in ${destination}`}
            >
              None
            </button>
          </div>
        </div>
        <div className="tracking-categories">
          {platforms.map((platform) => {
            const available = profiles.filter((profile) => profile.platform === platform);
            const selection = getPlatformSelection(prefs, company.id, channel, platform, available);
            const label =
              labels[platform] ||
              repo.platforms.find((item) => item.id === platform)?.label ||
              platform;
            const visible = available.filter((profile) =>
              profile.label.toLowerCase().includes(query.toLowerCase()),
            );
            const isExpanded = expanded === platform;
            const selectedCount = available.filter((profile) =>
              isProfileEnabled(prefs, company.id, channel, profile.id),
            ).length;
            return (
              <section
                className={`tracking-category ${isExpanded ? 'tracking-category--expanded' : ''}`}
                key={platform}
              >
                <div className="tracking-category-row">
                  <button
                    className="tracking-category-open"
                    aria-expanded={isExpanded}
                    aria-controls={`${id}-profiles-${platform}`}
                    onClick={() => {
                      setExpanded(isExpanded ? null : platform);
                      setQuery('');
                    }}
                  >
                    <PlatformIcon platform={platform} size={17} />
                    <span>{label}</span>
                    <small>{available.length ? `${selectedCount}/${available.length}` : '—'}</small>
                    <Mark name="chevron" size={12} />
                  </button>
                  <button
                    className={`tracking-switch ${selection !== 'none' ? 'tracking-switch--on' : ''} ${selection === 'some' ? 'tracking-switch--partial' : ''}`}
                    role="switch"
                    aria-checked={selection !== 'none'}
                    aria-label={`${label} in ${destination}${selection === 'some' ? ', some profiles selected' : ''}`}
                    onClick={() =>
                      onChange(
                        setPlatformEnabled(
                          prefs,
                          company.id,
                          channel,
                          platform,
                          selection === 'none',
                        ),
                      )
                    }
                  >
                    <span />
                  </button>
                </div>
                {isExpanded && (
                  <div className="tracking-profiles" id={`${id}-profiles-${platform}`}>
                    <div className="tracking-profiles-heading">
                      <span>
                        {available.length
                          ? `${available.length} ${available.length === 1 ? 'profile or source' : 'profiles & sources'}`
                          : 'No mapped profiles'}
                      </span>
                      {available.length > 0 && (
                        <div>
                          <button
                            onClick={() =>
                              onChange(
                                setPlatformEnabled(prefs, company.id, channel, platform, true),
                              )
                            }
                            aria-label={`All ${label} profiles in ${destination}`}
                          >
                            All
                          </button>
                          <button
                            onClick={() =>
                              onChange(
                                setPlatformEnabled(prefs, company.id, channel, platform, false),
                              )
                            }
                            aria-label={`No ${label} profiles in ${destination}`}
                          >
                            None
                          </button>
                        </div>
                      )}
                    </div>
                    {available.length > 6 && (
                      <input
                        className="tracking-profile-search"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={`Find ${label} profiles`}
                        aria-label={`Find ${label} profiles`}
                      />
                    )}
                    {available.length ? (
                      <div className="tracking-profile-list">
                        {visible.map((profile) => (
                          <div className="tracking-profile" key={profile.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={isProfileEnabled(prefs, company.id, channel, profile.id)}
                                onChange={(event) =>
                                  onChange(
                                    setProfileEnabled(
                                      prefs,
                                      company.id,
                                      channel,
                                      profile.id,
                                      event.target.checked,
                                      available.map((item) => item.id),
                                    ),
                                  )
                                }
                              />
                              <span>
                                <strong>{profile.label}</strong>
                                <small>
                                  {profile.eventCount > 0
                                    ? `${profile.eventCount} archived ${profile.eventCount === 1 ? 'record' : 'records'}`
                                    : 'Mapped source'}
                                </small>
                              </span>
                            </label>
                            {profile.url && (
                              <a
                                href={profile.url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${profile.label}`}
                                title="Open source"
                              >
                                <Mark name="external" size={12} />
                              </a>
                            )}
                          </div>
                        ))}
                        {!visible.length && <p className="tracking-note">No matching profiles.</p>}
                      </div>
                    ) : (
                      <p className="tracking-note">No profiles available yet.</p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
      <footer className="tracking-panel-footer">
        {channel === 'feed'
          ? 'My Feed preferences · Saved on this device'
          : 'Telegram preferences · Delivery pending'}
      </footer>
    </>
  );
}

function BulkTrackingSettings({ companyIds }: { companyIds: string[] }) {
  const { prefs, onChange } = useTracking();
  const [channel, setChannel] = useState<Channel>('feed');
  const id = useId();
  const count = companyIds.filter((companyId) =>
    isCompanyTracked(prefs, companyId, channel),
  ).length;
  return (
    <>
      <ChannelTabs channel={channel} setChannel={setChannel} id={id} />
      <div
        className="tracking-bulk-body"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${channel}`}
      >
        <p>
          <strong>
            {count} of {companyIds.length}
          </strong>{' '}
          companies selected for {channel === 'feed' ? 'My Feed' : 'Telegram'}.
        </p>
        <div className="tracking-bulk-actions">
          <button onClick={() => onChange(setCompaniesTracked(prefs, companyIds, true, channel))}>
            <Mark name="check" />
            Select all sources
          </button>
          <button onClick={() => onChange(setCompaniesTracked(prefs, companyIds, false, channel))}>
            <Mark name="close" />
            Select none
          </button>
        </div>
      </div>
    </>
  );
}
