import type { TrackingPreferences } from './tracking-preferences.js';
import type { AccountSettings } from './account/model.js';
export interface Preset {
  id: string;
  name: string;
  label: string;
  description: string;
  platforms: string[] | null;
  reddit: string[];
  frequency: 'daily' | 'hourly' | 'instant';
  policy: string;
}
export const PRESETS: Preset[];
export function eventAllowedByPreset(
  prefs: TrackingPreferences,
  event: { platform: string; eventType?: string },
): boolean;
export function capturePreset(
  tracking: TrackingPreferences,
  settings: AccountSettings,
): Record<string, unknown>;
export function applyPreset(
  tracking: TrackingPreferences,
  settings: AccountSettings,
  preset: any,
): { tracking: TrackingPreferences; settings: AccountSettings };
