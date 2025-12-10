# Blackout Time Parser Add-on

Home Assistant add-on that listens to Telegram channel posts, extracts blackout time ranges with LLMs (OpenAI, Claude, or Ollama), stores the schedule, and toggles a configured Home Assistant switch based on the current outage window. A small web UI (ingress) shows the current schedule and lets you test parsing manually.

Codebase is TypeScript and compiled to `dist/` inside the add-on image. Main entry: `src/server.ts`.

## Add-on options (with descriptions)

- `telegram_api_id` / `telegram_api_hash` / `telegram_session` – Credentials for the Telegram user client. `telegram_session` is a pre-generated session string; see “User account mode”.
- `telegram_channel` – Channel username (without `@`) or numeric id to listen to (required).
- `prefix` – Identifier to extract (e.g. `3.1` from the sample posts).
- `switch_entity` – Home Assistant switch entity to control.
- `timezone` – Timezone for parsing and schedule checks (default `Europe/Kyiv`).
- `message_hint` – Optional hint/prefix phrase to help the LLM focus on the right line.
- `loop_seconds` – How often to evaluate and call the switch service (seconds, default 60). Calls are sent only when the desired state changes.
- `on_lead_seconds` – How many seconds before range start to trigger switch ON (default 60).
- `off_delay_seconds` – How many seconds after range start to trigger switch OFF (default 3600 = 1h).
- `provider` – Choose `openai`, `claude`, `ollama`, or `auto` (default `ollama`). When a provider is chosen explicitly, credentials for that provider must be present; otherwise no LLM will be used.
- `openai_api_key` / `openai_model` – OpenAI credentials and model (default `gpt-3.5-turbo`).
- `claude_api_key` / `claude_model` – Claude credentials and model (default `claude-3-sonnet-20240229`).
- `ollama_host` / `ollama_api_key` / `ollama_model` – Ollama cloud endpoint, bearer key, and model (default `llama2`). If multiple providers are set in auto mode, OpenAI is preferred, then Claude, then Ollama.

## How it works

1. Telegram user client (GramJS) listens for new messages in the configured channel and filters by the configured channel.
2. Incoming text is parsed via the selected LLM (JSON-only prompt) with a regex fallback to catch `prefix`-specific time ranges.
3. Parsed schedule is persisted to `/data/state.json`.
4. Every minute the add-on compares the current time (in `timezone`) to the stored ranges and calls the Supervisor API to `switch.turn_on` 1 minute before each range start until 1 hour after that start, then `switch.turn_off` outside that window.
5. Ingress/web UI (port 3000) shows status, next switch window, and allows test parsing of pasted text.

## Running locally

```
docker build --build-arg BUILD_ARCH=amd64 -t blackout-time-parser .
docker run -it --rm -p 3000:3000 \
  -e SUPERVISOR_TOKEN=dummy \
  -v $PWD/test-data:/data \
  blackout-time-parser
```

Mount a JSON file at `/data/options.json` with the fields above to mirror Home Assistant options.

## Notes

- The add-on needs `SUPERVISOR_TOKEN` (provided automatically in Home Assistant) to call `switch.turn_on/turn_off`.
- Regex parsing supports Ukrainian month names and the `HH:MM - HH:MM` pattern shown in `example_*.txt` for resilience if LLMs are unavailable.
- User-account mode: obtain `api_id/api_hash` from https://my.telegram.org, generate a `telegram_session` string (e.g., with Telethon or GramJS scripts off-device), and paste it into options. This stores your user session; protect it like a password. Running as a user may violate Telegram’s TOS in some contexts—proceed at your own risk.
