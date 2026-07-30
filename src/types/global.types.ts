export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

/** Utility: makes every field of T optional except the given keys. */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;
