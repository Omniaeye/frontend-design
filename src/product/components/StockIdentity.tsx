import type { Company } from '../data/repository.js';
import { CompanyLogo } from './CompanyLogo';
import './stock-identity.css';

export function StockIdentity({ companies }: { companies: Company[] }) {
  if (!companies.length) return null;
  return (
    <div className={`stock-identity${companies.length > 1 ? ' stock-identity--multiple' : ''}`}>
      {companies.map((company) => (
        <a
          key={company.id}
          href={`#/companies/${company.id}`}
          title={company.name}
          aria-label={`${company.name} (${company.ticker})`}
        >
          <CompanyLogo company={company} />
          <strong>{company.ticker}</strong>
        </a>
      ))}
    </div>
  );
}
