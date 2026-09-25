import { getDefaultGameSettings, type GameSettings } from "@/data/game-menu";
import { useGamePath } from "./useGamePath";
import { useGameSettings } from "./useGameSettings";

export function useGameSettingValue<K extends keyof GameSettings>(key: K) {
  const pathname = useGamePath();
  const { settings } = useGameSettings(pathname);

  return (settings?.[key] ??
    getDefaultGameSettings(pathname)[key]) as GameSettings[K];
}
