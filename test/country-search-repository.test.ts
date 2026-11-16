import { describe, expect, it, vi } from 'vitest';
import { CountrySearchRepository } from '../src/api/country-search-repository.js';

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

describe('CountrySearchRepository', () => {
  it('caches completed results by case-insensitive query', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ name: 'France' }]);
    const repository = new CountrySearchRepository(fetcher);

    await expect(
      repository.search('France', new AbortController().signal),
    ).resolves.toEqual([{ name: 'France' }]);
    await expect(
      repository.search('FRANCE', new AbortController().signal),
    ).resolves.toEqual([{ name: 'France' }]);

    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('deduplicates identical in-flight requests without sharing caller cancellation', async () => {
    let resolveRequest: ((value: unknown[]) => void) | undefined;
    let sharedSignal: AbortSignal | undefined;
    const fetcher = vi.fn((_query: string, signal: AbortSignal) => {
      sharedSignal = signal;
      return new Promise<unknown[]>((resolve) => {
        resolveRequest = resolve;
      });
    });
    const repository = new CountrySearchRepository(fetcher);
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = repository.search('Japan', firstController.signal);
    const second = repository.search('Japan', secondController.signal);

    expect(fetcher).toHaveBeenCalledOnce();
    firstController.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(sharedSignal?.aborted).toBe(false);

    resolveRequest?.([{ name: 'Japan' }]);
    await expect(second).resolves.toEqual([{ name: 'Japan' }]);
  });

  it('starts a fresh request when the same query is retried after cancellation', async () => {
    const resolvers: Array<(value: unknown[]) => void> = [];
    const fetcher = vi.fn(
      (_query: string, signal: AbortSignal) =>
        new Promise<unknown[]>((resolve, reject) => {
          resolvers.push(resolve);
          signal.addEventListener('abort', () => reject(signal.reason ?? abortError()), {
            once: true,
          });
        }),
    );
    const repository = new CountrySearchRepository(fetcher);
    const firstCaller = new AbortController();
    const firstRequest = repository.search('Chile', firstCaller.signal);

    firstCaller.abort();
    const retry = repository.search('Chile', new AbortController().signal);
    await expect(firstRequest).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetcher).toHaveBeenCalledTimes(2);

    resolvers[1]?.([{ name: 'Chile' }]);
    await expect(retry).resolves.toEqual([{ name: 'Chile' }]);
  });

  it('aborts the shared fetch when its last subscriber cancels', async () => {
    let sharedSignal: AbortSignal | undefined;
    const fetcher = vi.fn((_query: string, signal: AbortSignal) => {
      sharedSignal = signal;
      return new Promise<unknown[]>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason ?? abortError()), {
          once: true,
        });
      });
    });
    const repository = new CountrySearchRepository(fetcher);
    const caller = new AbortController();
    const result = repository.search('Chile', caller.signal);

    caller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(sharedSignal?.aborted).toBe(true);
  });
});
