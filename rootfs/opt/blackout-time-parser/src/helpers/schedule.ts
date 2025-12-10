import { DateTime } from "luxon";
import { Schedule, TimeRange } from "./state.js";

export interface NextWindow {
  start: string; // ISO string
  end: string; // ISO string
  range: TimeRange;
  countdown?: string;
  display?: string;
}

export const computeNextWindow = (
  scheduleOrSchedules: Schedule | Schedule[] | null | undefined,
  timezone: string,
  onLeadSeconds = 60,
  offDelaySeconds = 3600,
): NextWindow | null => {
  const schedules = Array.isArray(scheduleOrSchedules)
    ? scheduleOrSchedules
    : scheduleOrSchedules
      ? [scheduleOrSchedules]
      : [];
  if (!schedules.length) return null;
  const now = DateTime.now().setZone(timezone);

  const windows: NextWindow[] = [];
  for (const schedule of schedules) {
    const date = DateTime.fromISO(schedule.date, { zone: timezone });
    if (!date.isValid) continue;
    const mapped = schedule.ranges
      .map((range) => {
        if (!range?.start) return null;
        const start = parseTime(range.start, date);
        if (!start) return null;
        const windowStart = start.minus({ seconds: onLeadSeconds });
        const windowEnd = start.plus({ seconds: offDelaySeconds });
        return {
          start: windowStart.toISO(),
          end: windowEnd.toISO(),
          range,
          date: schedule.date,
        };
      })
      .filter(Boolean) as NextWindow[];
    windows.push(...mapped);
  }

  if (!windows.length) return null;

  const futureWindows = windows.filter((w) => DateTime.fromISO(w.start, { zone: timezone }) > now);
  if (!futureWindows.length) return null;
  const candidate = futureWindows.reduce((best, w) => {
    if (!best) return w;
    const wStart = DateTime.fromISO(w.start, { zone: timezone });
    const bStart = DateTime.fromISO(best.start, { zone: timezone });
    return wStart < bStart ? w : best;
  }, null as NextWindow | null);
  if (!candidate) return null;

  const start = DateTime.fromISO(candidate.start, { zone: timezone });
  const diff = start.diff(now, ["hours", "minutes", "seconds"]).toObject();
  const parts = [];
  if (diff.hours) parts.push(`${Math.floor(diff.hours)}h`);
  if (diff.minutes || parts.length) parts.push(`${Math.floor(diff.minutes || 0)}m`);
  parts.push(`${Math.floor(diff.seconds || 0)}s`);
  candidate.countdown = parts.join(" ");

  const fmt = (dtStr: string) => DateTime.fromISO(dtStr, { zone: timezone }).toFormat("HH:mm");
  candidate.display = `${fmt(candidate.start)} → ${fmt(candidate.end)}${(candidate as any).date ? ` (${(candidate as any).date})` : ""}`;

  return candidate;
};

export const parseTime = (timeStr: string, date: DateTime): DateTime | null => {
  const clean = timeStr.replace(/\./g, ":").trim();
  const [hRaw, mRaw] = clean.split(":");
  const h = parseInt(hRaw, 10);
  const m = parseInt(mRaw, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return date.set({ hour: h === 24 ? 0 : h, minute: m });
};
