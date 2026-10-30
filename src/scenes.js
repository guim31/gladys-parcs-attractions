// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// - wait_summary: the waits of the followed attractions (all of them, or the
//   ones picked) as a sentence ready for a message or a speaker ("Big Thunder
//   Mountain : 25 minutes d'attente."), plus numbers for a "Continue only if"
//   step.
//
// A scene action does not receive the user's language: the sentence follows
// the `language` of the configuration. Outputs are numbers, never booleans:
// the core's "Continue only if" compares with ===.
// -----------------------------------------------------------------------------

import { TEXT, say } from './messages.js';

export class SceneError extends Error {}

const chosenIds = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean);

export const SCENE_ACTIONS = {
  async wait_summary(service, { fields }) {
    const language = service.config.language;
    // Asked right at start: the first reading, not "no data".
    await service.firstReading();
    const watched = service.watchedAttractions();
    if (watched.length === 0) {
      throw new SceneError(say(TEXT, language, 'noAttraction'));
    }
    const asked = chosenIds(fields?.attractions);
    const chosen = asked.length > 0 ? watched.filter((e) => asked.includes(e.deviceId)) : watched;
    if (chosen.length === 0) {
      throw new SceneError(say(TEXT, language, 'gone'));
    }
    const sentences = [];
    let operating = 0;
    let shortest = -1;
    for (const entry of chosen) {
      const { park, attraction } = service.lookupAttraction(entry);
      const name = service.displayName(entry, park, attraction);
      sentences.push(service.sentence(park, attraction, name, language));
      if (attraction?.status === 'OPERATING' && !service.isStale(park)) {
        operating += 1;
        if (attraction.wait !== null && (shortest === -1 || attraction.wait < shortest)) {
          shortest = attraction.wait;
        }
      }
    }
    return { sentence: sentences.join(' '), shortest_wait: shortest, operating_count: operating };
  },
};
