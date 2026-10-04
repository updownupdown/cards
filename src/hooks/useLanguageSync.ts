import { applyLanguagePreference } from "@/i18n";
import { setEnglishGameTitles } from "@/i18n/content";
import type { LanguagePreference } from "@/i18n/languages";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useGlobalSettings } from "./useGlobalSettings";

/**
 * Keeps the app's language in step with the language setting and, when that
 * follows the phone, with the phone's language. Returns false until the saved
 * setting has been applied, so the first screen isn't shown in the wrong
 * language.
 */
export function useLanguageSync() {
  const { settings, isLoading } = useGlobalSettings();
  const preference = settings.language;
  // Set while rendering, so every title drawn after this is already right.
  setEnglishGameTitles(settings.useEnglishGameTitles);
  const [appliedPreference, setAppliedPreference] =
    useState<LanguagePreference | null>(null);

  useEffect(() => {
    if (isLoading) return;
    applyLanguagePreference(preference);
    setAppliedPreference(preference);
    if (preference !== "system") return;

    // Android lets people change the language while the app is open.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") applyLanguagePreference(preference);
    });
    return () => subscription.remove();
  }, [isLoading, preference]);

  return appliedPreference !== null;
}
