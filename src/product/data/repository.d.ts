export type PlatformId =
  | 'news'
  | 'x'
  | 'reddit'
  | 'web'
  | 'filings'
  | 'youtube'
  | 'people'
  | 'github'
  | 'tokens'
  | 'instagram'
  | 'truthsocial'
  | 'telegram'
  | 'binance_square'
  | 'tiktok'
  | 'facebook'
  | 'linkedin'
  | 'bluesky';
export type EvidenceStatus = 'mapped' | 'indexed' | 'archived' | 'unavailable';
export interface Platform {
  id: PlatformId;
  label: string;
  description: string;
}
export interface Coverage {
  status: EvidenceStatus;
  mappedSourceCount: number | null;
  indexedRecordCount: number | null;
  availableSourceCount: number;
  availableEventCount: number;
  note: string;
}
export interface Company {
  id: string;
  registryCompanyId: string | null;
  name: string;
  ticker: string;
  category: 'company' | 'fund';
  logo: string | null;
  logoUrl: string | null;
  logoKind: string | null;
  monochrome: boolean;
  backgroundKey: string | null;
  websiteUrl: string | null;
  sourceCounts: Partial<Record<PlatformId, number>>;
  coverage: Partial<Record<PlatformId, Coverage>>;
  asset: { chainId: 4663; address: string; id: string };
}
export interface Source {
  id: string;
  companyIds: string[];
  platform: PlatformId;
  title: string;
  url: string | null;
  sourceUrl: string | null;
  status: EvidenceStatus;
  availabilityNote: string;
  imageUrl: string | null;
}
export interface ProductEvent {
  id: string;
  nativeIds: string[];
  companyIds: string[];
  platform: PlatformId;
  eventType: string;
  type: string;
  title: string;
  body: string | null;
  url: string;
  sourceUrl: string;
  sourceLabel: string;
  imageUrl: string | null;
  publishedAt: string | null;
  publishedDate: string | null;
  observedAt: string | null;
  snapshotAt: string | null;
  evidenceStatus: 'indexed' | 'archived';
  provenance: string[];
  associationNote: string;
  relatedTokenCount?: number;
  subjectCompanyIds?: string[];
  relatedTokens?: Array<{
    id: string;
    address: string;
    ticker: string | null;
    name: string | null;
    logo: string | null;
  }>;
  redditView?: 'new' | 'hot' | 'rising' | 'top';
  profileIds?: string[];
  media?: Array<{ type: string; url?: string; posterUrl?: string }>;
  socialMetadata?: import('../components/SocialContext').SocialRecord;
  hotScore?: number;
  hotActivityAt?: string;
}
export interface TrackingProfile {
  id: string;
  label: string;
  platform: PlatformId;
  url: string | null;
  companyIds: string[];
  sourceIds: string[];
  eventIds: string[];
  eventCount: number;
  origin: 'source' | 'event' | 'source-and-event';
  kind: string;
  note: string;
}
export interface SnapshotMeta {
  revision?: string;
  schemaVersion: 1;
  mode: 'snapshot';
  capturedAt: string | null;
  builtAt: string;
  companyCount: number;
  sourceCount: number;
  eventCount: number;
  liveConnected: boolean;
  partial: true;
  notice?: string;
  limitations?: string[];
  sourceStatus?: Record<
    string,
    { state?: string; checkedAt?: string; lastSuccess?: string; sourceUpdatedAt?: string }
  >;
  access?: 'public_sample' | string;
  inputHashes: Record<string, string>;
}
export interface ProductSnapshot {
  meta: SnapshotMeta;
  companies: Company[];
  sources: Source[];
  events: ProductEvent[];
  platforms: Platform[];
}
export interface EventQuery {
  companyIds?: string[];
  platforms?: string[];
  eventTypes?: string[];
  redditViews?: Array<'new' | 'hot' | 'rising' | 'top'>;
  profileIds?: string[];
  eventIds?: string[];
  requirePublication?: boolean;
  query?: string;
  since?: string;
  until?: string;
  cursor?: string | null;
  limit?: number;
}
export interface ProductRepository {
  meta: SnapshotMeta;
  platforms: Platform[];
  listCompanies(options?: {
    query?: string;
    ids?: string[];
    category?: 'company' | 'fund';
  }): Company[];
  getCompany(id: string): Company | null;
  getEvent(id: string): ProductEvent | null;
  listSources(options?: { companyId?: string; platform?: string }): Source[];
  listProfiles(options?: { companyId?: string; platform?: string }): TrackingProfile[];
  queryEvents(options?: EventQuery): {
    items: ProductEvent[];
    total: number;
    nextCursor: string | null;
  };
}
export function createProductRepository(snapshot: ProductSnapshot): ProductRepository;
export function loadProductRepository(options?: {
  signal?: AbortSignal;
  url?: string;
  fetcher?: typeof fetch;
}): Promise<ProductRepository>;

export function createProductRepositoryAsync(
  snapshot: ProductSnapshot,
  options?: { signal?: AbortSignal; budgetMs?: number; yieldTask?: () => Promise<void> },
): Promise<ProductRepository>;
