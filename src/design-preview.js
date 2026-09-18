/** Local presentation transport. It never forwards account or feed requests. */
export function previewResponse(path, method, snapshot) {
  if (!path.startsWith('/api/')) return null;
  if (method !== 'GET') return { status: 403, body: { error: 'Design preview is read-only.' } };
  if (path === '/api/feed/updates') return { status: 403, body: { error: 'No live stream.' } };
  if (path === '/api/account/config') return { status: 200, body: {} };
  // This selects the complete layout; it does not authorize a real account or service.
  if (path === '/api/feed/access')
    return { status: 200, body: { fullAccess: true, designPreview: true } };
  if (path === '/api/feed/snapshot') return { status: 200, body: snapshot };
  if (
    [
      '/api/feed/top',
      '/api/feed/search',
      '/api/feed/tokens',
      '/api/feed/social',
      '/api/feed/archive-events',
      '/api/feed/related-tokens',
    ].includes(path)
  ) {
    return { status: 200, body: { items: [], total: 0, nextCursor: null, live: false } };
  }
  return { status: 501, body: { error: 'Connect a data service to use this view.' } };
}

export async function installDesignPreview() {
  const original = window.fetch.bind(window);
  const snapshot = await original('/app-data/snapshot.json').then((response) => response.json());
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (url.origin === window.location.origin) {
      const method = String(
        init?.method || (input instanceof Request ? input.method : 'GET'),
      ).toUpperCase();
      const result = previewResponse(url.pathname, method, snapshot);
      if (result)
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { 'Content-Type': 'application/json' },
        });
    }
    return original(input, init);
  };
  const notice = document.createElement('div');
  notice.textContent = 'Design preview · No live data';
  notice.style.cssText =
    'position:fixed;bottom:8px;left:8px;z-index:99999;padding:6px 10px;background:#101a20;color:#bdd2cb;font:11px monospace;border:1px solid #35524a;pointer-events:none';
  document.body.append(notice);
}
