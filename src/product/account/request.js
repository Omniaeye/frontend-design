import { unpackSnapshotAsync } from '../data/snapshot-wire.mjs';
export async function requestJson(
  url,
  options,
  fetcher = fetch,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  const attempts = options.method === 'GET' ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response;
    try {
      response = await fetcher(url, { ...options, signal: AbortSignal.timeout(15000) });
    } catch (error) {
      if (attempt + 1 === attempts)
        throw new Error('Could not reach the account service. Try again.');
      await pause(400 * (attempt + 1));
      continue;
    }
    const result = await response.json().catch(() => null);
    if (response.ok && result !== null) return unpackSnapshotAsync(result);
    if (attempt + 1 < attempts && [500, 502, 503, 504].includes(response.status)) {
      await pause(400 * (attempt + 1));
      continue;
    }
    throw Object.assign(
      new Error(result?.error || 'Account service is unavailable. Please try again.'),
      { status: response.status },
    );
  }
}
