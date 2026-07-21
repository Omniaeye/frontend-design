import { youtubeThumbnailUrl } from './youtube.mjs';
export function mediaUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password) return undefined;
    const hosts = [
      'pbs.twimg.com',
      'abs.twimg.com',
      'video.twimg.com',
      'i.ytimg.com',
      'yt3.googleusercontent.com',
      'yt3.ggpht.com',
      'i.redd.it',
      'preview.redd.it',
      'external-preview.redd.it',
      'v.redd.it',
      'styles.redditmedia.com',
      'igimg.1322.io',
      'igmedia.1322.io',
      'static-assets-1.truthsocial.com',
    ];
    return hosts.includes(u.hostname) ||
      u.hostname.endsWith('.cdninstagram.com') ||
      u.hostname.endsWith('.fbcdn.net')
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function recordMedia(record) {
  const raw = record.media || record.socialMetadata?.media || [];
  const poster =
    raw.find((m) => ['thumbnail', 'poster'].includes(m.type))?.url ||
    (record.platform === 'reddit' ? raw.find((m) => m.type === 'image')?.url : undefined);
  const videos = raw.filter((m) => ['video', 'gif', 'animated_gif'].includes(m.type));
  const result = raw
    .filter(
      (m) =>
        !videos.length ||
        (!['thumbnail', 'poster'].includes(m.type) &&
          m.url !== poster &&
          !videos.some((v) => v.posterUrl === m.url)),
    )
    .map((m) => ({
      type: ['video', 'gif', 'animated_gif'].includes(m.type) ? 'video' : 'image',
      url: mediaUrl(m.url),
      posterUrl: mediaUrl(m.posterUrl || poster),
    }))
    .filter((m) => m.url);
  if (!result.length) {
    const image =
      mediaUrl(record.imageUrl) ||
      (record.platform === 'youtube' ? youtubeThumbnailUrl(record.url) : null);
    if (image) result.push({ type: 'image', url: image, posterUrl: undefined });
  }
  const unique = new Map();
  for (const media of result) {
    const u = new URL(media.url);
    if (media.type === 'video' && u.hostname === 'v.redd.it' && !/\.(mp4|webm)$/i.test(u.pathname))
      media.type = 'video_link';
    const key = ['preview.redd.it', 'i.redd.it'].includes(u.hostname)
      ? 'reddit:' + u.pathname
      : media.url;
    if (!unique.has(key)) unique.set(key, media);
  }
  return [...unique.values()].slice(0, 4);
}
