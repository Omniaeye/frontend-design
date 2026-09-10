// Drafts are device-local preparation, never submissions or proof of authorship.
export function draftStorageKey(userId) {
  return `omnia.bags.drafts.v1:${encodeURIComponent(userId || 'guest')}`;
}

export function parsePostUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname))
      return null;
    const match = url.pathname.match(/^\/([a-zA-Z0-9_]{1,15})\/status\/([0-9]{1,25})\/?$/);
    if (!match) return null;
    return {
      id: match[2],
      username: match[1],
      url: `https://x.com/${match[1]}/status/${match[2]}`,
    };
  } catch {
    return null;
  }
}

export function readDrafts(raw) {
  try {
    const value = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.slice(0, 100).flatMap((item) => {
      const post = typeof item?.url === 'string' ? parsePostUrl(item.url) : null;
      if (!post || seen.has(post.id)) return [];
      seen.add(post.id);
      return [post];
    });
  } catch {
    return [];
  }
}
