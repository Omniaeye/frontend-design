export interface AccountSettings {
  terminal?: import('../terminal/model.js').TerminalState;
  version: 1;
  displayName: string;
  density: 'compact' | 'comfortable';
  textSize: 'standard' | 'large';
  motion: 'system' | 'reduced';
  telegram: {
    frequency: 'instant' | 'hourly' | 'daily';
    quietHours: boolean;
    quietStart: string;
    quietEnd: string;
    timezone: string;
  };
}
export interface IdentityProfile {
  id: string | null;
  email: string | null;
  wallets: string[];
  passkeys: number;
  loginMethods: number;
  x: { id: string; username: string | null; name: string | null; photo: string | null } | null;
}
export const ACCOUNT_SETTINGS_KEY: string;
export function normalizeSettings(value?: unknown): AccountSettings;
export function settingsStorageKey(userId?: string | null): string;
export function identityProfile(user: unknown): IdentityProfile;
