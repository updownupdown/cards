import { describe, expect, test } from "@jest/globals";
import {
  getQuote,
  getTaoChapter,
  QUOTE_COUNT,
  TAO_CHAPTER_COUNT,
} from "@/data/collectibles";
import { getGameSpecificSettingDefinitions } from "@/data/game-settings";
import { CARD_FACTS } from "@/data/card-facts";
import { GAMES_DATA } from "@/data/games-registry";
import { i18n } from "@/i18n";
import { toTurkishUpperCase } from "@/components/common/Text";
import {
  foldForSearch,
  localizeGame,
  settingText,
  sourceHash,
} from "@/i18n/content";
import {
  isLanguagePreference,
  normalizeLanguageCode,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
} from "@/i18n/languages";
import { pseudoLocalize } from "@/i18n/pseudo";
import { NAMESPACES, RESOURCES } from "@/i18n/resources";
import esFacts from "@/locales/es/content/facts.json";
import esGames from "@/locales/es/content/games.json";
import esQuotes from "@/locales/es/content/quotes.json";
import esSettings from "@/locales/es/content/settings.json";
import esTao from "@/locales/es/content/tao.json";
import frFacts from "@/locales/fr/content/facts.json";
import frGames from "@/locales/fr/content/games.json";
import frQuotes from "@/locales/fr/content/quotes.json";
import frSettings from "@/locales/fr/content/settings.json";
import frTao from "@/locales/fr/content/tao.json";
import idFacts from "@/locales/id/content/facts.json";
import idGames from "@/locales/id/content/games.json";
import idQuotes from "@/locales/id/content/quotes.json";
import idSettings from "@/locales/id/content/settings.json";
import idTao from "@/locales/id/content/tao.json";
import itFacts from "@/locales/it/content/facts.json";
import itGames from "@/locales/it/content/games.json";
import itQuotes from "@/locales/it/content/quotes.json";
import itSettings from "@/locales/it/content/settings.json";
import itTao from "@/locales/it/content/tao.json";
import ptFacts from "@/locales/pt/content/facts.json";
import ptGames from "@/locales/pt/content/games.json";
import ptQuotes from "@/locales/pt/content/quotes.json";
import ptSettings from "@/locales/pt/content/settings.json";
import ptTao from "@/locales/pt/content/tao.json";
import trFacts from "@/locales/tr/content/facts.json";
import trGames from "@/locales/tr/content/games.json";
import trQuotes from "@/locales/tr/content/quotes.json";
import trSettings from "@/locales/tr/content/settings.json";
import trTao from "@/locales/tr/content/tao.json";

type Translation = { hash: string; value: unknown };

const CONTENT = {
  fr: {
    games: frGames,
    settings: frSettings,
    quotes: frQuotes,
    tao: frTao,
    facts: frFacts,
  },
  es: {
    games: esGames,
    settings: esSettings,
    quotes: esQuotes,
    tao: esTao,
    facts: esFacts,
  },
  id: {
    games: idGames,
    settings: idSettings,
    quotes: idQuotes,
    tao: idTao,
    facts: idFacts,
  },
  it: {
    games: itGames,
    settings: itSettings,
    quotes: itQuotes,
    tao: itTao,
    facts: itFacts,
  },
  pt: {
    games: ptGames,
    settings: ptSettings,
    quotes: ptQuotes,
    tao: ptTao,
    facts: ptFacts,
  },
  tr: {
    games: trGames,
    settings: trSettings,
    quotes: trQuotes,
    tao: trTao,
    facts: trFacts,
  },
} as Record<string, Record<string, Record<string, unknown>>>;

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  return Object.entries(value as object).reduce<Record<string, string>>(
    (all, [key, entry]) => ({
      ...all,
      ...flatten(entry, prefix ? `${prefix}.${key}` : key),
    }),
    {},
  );
}

/** Interpolations and tags, which translations must keep. */
const tokens = (text: string) =>
  (text.match(/\{\{[^}]+\}\}|<\/?[a-zA-Z0-9]+>|\n/g) ?? []).sort();

/** Markdown markers in rule lines (start, bold, table pipes), which translations must keep. */
const markers = (lines: unknown) =>
  (lines as string[]).map(
    (line) =>
      `${line.match(/^(##|-+|\|)\s/)?.[1] ?? ""}|${(line.match(/\*\*/g) ?? []).length}|${(line.match(/\|/g) ?? []).length}`,
  );

