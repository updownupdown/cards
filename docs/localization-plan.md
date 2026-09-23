# Localization

Solitarius is translated into French, Spanish, Italian, Portuguese, Turkish and Indonesian. English is the source language, more languages can follow, and translations are made by AI with automatic checks.

Status: French, Spanish, Italian, Portuguese, Turkish and Indonesian are complete. The UI, the in-game text, every game's title, description, quick start and rules, the game settings, all 156 quotes and all 81 Tao Te Ching chapters are translated, and the checks pass. Turkish was checked on a phone on 2026-09-16 (all 114 games opened, overflowing labels shortened, remaining hard-coded English strings translated). Italian, Portuguese and Indonesian have not yet been checked on a phone.

## Decisions

- **Game titles are translated** (changed from "stay in English" on 2026-09-16). A language uses its established name for a classic solitaire when there is one (Araignée, Taquin, Quarante Voleurs), translates descriptive titles, and keeps proper names (Klondike, FreeCell, Yukon). Search matches the translated title, the English title and the aliases, ignoring accents. Rules that mention another game use its translated title.
- **Quotes and Tao Te Ching chapters are translated.** Under each translated one, a "Show original" switch shows the English.
  - A **"Translate quotes and chapters"** setting turns translation off entirely. It is on by default and appears when the app isn't in English.
- **Formality:** French uses "vous". Spanish is neutral international Spanish using "tú". Italian uses "tu". Portuguese is Brazilian Portuguese using "você" (code `pt`), the larger market; European Portuguese speakers read it without trouble. Turkish uses "sen". Indonesian uses "kamu".
- **Tao Te Ching:** McDonald's "the Master … she" becomes "the Sage … he" in every language (le Sage, el Sabio, il Saggio, o Sábio, Bilge, Sang Bijak), and every chapter keeps the English line breaks.
- **Card faces:** the single letters on cards (A, K, Q, J) stay as they are. Full rank words are translated with plurals, for example King → Roi / Rey / Re / Rei / Papaz and Kings → Rois / Reyes / Re / Reis / Papazlar. Indonesian keeps the English rank names (As, King, Queen, Jack), as Indonesian players do, and Indonesian and Turkish poker hands follow local usage.
- **Suit versus colour in Turkish:** "renk" means both, so rules say "takım" for a suit and keep "renk" for red and black.
- **Language setting:** Settings has a Language dropdown (`SelectControl`). Its first option, "Auto (<phone language>)", follows the phone's language and is the default. English, Français, Español, Italiano, Português, Türkçe and Bahasa Indonesia follow as fixed options, including the language Auto currently resolves to. On web, Auto follows the browser's language. On Android 13 and later, the app also appears in the system's per-app language settings.
- **Privacy policy:** translated, with a note that the English version prevails.

## How it works

### Libraries

- **`expo-localization`** reads the phone's language list. Its config plugin, in `app.config.js`, lists the supported languages for Android per-app language settings and iOS. It also allows a language change without restarting the app, and keeps only these languages' resources in the APK.
- **`i18next` and `react-i18next`** handle lookups, interpolation, plurals and fallback to English.
- **`intl-pluralrules`** supplies `Intl.PluralRules`, which Hermes lacks and i18next needs.

### Code

- **`src/i18n/index.ts`** initializes i18next synchronously with bundled translations, so the first frame is already in the right language.
  - It exports `useTranslation`, `Trans`, `useDisplayLanguage`, `i18n` (for code outside components, such as toasts) and `applyLanguagePreference`.
  - Import these from `@/i18n`, never from `react-i18next`, so the setup always runs first.
- **`src/i18n/languages.ts`** holds the supported languages, their native names, and how the language setting resolves against the phone's languages.
- **`src/hooks/useLanguageSync.ts`**, used in the root layout, applies the saved `language` setting.
  - When the setting follows the phone, it checks the language again each time the app returns to the foreground.
  - The splash screen stays up until the saved setting is applied.
- **`src/i18n/pseudo.ts`** provides the development-only **Pseudo-locale** in the language picker. It shows English accented and 40% longer, such as `[Šţöçķ ~~]`, to catch overflowing or untranslated text.
- **Typed keys:** `src/i18n/i18next.d.ts` types translation keys against the English files, so `tsc` rejects a key that doesn't exist.

