// -----------------------------------------------------------------------------
// ThemeParks.wiki API (https://api.themeparks.wiki/v1, no key): the list of
// destinations (to find a park typed by name), the live data of a park
// (status and posted wait of every attraction) and its schedule.
//
// Terms of use (https://www.themeparks.wiki/terms): an explicit User-Agent,
// live data read at most once every five minutes per park (the service
// refreshes its cache at that pace), 429 answered with Retry-After, and the
// credit "Powered by ThemeParks.wiki" wherever the data is shown.
// -----------------------------------------------------------------------------

import { getBuffer, getJson, parseJson } from './http.js';

export const API = 'https://api.themeparks.wiki/v1';

export const destinationsUrl = () => `${API}/destinations`;
export const liveUrl = (parkId) => `${API}/entity/${parkId}/live`;
export const scheduleUrl = (parkId) => `${API}/entity/${parkId}/schedule`;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Statuses of the API. A value the API adds later reads as "unknown".
export const STATUSES = ['OPERATING', 'DOWN', 'CLOSED', 'REFURBISHMENT'];

/** "Parc Astérix" → "parcasterix": to compare what the user typed with a name. */
export const fold = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/** Every park of the service: `{ id, name, destination }[]`. */
export async function readParkList(fetchImpl) {
  const document = await getJson(fetchImpl, destinationsUrl());
  return (document?.destinations ?? []).flatMap((destination) =>
    (destination.parks ?? [])
      .filter((park) => typeof park?.id === 'string' && park.name)
      .map((park) => ({ id: park.id, name: String(park.name), destination: destination.name })),
  );
}

/**
 * The parks a typed name or id stands for: an id, an exact park name, an
 * exact destination name (all its parks), else a name containing the text
 * when only one park does. Returns [] when nothing (or too much) matches.
 */
export function resolvePark(list, typed) {
  const text = String(typed ?? '').trim();
  if (UUID.test(text)) {
    return list.filter((park) => park.id.toLowerCase() === text.toLowerCase());
  }
  const wanted = fold(text);
  if (wanted.length < 3) {
    return [];
  }
  const exact = list.filter((park) => fold(park.name) === wanted);
  if (exact.length > 0) {
    return exact;
  }
  const destination = list.filter((park) => fold(park.destination) === wanted);
  if (destination.length > 0) {
    return destination;
  }
  const partial = list.filter((park) => fold(park.name).includes(wanted));
  return partial.length === 1 ? partial : [];
}

/** One attraction of the live data: `{ id, name, status, wait }`, wait null when not posted. */
function attractionOf(entry) {
  const wait = entry.queue?.STANDBY?.waitTime;
  return {
    id: entry.id,
    name: String(entry.name ?? '').trim() || entry.id,
    status: STATUSES.includes(entry.status) ? entry.status : 'UNKNOWN',
    wait: Number.isFinite(wait) && wait >= 0 ? Math.round(wait) : null,
  };
}

/** Parses the live document of a park. */
export function parseLive(document) {
  const attractions = (document?.liveData ?? [])
    .filter((entry) => entry?.entityType === 'ATTRACTION' && typeof entry.id === 'string')
    .map(attractionOf);
  return {
    name: typeof document?.name === 'string' ? document.name : null,
    timezone: typeof document?.timezone === 'string' ? document.timezone : null,
    attractions,
  };
}

/** Parses the schedule of a park: `{ timezone, slots: [{ date, type, open, close }] }` (ms). */
export function parseSchedule(document) {
  const slots = (document?.schedule ?? [])
    .map((entry) => ({
      date: entry?.date,
      type: entry?.type,
      open: Date.parse(entry?.openingTime),
      close: Date.parse(entry?.closingTime),
    }))
    .filter(
      (slot) =>
        typeof slot.date === 'string' &&
        Number.isFinite(slot.open) &&
        Number.isFinite(slot.close) &&
        slot.close > slot.open,
    );
  return {
    timezone: typeof document?.timezone === 'string' ? document.timezone : null,
    slots,
  };
}

/**
 * GET a document with its ETag: `{ document, etag }`, document null when the
 * server answered 304 (unchanged since `etag`).
 */
export async function getConditional(fetchImpl, url, etag, now) {
  const result = await getBuffer(fetchImpl, url, { etag, maxBytes: 5e6, now });
  if (result.notModified) {
    return { document: null, etag };
  }
  return { document: parseJson(result.body, url), etag: result.etag };
}
