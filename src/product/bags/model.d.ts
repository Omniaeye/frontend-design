export interface PostDraft {
  id: string;
  username: string;
  url: string;
}
export function draftStorageKey(userId?: string | null): string;
export function parsePostUrl(value: string): PostDraft | null;
export function readDrafts(raw: string | null): PostDraft[];
