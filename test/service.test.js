// -----------------------------------------------------------------------------
// The integration end to end against the SDK's fake Gladys and the real
// answers of ThemeParks.wiki: discovery, states, triggers, widget, scene
// action, status, the parks typed by name, the integration's own timer.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../src/app.js';
import { STALE_MS } from '../src/service.js';
import {
  ASTERIX,
  DLP,
  action,
  create,
  createClock,
  createFetch,
  createWorld,
  cycle,
  featureId,
  setLive,
  urlOf,
} from './helpers/world.js';

const ASTERIX_LIVE = 'parc-asterix-live.json';
const isPark = (name) => (device) => device.name === name;
const sceneKeys = (world) =>
  world.fake.sceneEvents.map((e) => [
    e.key,
    e.data.attraction_name ?? e.data.park_name,
    e.data.threshold ?? null,
  ]);

test('each chosen park and all its attractions are offered, none created yet', async (t) => {
  const world = await createWorld({ config: { parks: [ASTERIX] } });
  t.after(() => world.app.stop());
  const devices = world.fake.discoveredDevices;
  // The capture lists 50 attractions at Parc Astérix (shows and restaurants left out).
  assert.equal(devices.length, 1 + 50);
  assert.equal(devices[0].name, 'Parc Asterix');
  assert.ok(devices.every((device) => device.should_poll === false));
  assert.ok(devices.some((device) => device.name === 'Parc Asterix · Thunder 2 Zeus'));
  assert.equal(world.fake.states.length, 0);
});

test('a park: open, hours at the park, average wait, rides down', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const park = await create(world, isPark('Parc Asterix'));
  assert.equal(park.external_id, `${world.gladys.externalIds('park', ASTERIX).device}`);
  const last = (key) => world.fake.lastState(featureId(park, key));
  assert.equal(last('open'), 1);
  assert.equal(last('hours'), '09:00–18:00');
  // Mean of the 33 posted waits above zero of the rides in service.
  assert.equal(last('average_wait'), 26);
  assert.equal(last('down'), 0);
  assert.deepEqual(world.fake.widgetRefreshes, ['waits']);
  // At 19:00 the park is closed (the evening event is not the park's hours).
  world.clock.time = Date.UTC(2026, 9, 30, 18, 0, 0);
  await world.service.refresh();
  assert.equal(last('open'), 0);
  // Another day without a slot in the schedule: closed today.
  world.clock.time = Date.UTC(2026, 10, 20, 12, 0, 0);
  setLive(world, ASTERIX_LIVE, 'Thunder 2 Zeus', { status: 'CLOSED' });
  world.network.routes[urlOf('parc-asterix-schedule.json')] = {
    ...world.network.routes[urlOf('parc-asterix-schedule.json')],
    schedule: [],
  };
  await world.service.refresh();
  assert.equal(last('hours'), "fermé aujourd'hui");
});

test('an attraction: wait, in service, status; 0 minutes when not in service', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const zeus = await create(world, 'Thunder 2 Zeus');
  const last = (key) => world.fake.lastState(featureId(zeus, key));
  assert.equal(last('wait'), 70);
  assert.equal(last('operating'), 1);
  assert.equal(last('status'), 'en service');
  setLive(world, ASTERIX_LIVE, 'Thunder 2 Zeus', { status: 'DOWN', wait: null });
  await cycle(world);
  assert.equal(last('wait'), 0);
  assert.equal(last('operating'), 0);
  assert.equal(last('status'), 'en panne');
  // A ride closed in the capture, without any queue.
  const anubis = await create(world, 'Wrath of Anubis');
  assert.equal(world.fake.lastState(featureId(anubis, 'status')), 'fermée');
  assert.equal(world.fake.lastState(featureId(anubis, 'wait')), 0);
  // A play area in service that posts no wait: no wait invented.
  const play = await create(world, 'Getafix Play Area');
  assert.equal(world.fake.lastState(featureId(play, 'wait')), undefined);
  assert.equal(world.fake.lastState(featureId(play, 'operating')), 1);
});

