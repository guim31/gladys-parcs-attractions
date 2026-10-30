# Gladys Theme parks (Parcs d'attractions)

External integration for [Gladys Assistant](https://gladysassistant.com): the
**live wait times and opening hours of theme parks**, attraction by
attraction: Disneyland Paris, Parc Astérix, Futuroscope, Europa-Park,
Efteling, PortAventura… and every park covered by
[ThemeParks.wiki](https://www.themeparks.wiki) (about 200 worldwide). **No
account, no key.**

**Powered by [ThemeParks.wiki](https://www.themeparks.wiki).** Unofficial: not
affiliated with ThemeParks.wiki nor with any park or operator; park and
attraction names are their owners' trademarks, used for identification only.
Developed without the hardware: the API was checked live on 2026-10-30, not
yet on many Gladys installations: feedback welcome.

User documentation: [English](docs/en.md) · [français](docs/fr.md) ·
[Deutsch](docs/de.md) · [español](docs/es.md).

## What you get in Gladys

- One read-only device per park you add: park open, today's hours at the
  park's local time, average posted wait, rides down.
- One read-only device per attraction you add: posted wait (minutes), in
  service or not, status (in service, down, closed, refurbishment).
- A dashboard widget: your attractions sorted by wait, colored by length,
  with the hours of their park and the ThemeParks.wiki credit.
- Scene triggers: the wait drops below a threshold, an attraction goes down,
  an attraction is back in service, the park opens.
- A scene action: the waits of your attractions in a sentence ready to send.

## Requirements

- Gladys Assistant 5.3.0 or later, with Internet access.

## Installation

In Gladys, **Integrations → Install from GitHub**, then paste
`https://github.com/guim31/gladys-parcs-attractions`. Choose your parks in the
Configuration tab (or type any other park by name), save, and add the park
and the attractions you want from the Discover tab.

## How it works

| Endpoint (api.themeparks.wiki/v1) | When                               | Data                                    |
| --------------------------------- | ---------------------------------- | --------------------------------------- |
| `/entity/<park>/live`             | every 5, 10 or 15 minutes per park | status and posted standby wait per ride |
| `/entity/<park>/schedule`         | once a day (or every six hours)    | opening hours (type `OPERATING`)        |
| `/destinations`                   | at start, for parks typed by name  | park list                               |

The integration drives its own timer (the devices are not polled by Gladys),
sends an explicit User-Agent and `If-None-Match`, and pauses on a 429 for the
`Retry-After` delay, as the
[terms of use](https://www.themeparks.wiki/terms) ask (live data at most once
every five minutes, credit where the data is shown).

## Limitations

- Only the standby queue: no single rider, virtual queue or paid fast pass.
- Shows and restaurants are not offered as devices.
- Waits and hours are the ones the parks publish.

## Development

```bash
npm install
npm test               # node --test, no network access
npm run lint           # ESLint
npm run format:check   # Prettier, as the CI runs it
npx github:GladysAssistant/integration-store .   # store admission checks
```

See [CLAUDE.md](CLAUDE.md) for the architecture and the conventions. The test
fixtures (`test/fixtures/api`) are the real answers of the API for
Disneyland Park and Parc Astérix, captured on 2026-10-30 at 13:03 (Paris);
the other cases are derived from them in the tests.

## Credits

- Data: [ThemeParks.wiki](https://www.themeparks.wiki) and its contributors,
  free to use with attribution.
- Structure shared with [gladys-piscines](https://github.com/guim31/gladys-piscines).
- Built from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## License

[Apache 2.0](LICENSE).
