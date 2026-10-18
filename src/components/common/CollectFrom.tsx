import { useShowAnimations } from "@/hooks/useShowAnimations";
import { Button } from "@/components/Button/Button";
import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { isPathBeyondField } from "@/data/force-field";
import { setLastPlayedGameDot } from "@/data/campaign-progress";
import { useFieldUp } from "@/data/odyssey-field";
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
  cancelAnimation,
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
 * those the game starts in Campaign mode, and there's no button while the
 * game is still locked on the map, or held beyond the force field.
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
  const language = useDisplayLanguage();
  const { unlockedPaths, isLoading } = useCampaignProgress();
  const fieldUp = useFieldUp();
  const game = GAMES_DATA[path];
  // A Campaign win is the only way to collect a quote or chapter, so no
  // button until the game is open on the map (or the map is read).
  if (
    !game ||
    (campaign &&
      (isLoading ||
        !unlockedPaths.has(path) ||
        (fieldUp && isPathBeyondField(path))))
  ) {
    return null;
  }
  const gameTitle = localizeGameTitle(game, path, language);
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

  return (
    <Glow color={theme.accent}>
      <Button
        text={label}
        size="sm"
        onPress={play}
        halfTaller
        style={{ alignSelf: "center" }}
        textStyle={{
          fontFamily: FontWeight[400],
          color: rgba(theme.sky, 0.75),
        }}
      />
    </Glow>
  );
}

/**
 * Whether a quote or chapter from this game can't be collected yet: its game
 * is still locked on the map, or held beyond the force field (or it has
 * none). False until progress is read.
 */
export function useLockedOnMap(path: string | undefined) {
  const { unlockedPaths, isLoading } = useCampaignProgress();
  const fieldUp = useFieldUp();
  return (
    !isLoading &&
    !(path && unlockedPaths.has(path) && !(fieldUp && isPathBeyondField(path)))
  );
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
  const animated = useShowAnimations();
  useEffect(() => {
    if (!animated) {
      // A steady light instead.
      pulse.value = 0.5;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, {
        duration: GLOW_PULSE_MS,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [animated, pulse]);
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
