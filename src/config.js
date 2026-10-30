// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

import { PARKS } from './parks.js';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// Seconds between two readings of a park. ThemeParks.wiki refreshes its cache
// every few minutes and asks not to poll live data more than once every five
// minutes: five minutes is the floor. The integration drives its own timer
// (devices are published with should_poll: false, the core only polls up to
// one minute).
export const REFRESH_INTERVALS = ['300', '600', '900'];

export const DEFAULT_CONFIG = {
  parks: [],
  other_parks: '',
  language: 'fr',
  refresh_interval: '300',
};

const PARK_IDS = PARKS.map((park) => park.id);

/** A list from the form: an array, tolerating a JSON or comma-separated string. */
function listOf(value) {
  let list = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      list = value.split(',');
    }
  }
  return Array.isArray(list) ? list.map((item) => String(item).trim()).filter(Boolean) : [];
}

/** The other parks typed by the user: names or ids, separated by commas, semicolons or lines. */
export function otherParksOf(value) {
  if (typeof value !== 'string') {
    return [];
  }
  const seen = new Set();
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item && !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()));
}

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const interval = REFRESH_INTERVALS.includes(String(source.refresh_interval))
    ? String(source.refresh_interval)
    : DEFAULT_CONFIG.refresh_interval;
  const wanted = listOf(source.parks);
  return {
    parks: PARK_IDS.filter((id) => wanted.includes(id)),
    otherParks: otherParksOf(source.other_parks),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
    refreshSeconds: Number(interval),
  };
}
