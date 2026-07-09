import { getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { Colors, rgba } from "@/styles/styles";
import { usePathname } from "expo-router";

export function useGameZoneBackground(opacity = 0.7) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const fallbackColor = Colors.background;

  return {
    zoneBg: rgba(gameInfo?.cardColorBg ?? fallbackColor, opacity),
    cardBg: gameInfo?.cardColorBg ?? fallbackColor,
    cardText: gameInfo?.cardColorText ?? Colors.K100,
  };
}
