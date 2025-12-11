import { Request, Response } from "express";
import { Options } from "../helpers/config.js";
import { State } from "../helpers/state.js";
import { computeNextWindow } from "../helpers/schedule.js";

export const statusHandler =
  (options: Options, llmProvider: any, telegramMode: string) => (_req: Request, res: Response) => {
    const schedulesArray = res.locals.state?.schedules
      ? Object.values(res.locals.state?.schedules)
      : res.locals.state?.schedule
        ? [res.locals.state.schedule]
        : [];
    const nextWindow = computeNextWindow(
      schedulesArray,
      options.timezone,
      options.on_lead_seconds,
      options.off_delay_seconds,
    );
    res.json({
      config: {
        telegram_channel: options.telegram_channel,
        prefix: options.prefix,
        switch_entities: options.switch_entities || [],
        timezone: options.timezone,
        message_hint: options.message_hint,
        llm_provider: llmProvider?.kind ?? "none",
      telegram_mode: telegramMode,
      provider: options.provider || "auto",
      on_lead_seconds: options.on_lead_seconds ?? 60,
      off_delay_seconds: options.off_delay_seconds ?? 3600,
      scheduled_jobs: res.locals.scheduled_jobs ?? 0,
    },
    state: {
      ...(res.locals.state as State),
      next_window: nextWindow,
    },
    });
  };
