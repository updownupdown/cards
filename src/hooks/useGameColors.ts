import { getGameInfo } from "@/data/game-menu";
import { Colors, rgba } from "@/styles/styles";
import { useGamePath } from "./useGamePath";

export function useGameColors(opacity = 0.7) {
  const pathname = useGamePath();
  const gameInfo = getGameInfo(pathname);
  const fallbackColor = Colors.background;

  return {
    colorZone: rgba(gameInfo?.gameColorDark ?? fallbackColor, opacity),
    colorDark: gameInfo?.gameColorDark ?? fallbackColor,
    colorPale: gameInfo?.gameColorPale ?? Colors.K100,
  };
}
