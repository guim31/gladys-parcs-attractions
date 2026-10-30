# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-10-30

### Added

- Live wait times and opening hours of theme parks from ThemeParks.wiki (no
  account, no key): the European parks to choose from a list, any other park
  of the service by name or id.
- One device per park (open, today's hours, average wait, rides down) and one
  per attraction (wait, in service, status), offered in the Discover tab.
- A "Wait times" widget: the followed attractions sorted by wait, colored by
  length, with the park hours and the ThemeParks.wiki credit.
- Scene triggers: wait below a threshold, attraction down, attraction back in
  service, park opens.
- Scene action "Get the wait times": a sentence ready to send, the shortest
  wait and the number of rides in service.
- Documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-parcs-attractions/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-parcs-attractions/releases/tag/v1.0.0
