export interface Country {
  name: string;
  officialName: string;
  flagUrl: string;
  flagEmoji: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  area: number | null;
  borders: string[];
  languages: string[];
  currencies: string[];
  description: string;
}

export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface SearchViewState {
  status: SearchStatus;
  query: string;
  countries: Country[];
  errorMessage: string;
}
