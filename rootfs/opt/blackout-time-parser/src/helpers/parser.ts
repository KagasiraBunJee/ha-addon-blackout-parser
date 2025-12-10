import { DateTime } from "luxon";
import { Options } from "../helpers/config.js";
import { LLMProvider, llmParse } from "../services/llm.js";
import { Schedule, TimeRange } from "./state.js";

const MONTHS_UA: Record<string, number> = {
  "січня": 1,
  "січень": 1,
  "лютого": 2,
  "лютий": 2,
  "березня": 3,
  "березень": 3,
  "квітня": 4,
  "квітень": 4,
  "травня": 5,
  "травень": 5,
  "червня": 6,
  "червень": 6,
  "липня": 7,
  "липень": 7,
  "серпня": 8,
  "серпень": 8,
  "вересня": 9,
  "вересень": 9,
  "жовтня": 10,
  "жовтень": 10,
  "листопада": 11,
  "листопад": 11,
  "грудня": 12,
  "грудень": 12,
};

export const parseMessage = async (
  text: string,
  cfg: Options,
  llm: LLMProvider,
): Promise<Pick<Schedule, "date" | "prefix" | "ranges" | "source"> | null> => {
  const llmResult = await llmParse(text, cfg, llm);
  if (llmResult) {
    return { ...llmResult, source: "llm" };
  }
  const fallback = fallbackParse(text, cfg);
  if (fallback) {
    return { ...fallback, source: "regex" };
  }
  return null;
};

export const fallbackParse = (
  text: string,
  cfg: Options,
): Pick<Schedule, "date" | "prefix" | "ranges"> | null => {
  const lines = text.split("\n");
  const targetLine = lines.find((ln) => ln.includes(cfg.prefix));
  if (!targetLine) return null;
  const timeMatches = [...targetLine.matchAll(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g)];
  if (!timeMatches.length) return null;
  const dateLine = lines.find((ln) =>
    /(\d{1,2}).*(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)/i.test(
      ln,
    ),
  );
  const date = dateLine
    ? parseNaturalDate(dateLine, cfg.timezone)
    : DateTime.now().setZone(cfg.timezone).toISODate()!;
  return {
    date,
    prefix: cfg.prefix,
    ranges: timeMatches.map((m) => ({ start: m[1], end: m[2] })),
  };
};

export const parseNaturalDate = (text: string, timezone: string): string => {
  const normalized = text.toLowerCase();
  const dayMatch = normalized.match(/(\d{1,2})/);
  const monthMatch = normalized.match(
    /(січня|січень|лютого|лютий|березня|березень|квітня|квітень|травня|травень|червня|червень|липня|липень|серпня|серпень|вересня|вересень|жовтня|жовтень|листопада|листопад|грудня|грудень)/,
  );
  const now = DateTime.now().setZone(timezone);
  const year = now.year;
  if (dayMatch && monthMatch) {
    const day = parseInt(dayMatch[1], 10);
    const month = MONTHS_UA[monthMatch[1]];
    const dt = DateTime.fromObject({ year, month, day }, { zone: timezone });
    if (dt.isValid) return dt.toISODate()!;
  }
  const iso = DateTime.fromISO(text, { zone: timezone });
  if (iso.isValid) return iso.toISODate()!;
  return now.toISODate()!;
};

export const normalizeRange = (range: any): TimeRange => {
  if (!range) {
    return { start: "", end: "" };
  }
  if (typeof range === "string") {
    const [start, end] = range.split("-").map((s) => s.trim());
    return { start, end };
  }
  return {
    start: range.start,
    end: range.end,
  };
};