test('triggers: wait below thresholds, down, back in service', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const zeus = await create(world, 'Thunder 2 Zeus');
  await create(world, 'Osiris');
  setLive(world, ASTERIX_LIVE, 'Thunder 2 Zeus', { wait: 40 });
  await cycle(world);
  setLive(world, ASTERIX_LIVE, 'Thunder 2 Zeus', { status: 'DOWN', wait: null });
  await cycle(world);
  setLive(world, ASTERIX_LIVE, 'Thunder 2 Zeus', { status: 'OPERATING', wait: 10 });
  await cycle(world);
  // An attraction not added: nothing.
  setLive(world, ASTERIX_LIVE, 'Discobelix', { wait: 5 });
  await cycle(world);
  assert.deepEqual(sceneKeys(world), [
    ['wait_below', 'Thunder 2 Zeus', '45'],
    ['wait_below', 'Thunder 2 Zeus', '60'],
    ['attraction_down', 'Thunder 2 Zeus', null],
    ['attraction_back', 'Thunder 2 Zeus', null],
  ]);
  const down = world.fake.sceneEvents.find((e) => e.key === 'attraction_down');
  assert.deepEqual(down.data, {
    attraction: zeus.external_id,
    attraction_name: 'Thunder 2 Zeus',
    park_name: 'Parc Asterix',
    wait: 0,
  });
  assert.equal(world.fake.sceneEvents.at(-1).data.wait, 10);
});

test('no trigger against a reading hours old, nor while the API is down', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Thunder 2 Zeus');
  setLive(world, ASTERIX_LIVE, 'Thunder 2 Zeus', { wait: 5 });
  await cycle(world, 3 * 3600);
  assert.deepEqual(world.fake.sceneEvents, []);
});

test('the park opens: one trigger at the first reading after the opening time', async (t) => {
  const clock = createClock(Date.UTC(2026, 9, 30, 7, 50, 0)); // 08:50 in Paris
  const world = await createWorld({ clock });
  t.after(() => world.app.stop());
  const park = await create(world, isPark('Parc Asterix'));
  await create(world, isPark('Disneyland Park'));
  assert.equal(world.fake.lastState(featureId(park, 'open')), 0);
  await cycle(world); // 08:55
  await cycle(world); // 09:00, both parks open
  await cycle(world);
  assert.deepEqual(
    world.fake.sceneEvents.map((e) => [e.key, e.data.park_name, e.data.hours]),
    [
      ['park_opened', 'Disneyland Park', '09:00–22:00'],
      ['park_opened', 'Parc Asterix', '09:00–18:00'],
    ],
  );
  assert.equal(world.fake.sceneEvents[1].data.park, park.external_id);
  assert.equal(world.fake.lastState(featureId(park, 'open')), 1);
});

test('the widget: Gladys names, sorted by wait, colors, park hours, credit; all optional', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const zeus = await create(world, 'Thunder 2 Zeus');
  await create(world, 'Gyrotechnix');
  await create(world, 'Wrath of Anubis');
  await create(world, 'Osiris');
  await world.fake.deviceUpdated({ ...zeus, name: 'Le grand huit' });
  const ack = await world.fake.widgetGet('waits', { language: 'fr' });
  assert.equal(ack.success, true);
  const content = ack.data.content;
  assert.deepEqual(validateWidgetContent(content), []);
  assert.deepEqual(content.components[0], {
    type: 'text',
    variant: 'caption',
    text: "Parc Asterix : ouvert jusqu'à 18:00",
  });
  assert.deepEqual(content.components[1].items, [
    { label: 'Gyrotechnix', value: '20 min', color: 'warning' },
    { label: 'Osiris Convolvulis', value: '50 min', color: 'danger' },
    { label: 'Le grand huit', value: '70 min', color: 'danger' },
    { label: 'The Wrath of Anubis Haunted House', value: 'fermée', color: 'neutral' },
  ]);
  assert.deepEqual(content.components[2].link, { url: 'https://www.themeparks.wiki' });

  const custom = await world.fake.widgetGet('waits', {
    language: 'en',
    settings: {
      attractions: [zeus.external_id, 'gone'],
      order: 'longest',
      show_hours: false,
      show_credit: false,
    },
  });
  assert.deepEqual(custom.data.content.components, [
    { type: 'status', items: [{ label: 'Le grand huit', value: '70 min', color: 'danger' }] },
  ]);
});

