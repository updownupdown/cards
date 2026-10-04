import type { GameMenuInfo } from "@/data/games-data";
import type { GameSpecificSettingDefinition } from "@/data/game-settings";
import esGames from "@/locales/es/content/games.json";
import esQuotes from "@/locales/es/content/quotes.json";
import esSettings from "@/locales/es/content/settings.json";
import esTao from "@/locales/es/content/tao.json";
import frGames from "@/locales/fr/content/games.json";
import frQuotes from "@/locales/fr/content/quotes.json";
import frSettings from "@/locales/fr/content/settings.json";
import frTao from "@/locales/fr/content/tao.json";
import idGames from "@/locales/id/content/games.json";
import idQuotes from "@/locales/id/content/quotes.json";
import idSettings from "@/locales/id/content/settings.json";
import idTao from "@/locales/id/content/tao.json";
import itGames from "@/locales/it/content/games.json";
import itQuotes from "@/locales/it/content/quotes.json";
import itSettings from "@/locales/it/content/settings.json";
import itTao from "@/locales/it/content/tao.json";
import ptGames from "@/locales/pt/content/games.json";
import ptQuotes from "@/locales/pt/content/quotes.json";
import ptSettings from "@/locales/pt/content/settings.json";
import ptTao from "@/locales/pt/content/tao.json";
import trGames from "@/locales/tr/content/games.json";
import trQuotes from "@/locales/tr/content/quotes.json";
import trSettings from "@/locales/tr/content/settings.json";
import trTao from "@/locales/tr/content/tao.json";
import {
  PSEUDO_LANGUAGE,
  SOURCE_LANGUAGE,
  type AppLanguage,
  type DisplayLanguage,
} from "./languages";
import { pseudoLocalizeDeep } from "./pseudo";

// Text written in English in the code (game titles, rules and descriptions,
// game settings, quotes and Tao Te Ching chapters) is translated in
// src/locales/<language>/content/*.json. Each translation stores a hash of the
// English it was made from: when the English changes, the translation is
// stale and English is shown until it is translated again, so players never
// see outdated rules.

/** A translation and the hash of the English it was translated from. */
type Translation<T> = { hash: string; value: T };

type GameTextField = "title" | "quickStart" | "howToPlay";

type SettingText = {
  label: string;
  description?: string;
  options: { label: string; description?: string }[];
};

type QuoteTextFields = { text: string; source?: string };

type LanguageContent = {
  games: Record<
    string,
    Partial<Record<GameTextField, Translation<string | string[]>>>
  >;
  settings: Record<string, Record<string, Translation<SettingText>>>;
  quotes: Record<string, Translation<QuoteTextFields>>;
  tao: Record<string, Translation<string>>;
};

const CONTENT: Record<Exclude<AppLanguage, "en">, LanguageContent> = {
  fr: { games: frGames, settings: frSettings, quotes: frQuotes, tao: frTao },
  es: { games: esGames, settings: esSettings, quotes: esQuotes, tao: esTao },
  id: { games: idGames, settings: idSettings, quotes: idQuotes, tao: idTao },
  it: { games: itGames, settings: itSettings, quotes: itQuotes, tao: itTao },
  pt: { games: ptGames, settings: ptSettings, quotes: ptQuotes, tao: ptTao },
  tr: { games: trGames, settings: trSettings, quotes: trQuotes, tao: trTao },
};

const GAME_TEXT_FIELDS: GameTextField[] = ["title", "quickStart", "howToPlay"];

/**
 * FNV-1a hash of an English value, as JSON. The translation script must hash
 * the same way.
 */
