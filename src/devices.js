// -----------------------------------------------------------------------------
// The Gladys devices: one per park, one per attraction.
//
// Park
//   open          input/binary             1 = inside today's opening hours
//   hours         text/text                today's hours, at the park's time
//   average_wait  duration/integer (min)   mean posted wait of the rides in service
//   down          counter-sensor/integer   attractions down (breakdown)
//
// Attraction
//   wait          duration/integer (min)   posted standby wait (0 when not in service)
//   operating     input/binary             1 = in service
//   status        text/text                in service, down, closed, refurbishment
//
// Read-only, no polling: the integration reads the API on its own timer
// (src/service.js), Gladys never polls (`should_poll: false`). The bounds are
// display bounds (gauges, charts).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
  DEVICE_FEATURE_UNITS as U,
} from '@gladysassistant/integration-sdk';
import { NAMES, TEXT, say } from './messages.js';
import { hoursText, openAt } from './time.js';

export const PARK_TYPE = 'park';
export const ATTRACTION_TYPE = 'attraction';
export const MAX_DEVICE_NAME = 80;
// Display bounds: a posted wait beyond five hours does not happen.
export const MAX_WAIT = 300;
export const MAX_DOWN = 200;

export const PARK_FEATURES = ['open', 'hours', 'average_wait', 'down'];
export const ATTRACTION_FEATURES = ['wait', 'operating', 'status'];
// Text features take `{ text }` states, never `{ state }`.
export const TEXT_FEATURES = new Set(['hours', 'status']);

/** Shortens a text to `max` characters, with an ellipsis. */
export function clip(text, max) {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

const DEFINITIONS = {
  open: { category: C.INPUT, type: T.SENSOR.BINARY, min: 0, max: 1 },
  hours: { category: C.TEXT, type: T.TEXT.TEXT, min: 0, max: 0 },
  average_wait: {
    category: C.DURATION,
    type: T.DURATION.INTEGER,
    unit: U.MINUTES,
    min: 0,
    max: MAX_WAIT,
  },
  down: { category: C.COUNTER_SENSOR, type: T.SENSOR.INTEGER, min: 0, max: MAX_DOWN },
  wait: {
    category: C.DURATION,
    type: T.DURATION.INTEGER,
    unit: U.MINUTES,
    min: 0,
    max: MAX_WAIT,
  },
  operating: { category: C.INPUT, type: T.SENSOR.BINARY, min: 0, max: 1 },
  status: { category: C.TEXT, type: T.TEXT.TEXT, min: 0, max: 0 },
};

function features(ids, keys, language) {
  const names = NAMES[language] ?? NAMES.en;
  return keys.map((key) => ({
    name: names[key],
    external_id: ids.feature(key),
    ...DEFINITIONS[key],
    read_only: true,
    has_feedback: false,
  }));
}

export const parkIds = (gladys, parkId) => gladys.externalIds(PARK_TYPE, parkId);
export const attractionIds = (gladys, attractionId) =>
  gladys.externalIds(ATTRACTION_TYPE, attractionId);

/** The device of a park. */
export function buildParkDevice(gladys, park, language) {
  const ids = parkIds(gladys, park.id);
  return {
    name: clip(park.name, MAX_DEVICE_NAME),
    external_id: ids.device,
    should_poll: false,
    params: [{ name: 'park_id', value: park.id }],
    features: features(ids, PARK_FEATURES, language),
  };
}

/** The device of an attraction: "Disneyland Park · Big Thunder Mountain". */
export function buildAttractionDevice(gladys, park, attraction, language) {
  const ids = attractionIds(gladys, attraction.id);
  return {
    name: clip(`${park.name} · ${attraction.name}`, MAX_DEVICE_NAME),
    external_id: ids.device,
    should_poll: false,
    params: [
      { name: 'park_id', value: park.id },
      { name: 'attraction_id', value: attraction.id },
    ],
    features: features(ids, ATTRACTION_FEATURES, language),
  };
}

/** Mean posted wait of the rides in service that post one (0 when none), in minutes. */
export function averageWait(attractions) {
  const waits = (attractions ?? [])
    .filter((a) => a.status === 'OPERATING' && a.wait !== null && a.wait > 0)
    .map((a) => a.wait);
  return waits.length === 0
    ? 0
    : Math.round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length);
}

export const downCount = (attractions) =>
  (attractions ?? []).filter((a) => a.status === 'DOWN').length;

/** The wait a feature shows: the posted one in service, 0 otherwise, null if unknown. */
export const waitValue = (attraction) => (attraction.status === 'OPERATING' ? attraction.wait : 0);

/** "en service", "en panne"… */
export const statusText = (attraction, language) =>
  say(TEXT, language, `status_${attraction.status}`);

const toState = (ids, key, value) =>
  TEXT_FEATURES.has(key)
    ? { device_feature_external_id: ids.feature(key), text: value }
    : { device_feature_external_id: ids.feature(key), state: value };

/** The states of a park device, at `now`. */
export function parkStates(gladys, park, now, language) {
  const ids = parkIds(gladys, park.id);
  const values = {
    open: park.slots ? openAt(park.slots, now) : null,
    hours: park.slots
      ? (hoursText(park.slots, now, park.timezone) ?? say(TEXT, language, 'closedToday'))
      : say(TEXT, language, 'noHours'),
    average_wait: park.attractions ? Math.min(MAX_WAIT, averageWait(park.attractions)) : null,
    down: park.attractions ? Math.min(MAX_DOWN, downCount(park.attractions)) : null,
  };
  return PARK_FEATURES.filter((key) => values[key] !== null).map((key) =>
    toState(ids, key, values[key]),
  );
}

/** The states of an attraction device. */
export function attractionStates(gladys, attraction, language) {
  const ids = attractionIds(gladys, attraction.id);
  const wait = waitValue(attraction);
  const values = {
    wait: wait === null ? null : Math.min(MAX_WAIT, wait),
    operating: attraction.status === 'OPERATING' ? 1 : 0,
    status: statusText(attraction, language),
  };
  return ATTRACTION_FEATURES.filter((key) => values[key] !== null).map((key) =>
    toState(ids, key, values[key]),
  );
}
