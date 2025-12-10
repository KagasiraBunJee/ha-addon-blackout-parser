import { OpenAI } from "openai";
import { Ollama } from "ollama";
import Anthropic from "@anthropic-ai/sdk";
import { Options } from "../helpers/config.js";
import { Schedule, TimeRange } from "../helpers/state.js";
import { parseNaturalDate, normalizeRange } from "../helpers/parser.js";

export type LLMProvider =
  | { kind: "openai"; client: OpenAI; model: string }
  | { kind: "claude"; client: Anthropic; model: string }
  | { kind: "ollama"; client: Ollama; model: string }
  | null;

export const buildLLMProvider = (cfg: Options): LLMProvider => {
  const choice = (cfg.provider || "auto").toLowerCase();
  const tryOpenAI = () =>
    cfg.openai_api_key
      ? {
          kind: "openai" as const,
          client: new OpenAI({ apiKey: cfg.openai_api_key }),
          model: cfg.openai_model || "gpt-3.5-turbo",
        }
      : null;
  const tryClaude = () =>
    cfg.claude_api_key
      ? {
          kind: "claude" as const,
          client: new Anthropic({ apiKey: cfg.claude_api_key }),
          model: cfg.claude_model || "claude-3-sonnet-20240229",
        }
      : null;
  const tryOllama = () =>
    cfg.ollama_host
      ? {
          kind: "ollama" as const,
          client: new Ollama({
            host: cfg.ollama_host,
            headers: cfg.ollama_api_key ? { Authorization: `Bearer ${cfg.ollama_api_key}` } : undefined,
          }),
          model: cfg.ollama_model || "llama2",
        }
      : null;

  if (choice === "openai") return tryOpenAI();
  if (choice === "claude") return tryClaude();
  if (choice === "ollama") return tryOllama();

  // auto fallback priority
  return tryOpenAI() || tryClaude() || tryOllama();
};

export const llmParse = async (
  text: string,
  cfg: Options,
  llm: LLMProvider,
): Promise<Pick<Schedule, "date" | "prefix" | "ranges"> | null> => {
  if (!llm) return null;
  const prompt = buildLLMPrompt(text, cfg);
  try {
    let content = "";
    if (llm.kind === "openai") {
      const completion = await llm.client.chat.completions.create({
        model: llm.model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "You extract blackout time ranges from Ukrainian Telegram posts. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
      });
      content = completion.choices[0].message?.content || "";
    } else if (llm.kind === "claude") {
      const response = await llm.client.messages.create({
        model: llm.model,
        max_tokens: 300,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      });
      content = response.content?.[0]?.text || "";
    } else if (llm.kind === "ollama") {
      const response = await llm.client.chat({
        model: llm.model,
        messages: [
          { role: "system", content: "Extract blackout ranges and return JSON only." },
          { role: "user", content: prompt },
        ],
        stream: false,
      });
      content = response.message?.content || "";
    }
    const parsed = extractJSON(content);
    if (!parsed || !parsed.date || !Array.isArray(parsed.ranges)) return null;
    return {
      date: parseNaturalDate(parsed.date, cfg.timezone),
      prefix: parsed.prefix || cfg.prefix,
      ranges: parsed.ranges.map(normalizeRange).filter(Boolean) as TimeRange[],
    };
  } catch (err) {
    console.warn("LLM parsing failed", (err as Error).message);
    return null;
  }
};

const buildLLMPrompt = (text: string, cfg: Options): string => {
  return [
    `Target prefix: ${cfg.prefix}`,
    cfg.message_hint ? `Hint: ${cfg.message_hint}` : "",
    "Extract the outage date (YYYY-MM-DD) and time ranges (HH:MM - HH:MM) for that prefix only.",
    'Output JSON: {"date":"YYYY-MM-DD","prefix":"<prefix>","ranges":[{"start":"HH:MM","end":"HH:MM"}, ...]}',
    "If missing data, return an empty object {}.",
    "",
    "Message:",
    text,
  ]
    .filter(Boolean)
    .join("\n");
};

const extractJSON = (content: string): Record<string, any> | null => {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};
