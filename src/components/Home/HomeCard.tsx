import { Text } from "@/components/common/Text";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import {
  DEFAULT_GAME_THUMBNAIL,
  GameMenuInfo,
  GameTagNames,
} from "@/data/games-data";
import { Icon } from "@/icons";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { Image, Pressable, type ViewStyle, View } from "react-native";
import { StatBars } from "./StatBars";

function getGameThumbnail(game: GameMenuInfo) {
  return GAME_THUMBNAIL_ASSETS[game.thumbnail || DEFAULT_GAME_THUMBNAIL];
}

type Props = {
  path: string;
  game: GameMenuInfo;
  onToggleFavorite?: (path: string) => void;
  isFavorite: boolean;
  size?: "small" | "medium" | "large";
  isLarge?: boolean;
  style?: ViewStyle;
  onOpen?: () => void;
};

export function HomeCard({
  path,
  game,
  onToggleFavorite,
  isFavorite,
  size = "medium",
  style,
  onOpen,
}: Props) {
  const { spacing } = useResponsiveMetrics();

  const handleOpen = () => {
    onOpen?.();
    router.push(path as Href);
  };

  const borderRadius = spacing(8);
  const padding = spacing(size === "large" ? 22 : size === "medium" ? 12 : 18);
  const shadowUnit = spacing(2);

  const smallCardHeight = spacing(50);
  const mediumCardHeight = spacing(120);

  const height =
    size === "large"
      ? undefined
      : size === "small"
        ? smallCardHeight
        : mediumCardHeight;

  const favBtnSize = spacing(42);
  const favBtnInset = spacing(4);

  return (
    <View
      style={[
        {
          overflow: "hidden",
          position: "relative",
          height,
          padding,
          borderRadius,
          boxShadow: `${shadowUnit * 0.5}px ${shadowUnit * 1}px ${shadowUnit * 4}px ${rgba(Colors.K900, 0.6)}, ${shadowUnit * 1}px ${shadowUnit * 2}px ${shadowUnit * 8}px ${rgba(Colors.K900, 0.6)}`,
        },
        style,
      ]}
    >
      {/* Thumbnail */}
      <Image
        source={getGameThumbnail(game)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        resizeMode="cover"
        fadeDuration={0}
      />

      <LinearGradient
        colors={
          size === "medium"
            ? [rgba(game.cardColorBg, 0.94), rgba(game.cardColorBg, 0.3)]
            : [
                rgba(game.cardColorBg, 0.9),
                rgba(game.cardColorBg, 0.9),
                rgba(game.cardColorBg, 0.6),
              ]
        }
        start={size === "medium" ? { x: 0.5, y: 1 } : { x: 0.2, y: 1 }}
        end={size === "medium" ? { x: 0.5, y: 0 } : { x: 0.6, y: 0 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      <Pressable
        style={{
          gap: spacing(14),
          height: size === "large" ? undefined : "100%",
        }}
        onPress={handleOpen}
      >
        <View
          style={{
            flexDirection: "column",
            alignItems: size === "medium" ? "center" : "flex-start",
            height: size === "large" ? undefined : "100%",
            gap: spacing(8),
            flex: 1,
            justifyContent: size === "medium" ? "flex-end" : "center",
          }}
        >
          {/* Title */}
          <Text
            size={size === "large" ? "xl" : "lg"}
            weight={500}
            color={game.cardColorText}
            style={{
              textAlign: size === "medium" ? "center" : undefined,
            }}
            lineHeight={1.2}
          >
            {game.title}
          </Text>

          {/* Description */}
          {size === "large" && (
            <Text size="sm" weight={300} color={Colors.K100} lineHeight={1.25}>
              {game.cardDescription}
            </Text>
          )}
        </View>

        {size === "large" && (
          <StatBars stats={game.stats} gameColor={game.cardColorText} />
        )}
      </Pressable>

      {/* Favourites Button */}
      <Pressable
        style={[
          {
            position: "absolute",
            zIndex: 2,
            alignItems: "center",
            justifyContent: "center",
            top: size === "small" ? "50%" : favBtnInset,
            right: favBtnInset,
            width: favBtnSize,
            height: favBtnSize,
            transform:
              size === "small" ? [{ translateY: -favBtnSize / 2 }] : undefined,
            borderRadius: spacing(8),
            backgroundColor: rgba(game.cardColorBg, 0.5),
          },
        ]}
        onPress={() => onToggleFavorite?.(path)}
        disabled={!onToggleFavorite}
      >
        <Icon
          name={isFavorite ? "star" : "star-outline"}
          color={isFavorite ? Colors.favoriteStar : Colors.K300}
          size={spacing(30)}
        />
      </Pressable>
    </View>
  );
}
