import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { RatingMeters } from "@/components/ui/Nocturne";
import { GameMenuInfo } from "@/data/games-data";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { rgba, theme as appTheme } from "@/styles/styles";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type Href } from "expo-router";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { FavButton } from "./FavButton";
import {
  favCorner,
  gameArt,
  useCardFrame,
  useGameCategory,
  useGamePalette,
} from "./HomeArt";
import { PaletteContext } from "@/styles/palette";
import { useTabReadyImage } from "./TabReady";

type Props = {
  path: string;
  game: GameMenuInfo;
  onToggleFavorite?: (path: string) => void;
  isFavorite: boolean;
  style?: ViewStyle;
};

/** The height of a full-width game card, the same wherever it shows. */
export const HOME_CARD_HEIGHT = 172;

/**
 * A game at full width: its art on the right, melting into the card, with its
 * name, family and ratings at the foot on the left (Game of the Day, the
 * Random Deal).
 */
export function HomeCard({
  path,
  game,
  onToggleFavorite,
  isFavorite,
  style,
}: Props) {
  const { spacing } = useResponsiveMetrics();
  const frame = useCardFrame();
  const { t: tCommon } = useTranslation("common");
  const category = useGameCategory();
  const thumbnail = gameArt(game);
  const thumbnailReady = useTabReadyImage(thumbnail);
  const title = localizeGameTitle(game, path, useDisplayLanguage());

  // The card in the game's own colours.
  const theme = useGamePalette(game);
  return (
    <PaletteContext.Provider value={theme}>
      <View
        style={[
          {
            ...frame,
            height: spacing(HOME_CARD_HEIGHT),
            backgroundColor: theme.surface,
          },
          style,
        ]}
      >
        <Pressable
          onPress={() => launchGame(path as Href)}
          accessibilityRole="button"
          accessibilityLabel={title}
          style={{ flex: 1 }}
        >
          {/* The art, melting slowly into the card towards the text. */}
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: "100%",
              backgroundColor: game.gameColorDark,
            }}
          >
            <Image
              source={thumbnail}
              // Every image is bundled, so skip expo-image's disk cache. On
              // Android it keys bundled images by resource id, which a new build
              // can reshuffle; while versionCode stays the same, the cache served
              // other games' thumbnails. Keep cachePolicy="memory" on every Image.
              cachePolicy="memory"
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              {...thumbnailReady}
            />
            <LinearGradient
              colors={[
                theme.surface,
                rgba(theme.surface, 0.6),
                rgba(theme.surface, 0),
              ]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View
            style={{
              flex: 1,
              width: "80%",
              justifyContent: "flex-end",
              padding: spacing(16),
              gap: spacing(12),
            }}
          >
            <View style={{ gap: spacing(2), width: "78%" }}>
              <Text size="xl" weight={500} lineHeight={1.15} numberOfLines={2}>
                {title}
              </Text>
              <Text size="xs" weight={400} color={theme.dim} numberOfLines={1}>
                {category(game)}
              </Text>
            </View>
            <RatingMeters
              rating={game.rating}
              labels={{
                complexity: tCommon("stats.complexity"),
                difficulty: tCommon("stats.difficulty"),
                luck: tCommon("stats.luck"),
              }}
            />
          </View>
        </Pressable>
        <FavButton
          style={favCorner(spacing, spacing(40), spacing(22))}
          isFavorite={isFavorite}
          onToggleFavorite={() => onToggleFavorite?.(path)}
          size={spacing(40)}
          iconSize={spacing(22)}
          // The app theme's accent, on every game card.
          activeColor={appTheme.accent}
          inactiveColor={theme.ink}
          disabled={!onToggleFavorite}
          shadow={false}
        />
      </View>
    </PaletteContext.Provider>
  );
}
