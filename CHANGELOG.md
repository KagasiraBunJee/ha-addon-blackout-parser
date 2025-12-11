# Changelog

## 0.6.2
- Add multiple switch support (`switch_entities`) alongside the legacy `switch_entity`.
- Support per-day schedules (store multiple dates in `state.schedules`) and compute next window across all dates.
- Add configurable lead/delay (`on_lead_seconds`, `off_delay_seconds`) with disable via `-1`.
- Replace polling loop with precise scheduled jobs (node-schedule); cleanup jobs after execution and rebuild on startup.
- Add reset endpoint/UI button to clear schedules and cancel jobs.
- Show all schedules and job count in the web UI; current schedule shows today only.
- Improve translations (HA-compatible YAML) so config descriptions display.
- Store last action event in readable timestamp.

## 0.7.0
- Added i18n: add-on config translations now in YAML; UI/server translations via locale-specific JSON; notifications and UI text localized (en/uk).
- Switched UI to server-rendered Pug template served from Express; UI fetches i18n via /api/i18n.
- Dropped legacy `switch_entity`; use `switch_entities` only.
- Added `notifiers` to send HA notify calls on ON triggers; localized message with lead time.
- Configurable lead/delay retained (`-1` disables triggers); multi-day scheduling preserved with cleanup of jobs after execution.
- Added `locale` config; improved status/UI fields (job count, all schedules, today’s schedule).
- Devcontainer mounts host Docker socket for HA tasks.
