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
import { getUiStrings } from "../helpers/i18n.js";
import { sendNotifications } from "../services/ha.js";

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
  app.set("view engine", "pug");
  app.set("views", path.join(__dirname, "..", "views"));

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
  app.get("/api/i18n", (_req, res) => {
    res.json(getUiStrings(options.locale));
  });
  app.post("/api/test-notify", async (req, res) => {
    const message = req.body?.message;
    const title = req.body?.title || "Test Notification";
    if (!message) {
      res.status(400).json({ error: "Missing message" });
      return;
    }
    if (!options.notifiers || options.notifiers.length === 0) {
      res.status(400).json({ error: "No notifiers configured" });
      return;
    }
    try {
      await sendNotifications(options.notifiers, title, message);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/", (_req, res) => {
    res.render("index");
  });

  app.listen(3000, () => {
    console.log("Web UI available on port 3000");
  });

  return app;
};
