import { useEffect } from 'react';
export type AccessStage = 'session' | 'access' | 'archive';

export function AccessBoot({
  stage,
  error,
  onRetry,
  exiting = false,
  onExit,
}: {
  stage: AccessStage;
  error?: string;
  onRetry?: () => void;
  exiting?: boolean;
  onExit?: () => void;
}) {
  useEffect(() => {
    if (!exiting || !onExit) return;
    const reduced =
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduced';
    const timer = window.setTimeout(onExit, reduced ? 0 : 240);
    return () => window.clearTimeout(timer);
  }, [exiting, onExit]);
  const stages = [
    ['session', 'SESSION', 'Restore encrypted identity'],
    ['access', 'ACCESS', 'Verify authorized wallet'],
    ['archive', 'ARCHIVE', 'Open Intelligence'],
  ] as const;
  const current = exiting
    ? stages.length
    : Math.max(
        0,
        stages.findIndex(([id]) => id === stage),
      );
  return (
    <div
      className={`access-boot${exiting ? ' is-exiting' : ''}`}
      onAnimationEnd={(event) => {
        if (exiting && event.animationName === 'access-exit-closed') onExit?.();
      }}
      role="status"
      aria-live="polite"
    >
      <div className="access-eye" aria-hidden="true">
        <img className="access-eye-open" src="/assets/eye-master.png" alt="" />
        <img className="access-eye-half" src="/assets/eye-blink-half.png" alt="" />
        <img className="access-eye-closed" src="/assets/eye-blink-closed.png" alt="" />
      </div>
      <div className="access-console">
        <div className="access-console-head">
          <span>OMNIA / PRIVATE ACCESS</span>
          <span className="access-cursor">_</span>
        </div>
        {stages.map(([id, label, description], index) => (
          <div
            className={`access-step ${index < current ? 'is-done' : index === current ? 'is-active' : ''}`}
            key={id}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{label}</strong>
            <small>{description}</small>
            <em>{index < current ? 'READY' : index === current ? 'RUNNING' : 'QUEUED'}</em>
          </div>
        ))}
        {error && (
          <div className="access-error">
            <span>Verification paused.</span>
            <small>{error}</small>
            {onRetry && <button onClick={onRetry}>Retry access check ↗</button>}
          </div>
        )}
      </div>
    </div>
  );
}
