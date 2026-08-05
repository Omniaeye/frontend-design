import type { CSSProperties } from 'react';
import './platform-icon.css';

const brands: Record<string, { label: string; color: string }> = {
  x: { label: 'X', color: '#F3F5F2' },
  reddit: { label: 'Reddit', color: '#FF4500' },
  youtube: { label: 'YouTube', color: '#FF0033' },
  github: { label: 'GitHub', color: '#F3F5F2' },
  telegram: { label: 'Telegram', color: '#26A5E4' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  threads: { label: 'Threads', color: '#F3F5F2' },
  tiktok: { label: 'TikTok', color: '#F3F5F2' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  facebook: { label: 'Facebook', color: '#0866FF' },
  bluesky: { label: 'Bluesky', color: '#0285FF' },
  discord: { label: 'Discord', color: '#5865F2' },
  twitch: { label: 'Twitch', color: '#9146FF' },
  snapchat: { label: 'Snapchat', color: '#FFFC00' },
  weibo: { label: 'Weibo', color: '#E6162D' },
};

export function PlatformIcon({
  platform,
  size = 16,
  title,
}: {
  platform: string;
  size?: number;
  title?: string;
}) {
  const key = platform === 'website' ? 'web' : platform;
  const brand = brands[key];
  const style = {
    width: size,
    height: size,
    ...(brand
      ? {
          '--platform-mask': `url('/assets/product-platforms/${key}.svg')`,
          '--platform-color': brand.color,
        }
      : {}),
  } as CSSProperties;
  if (brand)
    return (
      <span
        className="platform-icon platform-icon--brand"
        style={style}
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : undefined}
        aria-label={title}
        title={title}
      />
    );
  return (
    <svg
      className="platform-icon"
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {key === 'web' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" />
        </>
      ) : key === 'news' ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 8h10M7 12h4M7 16h4M14 12h3M14 16h3" />
        </>
      ) : key === 'filings' ? (
        <>
          <path d="M5 3h9l5 5v13H5V3Zm9 0v5h5M9 12h6M9 16h6" />
        </>
      ) : key === 'people' ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5" />
        </>
      ) : key === 'tokens' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 9.25c0-1.2 1.2-2.15 3.1-2.15 1.45 0 2.5.45 3.15 1.05M15.5 14.6c0 1.3-1.3 2.3-3.35 2.3-1.55 0-2.85-.5-3.65-1.35M12 5v14M8.6 12h6.8" />
        </>
      ) : (
        <>
          <path d="M3 5h18M3 12h18M3 19h12" />
        </>
      )}
    </svg>
  );
}
