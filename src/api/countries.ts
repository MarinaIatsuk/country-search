const API_BASE_URL = 'https://countries.dev/name';
export const REQUEST_TIMEOUT_MS = 10_000;

export class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message = `Country API request failed (${status})`) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function searchCountries(
  query: string,
  signal: AbortSignal,
): Promise<unknown[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const requestSignal = AbortSignal.any([
    signal,
    AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  ]);
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(normalizedQuery)}`, {
    signal: requestSignal,
  });

  if (response.status === 404) return [];
  if (!response.ok) throw new HttpError(response.status);

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Country API returned an unexpected response format.');
  }

  return payload;
}
