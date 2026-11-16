import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError, searchCountries } from '../src/api/countries.js';

const COUNTRY = { name: 'United States', capital: 'Washington' };

afterEach(() => vi.unstubAllGlobals());

describe('searchCountries', () => {
  it('requests the encoded query and returns the API payload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([COUNTRY]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchCountries('United States', new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://countries.dev/name/United%20States',
    );
    expect(results).toEqual([COUNTRY]);
  });

  it('treats a 404 as an empty result rather than an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Country not found', { status: 404 })),
    );

    await expect(
      searchCountries('no-such-country', new AbortController().signal),
    ).resolves.toEqual([]);
  });

  it('throws HttpError for other unsuccessful HTTP responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })),
    );

    const request = searchCountries('France', new AbortController().signal);
    await expect(request).rejects.toBeInstanceOf(HttpError);
    await expect(request).rejects.toMatchObject({ status: 503 });
  });

  it('does not send a request for a blank query', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchCountries('  ', new AbortController().signal)).resolves.toEqual(
      [],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
