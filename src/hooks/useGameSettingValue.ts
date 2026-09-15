import { DEFAULT_GAME_SETTINGS, type GameSettings } from "@/data/game-menu";
import { useGamePath } from "./useGamePath";
import { useGameSettings } from "./useGameSettings";

export function useGameSettingValue<K extends keyof GameSettings>(key: K) {
  const pathname = useGamePath();
  const { settings } = useGameSettings(pathname);

  return (settings?.[key] ?? DEFAULT_GAME_SETTINGS[key]) as GameSettings[K];
}
