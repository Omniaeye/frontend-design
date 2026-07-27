import type { Identity } from './identity';
export function createCredentials(options?: { clock?: () => number }): {
  invalidate: () => void;
  get: (identity: Identity) => Promise<[string | null, string | null]>;
};
