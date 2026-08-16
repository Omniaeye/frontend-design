export interface Panel {
  coverage: 'all' | 'following';
  relationship: 'any' | 'linked' | 'shared';
  topicWords: string;
  allWords: string;
  anyWords: string;
  phrases: string;
  notWords: string;
  searchFields: string[];
  matchScope: 'same' | 'across';
  mediaFilter: 'all' | 'image' | 'video' | 'any';
  id: string;
  name: string;
  kind: 'news' | 'top' | 'tokens';
  companies: string[] | null;
  platforms: string[];
  profiles: string[];
  types: string[];
  categories: string[];
  reddit: string[];
  query: string;
  exclude: string;
  media: 'full' | 'compact' | 'hidden';
  soundData: string;
  soundName: string;
  sound: string;
  volume: number;
  cooldown: number;
}
export interface TerminalState {
  version: number;
  active: string;
  presets: Panel[];
  soundData: string;
  soundName: string;
  workspaces: Array<{ id: string; name: string; panels: Panel[] }>;
}
export function panel(value?: Partial<Panel>): Panel;
export function standard(): TerminalState;
export function normalizeTerminal(value: unknown): TerminalState;
export function newItems(
  previous: Set<string> | null,
  items: Array<{ id: string }>,
): { ids: Set<string>; fresh: Array<{ id: string }> };
