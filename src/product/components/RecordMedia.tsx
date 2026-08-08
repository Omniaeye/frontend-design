import { useState } from 'react';
import { recordMedia } from '../media.mjs';
import './record-media.css';
type MediaRecord = {
  platform?: string;
  url?: string;
  imageUrl?: string | null;
  media?: any[];
  socialMetadata?: { media?: any[] };
};
function Asset({
  media,
  url,
}: {
  media: { type: string; url: string; posterUrl?: string };
  url: string;
}) {
  const [failed, setFailed] = useState('');
  if (failed)
    return (
      <a
        data-media-error={failed}
        className="media-unavailable"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        View media at source ↗
      </a>
    );
  if (media.type === 'video_link')
    return (
      <a href={url} target="_blank" rel="noreferrer">
        {media.posterUrl && (
          <img
            src={media.posterUrl}
            alt="Video preview"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <span>Watch video ↗</span>
      </a>
    );
  return media.type === 'video' ? (
    <video
      controls
      playsInline
      preload="none"
      poster={media.posterUrl}
      src={media.url}
      onError={(e) => setFailed(String(e.currentTarget.error?.code || 'video'))}
    />
  ) : (
    <a href={url} target="_blank" rel="noreferrer">
      <img
        src={media.url}
        alt="Post media"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed('image')}
      />
    </a>
  );
}
export function RecordMedia({ record, url }: { record: MediaRecord; url: string }) {
  const media = recordMedia(record);
  return media.length ? (
    <div className="record-media">
      {media.map((m: any) => (
        <Asset key={m.url} media={m} url={url} />
      ))}
    </div>
  ) : null;
}
