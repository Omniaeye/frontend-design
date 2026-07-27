// In-memory only. JWT expiry is a scheduling hint; the server still verifies every token.
export function createCredentials({ clock = Date.now } = {}) {
  let cache = null,
    flight = null,
    key = null,
    cooldown = 0;
  const expiry = (token) => {
    try {
      const s = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(s)).exp * 1000;
    } catch {
      return 0;
    }
  };
  const waiting = () =>
    Object.assign(new Error('Reconnecting your session. Please wait a moment.'), {
      code: 'session_cooldown',
      retryAt: cooldown,
    });
  return {
    invalidate() {
      cache = null;
    },
    get(identity) {
      const next = JSON.stringify([
        identity.profile.id,
        identity.profile.x?.id,
        identity.profile.wallets,
        identity.profile.email,
      ]);
      if (next !== key) {
        key = next;
        cache = null;
        flight = null;
        cooldown = 0;
      }
      if (cache && clock() < cache.until) return Promise.resolve(cache.value);
      if (clock() < cooldown) return Promise.reject(waiting());
      if (flight) return flight;
      const started = key;
      const task = (async () => {
        try {
          const token = await identity.getToken();
          const identityToken = await identity.getIdentityToken();
          if (started !== key) throw new Error('Your session changed.');
          if (!token) throw new Error('Your session has expired. Sign in again.');
          const until =
            Math.min(
              expiry(token),
              identityToken ? expiry(identityToken) : Infinity,
              clock() + 300000,
            ) - 30000;
          const value = [token, identityToken];
          if (until > clock()) cache = { until, value };
          return value;
        } catch (e) {
          if (
            started === key &&
            (e?.status === 429 ||
              e?.code === 'too_many_requests' ||
              /too many requests/i.test(e?.message || ''))
          ) {
            cooldown = clock() + 60000;
            throw waiting();
          }
          throw e;
        }
      })();
      flight = task;
      void task
        .finally(() => {
          if (flight === task) flight = null;
        })
        .catch(() => {});
      return task;
    },
  };
}
