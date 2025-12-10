import schedule, { Job } from "node-schedule";
import { DateTime } from "luxon";
import { Options } from "../helpers/config.js";
import { State } from "../helpers/state.js";
import { parseTime } from "../helpers/schedule.js";
import { callHomeAssistantSwitch } from "./ha.js";

type JobMap = Record<string, { on?: Job; off?: Job }>;
const scheduledJobs: JobMap = {};
const executed: Record<string, { on?: boolean; off?: boolean }> = {};
const appendEvent = (state: State, text: string) => {
  state.last_events = [text];
};

const cleanupEntry = (key: string) => {
  const entry = scheduledJobs[key];
  if (entry?.on) entry.on.cancel();
  if (entry?.off) entry.off.cancel();
  if (!entry?.on && !entry?.off) {
    delete scheduledJobs[key];
  }
};

export const cancelAllJobs = () => {
  Object.values(scheduledJobs).forEach((pair) => {
    pair.on?.cancel();
    pair.off?.cancel();
  });
  for (const key of Object.keys(scheduledJobs)) {
    delete scheduledJobs[key];
  }
  for (const key of Object.keys(executed)) {
    delete executed[key];
  }
};

const markExecuted = (key: string, desired: "on" | "off") => {
  executed[key] = executed[key] || {};
  if (desired === "on") executed[key].on = true;
  else executed[key].off = true;
};

export const scheduleSwitchJobs = async (
  options: Options,
  state: State,
) => {
  cancelAllJobs();
  const targetSwitches = [
    ...(options.switch_entities || []).filter(Boolean),
    ...(options.switch_entity ? [options.switch_entity] : []),
  ];
  if (!state.schedule || targetSwitches.length === 0) return;

  const leadSeconds = options.on_lead_seconds ?? 60;
  const offDelaySeconds = options.off_delay_seconds ?? 3600;
  const now = DateTime.now().setZone(options.timezone);
  const schedules = state.schedules
    ? Object.values(state.schedules)
    : state.schedule
      ? [state.schedule]
      : [];
  for (const sched of schedules) {
    const date = DateTime.fromISO(sched.date, { zone: options.timezone });
    if (!date.isValid) continue;

    for (const range of sched.ranges) {
      if (!range?.start) continue;
      const key = `${sched.date}-${range.start}`;
      const start = parseTime(range.start, date);
      if (!start) continue;
      const onAt = leadSeconds >= 0 ? start.minus({ seconds: leadSeconds }) : null;
      const offAt = offDelaySeconds >= 0 ? start.plus({ seconds: offDelaySeconds }) : null;

      const maybeCall = async (desired: "on" | "off") => {
        if (desired === "on" && executed[key]?.on) return;
        if (desired === "off" && executed[key]?.off) return;
        await callHomeAssistantSwitch(targetSwitches, desired);
        markExecuted(key, desired);
        const ts = DateTime.now().setZone(options.timezone).toFormat("yyyy-MM-dd HH:mm:ss");
        appendEvent(state, `switch ${desired} at ${ts}`);
      };

      if (onAt && offAt && !executed[key]?.on && now >= onAt && now < offAt) {
        await maybeCall("on");
      }
      if (offAt && !executed[key]?.off && now >= offAt) {
        await maybeCall("off");
      }

      if (onAt && !executed[key]?.on && onAt > now) {
        let job: Job | null = null;
        job = schedule.scheduleJob(onAt.toJSDate(), async () => {
          await maybeCall("on");
          job?.cancel();
          if (scheduledJobs[key]) {
            delete scheduledJobs[key].on;
            if (!scheduledJobs[key].off) delete scheduledJobs[key];
          }
        });
        scheduledJobs[key] = { ...(scheduledJobs[key] || {}), on: job };
      }

      if (offAt && !executed[key]?.off && offAt > now) {
        let job: Job | null = null;
        job = schedule.scheduleJob(offAt.toJSDate(), async () => {
          await maybeCall("off");
          job?.cancel();
          if (scheduledJobs[key]) {
            delete scheduledJobs[key].off;
            if (!scheduledJobs[key].on) delete scheduledJobs[key];
          }
        });
        scheduledJobs[key] = { ...(scheduledJobs[key] || {}), off: job };
      }
    }
  }
};
export const getScheduledJobsCount = () => {
  let count = 0;
  for (const entry of Object.values(scheduledJobs)) {
    if (entry.on) count += 1;
    if (entry.off) count += 1;
  }
  return count;
};
