import type { Panel } from './model.js';
export function terms(value: unknown): string[];
export function contains(text: unknown, term: string): boolean;
export function matchRules(event: any, p: Panel): { matched: boolean; reason: string };
