// -----------------------------------------------------------------------------
// Park time: today's date and the hours in the park's own time zone (a park
// in Florida followed from Paris shows its local hours), the opening slots of
// the schedule. Every function takes the time: the clock stays injectable.
// -----------------------------------------------------------------------------

const DEFAULT_ZONE = 'Europe/Paris';

const formatters = new Map();
function formatter(kind, timeZone) {
  const key = `${kind}|${timeZone}`;
  if (!formatters.has(key)) {
    let zone = timeZone || DEFAULT_ZONE;
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: zone });
    } catch {
      zone = DEFAULT_ZONE;
    }
    formatters.set(
      key,
      kind === 'date'
        ? new Intl.DateTimeFormat('en-CA', {
            timeZone: zone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
        : new Intl.DateTimeFormat('en-GB', {
            timeZone: zone,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          }),
    );
  }
  return formatters.get(key);
}

/** "2026-10-30", the date at the park. */
export const localDate = (ms, timeZone) => formatter('date', timeZone).format(ms);

/** "09:30", the time at the park. */
export const localTime = (ms, timeZone) => formatter('time', timeZone).format(ms);

/** The opening slots (type OPERATING) of the park's day `now` falls in. */
export function todaySlots(slots, now, timeZone) {
  const today = localDate(now, timeZone);
  return (slots ?? [])
    .filter((slot) => slot.type === 'OPERATING' && slot.date === today)
    .sort((a, b) => a.open - b.open);
}

/** 1 when `now` is inside an opening slot, else 0. */
export const openAt = (slots, now) =>
  (slots ?? []).some((slot) => slot.type === 'OPERATING' && slot.open <= now && now < slot.close)
    ? 1
    : 0;

/** The next opening after `now` (ms), or null. */
export function nextOpening(slots, now) {
  const next = (slots ?? [])
    .filter((slot) => slot.type === 'OPERATING' && slot.open > now)
    .sort((a, b) => a.open - b.open)[0];
  return next ? next.open : null;
}

/** "09:00–22:00", or "09:00–12:00, 14:00–18:00", or null on a day without opening. */
export function hoursText(slots, now, timeZone) {
  const today = todaySlots(slots, now, timeZone);
  return today.length > 0
    ? today
        .map((slot) => `${localTime(slot.open, timeZone)}–${localTime(slot.close, timeZone)}`)
        .join(', ')
    : null;
}
