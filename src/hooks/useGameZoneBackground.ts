import { getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { Colors, rgba } from "@/styles/styles";
import { usePathname } from "expo-router";

export function useGameZoneBackground(opacity = 0.7) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);

  return {
    zoneBg: rgba(gameInfo?.cardColorBg ?? Colors.K875, opacity),
    cardBg: gameInfo?.cardColorBg ?? Colors.K875,
    cardText: gameInfo?.cardColorText ?? Colors.K100,
  };
}
