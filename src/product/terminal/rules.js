// Literal matching over explicitly selected fields. No inferred synonyms or affiliations.
export const terms = (value) =>
  String(value || '')
    .split(',')
    .map((x) => x.normalize('NFKC').trim().toLowerCase())
    .filter(Boolean);
export function contains(text, term) {
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<![\\p{L}\\p{N}_$])' + escape(term) + '(?![\\p{L}\\p{N}_])', 'iu').test(
    String(text || '').normalize('NFKC'),
  );
}
export function fieldsFor(event, fields) {
  const rows = [];
  const social = event.socialMetadata;
  for (const field of fields) {
    if (field === 'text')
      rows.push({
        field,
        text:
          event.kind === 'token'
            ? String(event.description || '')
            : String(social?.content?.text || event.body || event.title || ''),
      });
    if (field === 'context') {
      const visit = (r, depth = 0) => {
        if (depth > 2) return;
        for (const c of r?.contexts || []) {
          rows.push({ field, text: c.record?.content?.text || '' });
          visit(c.record, depth + 1);
        }
      };
      visit(social);
    }
    if (field === 'author')
      rows.push({
        field,
        text: [social?.account?.handle, social?.account?.displayName, event.sourceLabel]
          .filter(Boolean)
          .join(' '),
      });
    if (field === 'token')
      rows.push({
        field,
        text: [event.name, event.ticker, event.description].filter(Boolean).join(' '),
      });
  }
  return rows;
}
export function matchRules(event, p) {
  const links = Number(
    event.hotScore || event.relatedTokenCount || event.relatedTokens?.length || 0,
  );
  if (p.relationship === 'linked' && links < 1)
    return { matched: false, reason: 'No direct token link' };
  if (p.relationship === 'shared' && links < 2)
    return { matched: false, reason: 'Fewer than two linked tokens' };
  const media = [...(event.media || []), ...(event.socialMetadata?.media || [])];
  if (
    p.mediaFilter === 'image' &&
    !event.imageUrl &&
    !media.some((m) => m.type === 'image' || m.type === 'photo')
  )
    return { matched: false, reason: 'No image' };
  if (p.mediaFilter === 'video' && !media.some((m) => m.type === 'video' || m.type === 'gif'))
    return { matched: false, reason: 'No video' };
  if (p.mediaFilter === 'any' && !event.imageUrl && !media.length)
    return { matched: false, reason: 'No media' };
  const rows = fieldsFor(event, p.searchFields || ['text']),
    topic = terms(p.topicWords),
    all = terms(p.allWords),
    any = terms(p.anyWords),
    phrases = terms(p.phrases),
    excluded = terms(p.notWords);
  if (rows.some((r) => excluded.some((t) => contains(r.text, t))))
    return { matched: false, reason: 'Excluded word' };
  const accepts = (text) =>
    (!topic.length || topic.some((t) => contains(text, t))) &&
    all.every((t) => contains(text, t)) &&
    (!any.length || any.some((t) => contains(text, t))) &&
    phrases.every((t) => contains(text, t));
  const candidates =
    p.matchScope === 'across'
      ? [{ field: 'selected fields', text: rows.map((r) => r.text).join(' ') }]
      : rows;
  // Exact phrases cannot be manufactured across unrelated fields.
  const hit =
    candidates.find((r) => accepts(r.text)) &&
    phrases.every((t) => rows.some((r) => contains(r.text, t)));
  const active = topic.length + all.length + any.length + phrases.length;
  return {
    matched: !active || !!hit,
    reason: active
      ? 'Matched keywords in ' +
        (p.matchScope === 'across'
          ? 'selected fields'
          : candidates.find((r) => accepts(r.text))?.field || 'text')
      : links
        ? `${links} linked token${links === 1 ? '' : 's'}`
        : 'Matches selected filters',
  };
}
