// Hermes has no Intl.PluralRules, which i18next needs for plurals.
import "intl-pluralrules";
import { getLocales } from "expo-localization";
// `use` is renamed so lint doesn't mistake it for a React hook.
import i18n, { changeLanguage, use as registerPlugin } from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { Platform } from "react-native";
import {
  PSEUDO_LANGUAGE,
  normalizeLanguageCode,
  resolveLanguage,
  SOURCE_LANGUAGE,
  type DisplayLanguage,
  type LanguagePreference,
} from "./languages";
import { pseudoLocalizeDeep } from "./pseudo";
import { NAMESPACES, RESOURCES } from "./resources";

/** The phone's preferred languages, most preferred first. */
export function getDeviceLanguageCodes() {
  try {
    return getLocales().map((locale) =>
      normalizeLanguageCode(locale.languageCode),
    );
  } catch {
    return [];
  }
}

// Translations are bundled and loaded synchronously, so the first frame is
// already in the right language. The saved language setting is applied as
// soon as it loads (see useLanguageSync); until then the phone's language is
// used. The web starts in English instead, as its static pages are, so they
// hydrate cleanly; the root layout rebuilds the app once the language is in.
void registerPlugin(initReactI18next).init({
  resources: __DEV__
    ? { ...RESOURCES, [PSEUDO_LANGUAGE]: pseudoLocalizeDeep(RESOURCES.en) }
    : RESOURCES,
  lng:
    Platform.OS === "web"
      ? SOURCE_LANGUAGE
      : resolveLanguage("system", getDeviceLanguageCodes()),
  fallbackLng: SOURCE_LANGUAGE,
  ns: NAMESPACES,
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
  react: { useSuspense: false },
});

/** The language the app is showing now. */
export function getDisplayLanguage() {
  return i18n.language as DisplayLanguage;
}

/** The language the app is showing, re-rendering the component when it changes. */
export function useDisplayLanguage() {
  return useTranslation().i18n.language as DisplayLanguage;
}

/** Switches the app to the language the setting resolves to, and returns it. */
export function applyLanguagePreference(preference: LanguagePreference) {
  const language = resolveLanguage(preference, getDeviceLanguageCodes());
  if (i18n.language !== language) void changeLanguage(language);
  if (typeof document !== "undefined") {
    document.documentElement.lang =
      language === PSEUDO_LANGUAGE ? SOURCE_LANGUAGE : language;
  }
  return language;
}

export { i18n };
export { Trans, useTranslation } from "react-i18next";