describe("Languages", () => {
  test("Turkish text is uppercased with the dotted capital İ", () => {
    expect(toTurkishUpperCase("iyi şanslar")).toBe("İYİ ŞANSLAR");
    expect(toTurkishUpperCase("ılık")).toBe("ILIK");
    expect(foldForSearch("Işıklar")).toBe(foldForSearch("isiklar"));
  });

  test("the setting follows the phone's first supported language", () => {
    expect(resolveLanguage("system", ["de", "fr", "es"])).toBe("fr");
    expect(resolveLanguage("system", ["de", null])).toBe("en");
    expect(resolveLanguage("es", ["fr"])).toBe("es");
    // Android reports Indonesian by its old code.
    expect(resolveLanguage("system", ["in"].map(normalizeLanguageCode))).toBe(
      "id",
    );
  });

  test("only known language settings are accepted", () => {
    expect(isLanguagePreference("system")).toBe(true);
    expect(isLanguagePreference("fr")).toBe(true);
    expect(isLanguagePreference("de")).toBe(false);
  });

  test("plurals follow each language's rules", () => {
    const fr = i18n.getFixedT("fr", "home");
    const en = i18n.getFixedT("en", "home");
    // French treats zero as singular; English doesn't.
    expect(fr("search.count", { count: 0 })).toBe("0 jeu");
    expect(en("search.count", { count: 0 })).toBe("0 games");
    expect(en("search.count", { count: 1 })).toBe("1 game");
  });

  test("the pseudo-locale keeps interpolations and tags", () => {
    const pseudo = pseudoLocalize("Score: {{score}} by <link>Name</link>");
    expect(tokens(pseudo)).toEqual(tokens("{{score}} <link></link>"));
    expect(pseudo).not.toContain("Score");
  });
});

describe("UI translations", () => {
  const cases = SUPPORTED_LANGUAGES.filter(
    (language) => language !== "en",
  ).flatMap((language) =>
    NAMESPACES.map((namespace) => [language, namespace] as const),
  );

  test.each(cases)(
    "%s %s has every English key, with the same placeholders",
    (language, namespace) => {
      const english = flatten(RESOURCES.en[namespace]);
      const translated = flatten(RESOURCES[language][namespace]);

      expect(Object.keys(translated).sort()).toEqual(
        Object.keys(english).sort(),
      );
      for (const [key, text] of Object.entries(english)) {
        expect({ key, tokens: tokens(translated[key]) }).toEqual({
          key,
          tokens: tokens(text),
        });
      }
    },
  );
});

describe("Content translations", () => {
  test.each(Object.keys(CONTENT))(
    "%s translations match the current English and keep its structure",
    (language) => {
      const { games, settings, quotes, tao, facts } = CONTENT[language];
      const stale: string[] = [];
      const check = (label: string, translation: unknown, english: unknown) => {
        if ((translation as Translation).hash !== sourceHash(english)) {
          stale.push(`${label} (English hash ${sourceHash(english)})`);
        }
      };

      for (const [slug, fields] of Object.entries(games)) {
        const game = GAMES_DATA[`/${slug}`];
        expect({ slug, exists: !!game }).toEqual({ slug, exists: true });
        for (const [field, translation] of Object.entries(fields as object)) {
          const english = game[field as "howToPlay"];
          check(`games ${slug}.${field}`, translation, english);
          if (Array.isArray(english)) {
            expect(markers((translation as Translation).value)).toEqual(
              markers(english),
            );
          }
        }
      }

      for (const [slug, keys] of Object.entries(settings)) {
        const definitions = getGameSpecificSettingDefinitions(`/${slug}`);
        for (const [key, translation] of Object.entries(keys as object)) {
          const definition = definitions.find((entry) => entry.key === key);
          expect({ slug, key, exists: !!definition }).toEqual({
            slug,
            key,
            exists: true,
          });
          check(
            `settings ${slug}.${key}`,
            translation,
            settingText(definition!),
          );
        }
      }

      for (const [id, translation] of Object.entries(quotes)) {
        expect(Number(id)).toBeLessThanOrEqual(QUOTE_COUNT);
        const quote = getQuote(Number(id))!;
        check(`quote ${id}`, translation, {
          text: quote.text,
          source: quote.source,
        });
      }

      for (const [chapter, translation] of Object.entries(tao)) {
        expect(Number(chapter)).toBeLessThanOrEqual(TAO_CHAPTER_COUNT);
        check(
          `tao ${chapter}`,
          translation,
          getTaoChapter(Number(chapter))!.text,
        );
      }

      for (const [id, translation] of Object.entries(facts)) {
        expect(Number(id)).toBeLessThanOrEqual(CARD_FACTS.length);
        check(`fact ${id}`, translation, CARD_FACTS[Number(id) - 1]);
      }

      expect(stale).toEqual([]);
    },
  );

  test("every card fact is translated, as the watch app copies them", () => {
    for (const language of Object.keys(CONTENT)) {
      expect({
        language,
        count: Object.keys(CONTENT[language].facts).length,
      }).toEqual({
        language,
        count: CARD_FACTS.length,
      });
    }
  });

  test("translated game text is shown, and English when it has changed", () => {
    const klondike = GAMES_DATA["/klondike"];
    const french = localizeGame(klondike, "/klondike", "fr");
    expect(french.quickStart).not.toEqual(klondike.quickStart);
    expect(french.howToPlay).toHaveLength(klondike.howToPlay!.length);
    expect(french.title).toBe(klondike.title);

    const edited = {
      ...klondike,
      quickStart: ["A newly edited first step."],
    };
    const stale = localizeGame(edited, "/klondike", "fr");
    expect(stale.quickStart).toEqual(["A newly edited first step."]);
    expect(stale.howToPlay).toEqual(french.howToPlay);
  });
});
