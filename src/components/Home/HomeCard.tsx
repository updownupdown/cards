import { Text } from "@/components/common/Text";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import { GameMenuInfo } from "@/data/games-data";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Icon } from "@/icons";
import { Colors, rgba } from "@/styles/styles";
import { Link, type Href } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { StatBars } from "./StatBars";

function getGameSource(game: GameMenuInfo) {
  return GAME_THUMBNAIL_ASSETS[game.thumbnail];
}

type Props = {
  path: string;
  game: GameMenuInfo;
  onToggleFavorite?: (path: string) => void;
  isFavorite: boolean;
  isLarge?: boolean;
};

export function HomeCard({
  path,
  game,
  onToggleFavorite,
  isFavorite,
  isLarge = false,
}: Props) {
  const responsiveScale = useResponsiveLayout();

  const borderRadius = Math.round(12 * responsiveScale);
  const padding = isLarge ? Math.round(22 * responsiveScale) : 0;
  const spacingUnit = Math.round(20 * responsiveScale);
  const shadowUnit = Math.round(2 * responsiveScale);
  const smallCardHeight = Math.round(52 * responsiveScale);
  const height = isLarge ? undefined : smallCardHeight;
  const favBtnSize = Math.round(40 * responsiveScale);
  const favBtnInset = isLarge
    ? padding * 0.25
    : smallCardHeight / 2 - favBtnSize / 2;

  return (
    <View
      style={{
        height,
        padding,
        borderRadius,
        backgroundColor: game.cardColorBg,
        boxShadow: `${shadowUnit * 0.5}px ${shadowUnit * 1}px ${shadowUnit * 4}px ${rgba(Colors.K900, 0.4)}, ${shadowUnit * 1}px ${shadowUnit * 2}px ${shadowUnit * 8}px ${rgba(Colors.K900, 0.4)}`,
      }}
    >
      <Link href={path as Href} asChild>
        <Pressable
          style={{
            gap: spacingUnit * 0.5,
            height: isLarge ? undefined : "100%",
          }}
        >
          <View
            style={{
              gap: spacingUnit,
              flexDirection: "row",
              alignItems: "flex-start",
              height: isLarge ? undefined : "100%",
            }}
          >
            <View
              style={{
                gap: Math.round(8 * responsiveScale),
                flex: 1,
                height: isLarge ? undefined : "100%",
                justifyContent: isLarge ? undefined : "center",
              }}
            >
              {/* Title */}
              <Text
                size={isLarge ? "lg" : "md"}
                weight={500}
                style={{
                  color: game.cardColorText,
                  paddingLeft: isLarge ? undefined : favBtnSize * 1.25,
                }}
              >
                {game.title}
              </Text>

              {/* Description */}
              {isLarge && (
                <Text
                  size="sm"
                  weight={300}
                  color={Colors.K400}
                  lineHeight={1.25}
                >
                  {game.cardDescription}
                </Text>
              )}
            </View>

            {/* Thumbnail */}
            <View
              style={{
                borderRadius: Math.round(8 * responsiveScale),
                borderTopLeftRadius: isLarge ? undefined : 0,
                borderBottomLeftRadius: isLarge ? undefined : 0,
                width: "35%",
                height: "100%",
                aspectRatio: isLarge ? 1 : undefined,
                overflow: "hidden",
                marginTop: isLarge ? padding * -0.75 : undefined,
                marginRight: isLarge ? padding * -0.75 : undefined,
              }}
            >
              <Image
                source={getGameSource(game)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
                fadeDuration={0}
              />
            </View>
          </View>

          {isLarge && (
            <StatBars stats={game.stats} gameColor={game.cardColorText} />
          )}
        </Pressable>
      </Link>

      {/* Favourites Button */}
      <Pressable
        style={[
          {
            position: "absolute",
            zIndex: 2,
            alignItems: "center",
            justifyContent: "center",
            top: favBtnInset,
            right: isLarge ? favBtnInset : undefined,
            left: isLarge ? undefined : favBtnInset,
            width: favBtnSize,
            height: favBtnSize,

            borderRadius: Math.round(8 * responsiveScale),
            backgroundColor: isLarge ? rgba(Colors.black, 0.6) : undefined,
          },
        ]}
        onPress={() => onToggleFavorite?.(path)}
        disabled={!onToggleFavorite}
      >
        <Icon
          name={isFavorite ? "star" : "star-outline"}
          color={isFavorite ? Colors.favoriteStar : Colors.K500}
          size={favBtnSize * 0.6}
        />
      </Pressable>
    </View>
  );
}
