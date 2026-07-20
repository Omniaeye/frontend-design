// Only server-verified activity can populate a local Hot fallback.
export function queryDailyTop(repository, filters, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const start = Date.parse(`${day}T00:00:00Z`);
  const end = start + 86400000;
  const { since, until, cursor: ignoredCursor, limit, ...query } = filters;
  const seen = new Set();
  const records = [];
  let cursor = null;
  do {
    const page = repository.queryEvents({ ...query, cursor, limit: 200 });
    for (const event of page.items) {
      const published = event.hotActivityAt;
      const time = published ? Date.parse(published) : NaN;
      if (
        !Number.isSafeInteger(event.hotScore) ||
        event.hotScore <= 0 ||
        !Number.isFinite(time) ||
        time < start ||
        time >= end ||
        time > now ||
        seen.has(event.id)
      )
        continue;
      seen.add(event.id);
      records.push(event);
    }
    cursor = page.nextCursor;
  } while (cursor);
  const tokenCount = (event) => (Number.isSafeInteger(event.hotScore) ? event.hotScore : 0);
  records.sort(
    (a, b) =>
      tokenCount(b) - tokenCount(a) ||
      Date.parse(b.hotActivityAt) - Date.parse(a.hotActivityAt) ||
      a.id.localeCompare(b.id),
  );
  const items = records.slice(0, 20);
  return { items, total: items.length, nextCursor: null };
}
