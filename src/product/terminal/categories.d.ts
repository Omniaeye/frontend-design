export function eventCategories(
  events: Array<{ platform: string; eventType: string }>,
  platforms: Array<{ id: string; label: string }>,
): Array<{ id: string; label: string; types: string[] }>;
export function typeLabel(value: string): string;
export function matchesCategory(
  event: { platform: string; eventType: string; redditView?: string },
  selections: string[],
): boolean;
export function movePanel<T extends { id: string }>(
  panels: T[],
  id: string,
  direction: number,
): T[];
