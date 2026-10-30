// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - waits: the followed attractions sorted by wait (shortest or longest
//   first), one status row each ("Big Thunder Mountain" / "25 min"), green up
//   to 15 minutes, orange up to 45, red beyond; grey when not in service or
//   out of date. Above, a caption with the state of their parks ("Disneyland
//   Park : ouvert jusqu'à 22:00"); below, the "ThemeParks.wiki" credit linked
//   to the service, as its terms ask. Both can be hidden.
//
// Budget of the core: 8 components, 2 texts, 1 status (10 rows), 4 buttons.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { clip } from './devices.js';
import { TEXT, say } from './messages.js';
import { WIDGET_KEY } from './service.js';

export const MAX_ROWS = 10;
export const CREDIT_URL = 'https://www.themeparks.wiki';
const MAX_LABEL = 40;
const MAX_CAPTION = 80;

/** The color of a row, from the wait. */
export function waitColor(service, park, attraction) {
  if (!attraction || attraction.status !== 'OPERATING' || service.isStale(park)) {
    return WIDGET_COLORS.NEUTRAL;
  }
  if (attraction.wait === null) {
    return WIDGET_COLORS.INFO;
  }
  if (attraction.wait <= 15) {
    return WIDGET_COLORS.SUCCESS;
  }
  return attraction.wait <= 45 ? WIDGET_COLORS.WARNING : WIDGET_COLORS.DANGER;
}

/** Sort rank: rides in service with a wait, then without, then the others. */
function rank(service, park, attraction) {
  if (!attraction || service.isStale(park) || attraction.status !== 'OPERATING') {
    return 2;
  }
  return attraction.wait === null ? 1 : 0;
}

async function waitsContent(service, { settings, language }) {
  await service.firstReading();
  const ttl = Math.max(60, service.config.refreshSeconds);
  const watched = service.watchedAttractions();
  const chosen = Array.isArray(settings?.attractions) ? settings.attractions.map(String) : [];
  const entries =
    chosen.length > 0
      ? chosen.map((id) => watched.find((entry) => entry.deviceId === id)).filter(Boolean)
      : watched;
  if (entries.length === 0) {
    const key = chosen.length > 0 ? 'gone' : 'pickAttraction';
    return { ttl_seconds: ttl, components: [{ type: 'text', text: say(TEXT, language, key) }] };
  }
  const longest = settings?.order === 'longest';
  const rows = entries
    .map((entry) => ({ entry, ...service.lookupAttraction(entry) }))
    .map((row) => ({ ...row, rank: rank(service, row.park, row.attraction) }))
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      if (a.rank === 0 && a.attraction.wait !== b.attraction.wait) {
        return longest
          ? b.attraction.wait - a.attraction.wait
          : a.attraction.wait - b.attraction.wait;
      }
      return 0;
    })
    .slice(0, MAX_ROWS);
  const components = [];
  if (settings?.show_hours !== false) {
    const parks = [...new Set(rows.map((row) => row.entry.parkId))]
      .map((id) => service.parks.get(id))
      .filter(Boolean);
    if (parks.length > 0) {
      components.push({
        type: 'text',
        variant: 'caption',
        text: clip(
          parks
            .map((park) =>
              say(TEXT, language, 'parkLine', {
                name: park.name,
                state: service.parkState(park, language),
              }),
            )
            .join(' · '),
          MAX_CAPTION,
        ),
      });
    }
  }
  components.push({
    type: 'status',
    items: rows.map(({ entry, park, attraction }) => ({
      // The name given in Gladys, not the API's.
      label: clip(service.displayName(entry, park, attraction), MAX_LABEL),
      value: clip(service.shortText(park, attraction, language), 40),
      color: waitColor(service, park, attraction),
    })),
  });
  if (settings?.show_credit !== false) {
    components.push({
      type: 'button',
      label: 'ThemeParks.wiki',
      icon: 'external-link',
      style: 'secondary',
      link: { url: CREDIT_URL },
    });
  }
  return { ttl_seconds: ttl, components };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get: waitsContent },
};