### UI text

- UI text lives in `src/locales/<language>/<namespace>.json`. The namespaces are `common`, `game`, `home`, `nodes`, `privacy` and `settings`, and they are registered in `src/i18n/resources.ts`.
- Components call `const { t } = useTranslation("home")` and then `t("sections.gameOfTheDay")`.
- For text containing a link, use `<Trans>` with a `<link>` tag in the string; see `HomeModal` and `privacy.tsx`.
- Plurals use i18next's `_one` and `_other` keys, as in `nodes:reward.unlockedGames`.

### Longer content

Longer text keeps its English in the code, where it is edited as before:

- game titles, descriptions, quick starts and rules (`src/data/games/*.ts`);
- game settings (`src/data/game-settings.ts`);
- quotes and Tao Te Ching chapters.

Translations live in `src/locales/<language>/content/{games,settings,quotes,tao}.json`, and `src/i18n/content.ts` lays them over the English:

- Each translation is stored as `{ "hash": ..., "value": ... }`. The hash is `sourceHash()` of the English it was translated from.
- When the English changes, the hash no longer matches. The app then shows English for that field, so outdated rules are never shown, and the i18n tests fail and list the stale field.
- `localizeGame`, `localizeSettingDefinitions`, `localizeQuote` and `localizeTaoChapter` return translated copies, cached per object and language. `localizeGameTitle` is the shortcut for screens that only show a name; every place that shows or sorts game names uses it.
- `isQuoteTranslated` and `isTaoChapterTranslated` decide whether the "Show original" switch appears.
- All 456 game fields (114 titles plus descriptions, quick starts and rules), 28 settings, 156 quotes and 81 chapters are translated in every language.

### Glossaries

`src/locales/glossary/{fr,es,it,pt}.json` records the style rules and card-game terms for each language:

- formality and typography;
- rank and suit names with plurals;
- foundation, stock, waste and similar terms.

Translations follow the glossary, and it is sent with every request the translation script makes.

### Translation workflow

`scripts/i18n.mjs` (`npm run i18n -- <command>`) reads the English content straight from the TypeScript sources:

- `status` — how much of each type is translated, stale or still English, per language.
- `export --lang fr [--type games] [--limit N] [--out file]` — the untranslated English, with batch boundaries for long runs.
- `import --lang fr --file file` — takes `{"items":[{"id","translation"}]}`, checks placeholders, card tokens, markdown structure and list lengths, then writes each translation with the hash of the English it came from.
- `translate --lang fr [--dry-run]` — the same work through the Anthropic API, with the glossary; needs `ANTHROPIC_API_KEY`.

An import that fails a check is rejected field by field, so a bad batch can never half-land.

### Numbers

`src/i18n/format.ts` formats percentages with `Intl.NumberFormat` in the display language, so French writes "45 %" with its non-breaking space. Win rates on the Stats tab and in the game stats go through it.

### Checks

- `src/__tests__/i18n.test.ts` checks that:
  - every language has every English UI key, with the same placeholders, tags and line breaks;
  - plurals follow each language's rules;
  - content translations aren't stale, point at existing games, settings, quotes and chapters, and keep the rules' markdown structure;
  - stale content falls back to English.
- ESLint's `i18next/no-literal-string` rule warns about hardcoded text in the converted folders (`src/app`, and `Button`, `Home`, `Modals`, `Nodes` and `common` under `src/components`).
- Jest runs in English, because expo-localization's mock reports `en-US`.

## Editing text

