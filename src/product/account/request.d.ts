export function requestJson<T>(
  url: string,
  options: RequestInit,
  fetcher?: typeof fetch,
  pause?: (ms: number) => Promise<void>,
): Promise<T>;
