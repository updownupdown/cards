import { getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { Colors, rgba } from "@/styles/styles";
import { usePathname } from "expo-router";

export function useGameZoneBackground(opacity = 0.7) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const fallbackColor = Colors.background;

  return {
    colorZone: rgba(gameInfo?.gameColorDark ?? fallbackColor, opacity),
    colorDark: gameInfo?.gameColorDark ?? fallbackColor,
    colorPale: gameInfo?.gameColorPale ?? Colors.K100,
  };
}
