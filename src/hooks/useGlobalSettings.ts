import { useEffect, useState } from "react";
import {
  GlobalSettings,
  DEFAULT_GLOBAL_SETTINGS,
  loadGlobalSettings,
  saveGlobalSettings,
} from "@/data/game-menu";

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(
    DEFAULT_GLOBAL_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadGlobalSettings().then((loaded) => {
      if (active) {
        setSettings(loaded);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const updateSettings = async (updates: Partial<GlobalSettings>) => {
    const nextSettings = { ...settings, ...updates };
    setSettings(nextSettings);
    await saveGlobalSettings(nextSettings);
  };

  return {
    settings,
    updateSettings,
    isLoading,
  };
}