- **Changing or adding UI text:** edit the English JSON, then add the same key to every other language. The i18n tests fail until you do.
- **Changing game rules, settings, quotes or chapters:** edit the English where it lives. Existing translations of that field become stale and show English until they are translated again. The tests list them, with the new hash.
- **Adding a language:**
  1. Add its code to `SUPPORTED_LANGUAGES` and `LANGUAGE_NAMES` (`src/i18n/languages.ts`), and check that `LANGUAGE_NAMES` in `scripts/i18n.mjs` has it.
  2. Add its UI files and register them in `resources.ts`.
  3. Add empty `content/*.json` files (`{}`), a content entry in `content.ts`, and the same entry in the `CONTENT` map of `src/__tests__/i18n.test.ts`.
  4. Add a glossary, and a tagline in `scripts/generate-store-graphics.mjs`.
  5. Add the code to `supportedLocales` in `app.config.js`, to `resourceConfigurations` in `android/app/build.gradle`, and to `android/app/src/main/res/xml/locales_config.xml`. Android names a few languages by old codes in `resourceConfigurations` (Indonesian is `in`, Hebrew `iw`), and the phone reports them the same way; `normalizeLanguageCode` in `languages.ts` maps them back.
  6. Check the script: on Android, `textTransform: "uppercase"` follows the phone's locale, not the app's, so on native `Text` uppercases in JavaScript for the display language (`toDisplayUpperCase`, with the Turkish dotted İ rule). A language with other casing rules needs a case there. Components that animate text styles (`NodeDetailsPanel`, `GameUserStats`) call it directly.
  7. Translate: titles first, since rules mention other games by title, then rules, settings, quotes and chapters. Then rebuild the native app.

## Next steps

1. **Check it on the phone.** Run the all-games sweep in each language, and in the pseudo-locale, and fix any overflow. French and Spanish were checked; Italian, Portuguese, Turkish and Indonesian were not. The random-play stress test already passes with `RANDOM_PLAY_LANGUAGE=fr`.
2. **Store listing.** Translate the Play Store description and screenshots' captions. The feature graphic tagline is already localized: `npm run store-graphics:generate -- --lang fr` writes `feature-graphic-1024x500-fr.png` (fr, es, it, pt, tr and id exist).
3. **More languages.** See "Next languages" below.
4. **Crash reporting** (`docs/crash-reporting-plan.md`) is still deferred and remains open before the first release.

John H. McDonald's Tao Te Ching translation allows derivative translations, which the translated chapters rely on; the Settings credit says the chapters are translated from his English version.

## Size

Each Latin-script language adds about 295 KB of JSON (about 78 KB compressed) to the JavaScript bundle; fr 313 KB, es 292 KB, it 293 KB, pt 293 KB, tr 286 KB, id 290 KB. The universal release APK is about 110 MB, most of it native libraries for four CPU types, so an Android App Bundle shrinks each download far more than any language adds.

## Next languages

Turkish and Indonesian, formerly in this list, are done. Chosen by how many people speak the language and use Android, leaving out languages whose speakers mostly read English comfortably (German, Dutch, Swedish, Norwegian, Danish).

| Order | Language           | Cost                            | Difficulty                                                                                                                      |
| ----- | ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Japanese           | ~250 KB                         | Needs a CJK font fallback; line breaking; no spaces for search                                                                  |
| 2     | Simplified Chinese | ~200 KB                         | Same as Japanese; Play Store isn't available in mainland China, so the reach is Singapore, Malaysia and Chinese speakers abroad |
| 3     | Korean             | ~230 KB                         | Hangul font fallback; otherwise straightforward                                                                                 |
| 4     | Russian            | ~330 KB, plus a Cyrillic font   | Three plural forms; long words                                                                                                  |
| 5     | Hindi              | ~450 KB, plus a Devanagari font | Conjunct shaping; many Indian players read English                                                                              |
| 6     | Arabic             | ~300 KB, plus an Arabic font    | Right-to-left layout of the whole app; six plural forms                                                                         |
| 7     | Vietnamese         | ~320 KB                         | Stacked accents need a font that has them                                                                                       |
| 8     | Polish             | ~320 KB                         | Three plural forms; long words                                                                                                  |

Common to the non-Latin languages:

- **Fonts.** Outfit covers only Latin. Android falls back to system fonts for other scripts, which works but looks different; a matching font costs 1–10 MB (CJK the most).
- **Layout.** Arabic needs right-to-left mirroring of the whole UI, including hand-tuned game boards, which is the largest job on this list.
- **Search.** `foldForSearch` strips Latin accents only; Japanese and Chinese need substring matching without word boundaries, which it already does.
