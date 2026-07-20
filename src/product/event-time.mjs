const full = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});
const day = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const valid = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function eventTime(event) {
  const published = [event.publishedAt, event.publishedDate].find(valid);
  if (published) {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(published);
    return {
      dateTime: published,
      label: dateOnly
        ? `${day.format(new Date(published))} · time unavailable`
        : `${full.format(new Date(published))} UTC`,
      title: dateOnly ? 'Publication date; source did not provide a time' : 'Published at (UTC)',
    };
  }
  if (valid(event.observedAt))
    return {
      dateTime: event.observedAt,
      label: `Received ${full.format(new Date(event.observedAt))} UTC`,
      title: 'Received at; publication time is unavailable or unverified',
    };
  return {
    dateTime: undefined,
    label: 'Time unavailable',
    title: 'No verified timestamp recorded',
  };
}
