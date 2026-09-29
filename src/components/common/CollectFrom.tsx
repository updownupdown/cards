import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { setLastPlayedGameDot } from "@/data/campaign-progress";
import { GAMES_DATA } from "@/data/games-registry";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { usePalette } from "@/styles/palette";
import { rgba } from "@/styles/styles";
import type { Href } from "expo-router";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * Where something is (or was) collected from: a small "Collected from" in
 * thin, spaced-out capitals between two hairlines, and under it the game's
 * name, in the same thin capitals in the accent, a link that starts it. A
 * Tao chapter or quote only comes from a Campaign win, so for those the game
 * starts in Campaign mode once it is unlocked on the map.
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
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation("common");
  const language = useDisplayLanguage();
  const { spacing, font } = useResponsiveMetrics();
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
  const rule = (
    <View
      style={{
        width: spacing(22),
        height: 1,
        backgroundColor: rgba(theme.dim, 0.45),
      }}
    />
  );
  return (
    <View style={[{ alignItems: "center", gap: spacing(6) }, style]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing(10),
        }}
      >
        {rule}
        <Text
          weight={300}
          color={theme.dim}
          textTransform="uppercase"
          numberOfLines={1}
          style={{
            fontSize: font(11),
            lineHeight: font(14),
            letterSpacing: spacing(2.4),
          }}
        >
          {t(collected ? "collectedFrom" : "collectFrom")}
        </Text>
        {rule}
      </View>
      <Text
        weight={300}
        color={theme.accent}
        textTransform="uppercase"
        accessibilityRole="link"
        onPress={play}
        style={{
          textAlign: "center",
          fontSize: font(17),
          lineHeight: font(22),
          letterSpacing: spacing(3),
        }}
      >
        {localizeGameTitle(game, path, language)}
      </Text>
    </View>
  );
}
