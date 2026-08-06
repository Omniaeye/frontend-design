import { useState, type CSSProperties } from 'react';
import type { Company } from '../data/repository.js';
import './company-logo.css';

// Product-only treatments. Shared landing assets remain untouched.
const overrides: Record<string, string> = {
  FIG: '/assets/product-brands/FIG.svg',
  GOOGL: '/assets/product-brands/GOOGL.png',
  IBM: '/assets/product-brands/IBM.svg',
};

const vectorColors: Record<string, string> = {
  NVDA: '#76B900',
  META: '#0467DF',
  NFLX: '#E50914',
  SHOP: '#7AB55C',
  BABA: '#FF6A00',
  DELL: '#007DB8',
  INTC: '#0071C5',
  NET: '#F38020',
  NU: '#820AD1',
  RDDT: '#FF4500',
  SNOW: '#29B5E8',
  SNAP: '#000000',
  F: '#00274E',
};
const lightPlates = new Set(['EWY', 'INDA', 'SGOV', 'SLV', 'MRVL', 'MU', 'RIVN', 'NU', 'F']);
const opticalScale: Record<string, number> = { FIG: 2.05, GOOGL: 2.45 };

export function CompanyLogo({ company, large = false }: { company: Company; large?: boolean }) {
  const source = overrides[company.ticker] ?? company.logo;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const unavailable = !source || failedSource === source;
  const isMonoVector =
    !!source && !overrides[company.ticker] && source.endsWith('.svg') && company.monochrome;
  const plate =
    company.ticker === 'SNAP'
      ? 'yellow'
      : company.ticker === 'GOOGL'
        ? 'black'
        : lightPlates.has(company.ticker)
          ? 'light'
          : 'none';
  const style = {
    '--brand-color': vectorColors[company.ticker] ?? '#F3F5F2',
    '--brand-scale': opticalScale[company.ticker] ?? 1,
    ...(isMonoVector && source ? { '--brand-mask': `url("${source}")` } : {}),
  } as CSSProperties;

  return (
    <span
      className={`company-logo brand-logo ${large ? 'large' : ''} brand-logo--${plate}`}
      data-ticker={company.ticker}
      style={style}
      aria-hidden="true"
    >
      {unavailable ? (
        <span className="logo-fallback">{company.ticker.slice(0, 2)}</span>
      ) : (
        <>
          {isMonoVector && <span className="brand-logo__vector" />}
          <img
            src={source!}
            alt=""
            loading="lazy"
            decoding="async"
            className={`brand-logo__image ${isMonoVector ? 'brand-logo__probe' : ''}`}
            onError={() => setFailedSource(source)}
          />
        </>
      )}
    </span>
  );
}
