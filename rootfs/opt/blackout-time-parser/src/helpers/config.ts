import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export interface Options {
  telegram_api_id?: string;
  telegram_api_hash?: string;
  telegram_session?: string;
  telegram_channel?: string[];
  prefix: string;
  switch_entities?: string[];
  timezone: string;
  message_hint?: string;
  openai_api_key?: string;
  openai_model?: string;
  claude_api_key?: string;
  claude_model?: string;
  ollama_host?: string;
  ollama_model?: string;
  ollama_api_key?: string;
  provider?: "openai" | "claude" | "ollama" | "auto" | string;
  on_lead_seconds?: number;
  off_delay_seconds?: number;
  telegram_mode?: string;
  telegram_poll_seconds?: number;
  telegram_poll_limit?: number;
  next_window_end_entity?: string;
  notifiers?: string[];
  locale?: string;
}

const DEFAULTS: Options = {
  prefix: "3.1",
  timezone: "Europe/Kyiv",
  message_hint: "",
  ollama_host: "https://api.ollama.com",
  provider: "ollama",
  on_lead_seconds: 60,
  off_delay_seconds: 3600,
  telegram_mode: "polling",
  telegram_poll_seconds: 300,
  telegram_poll_limit: 10,
  next_window_end_entity: "",
  notifiers: [],
  locale: "en",
};

const OPTIONS_PATH = "/data/options.json";

export const loadOptions = (): Options => {
  let fileOptions: Partial<Options> = {};
  try {
    if (fs.existsSync(OPTIONS_PATH)) {
      const raw = fs.readFileSync(OPTIONS_PATH, "utf-8");
      fileOptions = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read options.json", err);
  }
  if (typeof (fileOptions as any).telegram_channel === "string") {
    (fileOptions as any).telegram_channel = [(fileOptions as any).telegram_channel];
  }
  return {
    ...DEFAULTS,
    ...envOptions(),
    ...fileOptions,
  };
};

const envOptions = (): Partial<Options> => {
  return {
    telegram_api_id: process.env.TELEGRAM_API_ID,
    telegram_api_hash: process.env.TELEGRAM_API_HASH,
    telegram_session: process.env.TELEGRAM_SESSION,
    telegram_channel: process.env.TELEGRAM_CHANNEL
      ? process.env.TELEGRAM_CHANNEL.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    prefix: process.env.PREFIX,
    switch_entities: process.env.SWITCH_ENTITIES
      ? process.env.SWITCH_ENTITIES.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    timezone: process.env.TIMEZONE,
    message_hint: process.env.MESSAGE_HINT,
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: process.env.OPENAI_MODEL,
    claude_api_key: process.env.CLAUDE_API_KEY,
    claude_model: process.env.CLAUDE_MODEL,
    ollama_host: process.env.OLLAMA_HOST,
    ollama_model: process.env.OLLAMA_MODEL,
    ollama_api_key: process.env.OLLAMA_API_KEY,
    provider: (process.env.PROVIDER as Options["provider"]) ?? undefined,
    on_lead_seconds: process.env.ON_LEAD_SECONDS ? Number(process.env.ON_LEAD_SECONDS) : undefined,
    off_delay_seconds: process.env.OFF_DELAY_SECONDS ? Number(process.env.OFF_DELAY_SECONDS) : undefined,
    telegram_mode: process.env.TELEGRAM_MODE,
    telegram_poll_seconds: process.env.TELEGRAM_POLL_SECONDS
      ? Number(process.env.TELEGRAM_POLL_SECONDS)
      : undefined,
    telegram_poll_limit: process.env.TELEGRAM_POLL_LIMIT
      ? Number(process.env.TELEGRAM_POLL_LIMIT)
      : undefined,
    next_window_end_entity: process.env.NEXT_WINDOW_END_ENTITY,
    notifiers: process.env.NOTIFIERS
      ? process.env.NOTIFIERS.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    locale: process.env.LOCALE,
  };
};

export const resolveDirname = (metaUrl: string): string => {
  const __filename = fileURLToPath(metaUrl);
  return path.dirname(__filename);
};
