import { useState, type ImgHTMLAttributes } from 'react';
import manifest from '../../../public/assets/archive-media/manifest.json';

export function archiveImage(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/assets/')) return url;
  const cached = (manifest as Record<string, string>)[url];
  if (cached) return cached;
  // Live profile updates can arrive after the bundled image catalog was built.
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      [
        'pbs.twimg.com',
        'abs.twimg.com',
        'avatars.githubusercontent.com',
        'yt3.googleusercontent.com',
        'yt3.ggpht.com',
        'i.ytimg.com',
        'styles.redditmedia.com',
        'preview.redd.it',
        'i.redd.it',
      ].includes(parsed.hostname)
    )
      return parsed.href;
  } catch {
    /* Unknown image locations remain unavailable. */
  }
  return undefined;
}

export function ArchiveImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const resolved = archiveImage(src);
  const [failed, setFailed] = useState<string>();
  if (!resolved || failed === resolved) return null;
  return <img {...props} src={resolved} onError={() => setFailed(resolved)} />;
}
