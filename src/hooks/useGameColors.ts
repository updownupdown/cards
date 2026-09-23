import { getGameInfo } from "@/data/game-menu";
import { Colors, rgba } from "@/styles/styles";
import { DEFAULT_CARD_BACK } from "@/data/card-backs";
import { useGamePath } from "./useGamePath";

export function useGameColors(opacity = 0.7) {
  const pathname = useGamePath();
  const gameInfo = getGameInfo(pathname);
  const fallbackColor = Colors.background;

  return {
    colorZone: rgba(gameInfo?.gameColorDark ?? fallbackColor, opacity),
    colorDark: gameInfo?.gameColorDark ?? fallbackColor,
    colorPale: gameInfo?.gameColorPale ?? Colors.K100,
    /** Image key for this game's card back, shared with games using the same ink. */
    cardBackKey: (gameInfo?.cardBack ?? DEFAULT_CARD_BACK).toLowerCase(),
  };
}
