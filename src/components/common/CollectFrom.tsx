import { Button } from "@/components/Button/Button";
import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { setLastPlayedGameDot } from "@/data/campaign-progress";
import { GAMES_DATA } from "@/data/games-registry";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { usePalette } from "@/styles/palette";
import { FontWeight, rgba } from "@/styles/styles";
import type { Href } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** One swell or fade of the glow round a button that can collect. */
const GLOW_PULSE_MS = 1800;

/**
 * A "Win <game> to collect" button under something not collected yet, the
 * game's name in bold, which starts the game, glowing softly in the button's
 * colour. A Tao chapter or quote only comes from a Campaign win, so for
 * those the game starts in Campaign mode; while the game is still locked on
 * the map the button is locked too, with a line under it saying why.
 */
export function CollectFrom({
  path,
  campaign = false,
  onLaunch,
}: {
  path: string;
  campaign?: boolean;
  /** Called as the game starts (a viewer can close). */
  onLaunch?: () => void;
}) {
  const { t } = useTranslation("common");
  const theme = usePalette();
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const { unlockedPaths, isLoading } = useCampaignProgress();
  const game = GAMES_DATA[path];
  // Until the progress is read, the map's locks aren't known.
  if (!game || (campaign && isLoading)) return null;
  const gameTitle = localizeGameTitle(game, path, language);
  const locked = campaign && !unlockedPaths.has(path);
  const play = () => {
    onLaunch?.();
    if (campaign) {
      void setLastPlayedGameDot(path);
      launchGame({ pathname: path, params: { mode: "campaign" } } as Href);
    } else {
      launchGame(path as Href);
    }
  };

  const label = withBoldName(t("winToCollect", { game: gameTitle }), theme.sky);

  const button = (
    <Button
      text={label}
      size="sm"
      onPress={play}
      disabled={locked}
      iconName={locked ? "lock" : undefined}
      halfTaller
      style={{ alignSelf: "center" }}
      textStyle={{
        fontFamily: FontWeight[400],
        color: rgba(theme.sky, 0.75),
      }}
    />
  );

  if (locked) {
    return (
      <View style={{ alignItems: "center", gap: spacing(10) }}>
        {button}
        <Text
          size="xs"
          weight={400}
          color={theme.dim}
          style={{ textAlign: "center", maxWidth: spacing(300) }}
        >
          {withBoldName(t("lockedOnMap", { game: gameTitle }), theme.ink)}
        </Text>
      </View>
    );
  }

  return <Glow color={theme.accent}>{button}</Glow>;
}

/** The game's name, marked **bold** in the translation, in bold. */
function withBoldName(text: string, color: string) {
  return text.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <Text key={index} weight={600} color={color}>
        {part}
      </Text>
    ) : (
      part
    ),
  );
}

/** A soft light round a button, in its colour, slowly swelling and fading. */
function Glow({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  const { spacing } = useResponsiveMetrics();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: GLOW_PULSE_MS,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [pulse]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.5 * pulse.value,
  }));

  return (
    <View style={{ alignSelf: "center" }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            pointerEvents: "none",
            borderRadius: 999,
            backgroundColor: color,
            boxShadow: `0 0 ${spacing(18)}px ${spacing(3)}px ${rgba(color, 0.8)}`,
          },
          glowStyle,
        ]}
      />
      {children}
    </View>
  );
}
