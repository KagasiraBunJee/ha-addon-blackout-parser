import { Options } from "../helpers/config.js";
import { createHash } from "../helpers/hash.js";
import { parseMessage } from "../helpers/parser.js";
import { persistState, Schedule, State } from "../helpers/state.js";
import { LLMProvider } from "../services/llm.js";
import { callHomeAssistantSwitch } from "../services/ha.js";
import { parseTime } from "../helpers/schedule.js";
import { DateTime } from "luxon";
import { scheduleSwitchJobs } from "../services/scheduler.js";

export const parseAndPersistFactory = (
  options: Options,
  state: State,
  llmProvider: LLMProvider,
) => {
  let lastParsedTextHash: number | null = null;

  const parseAndPersist = async (text: string, source: string): Promise<Schedule | null> => {
    const hash = createHash(text);
    if (hash === lastParsedTextHash && source !== "manual") {
      return state.schedule || null;
    }
    const parsed = await parseMessage(text, options, llmProvider);
    if (!parsed) return null;

    state.schedule = {
      ...parsed,
      parsed_at: new Date().toISOString(),
    };
    if (!state.schedules) state.schedules = {};
    state.schedules[parsed.date] = state.schedule;
    state.last_parsed_at = state.schedule.parsed_at;
    persistState(state);
    lastParsedTextHash = hash;
    await scheduleSwitchJobs(options, state);
    return state.schedule;
  };

  return parseAndPersist;
};

export const evaluateAndToggleSwitch = async (
  options: Options,
  state: State,
) => {
  // Kept for compatibility; scheduling now handled by scheduleSwitchJobs.
  await scheduleSwitchJobs(options, state);
};
