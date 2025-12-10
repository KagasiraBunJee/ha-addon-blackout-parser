import path from "path";
import express from "express";
import { resolveDirname } from "../helpers/config.js";
import { statusHandler } from "./status.js";
import { testParseHandler } from "./testParse.js";
import { Options } from "../helpers/config.js";
import { State } from "../helpers/state.js";
import { LLMProvider } from "../services/llm.js";
import { parseAndPersistFactory } from "../routes/parsePersist.js";
import { NextFunction, Request, Response } from "express";
import { resetHandler } from "./reset.js";
import { getScheduledJobsCount } from "../services/scheduler.js";

export const createServer = (
  options: Options,
  state: State,
  llmProvider: LLMProvider,
  telegramMode: string,
  parseAndPersist?: ReturnType<typeof parseAndPersistFactory>,
) => {
  const __dirname = resolveDirname(import.meta.url);
  const app = express();
  app.use(express.json());
  // Serve static UI from project public dir (one level up from dist/)
  app.use(express.static(path.join(__dirname, "..", "..", "public")));

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.state = state;
    next();
  });

  const parseAndPersistBound = parseAndPersist
    ? parseAndPersist
    : parseAndPersistFactory(options, state, llmProvider);

  app.get("/api/status", (req, res, next) => {
    res.locals.scheduled_jobs = getScheduledJobsCount();
    next();
  }, statusHandler(options, llmProvider, telegramMode));
  app.post("/api/test-parse", testParseHandler(parseAndPersistBound));
  app.post("/api/reset", resetHandler(state));

  app.listen(3000, () => {
    console.log("Web UI available on port 3000");
  });

  return app;
};
