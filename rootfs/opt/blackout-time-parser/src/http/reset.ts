import { Request, Response } from "express";
import { persistState, resetState, State } from "../helpers/state.js";
import { cancelAllJobs } from "../services/scheduler.js";

export const resetHandler = (state: State) => (_req: Request, res: Response) => {
  cancelAllJobs();
  // mutate existing state reference so consumers see the cleared state
  state.schedule = null;
  state.schedules = {};
  state.last_channel_post_id = null;
  state.last_parsed_at = null;
  state.last_events = [];
  persistState(state);
  res.json({ ok: true, state: resetState() });
};
