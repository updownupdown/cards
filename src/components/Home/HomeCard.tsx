import { Text } from "@/components/common/Text";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import { DEFAULT_GAME_THUMBNAIL, GameMenuInfo } from "@/data/games-data";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage } from "@/i18n";
import { localizeGame } from "@/i18n/content";
import { Colors, rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { launchGame } from "@/components/common/GameLaunchOverlay";
import { type Href } from "expo-router";
import { Image } from "expo-image";
import { Platform, Pressable, View, type ViewStyle } from "react-native";
import { FavButton } from "./FavButton";
import { RatingsBars } from "./RatingBars";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";

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
  showCompleted?: boolean;
  onOpen?: () => void;
};

export function HomeCard({
  path,
  game,
  onToggleFavorite,
  isFavorite,
  size = "medium",
  style,
  showCompleted,
  onOpen,
}: Props) {
  const { spacing } = useResponsiveMetrics();
  const { title, cardDescription } = localizeGame(
    game,
    path,
    useDisplayLanguage(),
  );

  const handleOpen = () => {
    onOpen?.();
    launchGame(path as Href);
  };

  const borderRadius = spacing(8);
  const padding = spacing(size === "large" ? 22 : size === "medium" ? 12 : 18);
  // A small card is only spacing(50) tall, so the horizontal padding would
  // leave a content box shorter than one line of text and clip the title on
  // native (web just lets it overflow the padding box).
  const paddingVertical = size === "small" ? spacing(8) : padding;
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
          // No overflow:hidden here - it would clip this view's own shadow on
          // native. The inner view does the clipping instead.
          position: "relative",
          height,
          borderRadius,
          ...homeSurfaceShadow(spacing),
          ...(Platform.OS === "android"
            ? { backgroundColor: game.gameColorDark }
            : null),
        },
        style,
      ]}
    >
      <View
        style={{
          overflow: "hidden",
          borderRadius,
          width: "100%",
          height: size === "large" ? undefined : "100%",
        }}
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
          contentFit="cover"
        />

        <LinearGradient
          colors={
            size === "medium"
              ? [rgba(game.gameColorDark, 0.94), rgba(game.gameColorDark, 0.3)]
              : [
                  rgba(game.gameColorDark, 0.95),
                  rgba(game.gameColorDark, 0.9),
                  rgba(game.gameColorDark, 0.7),
                ]
          }
          start={size === "medium" ? { x: 0.5, y: 1 } : { x: 0.2, y: 1 }}
          end={size === "medium" ? { x: 0.5, y: 0 } : { x: 0.5, y: 0 }}
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
            paddingHorizontal: padding,
            paddingVertical,
            height: size === "large" ? undefined : "100%",
          }}
          onPress={handleOpen}
        >
          <View
            style={{
              flexDirection: "column",
              alignItems: size === "medium" ? "center" : "flex-start",
              height: size === "large" ? undefined : "100%",
              minHeight: size === "large" ? spacing(100) : undefined,
              gap: spacing(8),
              flex: 1,
              justifyContent: size === "medium" ? "flex-end" : "center",
            }}
          >
            {/* Title and Completed */}

            <Text
              size={size === "large" ? "xl" : "lg"}
              weight={500}
              color={game.gameColorPale}
              style={{
                textAlign: size === "medium" ? "center" : undefined,
              }}
              lineHeight={1.2}
            >
              {title}
            </Text>

            {/* Description */}
            {size === "large" && (
              <Text
                size="sm"
                weight={300}
                color={Colors.K100}
                lineHeight={1.25}
              >
                {cardDescription}
              </Text>
            )}
          </View>

          {size === "large" && (
            <RatingsBars rating={game.rating} gameColor={game.gameColorPale} />
          )}
        </Pressable>

        {showCompleted && (
          <View
            style={[
              flexStyles.rowCentered,
              {
                pointerEvents: "none",
                userSelect: "none",
                position: "absolute",
                zIndex: 2,
                top: size === "small" ? "50%" : favBtnInset,
                right: size === "medium" ? undefined : favBtnInset + favBtnSize,
                left: size === "medium" ? favBtnInset : undefined,
                width: favBtnSize,
                height: favBtnSize,
                transform:
                  size === "small"
                    ? [{ translateY: -favBtnSize / 2 }]
                    : undefined,
              },
            ]}
          >
            <View
              style={[
                flexStyles.rowCentered,
                {
                  width: spacing(24),
                  height: spacing(24),
                  borderRadius: spacing(12),
                  backgroundColor: rgba(Colors.black, 0.7),
                  boxShadow: `0 ${spacing(1)}px ${spacing(6)}px ${rgba(Colors.black, 0.4)}`,
                },
              ]}
            >
              <Icon
                name="trophy"
                size={spacing(14)}
                color={Colors.trophyGold}
              />
            </View>
          </View>
        )}

        <FavButton
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
                size === "small"
                  ? [{ translateY: -favBtnSize / 2 }]
                  : undefined,
            },
          ]}
          isFavorite={isFavorite}
          onToggleFavorite={() => onToggleFavorite?.(path)}
          size={favBtnSize}
          iconSize={spacing(30)}
          inactiveColor={game.gameColorPale}
          disabled={!onToggleFavorite}
        />
      </View>
    </View>
  );
}