export function sourceHash(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function translate<T>(
  language: DisplayLanguage,
  translation: Translation<unknown> | undefined,
  english: T,
): T {
  if (language === PSEUDO_LANGUAGE) return pseudoLocalizeDeep(english);
  if (!translation || translation.hash !== sourceHash(english)) return english;
  return translation.value as T;
}

/** True when a current translation (or the pseudo-locale) replaces the English. */
function isTranslated(
  language: DisplayLanguage,
  translation: Translation<unknown> | undefined,
  english: unknown,
) {
  if (language === PSEUDO_LANGUAGE) return true;
  return !!translation && translation.hash === sourceHash(english);
}

function contentFor(language: DisplayLanguage) {
  return language === "en" || language === PSEUDO_LANGUAGE
    ? undefined
    : CONTENT[language];
}

// Localized copies are cached per English object and language, so hashes are
// only computed once.
const cache = new WeakMap<object, Map<string, unknown>>();

let englishGameTitles = false;
/** Keeps game titles in English, whatever the display language. */
export function setEnglishGameTitles(value: boolean) {
  englishGameTitles = value;
}

function cached<T extends object>(
  english: T,
  language: DisplayLanguage,
  localize: () => T,
): T {
  if (language === SOURCE_LANGUAGE) return english;
  let byLanguage = cache.get(english);
  if (!byLanguage) {
    byLanguage = new Map();
    cache.set(english, byLanguage);
  }
  // Game titles depend on the English-titles flag, so it is part of the key.
  const key = englishGameTitles ? `${language}:en-titles` : language;
  if (!byLanguage.has(key)) byLanguage.set(key, localize());
  return byLanguage.get(key) as T;
}

const slugOf = (path: string) => path.replace(/^\//, "");

/** A game's title, description, quick start and rules in the display language. */
export function localizeGame<T extends GameMenuInfo>(
  game: T,
  path: string,
  language: DisplayLanguage,
): T {
  return cached(game, language, () => {
    const translations = contentFor(language)?.games[slugOf(path)];
    const localized = { ...game };
    for (const field of GAME_TEXT_FIELDS) {
      if (game[field] === undefined) continue;
      if (field === "title" && englishGameTitles) continue;
      (localized as GameMenuInfo)[field] = translate(
        language,
        translations?.[field],
        game[field],
      ) as never;
    }
    return localized;
  });
}

/** A game's title in the display language. */
export function localizeGameTitle(
  game: GameMenuInfo,
  path: string,
  language: DisplayLanguage,
) {
  return localizeGame(game, path, language).title;
}

/**
 * Lowercases a game name and strips accents, so a search for "piramide"
 * finds "Pirámide".
 */
export function foldForSearch(text: string) {
  // Turkish dotless ı matches i, like the accents removed below.
  const lower = text.toLowerCase().replace(/ı/g, "i");
  try {
    return lower.normalize("NFD").replace(/[̀-ͯ]/g, "");
  } catch {
    return lower;
  }
}

/** The translatable text of a game setting, as it is hashed and translated. */
export function settingText(definition: GameSpecificSettingDefinition) {
  return {
    label: definition.label,
    description: definition.description,
    options: definition.options.map(({ label, description }) => ({
      label,
      description,
    })),
  };
}

/** A game's specific settings with labels and descriptions translated. */
export function localizeSettingDefinitions(
  path: string,
  definitions: GameSpecificSettingDefinition[],
  language: DisplayLanguage,
) {
  return cached(definitions, language, () =>
    definitions.map((definition) => {
      const text = translate(
        language,
        contentFor(language)?.settings[slugOf(path)]?.[definition.key],
        settingText(definition),
      );
      return {
        ...definition,
        label: text.label,
        description: text.description,
        options: definition.options.map((option, index) => ({
          ...option,
          label: text.options[index]?.label ?? option.label,
          description: text.options[index]?.description ?? option.description,
        })),
      };
    }),
  );
}

const quoteText = ({ text, source }: QuoteTextFields) => ({ text, source });

/** Whether a quote is shown translated in the display language. */
export function isQuoteTranslated(
  id: number,
  quote: QuoteTextFields,
  language: DisplayLanguage,
) {
  return isTranslated(
    language,
    contentFor(language)?.quotes[String(id)],
    quoteText(quote),
  );
}

/** A quote's text and source in the display language; the author is unchanged. */
export function localizeQuote<T extends QuoteTextFields>(
  id: number,
  quote: T,
  language: DisplayLanguage,
): T {
  return cached(quote, language, () => ({
    ...quote,
    ...translate(
      language,
      contentFor(language)?.quotes[String(id)],
      quoteText(quote),
    ),
  }));
}

/** Whether a Tao Te Ching chapter is shown translated in the display language. */
export function isTaoChapterTranslated(
  chapterNumber: number,
  chapter: { text: string },
  language: DisplayLanguage,
) {
  return isTranslated(
    language,
    contentFor(language)?.tao[String(chapterNumber)],
    chapter.text,
  );
}

/** A Tao Te Ching chapter's text in the display language. */
export function localizeTaoChapter<T extends { text: string }>(
  chapterNumber: number,
  chapter: T,
  language: DisplayLanguage,
): T {
  return cached(chapter, language, () => ({
    ...chapter,
    text: translate(
      language,
      contentFor(language)?.tao[String(chapterNumber)],
      chapter.text,
    ),
  }));
}
