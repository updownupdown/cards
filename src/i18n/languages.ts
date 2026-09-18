/** Languages the app is translated into. English is the source language. */
export const SUPPORTED_LANGUAGES = [
  "en",
  "fr",
  "es",
  "it",
  "pt",
  "tr",
  "id",
] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const SOURCE_LANGUAGE: AppLanguage = "en";

/**
 * A development-only language that shows English accented and about 40%
 * longer, to find text that overflows or was never moved into translations.
 */
export const PSEUDO_LANGUAGE = "pseudo";
export type DisplayLanguage = AppLanguage | typeof PSEUDO_LANGUAGE;

/** The language setting: follow the phone, or always use one language. */
export type LanguagePreference = "system" | DisplayLanguage;

/** Each language's name in that language, as the language picker shows it. */
export const LANGUAGE_NAMES: Record<DisplayLanguage, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  tr: "Türkçe",
  id: "Bahasa Indonesia",
  pseudo: "Pseudo-locale",
};

export function isAppLanguage(value: unknown): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

/** A valid saved language setting. The pseudo-locale exists in development only. */
export function isLanguagePreference(
  value: unknown,
): value is LanguagePreference {
  return (
    value === "system" ||
    isAppLanguage(value) ||
    (value === PSEUDO_LANGUAGE && __DEV__)
  );
}

/**
 * Android still reports a few languages by their old ISO codes, such as "in"
 * for Indonesian. These map them to the codes the app uses.
 */
const LEGACY_LANGUAGE_CODES: Record<string, string> = {
  in: "id",
  iw: "he",
  ji: "yi",
};

export function normalizeLanguageCode(code: string | null | undefined) {
  return code ? (LEGACY_LANGUAGE_CODES[code] ?? code) : code;
}

/**
 * The language to show: the chosen one, or else the first of the phone's
 * preferred languages that the app supports, falling back to English.
 */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLanguageCodes: readonly (string | null | undefined)[],
): DisplayLanguage {
  if (preference !== "system") return preference;
  return deviceLanguageCodes.find(isAppLanguage) ?? SOURCE_LANGUAGE;
}
