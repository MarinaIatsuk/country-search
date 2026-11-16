import { searchCountries } from './countries.js';

type SearchFunction = (query: string, signal: AbortSignal) => Promise<unknown[]>;

interface InFlightRequest {
  controller: AbortController;
  subscribers: Set<symbol>;
  promise: Promise<unknown[]>;
}

function getAbortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
}

export class CountrySearchRepository {
  private readonly fetcher: SearchFunction;
  private readonly cache = new Map<string, unknown[]>();
  private readonly inFlight = new Map<string, InFlightRequest>();

  constructor(fetcher: SearchFunction = searchCountries) {
    this.fetcher = fetcher;
  }

  public search(query: string, signal: AbortSignal): Promise<unknown[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return Promise.resolve([]);
    if (signal.aborted) return Promise.reject(getAbortReason(signal));

    const key = normalizedQuery.toLowerCase();
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached.slice());

    let request = this.inFlight.get(key);
    if (!request) {
      request = this.createRequest(key, normalizedQuery);
    }

    return this.subscribe(key, request, signal);
  }

  private createRequest(key: string, query: string): InFlightRequest {
    const controller = new AbortController();
    const request: InFlightRequest = {
      controller,
      subscribers: new Set<symbol>(),
      promise: Promise.resolve([]),
    };

    request.promise = this.fetcher(query, controller.signal)
      .then((results) => {
        this.cache.set(key, results.slice());
        return results;
      })
      .finally(() => {
        if (this.inFlight.get(key) === request) this.inFlight.delete(key);
      });
    this.inFlight.set(key, request);
    return request;
  }

  private subscribe(
    key: string,
    request: InFlightRequest,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    const subscriber = Symbol(key);
    request.subscribers.add(subscriber);

    return new Promise<unknown[]>((resolve, reject) => {
      let settled = false;
      const unsubscribe = (): void => {
        signal.removeEventListener('abort', onAbort);
        request.subscribers.delete(subscriber);
      };
      const onAbort = (): void => {
        if (settled) return;
        settled = true;
        unsubscribe();
        reject(getAbortReason(signal));
        if (request.subscribers.size === 0 && this.inFlight.get(key) === request) {
          this.inFlight.delete(key);
          request.controller.abort();
        }
      };

      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
        return;
      }

      request.promise.then(
        (results) => {
          if (settled) return;
          settled = true;
          unsubscribe();
          resolve(results.slice());
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          unsubscribe();
          reject(error);
        },
      );
    });
  }
}
