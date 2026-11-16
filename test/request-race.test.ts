import { afterEach, describe, expect, it, vi } from 'vitest';
import { CountrySearchController } from '../src/search/country-search-controller.js';
import type { SearchViewState } from '../src/types.js';

interface PendingRequest {
  query: string;
  signal: AbortSignal;
  resolve: (value: unknown[]) => void;
  reject: (reason: unknown) => void;
}

async function waitForDebounce(): Promise<void> {
  await vi.advanceTimersByTimeAsync(350);
}

afterEach(() => vi.useRealTimers());

describe('country request races', () => {
  it('aborts the old fetch immediately and keeps only the newest result', async () => {
    vi.useFakeTimers();
    const states: SearchViewState[] = [];
    const pending: PendingRequest[] = [];
    const search = vi.fn(
      (query: string, signal: AbortSignal) =>
        new Promise<unknown[]>((resolve, reject) => {
          const request = { query, signal, resolve, reject };
          pending.push(request);
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
          if (signal.aborted) reject(signal.reason);
        }),
    );
    const controller = new CountrySearchController((state) => states.push(state), search);

    controller.onQueryChange('sp');
    await waitForDebounce();
    expect(pending).toHaveLength(1);

    controller.onQueryChange('spain');
    expect(pending[0]?.signal.aborted).toBe(true);
    await waitForDebounce();
    expect(pending.map(({ query }) => query)).toEqual(['sp', 'spain']);

    pending[1]?.resolve([{ name: 'Spain', region: 'Europe' }]);
    await Promise.resolve();
    pending[0]?.resolve([{ name: 'Old result', region: 'Europe' }]);
    await Promise.resolve();

    expect(states.at(-1)?.status).toBe('success');
    expect(states.at(-1)?.query).toBe('spain');
    expect(states.at(-1)?.countries.map(({ name }) => name)).toEqual(['Spain']);
    expect(states.some(({ status }) => status === 'error')).toBe(false);
  });
});
