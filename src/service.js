// -----------------------------------------------------------------------------
// The integration at runtime: the parks read, their last live data and
// schedule, the refresh timer, the devices offered in the Discover tab, the
// states of the devices added to Gladys, and the scene triggers.
//
// Data flow: every park chosen in the configuration, plus every park with a
// device added to Gladys, is read at the configured pace (one live request
// per park, the schedule once a day or every six hours). The park and all
// its attractions are offered in the Discover tab; the ones the user adds
// are the "watched" devices: states, widget, triggers and scene action.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import {
  getConditional,
  liveUrl,
  parseLive,
  parseSchedule,
  readParkList,
  resolvePark,
  scheduleUrl,
} from './api.js';
import { DEFAULT_CONFIG, normalizeConfig } from './config.js';
import {
  ATTRACTION_TYPE,
  PARK_TYPE,
  attractionStates,
  buildAttractionDevice,
  buildParkDevice,
  parkIds,
  parkStates,
  statusText,
} from './devices.js';
import { REPORTS, TEXT, lines, render, say } from './messages.js';
import { PARKS } from './parks.js';
import { hoursText, localDate, localTime, nextOpening, todaySlots } from './time.js';

const logger = createLogger({ name: 'parcs' });

// Live data older than this is "out of date": shown grey, never compared by
// the triggers.
export const STALE_MS = 45 * 60 * 1000;
// Unchanged states (a ride closed all winter) are sent again this often, or
// the dashboard shows "no recent value" after 48 hours.
export const HEARTBEAT_MS = 6 * 3600 * 1000;
// The schedule is read again after this, and at every new day of the park.
export const SCHEDULE_MS = 6 * 3600 * 1000;
// The park list (for the parks typed by name) is read again after this.
export const PARK_LIST_MS = 24 * 3600 * 1000;
// Pause after a 429 without Retry-After.
export const DEFAULT_BACKOFF_MS = 60 * 1000;

export const TRIGGERS = {
  WAIT_BELOW: 'wait_below',
  ATTRACTION_DOWN: 'attraction_down',
  ATTRACTION_BACK: 'attraction_back',
  PARK_OPENED: 'park_opened',
};
// The thresholds offered by the wait trigger, in minutes (the scene filters
// only compare for equality: an event is fired for every threshold crossed).
export const THRESHOLDS = [5, 10, 15, 20, 30, 45, 60];

export const WIDGET_KEY = 'waits';

const KNOWN_PARKS = new Map(PARKS.map((park) => [park.id, park.name]));

/** One park at runtime. */
class Park {
  constructor(id, name) {
    this.id = id;
    this.name = name ?? id;
    this.timezone = null;
    this.attractions = null; // array of { id, name, status, wait }
    this.byId = new Map();
    this.slots = null;
    this.scheduleAt = null;
    this.scheduleDay = null;
    this.liveEtag = null;
    this.okAt = null;
    this.previousOkAt = null;
    this.error = null;
    this.openAt = null; // time of the last opening check, for the trigger
  }
}

export class ThemeParks {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: they call refresh()
   */
  constructor({ gladys, fetch = globalThis.fetch, now = Date.now, timers = true }) {
    this.gladys = gladys;
    this.fetch = fetch;
    this.now = now;
    this.useTimers = timers;
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.parks = new Map(); // id → Park
    this.parkList = null;
    this.parkListAt = null;
    this.otherIds = [];
    this.unresolved = [];
    this.parkListError = null;
    this.backoffUntil = 0;
    this.discoveredSignature = null;
    this.publishFailed = false;
    this.discoveryFailed = false;
    this.fireFailed = false;
    this.timer = null;
    this.stopped = false;
    this.refreshing = null;
    this.loading = Promise.resolve();
  }

  // --- lifecycle --------------------------------------------------------------

  async start(config) {
    this.config = config;
    this.schedule();
    logger.info(
      `Started: ${config.parks.length + config.otherParks.length} park(s) chosen, ${this.watched().length} device(s) added`,
    );
    // The first reading in the background: the widget and the scene action
    // wait for it.
    this.loading = this.refresh({ discover: true, resolve: true });
  }

  /** Gladys restarted: everything again, the states included. */
  async resync(config) {
    this.config = config;
    this.gladys.forgetPublishedStates?.();
    await this.refresh({ discover: true, resolve: true });
  }

