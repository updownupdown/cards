import { Text } from "@/components/common/Text";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import { GameMenuInfo } from "@/data/games-data";
import { Icon } from "@/icons";
import { Colors, HomePadding, MaxContentWidth, rgba } from "@/styles/styles";
import { Link, type Href } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";

type GameCardBaseProps = {
  path: string;
  game: GameMenuInfo;
  onToggleFavorite?: (path: string) => void;
};

type LargeGameCardProps = GameCardBaseProps & {
  isFavorite: boolean;
};

type SmallGameCardProps = GameCardBaseProps & {
  isFavorite: boolean;
};

function getGameSource(game: GameMenuInfo) {
  return GAME_THUMBNAIL_ASSETS[game.thumbnail];
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const dampedScale = (
  raw: number,
  min: number,
  max: number,
  strength: number,
) => {
  const clamped = clamp(raw, min, max);
  return 1 + (clamped - 1) * strength;
};

const STAT_CONFIG = [
  { label: "Complexity", key: "complexity" as const, alpha: 0.78 },
  { label: "Difficulty", key: "difficulty" as const, alpha: 0.68 },
  { label: "Luck", key: "luck" as const, alpha: 0.58 },
];

export function SmallHomeCard({
  path,
  game,
  onToggleFavorite,
  isFavorite,
}: SmallGameCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth =
    Math.min(screenWidth, MaxContentWidth) - HomePadding * 2;
  const smallScale = dampedScale(containerWidth / 380, 0.93, 1.1, 0.55);

  const minHeight = Math.round(52 * smallScale);
  const borderRadius = Math.round(10 * smallScale);
  const padX = Math.round(12 * smallScale);
  const gap = Math.round(10 * smallScale);
  const titleSize = Math.round(16 * smallScale);
  const iconSize = Math.round(24 * smallScale);
  const starSize = Math.round(38 * smallScale);
  const imageWidth = Math.round(containerWidth * 0.28);
  const shadowY = Math.round(4 * smallScale);
  const shadowBlur = Math.round(8 * smallScale);
  const starInset = Math.max(6, Math.round(padX * 0.5));

  const smallCardStyle = StyleSheet.flatten([
    styles.smallCard,
    {
      width: "100%" as const,
      minHeight,
      borderRadius,
      backgroundColor: game.cardColorBg,
      boxShadow: `0 ${shadowY}px ${shadowBlur}px ${rgba(game.cardColorBg, 0.6)}`,
    },
  ]);

  const smallPressableStyle = StyleSheet.flatten([
    styles.smallCardPressable,
    {
      minHeight,
      paddingRight: 0,
      paddingLeft: starSize + gap,
      gap,
    },
  ]);

  const smallStarStyle = StyleSheet.flatten([
    styles.smallCardStar,
    {
      left: starInset,
      width: starSize,
      height: starSize,
      borderRadius: Math.round(8 * smallScale),
      transform: [{ translateY: -starSize / 2 }],
    },
  ]);

  return (
    <View style={smallCardStyle}>
      <Link href={path as Href} asChild>
        <Pressable style={smallPressableStyle}>
          <View style={styles.smallCardTextWrap}>
            <Text weight={400} size="md" color={game.cardColorText}>
              {game.title}
            </Text>
          </View>

          <View
            style={[
              styles.smallCardThumbWrap,
              {
                width: imageWidth,
                borderTopRightRadius: borderRadius,
                borderBottomRightRadius: borderRadius,
              },
            ]}
          >
            <Image
              source={getGameSource(game)}
              style={styles.smallCardImage}
              resizeMode="cover"
            />
            <View style={styles.smallCardThumbOverlay} />
          </View>
        </Pressable>
      </Link>

      <Pressable
        style={smallStarStyle}
        onPress={() => onToggleFavorite?.(path)}
        disabled={!onToggleFavorite}
      >
        <Icon
          name={isFavorite ? "star" : "star-outline"}
          color={isFavorite ? Colors.favoriteStar : Colors.K500}
          size={iconSize}
        />
      </Pressable>
    </View>
  );
}

function StatBar({
  label,
  value,
  fillColor,
  trackStyle,
  columnStyle,
}: {
  label: string;
  value: number;
  fillColor: string;
  labelStyle?: TextStyle;
  trackStyle?: ViewStyle;
  columnStyle?: ViewStyle;
}) {
  return (
    <View
      style={[
        columnStyle,
        {
          flex: 1,
          gap: 6,
        },
      ]}
    >
      <Text
        size="xxs"
        weight={300}
        color={Colors.K300}
        textTransform="uppercase"
      >
        {label}
      </Text>
      <View style={[styles.statTrack, trackStyle]}>
        <View
          style={[
            styles.statFill,
            {
              width: `${value}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function LargeHomeCard({
  path,
  game,
  onToggleFavorite,
  isFavorite,
}: LargeGameCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth =
    Math.min(screenWidth, MaxContentWidth) - HomePadding * 2;
  const rawScale = containerWidth / 380;

  const layoutScale = dampedScale(rawScale, 0.93, 1.1, 0.55);
  const controlScale = dampedScale(rawScale, 0.92, 1.1, 0.55);
  const elevationScale = dampedScale(rawScale, 0.9, 1.12, 0.5);

  const borderRadius = Math.round(12 * layoutScale);
  const cardPadding = Math.round(14 * layoutScale);
  const spacingUnit = Math.round(12 * layoutScale);
  const statTrackHeight = Math.round(8 * layoutScale);
  const statColumnGap = Math.round(5 * layoutScale);
  const controlSize = Math.round(44 * controlScale);
  const starIconSize = Math.round(30 * controlScale);
  const shadowUnit = Math.round(2 * elevationScale);

  const largeStarStyle = StyleSheet.flatten([
    styles.starBtn,
    {
      width: controlSize,
      height: controlSize,
      borderRadius: Math.round(8 * controlScale),
      top: cardPadding * 0.75,
      right: cardPadding * 0.75,
    },
  ]);

  return (
    <View
      style={{
        overflow: "hidden",
        padding: cardPadding * 0.5,
        borderRadius: borderRadius,
        backgroundColor: game.cardColorBg,
        boxShadow: `${shadowUnit * 0.5}px ${shadowUnit * 1}px ${shadowUnit * 4}px ${rgba(game.cardColorBg, 0.4)}, ${shadowUnit * 1}px ${shadowUnit * 2}px ${shadowUnit * 8}px ${rgba(game.cardColorBg, 0.4)}`,
      }}
    >
      <Link href={path as Href} asChild>
        <Pressable style={{ gap: spacingUnit }}>
          <View style={[styles.largeCardTopRow, { gap: spacingUnit }]}>
            <View
              style={[
                styles.largeCardTextColumn,
                {
                  gap: Math.round(6 * layoutScale),
                  paddingVertical: cardPadding * 1.5,
                  paddingHorizontal: cardPadding,
                },
              ]}
            >
              <Text
                size="lg"
                weight={500}
                style={[
                  styles.largeCardTitle,
                  {
                    color: game.cardColorText,
                  },
                ]}
              >
                {game.title}
              </Text>

              <Text
                size="sm"
                weight={300}
                color={Colors.K400}
                lineHeight={1.25}
              >
                {game.cardDescription}
              </Text>
            </View>

            <View
              style={[
                styles.largeCardImageWrap,
                {
                  borderRadius: Math.round(8 * layoutScale),
                },
              ]}
            >
              <Image
                source={getGameSource(game)}
                style={styles.largeCardImage}
                resizeMode="cover"
              />
              <View style={styles.cardOverlay} />
            </View>
          </View>

          <View
            style={[
              styles.statsRow,
              {
                gap: Math.round(10 * layoutScale),
                paddingHorizontal: cardPadding * 1.5,
                paddingBottom: cardPadding * 1.5,
              },
            ]}
          >
            {STAT_CONFIG.map((stat) => (
              <StatBar
                key={stat.key}
                label={stat.label}
                value={game.stats[stat.key]}
                fillColor={rgba(game.cardColorText, stat.alpha)}
                trackStyle={{ height: statTrackHeight }}
                columnStyle={{ gap: statColumnGap }}
              />
            ))}
          </View>
        </Pressable>
      </Link>

      <Pressable
        style={largeStarStyle}
        onPress={() => onToggleFavorite?.(path)}
        disabled={!onToggleFavorite}
      >
        <Icon
          name={isFavorite ? "star" : "star-outline"}
          color={isFavorite ? Colors.favoriteStar : Colors.K500}
          size={starIconSize}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  smallCard: {
    minHeight: 52,
    borderRadius: 10,
    overflow: "hidden",
  },
  smallCardPressable: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
  },
  smallCardStar: {
    position: "absolute",
    top: "50%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  smallCardTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  smallCardImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  smallCardThumbWrap: {
    height: "100%",
    overflow: "hidden",
  },
  smallCardThumbOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: rgba(Colors.black, 0.2),
  },
  smallCardTitle: {
    textAlign: "left",
  },

  largeCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  largeCardTextColumn: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  largeCardImageWrap: {
    width: "35%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  largeCardImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  largeCardTitle: {
    textAlign: "left",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
  },

  statTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: rgba(Colors.white, 0.12),
    overflow: "hidden",
  },
  statFill: {
    height: "100%",
    borderRadius: 999,
  },
  starBtn: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: rgba(Colors.black, 0.4),
    zIndex: 2,
  },
  cardOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: rgba(Colors.black, 0.18),
  },
});