test('the widget out of date, and with nothing followed', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Thunder 2 Zeus');
  world.network.routes[urlOf(ASTERIX_LIVE)] = 503;
  await cycle(world, STALE_MS / 1000 + 60);
  const ack = await world.fake.widgetGet('waits', { language: 'en' });
  assert.deepEqual(ack.data.content.components[1].items, [
    { label: 'Thunder 2 Zeus', value: 'data out of date', color: 'neutral' },
  ]);
  const empty = await createWorld();
  t.after(() => empty.app.stop());
  const none = await empty.fake.widgetGet('waits', { language: 'en' });
  assert.deepEqual(validateWidgetContent(none.data.content), []);
  assert.match(none.data.content.components[0].text, /Discover tab/);
});

test('the scene action: one sentence, the shortest wait, the rides in service', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const zeus = await create(world, 'Thunder 2 Zeus');
  await create(world, 'Wrath of Anubis');
  const gyro = await create(world, 'Gyrotechnix');
  const all = await world.fake.sceneAction('wait_summary', {});
  assert.deepEqual(all.data.outputs, {
    sentence:
      "Thunder 2 Zeus : 70 minutes d'attente. The Wrath of Anubis Haunted House : fermée. Gyrotechnix : 20 minutes d'attente.",
    shortest_wait: 20,
    operating_count: 2,
  });
  const one = await world.fake.sceneAction('wait_summary', {
    attractions: [zeus.external_id],
  });
  assert.equal(one.data.outputs.shortest_wait, 70);
  assert.equal(one.data.outputs.operating_count, 1);
  const none = await world.fake.sceneAction('wait_summary', { attractions: ['nope'] });
  assert.equal(none.success, false);
  assert.ok(gyro);
});

test('the scene action with nothing followed fails with a clear message', async (t) => {
  const world = await createWorld({ config: { parks: [ASTERIX], language: 'en' } });
  t.after(() => world.app.stop());
  const ack = await world.fake.sceneAction('wait_summary', {});
  assert.equal(ack.success, false);
  assert.match(ack.error, /Discover tab/);
});

test('other parks typed by name or id are found in the park list', async (t) => {
  const world = await createWorld({
    config: { parks: [], other_parks: 'parc astérix, Disneyland Paris, Atlantis Nowhere' },
  });
  t.after(() => world.app.stop());
  // Disneyland Paris is a destination: both its parks.
  assert.deepEqual(
    world.service.chosenIds().sort(),
    [ASTERIX, DLP, 'ca888437-ebb4-4d50-aed2-d227f7096968'].sort(),
  );
  const message = await action(world, 'status');
  assert.match(message.en, /Parks not found: Atlantis Nowhere/);
  assert.match(message.fr, /■ Parc Asterix : 50 attractions/);
});

test('status with no park chosen', async (t) => {
  const world = await createWorld({ config: {} });
  t.after(() => world.app.stop());
  const message = await action(world, 'status');
  assert.match(message.en, /No park chosen/);
  assert.equal(world.network.calls.length, 0);
});

test('a 429 pauses every request for the Retry-After delay', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  world.network.routes[urlOf('disneyland-park-live.json')] = new Response('slow down', {
    status: 429,
    headers: { 'retry-after': '600' },
  });
  await cycle(world);
  const after429 = world.network.calls.length;
  await cycle(world);
  assert.equal(world.network.calls.length, after429, 'nothing read during the pause');
  world.network.routes[urlOf('disneyland-park-live.json')] =
    createFetch().routes[urlOf('disneyland-park-live.json')];
  await cycle(world);
  assert.ok(world.network.calls.length > after429);
});

