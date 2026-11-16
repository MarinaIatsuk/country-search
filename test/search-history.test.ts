import { describe, expect, it } from 'vitest';
import { SearchHistory, type StorageLike } from '../src/ui/search-history.js';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('SearchHistory', () => {
  it('stores unique recent searches newest-first and limits the list', () => {
    const storage = new MemoryStorage();
    const history = new SearchHistory(storage, 3);

    history.add('France');
    history.add('Japan');
    history.add('france');
    history.add('Chile');
    history.add('Canada');

    expect(history.getRecent()).toEqual(['Canada', 'Chile', 'france']);
  });

  it('returns an empty history when stored JSON is invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem('country-search-history', '{not-json');

    expect(new SearchHistory(storage).getRecent()).toEqual([]);
  });

  it('works when browser storage is unavailable or throws', () => {
    const brokenStorage: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const history = new SearchHistory(brokenStorage);

    expect(history.getRecent()).toEqual([]);
    expect(() => history.add('Norway')).not.toThrow();
  });
});
