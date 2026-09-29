import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { setLastPlayedGameDot } from "@/data/campaign-progress";
import { GAMES_DATA } from "@/data/games-registry";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { usePalette } from "@/styles/palette";
import type { Href } from "expo-router";
import type { TextStyle } from "react-native";

/**
 * Where something is (or was) collected from: "Collect from: Klondike", the
 * game's name a link in the accent that starts it. A Tao chapter or quote
 * only comes from a Campaign win, so for those the game starts in Campaign
 * mode once it is unlocked on the map.
 */
export function CollectFrom({
  path,
  collected = false,
  campaign = false,
  onLaunch,
  style,
}: {
  path: string;
  /** "Collected from", rather than "Collect from". */
  collected?: boolean;
  campaign?: boolean;
  /** Called as the game starts (a viewer can close). */
  onLaunch?: () => void;
  style?: TextStyle;
}) {
  const { t } = useTranslation("common");
  const language = useDisplayLanguage();
  const theme = usePalette();
  const { unlockedPaths } = useCampaignProgress();
  const game = GAMES_DATA[path];
  if (!game) return null;
  const play = () => {
    onLaunch?.();
    if (campaign && unlockedPaths.has(path)) {
      void setLastPlayedGameDot(path);
      launchGame({ pathname: path, params: { mode: "campaign" } } as Href);
    } else {
      launchGame(path as Href);
    }
  };
  return (
    <Text
      size="md"
      weight={700}
      color={theme.dim}
      style={[{ textAlign: "center" }, style]}
    >
      {t(collected ? "collectedFrom" : "collectFrom")}{" "}
      <Text
        size="md"
        weight={700}
        color={theme.accent}
        accessibilityRole="link"
        onPress={play}
      >
        {localizeGameTitle(game, path, language)}
      </Text>
    </Text>
  );
}
