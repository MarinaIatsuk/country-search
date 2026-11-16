import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/api/countries.js';
import { CountrySearchController } from '../src/search/country-search-controller.js';
import type { Country, SearchViewState } from '../src/types.js';

const country = (name: string): Country => ({
  name,
  officialName: name,
  flagUrl: '',
  flagEmoji: '',
  capital: '',
  region: 'Europe',
  subregion: '',
  population: 1,
  area: null,
  borders: [],
  languages: [],
  currencies: [],
  description: `${name} details`,
});

async function runDebounce(): Promise<void> {
  await vi.advanceTimersByTimeAsync(350);
}

afterEach(() => vi.useRealTimers());

describe('CountrySearchController error states', () => {
  it('shows an empty state when the search returns no matches', async () => {
    vi.useFakeTimers();
    const states: SearchViewState[] = [];
    const controller = new CountrySearchController(
      (state) => states.push(state),
      vi.fn().mockResolvedValue([]),
    );

    controller.onQueryChange('no match');
    await runDebounce();

    expect(states.at(-1)?.status).toBe('empty');
    expect(states.at(-1)?.errorMessage).toBe('');
  });

  it('does not show a user-cancelled request as an error', async () => {
    vi.useFakeTimers();
    const states: SearchViewState[] = [];
    const search = vi.fn(
      (_query: string, signal: AbortSignal) =>
        new Promise<unknown[]>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    );
    const controller = new CountrySearchController((state) => states.push(state), search);

    controller.onQueryChange('sp');
    await runDebounce();
    controller.onQueryChange('spa');

    expect(states.at(-1)?.status).toBe('loading');
    expect(states.at(-1)?.errorMessage).toBe('');
    expect(search.mock.calls[0]?.[1].aborted).toBe(true);
  });

  it('shows timeout and HTTP failures with a retryable error state', async () => {
    vi.useFakeTimers();
    const states: SearchViewState[] = [];
    const search = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'))
      .mockRejectedValueOnce(new HttpError(503));
    const controller = new CountrySearchController((state) => states.push(state), search);

    controller.onQueryChange('France');
    await runDebounce();
    expect(states.at(-1)?.status).toBe('error');
    expect(states.at(-1)?.errorMessage).toContain('времени');

    controller.retry();
    await Promise.resolve();
    expect(states.at(-1)?.status).toBe('error');
    expect(states.at(-1)?.errorMessage).toContain('503');
    expect(search.mock.calls.map(([query]) => query)).toEqual(['France', 'France']);
  });

  it('can be destroyed without allowing later work to update the view', async () => {
    vi.useFakeTimers();
    const states: SearchViewState[] = [];
    const controller = new CountrySearchController(
      (state) => states.push(state),
      vi.fn().mockResolvedValue([country('France')]),
    );

    controller.onQueryChange('France');
    controller.destroy();
    await runDebounce();

    expect(states.at(-1)?.status).toBe('idle');
  });
});
