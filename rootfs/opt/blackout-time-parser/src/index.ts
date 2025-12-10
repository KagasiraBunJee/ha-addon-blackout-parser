import { loadOptions } from "./helpers/config.js";
import { loadState } from "./helpers/state.js";
import { buildLLMProvider } from "./services/llm.js";
import { startTelegramClient } from "./services/telegram.js";
import { createServer } from "./http/server.js";
import { parseAndPersistFactory } from "./routes/parsePersist.js";
import { scheduleSwitchJobs } from "./services/scheduler.js";

const bindTelegramHandler = (
  state: ReturnType<typeof loadState>,
  parseAndPersist: (text: string, source: string) => Promise<any>,
) => async (text: string, id: number) => {
  state.last_channel_post_id = id;
  state.last_parsed_at = new Date().toISOString();
  await parseAndPersist(text, "telegram");
};

const options = loadOptions();
const state = loadState();
const llmProvider = buildLLMProvider(options);

const parseAndPersist = parseAndPersistFactory(options, state, llmProvider);

const telegramHandle = startTelegramClient(options, bindTelegramHandler(state, parseAndPersist));
const telegramMode = telegramHandle?.mode ?? "none";

// Schedule existing schedule on startup
scheduleSwitchJobs(options, state).catch(console.error);

createServer(options, state, llmProvider, telegramMode, parseAndPersist);
