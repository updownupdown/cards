import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { hairline, RatingMeters } from "@/components/ui/Nocturne";
import { GameMenuInfo } from "@/data/games-data";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type Href } from "expo-router";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { FavButton } from "./FavButton";
import { gameArt, useGameCategory } from "./HomeArt";
import { useTabReadyImage } from "./TabReady";

type Props = {
  path: string;
  game: GameMenuInfo;
  onToggleFavorite?: (path: string) => void;
  isFavorite: boolean;
  style?: ViewStyle;
};

/**
 * A game at full width: its art on the left, fading into the card, with its
 * name, family and ratings beside it (Game of the Day, the Random Deal).
 */
export function HomeCard({
  path,
  game,
  onToggleFavorite,
  isFavorite,
  style,
}: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t: tCommon } = useTranslation("common");
  const category = useGameCategory();
  const thumbnail = gameArt(game);
  const thumbnailReady = useTabReadyImage(thumbnail);
  const title = localizeGameTitle(game, path, useDisplayLanguage());

  return (
    <View
      style={[
        {
          minHeight: spacing(150),
          borderRadius: spacing(18),
          overflow: "hidden",
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: hairline(),
        },
        style,
      ]}
    >
      <Pressable
        onPress={() => launchGame(path as Href)}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={{ flex: 1, flexDirection: "row" }}
      >
        {/* The art, melting into the card towards the text. */}
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "52%",
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
              rgba(theme.surface, 0),
              rgba(theme.surface, 0.55),
              theme.surface,
            ]}
            locations={[0.3, 0.7, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View
          style={{
            flex: 1,
            marginLeft: "40%",
            padding: spacing(14),
            paddingRight: spacing(40),
            gap: spacing(4),
          }}
        >
          <Text size="lg" weight={500} lineHeight={1.2} numberOfLines={2}>
            {title}
          </Text>
          <Text size="xs" weight={300} color={theme.dim} numberOfLines={1}>
            {category(game)}
          </Text>
          <View style={{ marginTop: "auto", paddingTop: spacing(12) }}>
            <RatingMeters
              stacked
              rating={game.rating}
              labels={{
                complexity: tCommon("stats.complexity"),
                difficulty: tCommon("stats.difficulty"),
                luck: tCommon("stats.luck"),
              }}
            />
          </View>
        </View>
      </Pressable>
      <FavButton
        style={{ position: "absolute", top: spacing(4), right: spacing(4) }}
        isFavorite={isFavorite}
        onToggleFavorite={() => onToggleFavorite?.(path)}
        size={spacing(40)}
        iconSize={spacing(22)}
        activeColor={theme.accent}
        inactiveColor={theme.dim}
        disabled={!onToggleFavorite}
      />
    </View>
  );
}
