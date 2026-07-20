import type { ProductRepository, EventQuery } from './data/repository.js';
export function queryDailyTop(
  repository: ProductRepository,
  filters: EventQuery,
  now?: number,
): ReturnType<ProductRepository['queryEvents']>;
