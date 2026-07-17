import type { ProductRepository, TrackingProfile } from './data/repository.js';
export type TrackingChannel = 'feed' | 'telegram';
export type SelectionState = 'all' | 'some' | 'none';
export type RedditView = 'new' | 'hot' | 'rising' | 'top';
export interface ChannelRule {
  platforms: string[];
  excludedProfileIds: string[];
  profileAllowlist: Record<string, string[]>;
}
export interface TrackingPreferences {
  eventPolicy?: 'all' | 'milestones';
  presetChoice?: string | null;
  version: 2;
  platformIds: string[];
  following: string[];
  redditViews: Record<TrackingChannel, RedditView[]>;
  rules: Record<string, { feed: ChannelRule; telegram: ChannelRule }>;
}
export const TRACKING_PREFERENCES_KEY: string;
export const LEGACY_PREFERENCES_KEY: string;
export const REDDIT_VIEWS: RedditView[];
export function createTrackingPreferences(
  companyIds: string[],
  platformIds: string[],
): TrackingPreferences;
export function parseTrackingPreferences(
  rawV2: string | null,
  rawLegacy: string | null,
  companyIds: string[],
  platformIds: string[],
): TrackingPreferences;
export function serializeTrackingPreferences(prefs: TrackingPreferences): string;
export function getRedditViews(prefs: TrackingPreferences, channel?: TrackingChannel): RedditView[];
export function setRedditViews(
  prefs: TrackingPreferences,
  channel: TrackingChannel,
  views: RedditView[],
): TrackingPreferences;
export function getCompanyRule(
  prefs: TrackingPreferences,
  companyId: string,
  channel?: TrackingChannel,
): ChannelRule;
export function isCompanyTracked(
  prefs: TrackingPreferences,
  companyId: string,
  channel?: TrackingChannel,
): boolean;
export function isProfileEnabled(
  prefs: TrackingPreferences,
  companyId: string,
  channel: TrackingChannel,
  profileId: string,
): boolean;
export function setCompaniesTracked(
  prefs: TrackingPreferences,
  companyIds: string[],
  on: boolean,
  channel?: TrackingChannel,
): TrackingPreferences;
export function setPlatformEnabled(
  prefs: TrackingPreferences,
  companyId: string,
  channel: TrackingChannel,
  platform: string,
  on: boolean,
): TrackingPreferences;
export function setProfileEnabled(
  prefs: TrackingPreferences,
  companyId: string,
  channel: TrackingChannel,
  profileId: string,
  on: boolean,
  platformProfileIds?: string[],
): TrackingPreferences;
export function listTrackingProfiles(
  repository: ProductRepository,
  companyId: string,
  platform?: string,
): TrackingProfile[];
export function getPlatformSelection(
  prefs: TrackingPreferences,
  companyId: string,
  channel: TrackingChannel,
  platform: string,
  profiles?: TrackingProfile[],
): SelectionState;
export function createTrackingRepository(
  repository: ProductRepository,
  prefs: TrackingPreferences,
  channel?: TrackingChannel,
): ProductRepository;
