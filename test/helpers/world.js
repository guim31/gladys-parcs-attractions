// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake `fetch` serving the
// real answers of ThemeParks.wiki (captured on 2026-10-30 at 13:03 in Paris,
// see test/fixtures/api/index.json), a manual clock, and the integration wired
// on top through registerHandlers. Nothing touches the network.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';

process.env.LOG_LEVEL ??= 'silent';

export const fixtureJson = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/api/${name}`, import.meta.url), 'utf8'));

// 2026-10-30 13:03:00 in Paris (12:03 UTC), the time of the capture.
export const FIXTURE_TIME = Date.UTC(2026, 9, 30, 12, 3, 0);

export const DLP = 'dae968d5-630d-4719-8b06-3d107e944401';
export const ASTERIX = '9e938687-fd99-46f3-986a-1878210378f8';

const INDEX = fixtureJson('index.json');

/** The URL of a fixture file, e.g. urlOf('parc-asterix-live.json'). */
export const urlOf = (file) => Object.keys(INDEX).find((url) => INDEX[url] === file);

/**
 * A fake `fetch`: `routes[url]` is a JSON value, a status number, a Response,
 * an Error (network failure) or a function of the request returning one of them.
 * Every call is recorded in `calls`.
 */
export function createFetch(overrides = {}) {
  const routes = {
    ...Object.fromEntries(Object.entries(INDEX).map(([url, file]) => [url, fixtureJson(file)])),
    ...overrides,
  };
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, headers: init.headers ?? {} });
    let route = routes[url];
    if (typeof route === 'function') {
      route = await route(url, init);
    }
    if (route instanceof Error) {
      throw route;
    }
    if (route === undefined) {
      return new Response('not found', { status: 404 });
    }
    if (route instanceof Response) {
      return route;
    }
    if (typeof route === 'number') {
      return new Response('error', { status: route });
    }
    return new Response(JSON.stringify(route), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, calls, routes };
}

/** A manual clock. */
export function createClock(start = FIXTURE_TIME) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {object} [options.network] from createFetch
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {boolean} [options.connect]
 */
export async function createWorld({
  config = { parks: [DLP, ASTERIX] },
  network = createFetch(),
  devices = [],
  connect = true,
  clock = createClock(),
} = {}) {
  const gladys = createFakeGladys({ config, devices });
  const app = registerHandlers(gladys, { fetch: network.fetch, timers: false, now: clock.now });
  const world = { gladys, fake: gladys.fake, app, service: app.service, network, clock };
  if (connect) {
    await gladys.connect();
    await app.ready;
    await app.service.loading;
  }
  return world;
}

/** Run a configuration action; resolves with its message (multi-language). */
export async function action(world, key, fields = {}) {
  const ack = await world.fake.action(key, fields);
  if (!ack.success) {
    throw new Error(`${key} failed: ${ack.error}`);
  }
  return ack.data.message;
}

/** The device published for a name part or a predicate, from the last discovery list. */
export const discovered = (world, predicate) =>
  world.fake.discoveredDevices.find(
    typeof predicate === 'function' ? predicate : (d) => d.name.includes(predicate),
  );

/** Create a discovered device in Gladys, as the user would. */
export async function create(world, predicate) {
  const device = discovered(world, predicate);
  if (!device) {
    throw new Error(`${predicate} is not in the discovered devices`);
  }
  await world.fake.deviceCreated(device);
  return device;
}

/** External id of one feature of a device. */
export const featureId = (device, key) =>
  device.features.find((feature) => feature.external_id.endsWith(`:${key}`))?.external_id;

/** One refresh cycle, `seconds` later. */
export async function cycle(world, seconds = 300) {
  world.clock.advance(seconds * 1000);
  await world.service.refresh();
}

/** Captures what the integration logs, at a level. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}

/**
 * Changes the live entry of an attraction (matched by name) in a served
 * fixture, e.g. `setLive(world, 'parc-asterix-live.json', 'Tonnerre 2 Zeus',
 * { status: 'DOWN' })`; `wait` sets the posted standby wait.
 */
export function setLive(world, file, name, { wait, ...changes }) {
  const url = urlOf(file);
  const document = structuredClone(world.network.routes[url]);
  const entry = document.liveData.find((item) => item.name === name);
  if (!entry) {
    throw new Error(`${name} is not in ${file}`);
  }
  Object.assign(entry, changes);
  if (wait !== undefined) {
    entry.queue = { ...entry.queue, STANDBY: { waitTime: wait } };
  }
  world.network.routes[url] = document;
  return entry;
}
