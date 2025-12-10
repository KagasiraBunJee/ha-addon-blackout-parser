import fs from "fs";

export interface TimeRange {
  start: string;
  end: string;
}

export interface Schedule {
  date: string;
  prefix: string;
  ranges: TimeRange[];
  source: string;
  parsed_at: string;
}

export interface State {
  schedule?: Schedule | null;
  schedules?: Record<string, Schedule>;
  last_channel_post_id?: number | string | null;
  last_parsed_at?: string | null;
  last_events?: string[];
}

const STATE_PATH = "/data/state.json";

export const loadState = (): State => {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const raw = fs.readFileSync(STATE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read state.json, starting fresh", err);
  }
  return { schedule: null, last_channel_post_id: null, last_parsed_at: null };
};

export const persistState = (state: State): void => {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};

export const resetState = (): State => {
  const fresh: State = {
    schedule: null,
    schedules: {},
    last_channel_post_id: null,
    last_parsed_at: null,
    last_events: [],
  };
  persistState(fresh);
  return fresh;
};