  async reconfigure(config) {
    const languageChanged = config.language !== this.config.language;
    this.config = config;
    if (languageChanged) {
      // The status and hours texts follow the language.
      this.gladys.forgetPublishedStates?.();
    }
    this.schedule();
    await this.refresh({ discover: true, resolve: true });
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.refreshing;
  }

  schedule() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    clearTimeout(this.timer);
    // A callback still running when the schedule changes must not start a
    // second chain: each chain only continues while it is the current one.
    this.generation = (this.generation ?? 0) + 1;
    const generation = this.generation;
    const tick = () => {
      this.timer = setTimeout(async () => {
        await this.refresh();
        if (!this.stopped && this.generation === generation) {
          tick();
        }
      }, this.config.refreshSeconds * 1000);
      this.timer.unref?.();
    };
    tick();
  }

  // --- parks and devices ------------------------------------------------------

  /** The parks chosen: ticked in the list, or typed by name and found. */
  chosenIds() {
    return [...new Set([...this.config.parks, ...this.otherIds])];
  }

  /** What a device created in Gladys stands for: `{ kind, parkId, attractionId }`. */
  static identify(device) {
    const param = (name) => device?.params?.find?.((p) => p.name === name)?.value ?? null;
    const id = String(device?.external_id ?? '');
    const match = /:(park|attraction):([^:]+)$/.exec(id);
    if (!match) {
      return null;
    }
    const kind = match[1];
    return {
      kind,
      parkId: param('park_id') ?? (kind === PARK_TYPE ? match[2] : null),
      attractionId: kind === ATTRACTION_TYPE ? match[2] : null,
    };
  }

  /** The devices added to Gladys: `{ deviceId, kind, parkId, attractionId, name }[]`. */
  watched() {
    return (this.gladys.devices ?? [])
      .map((device) => {
        const identity = ThemeParks.identify(device);
        return identity ? { deviceId: device.external_id, name: device.name, ...identity } : null;
      })
      .filter((entry) => entry && entry.parkId);
  }

  watchedAttractions() {
    return this.watched().filter((entry) => entry.kind === ATTRACTION_TYPE);
  }

  /** The parks to read: the ones chosen, and the ones of the devices added. */
  activeIds() {
    return [...new Set([...this.chosenIds(), ...this.watched().map((entry) => entry.parkId)])];
  }

  park(id) {
    if (!this.parks.has(id)) {
      const listed = this.parkList?.find((park) => park.id === id)?.name;
      this.parks.set(id, new Park(id, KNOWN_PARKS.get(id) ?? listed));
    }
    return this.parks.get(id);
  }

  /** The last reading of an attraction device: `{ park, attraction }`, attraction null if unknown. */
  lookupAttraction(entry) {
    const park = this.parks.get(entry.parkId) ?? null;
    return { park, attraction: park?.byId.get(entry.attractionId) ?? null };
  }

  isStale(park) {
    return !park || park.okAt === null || this.now() - park.okAt > STALE_MS;
  }

  /** Waits for the first reading (at most `ms`), for a widget or a scene action asked at start. */
  async firstReading(ms = 10000) {
    let timer;
    await Promise.race([
      this.loading,
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
    clearTimeout(timer);
  }

  // --- parks typed by name ----------------------------------------------------

  /** Finds the parks typed in `other_parks` in the park list of the service. */
  async resolveOthers() {
    const typed = this.config.otherParks;
    if (typed.length === 0) {
      this.otherIds = [];
      this.unresolved = [];
      return;
    }
    const now = this.now();
    if (!this.parkList || now - this.parkListAt > PARK_LIST_MS) {
      try {
        this.parkList = await readParkList(this.fetch);
        this.parkListAt = now;
        if (this.parkListError) {
          logger.info('Park list: available again');
        }
        this.parkListError = null;
      } catch (err) {
        if (!this.parkListError) {
          logger.warn(`Park list unavailable: ${err.message}`);
        }
        this.parkListError = err.message;
        if (!this.parkList) {
          // Not known yet: nothing is said unresolved, it is read again next time.
          return;
        }
      }
    }
    const ids = [];
    const unresolved = [];
    for (const text of typed) {
      const found = resolvePark(this.parkList, text);
      if (found.length === 0) {
        unresolved.push(text);
      }
      ids.push(...found.map((park) => park.id));
    }
    if (unresolved.join() !== this.unresolved.join() && unresolved.length > 0) {
      logger.warn(`Parks not found: ${unresolved.join(', ')}`);
    }
    this.otherIds = [...new Set(ids)];
    this.unresolved = unresolved;
  }

  // --- publication ------------------------------------------------------------

  async publishDiscovered({ force = false } = {}) {
    const language = this.config.language;
    const devices = [];
    for (const id of this.chosenIds()) {
      const park = this.parks.get(id);
      if (!park?.attractions) {
        continue;
      }
      devices.push(buildParkDevice(this.gladys, park, language));
      const attractions = [...park.attractions].sort((a, b) => a.name.localeCompare(b.name));
      for (const attraction of attractions) {
        devices.push(buildAttractionDevice(this.gladys, park, attraction, language));
      }
    }
    const signature = JSON.stringify(devices.map((d) => [d.external_id, d.name, d.features]));
    if (!force && signature === this.discoveredSignature) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(devices);
      this.discoveredSignature = signature;
      if (this.discoveryFailed) {
        this.discoveryFailed = false;
        logger.info('Discovered devices published again');
      }
    } catch (err) {
      if (!this.discoveryFailed) {
        logger.warn(`Cannot publish the discovered devices: ${err.message}`);
      }
      this.discoveryFailed = true;
    }
  }

  async publish(states) {
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      // Gladys restarting: said once, the next refresh sends them again.
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  /** The states of one watched device, [] when its park is not read yet. */
  statesOf(entry) {
    const language = this.config.language;
    if (entry.kind === PARK_TYPE) {
      const park = this.parks.get(entry.parkId);
      return park && (park.attractions || park.slots)
        ? parkStates(this.gladys, park, this.now(), language)
        : [];
    }
    const { attraction } = this.lookupAttraction(entry);
    return attraction ? attractionStates(this.gladys, attraction, language) : [];
  }

  refreshWidget() {
    this.gladys.requestWidgetRefresh?.(WIDGET_KEY)?.catch?.(() => {});
  }

  /** A device was just added in Gladys: its states, all of them, now. */
  async onDeviceCreated(device) {
    const identity = ThemeParks.identify(device);
    if (identity?.parkId) {
      await this.publish(this.statesOf({ deviceId: device.external_id, ...identity }));
    }
    this.refreshWidget();
  }

  // --- refresh ----------------------------------------------------------------

  /** One read of every active park; concurrent calls share it. */
  refresh({ discover = false, resolve = false } = {}) {
    if (!this.refreshing) {
      this.refreshing = this.refreshAll(discover, resolve)
        .catch((err) => logger.warn(`Refresh failed: ${err.message}`))
        .finally(() => {
          this.refreshing = null;
        });
      return this.refreshing;
    }
    // A discovery asked during a refresh (parks just chosen) reads again
    // right after it: the running one may not include the new parks.
    return discover
      ? this.refreshing.then(() => this.refresh({ discover, resolve }))
      : this.refreshing;
  }

  async refreshAll(forceDiscovery, resolve) {
    if (resolve || (this.config.otherParks.length > 0 && !this.parkList)) {
      await this.resolveOthers();
    }
    const events = [];
    for (const id of this.activeIds()) {
      const park = this.park(id);
      const previous = park.attractions ? new Map(park.byId) : null;
      if (await this.readPark(park)) {
        events.push(...this.attractionEvents(park, previous));
      }
      events.push(...this.parkEvents(park));
    }
    await this.publishDiscovered({ force: forceDiscovery });
    const states = this.watched().flatMap((entry) => this.statesOf(entry));
    await this.publish(states);
    for (const { key, data } of events) {
      await this.fire(key, data);
    }
  }

  /** Reads the live data (and the schedule when due) of a park; a failure is logged once. */
  async readPark(park) {
    const now = this.now();
    if (now < this.backoffUntil) {
      return false;
    }
    try {
      const { document, etag } = await getConditional(
        this.fetch,
        liveUrl(park.id),
        park.liveEtag,
        now,
      );
      park.liveEtag = etag;
      if (document) {
        const live = parseLive(document);
        park.name = live.name ?? park.name;
        park.timezone = live.timezone ?? park.timezone;
        park.attractions = live.attractions;
        park.byId = new Map(live.attractions.map((a) => [a.id, a]));
      }
      await this.readSchedule(park, now);
      park.previousOkAt = park.okAt;
      park.okAt = now;
      if (park.error) {
        logger.info(`${park.name}: data back`);
      }
      park.error = null;
      logger.debug(`${park.name}: ${park.attractions?.length ?? 0} attractions read`);
      return Boolean(document);
    } catch (err) {
      if (err.status === 429) {
        this.pause(now, err);
      }
      if (!park.error) {
        logger.warn(`${park.name}: data unavailable: ${err.message}`);
      }
      park.error = err.message;
      return false;
    }
  }

  /** A 429: no request until the delay it asks has passed (said once per pause). */
  pause(now, err) {
    const wasPaused = now < this.backoffUntil;
    this.backoffUntil = now + (err.retryAfterMs ?? DEFAULT_BACKOFF_MS);
    if (!wasPaused) {
      logger.warn(
        `ThemeParks.wiki asks to slow down: paused for ${Math.round((this.backoffUntil - now) / 1000)} s`,
      );
    }
  }

  /** The schedule, read at the first reading, every new day at the park and every six hours. */
  async readSchedule(park, now) {
    const day = localDate(now, park.timezone);
    if (park.slots && park.scheduleDay === day && now - park.scheduleAt < SCHEDULE_MS) {
      return;
    }
    try {
      const schedule = parseSchedule(
        (await getConditional(this.fetch, scheduleUrl(park.id), null, now)).document,
      );
      park.timezone = park.timezone ?? schedule.timezone;
      park.slots = schedule.slots;
      park.scheduleAt = now;
      park.scheduleDay = localDate(now, park.timezone);
    } catch (err) {
      // The live data still counts (its events too); the hours wait for the
      // next reading. A 429 pauses the next requests.
      logger.debug(`${park.name}: schedule unavailable: ${err.message}`);
      if (err.status === 429) {
        this.pause(now, err);
      }
    }
  }

  /** The trigger events of the attractions between two live readings of a park. */
  attractionEvents(park, previous) {
    // A comparison with a reading hours old (the API back after an outage)
    // would fire changes that are no longer news.
    const recent =
      previous &&
      park.previousOkAt !== null &&
      park.okAt - park.previousOkAt <= 2 * this.config.refreshSeconds * 1000 + 5000;
    if (!recent) {
      return [];
    }
    const events = [];
    for (const entry of this.watchedAttractions()) {
      if (entry.parkId !== park.id) {
        continue;
      }
      const before = previous.get(entry.attractionId);
      const after = park.byId.get(entry.attractionId);
      if (before && after) {
        events.push(...this.waitEvents(park, entry.deviceId, before, after));
      }
    }
    return events;
  }

  /** The events of one attraction between two readings. */
  waitEvents(park, deviceId, before, after) {
    const data = {
      attraction: deviceId,
      attraction_name: after.name,
      park_name: park.name,
      wait: after.status === 'OPERATING' ? (after.wait ?? 0) : 0,
    };
    const events = [];
    if (before.status === 'OPERATING' && after.status === 'DOWN') {
      events.push({ key: TRIGGERS.ATTRACTION_DOWN, data });
    }
    if (before.status === 'DOWN' && after.status === 'OPERATING') {
      events.push({ key: TRIGGERS.ATTRACTION_BACK, data });
    }
    // A wait is compared only between two readings in service: the morning
    // opening at 5 minutes is not "the queue got shorter".
    if (
      before.status === 'OPERATING' &&
      after.status === 'OPERATING' &&
      before.wait !== null &&
      after.wait !== null
    ) {
      for (const threshold of THRESHOLDS) {
        if (before.wait > threshold && after.wait <= threshold) {
          events.push({
            key: TRIGGERS.WAIT_BELOW,
            data: { ...data, threshold: String(threshold) },
          });
        }
      }
    }
    return events;
  }

  /**
   * The opening of a park added to Gladys: an opening time of its schedule
   * passed between the last check and now. A schedule that changes during the
   * day (a slot already running when it is read) is not an opening.
   */
  parkEvents(park) {
    if (!park.slots) {
      return [];
    }
    const now = this.now();
    const since = park.openAt;
    const recent = since !== null && now - since <= 2 * this.config.refreshSeconds * 1000 + 5000;
    park.openAt = now;
    if (!recent) {
      return [];
    }
    const opening = park.slots.find(
      (slot) =>
        slot.type === 'OPERATING' && slot.open > since && slot.open <= now && now < slot.close,
    );
    const device = parkIds(this.gladys, park.id).device;
    if (!opening || !this.watched().some((entry) => entry.deviceId === device)) {
      return [];
    }
    return [
      {
        key: TRIGGERS.PARK_OPENED,
        data: {
          park: device,
          park_name: park.name,
          hours: hoursText(park.slots, now, park.timezone) ?? '',
        },
      },
    ];
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      if (this.fireFailed) {
        this.fireFailed = false;
        logger.info('Scene triggers fired again');
      }
    } catch (err) {
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
    }
  }

  // --- texts ------------------------------------------------------------------

  /** "25 min", "en panne", "données périmées"… for a widget row (40 characters). */
  shortText(park, attraction, language) {
    if (!attraction) {
      return '—';
    }
    if (this.isStale(park)) {
      return say(TEXT, language, 'stale');
    }
    if (attraction.status !== 'OPERATING') {
      return statusText(attraction, language);
    }
    return attraction.wait === null
      ? say(TEXT, language, 'noWait')
      : say(TEXT, language, 'minutes', attraction);
  }

  /** "ouvert jusqu'à 22:00", "fermé, ouvre à 09:00", "fermé aujourd'hui". */
  parkState(park, language) {
    if (!park?.slots) {
      return say(TEXT, language, 'noHours');
    }
    const now = this.now();
    const current = park.slots.find(
      (slot) => slot.type === 'OPERATING' && slot.open <= now && now < slot.close,
    );
    if (current) {
      return say(TEXT, language, 'openUntil', { time: localTime(current.close, park.timezone) });
    }
    const next = nextOpening(todaySlots(park.slots, now, park.timezone), now);
    if (next !== null) {
      return say(TEXT, language, 'opensAt', { time: localTime(next, park.timezone) });
    }
    return todaySlots(park.slots, now, park.timezone).length > 0
      ? say(TEXT, language, 'parkClosed')
      : say(TEXT, language, 'closedToday');
  }

  /** "Big Thunder Mountain : 25 minutes d'attente." */
  sentence(park, attraction, name, language) {
    if (!attraction || this.isStale(park)) {
      return say(TEXT, language, 'sentenceUnknown', { name });
    }
    if (attraction.status !== 'OPERATING') {
      return say(TEXT, language, 'sentenceStatus', {
        name,
        status: statusText(attraction, language),
      });
    }
    return attraction.wait === null
      ? say(TEXT, language, 'sentenceNoWait', { name })
      : say(TEXT, language, 'sentence', { name, wait: attraction.wait });
  }

  /** The attraction name to show: the one given in Gladys, without the park prefix. */
  displayName(entry, park, attraction) {
    const name = entry.name || attraction?.name || entry.attractionId;
    const prefix = park ? `${park.name} · ` : null;
    return prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name;
  }

  // --- configuration action ---------------------------------------------------

  status() {
    const now = this.now();
    const blocks = [];
    if (this.config.parks.length === 0 && this.config.otherParks.length === 0) {
      blocks.push(render(REPORTS, 'noPark'));
    }
    if (this.unresolved.length > 0) {
      blocks.push(render(REPORTS, 'unresolved', { names: this.unresolved.join(', ') }));
    }
    if (this.parkListError && this.config.otherParks.length > 0) {
      blocks.push(render(REPORTS, 'error', { error: this.parkListError }));
    }
    for (const id of this.activeIds()) {
      const park = this.park(id);
      blocks.push(
        render(REPORTS, 'park', { name: park.name, count: park.attractions?.length ?? 0 }),
        park.okAt === null
          ? render(REPORTS, 'waiting')
          : render(REPORTS, 'read', { age: Math.round((now - park.okAt) / 1000) }),
        park.error ? render(REPORTS, 'error', { error: park.error }) : null,
      );
    }
    blocks.push(render(REPORTS, 'watched', { count: this.watched().length }));
    return lines(...blocks);
  }
}
