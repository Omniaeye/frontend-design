import { RecordMedia } from './RecordMedia';
import { mediaUrl } from '../media.mjs';
export type SocialRecord = {
  platform?: string;
  account?: {
    avatarUrl?: string;
    handle?: string;
    displayName?: string;
    canonicalProfileUrl?: string;
  };
  content?: { text?: string; canonicalUrl?: string; type?: string };
  media?: any[];
  contexts?: Array<{ relation: string; record: SocialRecord }>;
  mutation?: { type?: string };
};
const actions: Record<string, string> = {
  repost: 'Reposted',
  quote: 'Quoted',
  reply: 'Replied',
  pin: 'Pinned',
  unpin: 'Unpinned',
  delete: 'Deleted',
  deleted: 'Deleted',
  tweet_deleted: 'Deleted',
};
export function socialAction(record?: SocialRecord) {
  return actions[record?.mutation?.type || record?.content?.type || ''] || '';
}
export function SocialContext({ record, depth = 0 }: { record?: SocialRecord; depth?: number }) {
  if (!record || depth > 2) return null;
  return (
    <>
      {record.contexts?.map(({ relation, record: child }, index) => {
        const author = child.account || {};
        const avatar = mediaUrl(author.avatarUrl);
        const url = child.content?.canonicalUrl || author.canonicalProfileUrl;
        return (
          <div className="social-context" key={`${relation}:${url || index}`}>
            <div className="social-context-author">
              {avatar && (
                <img
                  src={avatar}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.hidden = true;
                  }}
                />
              )}
              {url ? (
                <a href={url} target="_blank" rel="noreferrer">
                  {author.displayName || author.handle || 'Original post'} ↗
                </a>
              ) : (
                <span>{author.displayName || author.handle || 'Original post'}</span>
              )}
              {author.handle && <small>@{author.handle.replace(/^@/, '')}</small>}
            </div>
            {child.content?.text && <p>{child.content.text}</p>}
            <RecordMedia record={child} url={url || ''} />
            <SocialContext record={child} depth={depth + 1} />
          </div>
        );
      })}
    </>
  );
}