test('the requests carry the User-Agent and the ETag of the last answer', async (t) => {
  let served = 0;
  const network = createFetch();
  const body = network.routes[urlOf(ASTERIX_LIVE)];
  network.routes[urlOf(ASTERIX_LIVE)] = (url, init) => {
    served += 1;
    return init.headers['if-none-match'] === 'W/"a"'
      ? new Response(null, { status: 304 })
      : new Response(JSON.stringify(body), { status: 200, headers: { etag: 'W/"a"' } });
  };
  const world = await createWorld({ config: { parks: [ASTERIX] }, network });
  t.after(() => world.app.stop());
  const zeus = await create(world, 'Thunder 2 Zeus');
  await cycle(world);
  assert.equal(served, 2);
  assert.match(network.calls[0].headers['user-agent'], /^gladys-parcs-attractions /);
  // A 304 keeps the last data.
  assert.equal(world.fake.lastState(featureId(zeus, 'wait')), 70);
  // The schedule is read once, not at every cycle.
  assert.equal(network.calls.filter((c) => c.url.endsWith('/schedule')).length, 1);
});

test('the container reads on its own timer, without onPoll', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const clock = createClock();
  const network = createFetch();
  const gladys = createFakeGladys({ config: { parks: [ASTERIX] } });
  const app = registerHandlers(gladys, { fetch: network.fetch, now: clock.now });
  t.after(() => app.stop());
  await gladys.connect();
  await app.ready;
  await app.service.loading;
  const before = network.calls.length;
  t.mock.timers.tick(300 * 1000);
  await app.service.refreshing;
  assert.equal(network.calls.length, before + 1);
});

test('a 429 on the schedule keeps the live reading and its triggers', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Thunder 2 Zeus');
  // The schedule is due again: a new day at the park.
  world.service.park(ASTERIX).scheduleDay = '2026-10-29';
  world.network.routes[urlOf('parc-asterix-schedule.json')] = new Response('slow down', {
    status: 429,
    headers: { 'retry-after': '60' },
  });
  setLive(world, ASTERIX_LIVE, 'Thunder 2 Zeus', { status: 'DOWN', wait: null });
  await cycle(world);
  assert.deepEqual(sceneKeys(world), [['attraction_down', 'Thunder 2 Zeus', null]]);
  assert.equal(world.service.park(ASTERIX).okAt, world.clock.now());
});

test('an evening slot past midnight: open, with its hours', async (t) => {
  const world = await createWorld({ config: { parks: [ASTERIX] } });
  t.after(() => world.app.stop());
  const park = await create(world, isPark('Parc Asterix'));
  const url = urlOf('parc-asterix-schedule.json');
  world.network.routes[url] = {
    ...world.network.routes[url],
    schedule: [
      {
        date: '2026-10-30',
        type: 'OPERATING',
        openingTime: '2026-10-30T19:00:00+01:00',
        closingTime: '2026-10-31T01:00:00+01:00',
      },
    ],
  };
  world.service.park(ASTERIX).slots = null;
  world.clock.time = Date.UTC(2026, 9, 30, 23, 30, 0); // 00:30 in Paris
  await world.service.refresh();
  assert.equal(world.fake.lastState(featureId(park, 'open')), 1);
  assert.equal(world.fake.lastState(featureId(park, 'hours')), '19:00–01:00');
});

test('no park_opened when a schedule read during the day shows a slot already running', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, isPark('Parc Asterix'));
  const park = world.service.park(ASTERIX);
  // Hours unknown until now, then published: the park did not just open.
  const slots = park.slots;
  park.slots = [];
  await cycle(world);
  park.slots = slots;
  park.scheduleDay = localDateParis(world.clock.now());
  await cycle(world);
  assert.deepEqual(world.fake.sceneEvents, []);
});

const localDateParis = (ms) =>
  new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
