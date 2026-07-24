import { normalizeTerminal } from '../terminal/model.js';
export const ACCOUNT_SETTINGS_KEY = 'omnia.product.settings.v1';

export function normalizeSettings(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  const telegram = input.telegram || {};
  let timezone = typeof telegram.timezone === 'string' ? telegram.timezone : 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
  } catch {
    timezone = 'UTC';
  }
  const time = (value, fallback) =>
    typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
  return {
    version: 1,
    terminal: normalizeTerminal(input.terminal),
    displayName: typeof input.displayName === 'string' ? input.displayName.trim().slice(0, 60) : '',
    density: input.density === 'comfortable' ? 'comfortable' : 'compact',
    textSize: input.textSize === 'large' ? 'large' : 'standard',
    motion: input.motion === 'reduced' ? 'reduced' : 'system',
    telegram: {
      frequency: ['instant', 'hourly', 'daily'].includes(telegram.frequency)
        ? telegram.frequency
        : 'instant',
      quietHours: telegram.quietHours === true,
      quietStart: time(telegram.quietStart, '22:00'),
      quietEnd: time(telegram.quietEnd, '08:00'),
      timezone,
    },
  };
}

export function settingsStorageKey(userId) {
  return userId ? `${ACCOUNT_SETTINGS_KEY}:${encodeURIComponent(userId)}` : ACCOUNT_SETTINGS_KEY;
}

// Only project identity metadata. Never persist provider access/refresh tokens.
export function identityProfile(user) {
  const accounts = user?.linkedAccounts || user?.linked_accounts || [];
  const twitter = accounts.find((account) => account.type === 'twitter_oauth');
  const email = accounts.find((account) => account.type === 'email');
  const wallets = accounts
    .filter((account) => account.type === 'wallet')
    .map((account) => account.address)
    .filter(Boolean);
  const safePhoto = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  };
  return {
    id: user?.id || null,
    email: email?.address || null,
    wallets,
    passkeys: accounts.filter((account) => account.type === 'passkey').length,
    loginMethods: accounts.length,
    x: twitter?.subject
      ? {
          id: String(twitter.subject),
          username: twitter.username || null,
          name: twitter.name || null,
          photo: safePhoto(twitter.profilePictureUrl || twitter.profile_picture_url),
        }
      : null,
  };
}
