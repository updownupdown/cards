import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import {
  gameArt,
  useCardFrame,
  useGameCategory,
} from "@/components/Home/HomeArt";
import { getGameDotDefinition } from "@/data/campaign-map";
import { setLastPlayedGameDot } from "@/data/campaign-progress";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { gamePalette, PaletteContext } from "@/styles/palette";
import { rgba, theme as appTheme } from "@/styles/styles";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ActionButton, RatingMeters } from "./Nocturne";
import { GameCollectibleIcons } from "./GameCollectibleIcons";

/** How much of the game's colour lies over its art. */
const OVERLAY_OPACITY = 0.92;
/** Moving to another game, its colours and art ease in over this long. */
export const GAME_CHANGE_MS = 400;

type Props = {
  path: string;
  collectedTaoIds: ReadonlySet<number>;
  collectedQuoteIds: ReadonlySet<number>;
  locked?: boolean;
  /** Launch in Campaign mode, so a win counts on the map. */
  campaign?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A game's label, in the game's own colours over its art: its name and
 * family, its ratings, the collectibles a Campaign win gives, and a Play
 * button. Shown under the Odyssey map; moving to another game, the colours
 * ease across.
 */
export function GameInfoPanel({
  path,
  collectedTaoIds,
  collectedQuoteIds,
  locked = false,
  campaign = false,
  style,
}: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t: tCommon } = useTranslation("common");
  const language = useDisplayLanguage();
  const category = useGameCategory();
  const frame = useCardFrame();
  const game = GAMES_DATA[path];
  const theme = useMemo(
    () =>
      game
        ? gamePalette(
            game.gameColorDark,
            game.gameColorPale,
            game.gameColorAccent,
          )
        : appTheme,
    [game],
  );
  const overlayColor = rgba(theme.surface, OVERLAY_OPACITY);
  const overlay = useSharedValue(overlayColor);
  useEffect(() => {
    overlay.value = withTiming(overlayColor, { duration: GAME_CHANGE_MS });
  }, [overlay, overlayColor]);
  const overlayStyle = useAnimatedStyle(() => ({
    backgroundColor: overlay.value,
  }));
  if (!game) return null;
  const rewards = getGameDotDefinition(path)?.rewards ?? [];

  const play = () => {
    if (campaign) {
      void setLastPlayedGameDot(path);
      launchGame({ pathname: path, params: { mode: "campaign" } } as Href);
    } else {
      launchGame(path as Href);
    }
  };

  return (
    <PaletteContext.Provider value={theme}>
      <View
        style={[
          {
            // The game cards' frame: their corners and shadow.
            ...frame,
            padding: spacing(16),
            gap: spacing(14),
            backgroundColor: theme.surface,
          },
          style,
        ]}
      >
        <Image
          source={gameArt(game)}
          cachePolicy="memory"
          contentFit="cover"
          transition={GAME_CHANGE_MS}
          style={[StyleSheet.absoluteFill, { opacity: locked ? 0.35 : 1 }]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: spacing(12),
          }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: spacing(2) }}>
            <Text size="xl" weight={500} numberOfLines={1}>
              {localizeGameTitle(game, path, language)}
            </Text>
            <Text size="xs" weight={400} color={theme.dim} numberOfLines={1}>
              {category(game)}
            </Text>
          </View>
          <GameCollectibleIcons
            rewards={rewards}
            collectedTaoIds={collectedTaoIds}
            collectedQuoteIds={collectedQuoteIds}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: spacing(14),
          }}
        >
          <View style={{ flex: 1 }}>
            <RatingMeters
              rating={game.rating}
              labels={{
                complexity: tCommon("stats.complexity"),
                difficulty: tCommon("stats.difficulty"),
                luck: tCommon("stats.luck"),
              }}
            />
          </View>
          <ActionButton
            small
            iconName={locked ? "lock" : "play"}
            label={tCommon("play")}
            disabled={locked}
            onPress={play}
          />
        </View>
      </View>
    </PaletteContext.Provider>
  );
}
