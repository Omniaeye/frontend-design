const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

export function youtubeVideoId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    let id = null;
    if (YOUTUBE_HOSTS.has(url.hostname) && url.pathname === '/watch')
      id = url.searchParams.get('v');
    else if (url.hostname === 'youtu.be' && /^\/[A-Za-z0-9_-]{11}$/.test(url.pathname))
      id = url.pathname.slice(1);
    else if (
      YOUTUBE_HOSTS.has(url.hostname) &&
      /^\/(?:shorts|live|embed)\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname)
    )
      id = url.pathname.split('/')[2];
    return id && VIDEO_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(value) {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function youtubeThumbnailUrl(value) {
  const id = youtubeVideoId(value);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
