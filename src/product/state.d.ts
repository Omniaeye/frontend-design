export const PREFERENCES_KEY: string;
export function setQuerySelection(
  search: string | URLSearchParams,
  key: string,
  values: string[],
): URLSearchParams;
export function toggleQuerySelection(
  search: string | URLSearchParams,
  key: string,
  value: string,
  available: string[],
): URLSearchParams;
export function parsePreferences(value: string | null, companyIds: string[]): string[];
export function serializePreferences(following: string[]): string;
export function toggleFollowing(following: string[], id: string): string[];
export function toggleQueryValue(
  search: string | URLSearchParams,
  key: string,
  value: string,
): URLSearchParams;
export function feedCompanyIds(following: string[], selected: string[]): string[];
export type TrackerId =
  | 'reddit'
  | 'x'
  | 'website'
  | 'youtube'
  | 'github'
  | 'instagram'
  | 'truthsocial'
  | 'telegram'
  | 'binance_square'
  | 'tiktok'
  | 'facebook'
  | 'linkedin'
  | 'bluesky';
export const TRACKER_PLATFORMS: Readonly<Record<TrackerId, readonly string[]>>;
export function currentTracker(search: string | URLSearchParams): string;
export function setTrackerSelection(
  search: string | URLSearchParams,
  tracker: TrackerId,
): URLSearchParams;
export function withoutEvent(search: string): string;
export function queryEventPages(
  repository: import('./data/repository.js').ProductRepository,
  query: import('./data/repository.js').EventQuery,
  pageCount: number,
): ReturnType<import('./data/repository.js').ProductRepository['queryEvents']>;

export function selectFeedRepository<T>(
  repository: T,
  personalRepository: T,
  search: string | URLSearchParams,
): T;
