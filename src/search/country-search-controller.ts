import { HttpError, searchCountries } from '../api/countries.js';
import { mapCountryResponse } from '../api/map-country-response.js';
import { debounce } from '../utils/debounce.js';
import type { Country, SearchViewState } from '../types.js';

export type SearchFunction = (query: string, signal: AbortSignal) => Promise<unknown[]>;
export type StateListener = (state: SearchViewState) => void;

const DEBOUNCE_DELAY_MS = 350;

function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('name' in error)) return undefined;
  return typeof error.name === 'string' ? error.name : undefined;
}

function errorMessage(error: unknown): string {
  if (errorName(error) === 'TimeoutError') {
    return 'Запрос занял слишком много времени. Проверьте соединение и попробуйте ещё раз.';
  }
  if (error instanceof HttpError) {
    return `Сервер вернул ошибку ${error.status}. Попробуйте ещё раз.`;
  }
  return 'Не удалось загрузить страны. Проверьте подключение и попробуйте ещё раз.';
}

export class CountrySearchController {
  private readonly onState: StateListener;
  private readonly search: SearchFunction;
  private readonly scheduleSearch: (query: string, version: number) => void;
  private currentState: SearchViewState = {
    status: 'idle',
    query: '',
    countries: [],
    errorMessage: '',
  };
  private latestQuery = '';
  private version = 0;
  private activeController: AbortController | undefined;

  constructor(
    onState: StateListener,
    search: SearchFunction = searchCountries,
    delay = DEBOUNCE_DELAY_MS,
  ) {
    this.onState = onState;
    this.search = search;
    this.scheduleSearch = debounce((query: string, version: number) => {
      if (version === this.version) void this.performSearch(query, version);
    }, delay);
    this.onState(this.currentState);
  }

  public onQueryChange(query: string): void {
    this.latestQuery = query.trim();
    this.version += 1;
    this.abortActiveRequest();

    if (!this.latestQuery) {
      this.updateState({ status: 'idle', query: '', countries: [], errorMessage: '' });
      return;
    }

    this.updateState({
      status: 'loading',
      query: this.latestQuery,
      countries: [],
      errorMessage: '',
    });
    this.scheduleSearch(this.latestQuery, this.version);
  }

  public retry(): void {
    if (!this.latestQuery) return;
    this.version += 1;
    this.abortActiveRequest();
    const requestVersion = this.version;
    this.updateState({
      status: 'loading',
      query: this.latestQuery,
      countries: [],
      errorMessage: '',
    });
    void this.performSearch(this.latestQuery, requestVersion);
  }

  public destroy(): void {
    this.version += 1;
    this.latestQuery = '';
    this.abortActiveRequest();
    this.updateState({ status: 'idle', query: '', countries: [], errorMessage: '' });
  }

  private abortActiveRequest(): void {
    this.activeController?.abort();
    this.activeController = undefined;
  }

  private updateState(nextState: SearchViewState): void {
    this.currentState = nextState;
    this.onState(nextState);
  }

  private async performSearch(query: string, requestVersion: number): Promise<void> {
    if (requestVersion !== this.version || !query) return;
    const requestController = new AbortController();
    this.activeController = requestController;

    try {
      const rawCountries = await this.search(query, requestController.signal);
      if (requestVersion !== this.version || requestController.signal.aborted) return;
      const countries: Country[] = rawCountries.map(mapCountryResponse);
      this.updateState({
        status: countries.length > 0 ? 'success' : 'empty',
        query,
        countries,
        errorMessage: '',
      });
    } catch (error: unknown) {
      if (requestVersion !== this.version || errorName(error) === 'AbortError') return;
      if (error instanceof HttpError && error.status === 404) {
        this.updateState({ status: 'empty', query, countries: [], errorMessage: '' });
        return;
      }
      this.updateState({
        status: 'error',
        query,
        countries: [],
        errorMessage: errorMessage(error),
      });
    } finally {
      if (this.activeController === requestController) this.activeController = undefined;
    }
  }
}
