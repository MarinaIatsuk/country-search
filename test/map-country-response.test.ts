import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/api/map-country-response.js';

const rawCountry = {
  name: 'Iceland',
  officialName: 'Republic of Iceland',
  capital: 'Reykjavík',
  region: 'Europe',
  subregion: 'Northern Europe',
  population: 372520,
  area: 103000,
  borders: [],
  flags: { svg: 'https://countries.dev/flags/is.svg' },
  flag: '🇮🇸',
  languages: [{ name: 'Icelandic' }],
  currencies: [{ code: 'ISK', name: 'Icelandic króna', symbol: 'kr' }],
};

describe('mapCountryResponse', () => {
  it('maps the API payload into safe card and detail fields', () => {
    expect(mapCountryResponse(rawCountry)).toEqual({
      name: 'Iceland',
      officialName: 'Republic of Iceland',
      flagUrl: 'https://countries.dev/flags/is.svg',
      flagEmoji: '🇮🇸',
      capital: 'Reykjavík',
      region: 'Europe',
      subregion: 'Northern Europe',
      population: 372520,
      area: 103000,
      borders: [],
      languages: ['Icelandic'],
      currencies: ['Icelandic króna (kr)'],
      description: 'Republic of Iceland is located in Northern Europe.',
    });
  });

  it('handles missing optional data and older array-shaped capitals', () => {
    const mapped = mapCountryResponse({ name: 'Example', capital: ['Capital City'] });
    expect(mapped.name).toBe('Example');
    expect(mapped.capital).toBe('Capital City');
    expect(mapped.flagUrl).toBe('');
    expect(mapped.population).toBe(0);
    expect(mapped.area).toBeNull();
    expect(mapped.languages).toEqual([]);
    expect(mapped.currencies).toEqual([]);
  });

  it('rejects a non-object API value', () => {
    expect(() => mapCountryResponse(null)).toThrow('Country data must be an object.');
  });
});
