export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = 'country-search-history';
const DEFAULT_LIMIT = 5;

function getBrowserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export class SearchHistory {
  private readonly storage: StorageLike | undefined;
  private readonly limit: number;

  constructor(
    storage: StorageLike | undefined = getBrowserStorage(),
    limit = DEFAULT_LIMIT,
  ) {
    this.storage = storage;
    this.limit = Math.max(1, limit);
  }

  public getRecent(): string[] {
    if (!this.storage) return [];
    try {
      const serialized = this.storage.getItem(STORAGE_KEY);
      if (!serialized) return [];
      const parsed: unknown = JSON.parse(serialized);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .slice(0, this.limit);
    } catch {
      return [];
    }
  }

  public add(query: string): void {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !this.storage) return;

    const recent = this.getRecent().filter(
      (item) => item.toLowerCase() !== normalizedQuery.toLowerCase(),
    );
    recent.unshift(normalizedQuery);
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, this.limit)));
    } catch {
      // Private browsing and browser storage policies may prevent persistence.
    }
  }

  public clear(): void {
    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // A failed clear should not break searching.
    }
  }
}
