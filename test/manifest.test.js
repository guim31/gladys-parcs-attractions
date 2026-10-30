// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CONFIG, LANGUAGES, REFRESH_INTERVALS } from '../src/config.js';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { THRESHOLDS, TRIGGERS, WIDGET_KEY } from '../src/service.js';
import { PARKS } from '../src/parks.js';
import { WIDGETS } from '../src/widgets.js';
import { ASTERIX, create, createWorld } from './helpers/world.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

// Every list of form fields the manifest can declare (same field grammar).
const allFields = [
  ...(manifest.config_schema ?? []),
  ...[
    ...(manifest.actions ?? []),
    ...(manifest.scene_triggers ?? []),
    ...(manifest.scene_actions ?? []),
  ].flatMap((item) => item.fields ?? []),
  ...(manifest.widgets ?? []).flatMap((widget) => widget.settings ?? []),
];

// The handlers the integration actually registers on the SDK.
const { gladys: registered, app } = await createWorld({ connect: false });
await app.stop();
const handlerKeys = (prefix) =>
  Object.keys(registered.handlers)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));

const keysOf = (list) => (list ?? []).map((entry) => entry.key);
const optionValues = (field) => field.options.map((option) => option.value);
const field = (list, key) => list.find((entry) => entry.key === key);

test('identity: name, image, cover, cloud transport, leisure category', () => {
  assert.equal(manifest.name, "Parcs d'attractions");
  assert.equal(manifest.type, 'device');
  assert.match(manifest.docker_image, /^ghcr\.io\/guim31\/gladys-parcs-attractions:/);
  assert.equal(
    manifest.cover_image,
    'https://raw.githubusercontent.com/guim31/gladys-parcs-attractions/main/cover.png',
  );
  assert.deepEqual(manifest.transports, ['cloud']);
  assert.deepEqual(manifest.categories, ['leisure', 'services']);
});

test('Gladys 5.3.0 at least: widgets, scene triggers and actions, keywords', () => {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  const [major, minor] = match.slice(1).map(Number);
  assert.ok(major > 5 || (major === 5 && minor >= 3), manifest.gladys_version);
  // Parks all over the world: no country restriction.
  assert.equal(manifest.countries, undefined);
});

test('the parks offered are the parks of the code, by ThemeParks.wiki id', () => {
  const options = field(manifest.config_schema, 'parks').options;
  assert.deepEqual(
    options.map((option) => option.value),
    PARKS.map((park) => park.id),
  );
  for (const option of options) {
    assert.match(option.value, /^[0-9a-f-]{36}$/);
  }
  assert.ok(PARKS.some((park) => park.id === ASTERIX));
});

test('every manifest action has a handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.actions).sort(), handlerKeys('action:').sort());
});

test('every scene action has a handler, and its outputs are the declared ones', async (t) => {
  assert.deepEqual(keysOf(manifest.scene_actions).sort(), Object.keys(SCENE_ACTIONS).sort());
  assert.deepEqual(handlerKeys('sceneAction:').sort(), keysOf(manifest.scene_actions).sort());
  const world = await createWorld();
  t.after(() => world.app.stop());
  const zeus = await create(world, 'Thunder 2 Zeus');
  const results = {
    wait_summary: await world.fake.sceneAction('wait_summary', {
      attractions: [zeus.external_id],
    }),
  };
  for (const entry of manifest.scene_actions) {
    assert.equal(results[entry.key].success, true, entry.key);
    assert.deepEqual(
      Object.keys(results[entry.key].data.outputs).sort(),
      keysOf(entry.outputs).sort(),
      `${entry.key} outputs`,
    );
    // "Continue only if" compares with ===: numbers, never booleans.
    for (const output of entry.outputs) {
      assert.notEqual(output.type, 'boolean', `${entry.key}.${output.key}`);
      const value = results[entry.key].data.outputs[output.key];
      assert.equal(typeof value, output.type, `${entry.key}.${output.key}`);
    }
  }
});

test('the scene triggers fired by the code are declared, with their fields and variables', () => {
  assert.deepEqual(keysOf(manifest.scene_triggers).sort(), Object.values(TRIGGERS).sort());
  for (const trigger of manifest.scene_triggers) {
    const threshold = field(trigger.fields, 'threshold');
    assert.equal(Boolean(threshold), trigger.key === 'wait_below', trigger.key);
    if (threshold) {
      assert.deepEqual(optionValues(threshold), THRESHOLDS.map(String), trigger.key);
    }
  }
});

test('the event data of every trigger carries its declared fields and variables', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const park = world.service.park(ASTERIX);
  const ride = (status, wait) => ({ id: 'r', name: 'R', status, wait });
  const events = [
    ...world.service.waitEvents(park, 'device', ride('OPERATING', 50), ride('OPERATING', 5)),
    ...world.service.waitEvents(park, 'device', ride('OPERATING', 5), ride('DOWN', null)),
    ...world.service.waitEvents(park, 'device', ride('DOWN', null), ride('OPERATING', 5)),
  ];
  // The opening of a park added to Gladys, from 08:55 to 09:05.
  await create(world, (device) => device.name === 'Parc Asterix');
  world.clock.time = Date.UTC(2026, 9, 30, 7, 55, 0);
  world.service.parkEvents(park);
  world.clock.time += 600 * 1000;
  events.push(...world.service.parkEvents(park));
  for (const trigger of manifest.scene_triggers) {
    const event = events.find((e) => e.key === trigger.key);
    assert.ok(event, `${trigger.key} is fired`);
    for (const key of [...keysOf(trigger.fields), ...keysOf(trigger.variables)]) {
      assert.ok(key in event.data, `${trigger.key}: "${key}" is in the event data`);
    }
  }
});

test('every widget has its handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.widgets).sort(), Object.keys(WIDGETS).sort());
  assert.deepEqual(Object.keys(WIDGETS), [WIDGET_KEY]);
  assert.deepEqual(handlerKeys('widget:').sort(), Object.keys(WIDGETS).sort());
});

test('config_schema defaults and options are the ones of the code', () => {
  for (const entry of manifest.config_schema) {
    if (entry.default !== undefined) {
      assert.deepEqual(DEFAULT_CONFIG[entry.key], entry.default, entry.key);
    }
  }
  assert.deepEqual(
    Object.keys(DEFAULT_CONFIG).sort(),
    manifest.config_schema
      .filter((entry) => entry.type !== 'section')
      .map((entry) => entry.key)
      .sort(),
  );
  assert.deepEqual(optionValues(field(manifest.config_schema, 'language')), LANGUAGES);
  assert.deepEqual(
    optionValues(field(manifest.config_schema, 'refresh_interval')),
    REFRESH_INTERVALS,
  );
});

test('section fields are purely presentational, with https links', () => {
  for (const section of manifest.config_schema.filter((entry) => entry.type === 'section')) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
});

test('dynamic selects declare the devices or houses source and no static options', () => {
  const dynamic = allFields.filter((entry) => entry.source !== undefined);
  assert.ok(dynamic.length >= 6);
  for (const entry of dynamic) {
    assert.ok(['devices', 'houses'].includes(entry.source), entry.key);
    assert.equal(entry.options, undefined, entry.key);
  }
});

test('actions: no secret field, no default (the core applies none to actions)', () => {
  // GladysAssistant/Gladys#3154 and #3155.
  for (const entry of manifest.actions) {
    for (const item of entry.fields ?? []) {
      assert.notEqual(item.type, 'secret', `${entry.key}.${item.key}`);
      assert.equal(item.default, undefined, `${entry.key}.${item.key}`);
    }
  }
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`));
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});
