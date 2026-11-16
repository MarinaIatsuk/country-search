import type { Country } from '../types.js';

type DataRecord = Record<string, unknown>;

function asRecord(value: unknown): DataRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as DataRecord)
    : undefined;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === 'string');
  return [];
}

function getNamedValues(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : Object.values(asRecord(value) ?? {});
  return entries.flatMap((entry) => {
    if (typeof entry === 'string') return [entry];
    const record = asRecord(entry);
    if (!record) return [];
    const name = asString(record.name);
    const symbol = asString(record.symbol);
    if (!name) return [];
    return [symbol ? `${name} (${symbol})` : name];
  });
}

function getCapital(value: unknown): string {
  if (typeof value === 'string') return value;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').join(', ')
    : '';
}

export function mapCountryResponse(raw: unknown): Country {
  const country = asRecord(raw);
  if (!country) throw new Error('Country data must be an object.');

  const name = asString(country.name, 'Unknown country');
  const region = asString(country.region, 'Unknown region');
  const subregion = asString(country.subregion);
  const flags = asRecord(country.flags);
  const flagValue = asString(country.flag);
  const flagUrl =
    asString(flags?.svg) ||
    asString(flags?.png) ||
    (flagValue.startsWith('http') ? flagValue : '');
  const flagEmoji = flagValue && !flagValue.startsWith('http') ? flagValue : '';
  const officialName =
    asString(country.officialName) || asString(country.nativeName) || name;
  const description =
    asString(country.description) ||
    `${officialName} is located in ${subregion || region}.`;
  const population = typeof country.population === 'number' ? country.population : 0;
  const area = typeof country.area === 'number' ? country.area : null;

  return {
    name,
    officialName,
    flagUrl,
    flagEmoji,
    capital: getCapital(country.capital),
    region,
    subregion,
    population,
    area,
    borders: asStringList(country.borders),
    languages: getNamedValues(country.languages),
    currencies: getNamedValues(country.currencies),
    description,
  };
}
