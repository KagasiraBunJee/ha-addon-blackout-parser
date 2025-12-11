import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadLocale = (locale: string): Record<string, any> => {
  const file = path.join(__dirname, "..", "translations", `${locale}.json`);
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Failed to load locale ${locale}`, err);
  }
  return {};
};

const cache: Record<string, Record<string, any>> = {};

export const t = (
  locale: string | undefined,
  key: string,
  params: Record<string, string | number> = {},
): string => {
  const lang = (locale || "en").toLowerCase();
  if (!cache[lang]) {
    cache[lang] = loadLocale(lang);
  }
  const dict = cache[lang];
  const fallback = lang === "en" ? {} : loadLocale("en");
  const template = dict[key] || fallback[key] || key;
  return Object.keys(params).reduce(
    (acc, k) => acc.replace(new RegExp(`{${k}}`, "g"), String(params[k])),
    template,
  );
};

export const getUiStrings = (locale: string | undefined) => {
  const lang = (locale || "en").toLowerCase();
  if (!cache[lang]) {
    cache[lang] = loadLocale(lang);
  }
  const fallback = lang === "en" ? {} : loadLocale("en");
  return cache[lang].ui || fallback.ui || {};
};
