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
