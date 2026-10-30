// -----------------------------------------------------------------------------
// The API parsing and the park time, on the real answers of ThemeParks.wiki.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLive, parseSchedule, resolvePark } from '../src/api.js';
import { normalizeConfig } from '../src/config.js';
import { averageWait } from '../src/devices.js';
import { hoursText, localDate, openAt } from '../src/time.js';
import { ASTERIX, DLP, FIXTURE_TIME, fixtureJson } from './helpers/world.js';

const parkList = (fixtureJson('destinations.json').destinations ?? []).flatMap((destination) =>
  destination.parks.map((park) => ({ ...park, destination: destination.name })),
);

test('the live data: attractions only, statuses, posted waits', () => {
  const live = parseLive(fixtureJson('disneyland-park-live.json'));
  assert.equal(live.name, 'Disneyland Park');
  assert.equal(live.timezone, 'Europe/Paris');
  assert.equal(live.attractions.length, 37);
  const buzz = live.attractions.find((a) => a.name === 'Buzz Lightyear Laser Blast');
  assert.deepEqual(buzz, {
    id: '03992704-698d-474b-a721-a5ac3498edb9',
    name: 'Buzz Lightyear Laser Blast',
    status: 'OPERATING',
    wait: 35,
  });
  assert.equal(averageWait(live.attractions), 28);
});

test('a status the API adds later reads as unknown; a missing wait as null', () => {
  const live = parseLive({
    liveData: [
      { id: 'a', name: 'A', entityType: 'ATTRACTION', status: 'BOARDING_GROUPS' },
      { id: 'b', name: 'B', entityType: 'SHOW', status: 'OPERATING' },
    ],
  });
  assert.deepEqual(live.attractions, [{ id: 'a', name: 'A', status: 'UNKNOWN', wait: null }]);
  assert.deepEqual(parseLive(null).attractions, []);
});

test('the schedule: hours of the day at the park, open or not', () => {
  const { slots, timezone } = parseSchedule(fixtureJson('parc-asterix-schedule.json'));
  assert.equal(timezone, 'Europe/Paris');
  assert.equal(hoursText(slots, FIXTURE_TIME, timezone), '09:00–18:00');
  assert.equal(openAt(slots, FIXTURE_TIME), 1);
  // The evening event (TICKETED_EVENT) is not the park's opening.
  assert.equal(openAt(slots, Date.UTC(2026, 9, 30, 19, 0, 0)), 0);
  // Read from another time zone: the hours stay the park's.
  const dlp = parseSchedule(fixtureJson('disneyland-park-schedule.json'));
  assert.equal(hoursText(dlp.slots, FIXTURE_TIME, 'Europe/Paris'), '09:00–22:00');
  assert.equal(localDate(Date.UTC(2026, 9, 30, 23, 30), 'Europe/Paris'), '2026-10-31');
  assert.equal(localDate(Date.UTC(2026, 9, 30, 23, 30), 'Bad/Zone'), '2026-10-31');
});

test('a park typed by name, destination or id', () => {
  const ids = (text) => resolvePark(parkList, text).map((park) => park.id);
  assert.deepEqual(ids('Parc Astérix'), [ASTERIX]);
  assert.deepEqual(ids('  PARC ASTERIX '), [ASTERIX]);
  assert.deepEqual(ids(DLP.toUpperCase()), [DLP]);
  assert.equal(ids('Disneyland Paris').length, 2);
  assert.deepEqual(ids('Magic Kingdom').length, 1);
  assert.deepEqual(ids('Park'), [], 'too many parks contain it');
  assert.deepEqual(ids('ab'), []);
  assert.deepEqual(ids('Atlantis Nowhere'), []);
});

test('the configuration: known park ids only, other parks split and deduplicated', () => {
  const config = normalizeConfig({
    parks: JSON.stringify([ASTERIX, 'unknown']),
    other_parks: 'Magic Kingdom Park; magic kingdom park\nTokyo DisneySea, ',
    refresh_interval: '60',
    language: 'it',
  });
  assert.deepEqual(config, {
    parks: [ASTERIX],
    otherParks: ['Magic Kingdom Park', 'Tokyo DisneySea'],
    language: 'fr',
    refreshSeconds: 300,
  });
});
