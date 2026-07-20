export function eventTime(event: {
  publishedAt?: string | null;
  publishedDate?: string | null;
  observedAt?: string | null;
}): { dateTime: string | undefined; label: string; title: string };
