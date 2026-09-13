export function confirmPost<T extends { id: string }>(options: {
  request: (path: string, body: unknown) => Promise<{ post: T }>;
  previewId: string;
  onConfirmed: (post: T) => void;
  refresh: () => Promise<void>;
}): Promise<T>;
export function mergeConfirmedPost<T extends { id: string }>(posts: T[], post: T): T[];
