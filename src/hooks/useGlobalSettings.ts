import { useEffect, useState } from "react";
import {
  GlobalSettings,
  DEFAULT_GLOBAL_SETTINGS,
  getCachedGlobalSettings,
  loadGlobalSettings,
  saveGlobalSettings,
  subscribeToGlobalSettings,
} from "@/data/game-menu";

export function useGlobalSettings() {
  // On native, settings are usually already in memory: start from them so the
  // first render is final, instead of rendering defaults and then again.
  const [settings, setSettings] = useState<GlobalSettings>(
    () => getCachedGlobalSettings() ?? DEFAULT_GLOBAL_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(
    () => getCachedGlobalSettings() === null,
  );

  useEffect(() => {
    let active = true;

    // Keep every instance in sync when any of them saves.
    const unsubscribe = subscribeToGlobalSettings((next) => {
      setSettings(next);
      setIsLoading(false);
    });

    if (getCachedGlobalSettings() === null) {
      loadGlobalSettings().then((loaded) => {
        if (active) {
          setSettings(loaded);
          setIsLoading(false);
        }
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const updateSettings = async (updates: Partial<GlobalSettings>) => {
    // Updates every subscribed instance (this one included) before saving.
    await saveGlobalSettings({ ...settings, ...updates });
  };

  return {
    settings,
    updateSettings,
    isLoading,
  };
}
