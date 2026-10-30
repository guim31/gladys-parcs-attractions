// -----------------------------------------------------------------------------
// What the integration writes to `docker logs`: at info, only the lifecycle
// (the start, the API lost and back), never one line per reading; a failure
// that repeats at every cycle is logged once, plus one line when it is over.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureLogs, create, createWorld, cycle, urlOf } from './helpers/world.js';

const strip = (line) => line.text.replace(/^\[[^\]]+\] /, '');

test('the start is one info line', async (t) => {
  const lines = captureLogs(t, 'info');
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.deepEqual(lines.map(strip), [
    '[INFO] [parcs] Started: 2 park(s) chosen, 0 device(s) added',
  ]);
});

test('a normal reading cycle writes nothing at info, one line at debug', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Thunder 2 Zeus');
  const lines = captureLogs(t, 'info');
  for (let i = 0; i < 5; i += 1) {
    await cycle(world);
  }
  assert.deepEqual(lines, []);
  const debug = captureLogs(t, 'debug');
  await cycle(world);
  assert.deepEqual(debug.map(strip), [
    '[DEBUG] [parcs] Disneyland Park: 37 attractions read',
    '[DEBUG] [parcs] Parc Asterix: 50 attractions read',
  ]);
});

test('the API down at every cycle: one warning, then one line at recovery', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'Thunder 2 Zeus');
  const url = urlOf('parc-asterix-live.json');
  const saved = world.network.routes[url];
  const lines = captureLogs(t, 'info');
  world.network.routes[url] = new TypeError('fetch failed');
  for (let i = 0; i < 4; i += 1) {
    await cycle(world);
  }
  world.network.routes[url] = saved;
  await cycle(world);
  assert.deepEqual(lines.map(strip), [
    '[WARN] [parcs] Parc Asterix: data unavailable: api.themeparks.wiki: fetch failed',
    '[INFO] [parcs] Parc Asterix: data back',
  ]);
});
