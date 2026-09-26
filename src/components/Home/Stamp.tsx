import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import {
  GAME_GREY_STICKER_ASSETS,
  GAME_GREY_THUMBNAIL_ASSETS,
  GAME_STICKER_ASSETS,
  GAME_THUMBNAIL_ASSETS,
} from "@/data/game-thumbnails";
import { type GameMenuInfo } from "@/data/games-data";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage } from "@/i18n";
import { localizeGame } from "@/i18n/content";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Colors, rgba } from "@/styles/styles";
import { Image } from "expo-image";
import { type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { FavButton } from "./FavButton";
import { useTabReadyImage } from "./TabReady";

/**
 * The stamp's paper in stamp units, as drawn in stamp-frame.png. Keep in
 * step with STAMP_FRAME in scripts/generate-assets.js.
 */
const STAMP_FRAME = { width: 500, height: 400, pad: 40 };
/** White paper between the perforations and the picture, in stamp units. */
const PICTURE_INSET = 25;

export const STAMP_ASPECT = STAMP_FRAME.height / STAMP_FRAME.width;

/**
 * How much of a category's opening the stamps spread their start over, the
 * first moving at once and the last this far in.
 */
export const STAMP_STAGGER = 0.3;

const ease = Easing.inOut(Easing.cubic);

const frameSource = require("@/assets/images/stamp-frame.png");

/** Where a stamp's centre sits in its category, closed and open. */
export type StampPlacement = {
  closedX: number;
  closedY: number;
  openX: number;
  openY: number;
  /** When this stamp starts moving, from 0 to STAMP_STAGGER. */
  delay: number;
};

/** A stamp's own progress, eased, from its category's overall progress. */
export function stampProgress(progress: number, delay: number) {
  "worklet";
  const t = (progress - delay) / (1 - STAMP_STAGGER);
  return ease(Math.min(1, Math.max(0, t)));
}

/**
 * A small, stable tilt and nudge for each stamp, so a page looks hand-stuck.
 * Offsets are fractions of the stamp's width.
 */
function stampTilt(path: string) {
  let hash = 0;
  for (let index = 0; index < path.length; index += 1) {
    hash = (hash * 31 + path.charCodeAt(index)) >>> 0;
  }
  return {
    rotate: ((hash % 61) - 30) / 20,
    x: (((hash >>> 6) % 21) - 10) / 800,
    y: (((hash >>> 11) % 21) - 10) / 800,
  };
}

type StampProps = {
  path: string;
  game: GameMenuInfo;
  won: boolean;
  isFavorite: boolean;
  onToggleFavorite: (path: string) => void;
  /** Width when open; closed, the stamp is the same view scaled down. */
  width: number;
  closedScale: number;
  placement: StampPlacement;
  zIndex: number;
  /** The category's opening, 0 closed to 1 open, over its whole duration. */
  progress: SharedValue<number>;
  /** Open (or opening): pressable, and showing its name and star. */
  open: boolean;
  /** Mounts the name and star, which only show as the stamp grows. */
  showDetails: boolean;
  /** Shows the full-size picture, once the stamp has finished growing. */
  sharp: boolean;
  /** The colour the stamp lies on, for fading pictures of games not won. */
  surfaceColor: string;
};

/**
 * A game in the Collect tab's album: a perforated stamp once won, an empty
 * slot with a faded picture until then. One view, drawn at its open size and
 * scaled down when its category is closed, so it grows smoothly in place.
 */
export function Stamp({
  path,
  game,
  won,
  isFavorite,
  onToggleFavorite,
  width,
  closedScale,
  placement,
  zIndex,
  progress,
  open,
  showDetails,
  sharp,
  surfaceColor,
}: StampProps) {
  const { spacing } = useResponsiveMetrics();
  const { title } = localizeGame(game, path, useDisplayLanguage());
  const height = width * STAMP_ASPECT;
  const unit = width / STAMP_FRAME.width;
  const inset = PICTURE_INSET * unit;
  // A game without art shows only the colour the picture lies on.
  const thumbnail = game.thumbnail;
  // Small copies while closed: the full thumbnails, all 114 at once, cost
  // Android about 300MB of GPU memory and slowed the whole app after a visit
  // here. The full ones load over them once a category has opened.
  const sticker =
    thumbnail &&
    (won ? GAME_STICKER_ASSETS : GAME_GREY_STICKER_ASSETS)[thumbnail];
  const stickerReady = useTabReadyImage(sticker);
  const frameReady = useTabReadyImage(won ? frameSource : null);
  const tilt = won ? stampTilt(path) : null;

  const { closedX, closedY, openX, openY, delay } = placement;
  const moveStyle = useAnimatedStyle(() => {
    const t = stampProgress(progress.value, delay);
    return {
      transform: [
        { translateX: closedX + (openX - closedX) * t - width / 2 },
        { translateY: closedY + (openY - closedY) * t - height / 2 },
        { scale: closedScale + (1 - closedScale) * t },
      ],
    };
  });
  // The name and star fade in over the last of the stamp's growth.
  const detailStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      stampProgress(progress.value, delay),
      [0.6, 1],
      [0, 1],
      "clamp",
    ),
  }));

  const fill = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  } as const;
  const favSize = spacing(36);

  return (
    <Animated.View
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      accessibilityElementsHidden={!open}
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          zIndex,
        },
        open ? pointerEventsStyles.boxNone : pointerEventsStyles.none,
        moveStyle,
      ]}
    >
      {/* The slot in the album, which a won game's stamp lies over. */}
      <View
        style={[
          pointerEventsStyles.none,
          {
            position: "absolute",
            zIndex: 100,
            top: inset / 2.4,
            left: inset / 2.4,
            right: inset / 2.4,
            bottom: inset / 2.4,
            borderRadius: won ? 0 : spacing(8),
            borderWidth: won ? 0 : spacing(1),
            borderColor: rgba(Colors.K950, won ? 0 : 1),
          },
        ]}
      />

      <View
        style={[
          // "none" again rather than inherited: on web, "box-none" turns its
          // children back on even under a parent that is "none".
          open ? pointerEventsStyles.boxNone : pointerEventsStyles.none,
          {
            flex: 1,
            transform: tilt
              ? [
                  { translateX: tilt.x * width },
                  { translateY: tilt.y * width },
                  { rotate: `${tilt.rotate}deg` },
                ]
              : undefined,
          },
        ]}
      >
        {won && (
          <Image
            source={frameSource}
            cachePolicy="memory"
            style={{
              position: "absolute",
              left: -STAMP_FRAME.pad * unit,
              top: -STAMP_FRAME.pad * unit,
              width: (STAMP_FRAME.width + STAMP_FRAME.pad * 2) * unit,
              height: (STAMP_FRAME.height + STAMP_FRAME.pad * 2) * unit,
            }}
            {...frameReady}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          disabled={!open}
          onPress={() => launchGame(path as Href)}
          style={{
            position: "absolute",
            top: inset,
            left: inset,
            right: inset,
            bottom: inset,
            overflow: "hidden",
            borderRadius: won ? 0 : spacing(6),
            backgroundColor: won ? game.gameColorDark : surfaceColor,
          }}
        >
          <Image
            source={sticker}
            cachePolicy="memory"
            style={fill}
            contentFit="cover"
            {...stickerReady}
          />
          {sharp && thumbnail && (
            <Image
              source={
                won
                  ? GAME_THUMBNAIL_ASSETS[thumbnail]
                  : GAME_GREY_THUMBNAIL_ASSETS[thumbnail]
              }
              cachePolicy="memory"
              style={fill}
              contentFit="cover"
              transition={150}
            />
          )}
          {/* A game not yet won shows faded, at 60%: the colour it lies on,
              laid over it, rather than opacity, which Android would apply to
              each image separately as the sharp one fades in. */}
          {!won && (
            <View
              style={[
                fill,
                {
                  backgroundColor: rgba(surfaceColor, 0.6),
                  borderRadius: spacing(6),
                },
              ]}
            />
          )}

          {showDetails && (
            <Animated.View
              style={[
                fill,
                { justifyContent: "flex-end", pointerEvents: "none" },
                detailStyle,
              ]}
            >
              <LinearGradient
                colors={[rgba(Colors.black, 0), rgba(Colors.black, 0.8)]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: "80%",
                }}
              />
              <Text
                size="md"
                weight={500}
                color={won ? Colors.white : Colors.K300}
                lineHeight={1.1}
                numberOfLines={2}
                style={{
                  textAlign: "center",
                  paddingHorizontal: spacing(6),
                  paddingBottom: spacing(11),
                }}
              >
                {title}
              </Text>
            </Animated.View>
          )}
        </Pressable>

        {showDetails && (
          <Animated.View
            style={[
              { position: "absolute", top: inset, right: inset },
              open ? pointerEventsStyles.boxNone : pointerEventsStyles.none,
              detailStyle,
            ]}
          >
            <FavButton
              isFavorite={isFavorite}
              onToggleFavorite={() => onToggleFavorite(path)}
              size={favSize}
              iconSize={spacing(28)}
              inactiveColor={Colors.white}
              backdrop
              disabled={!open}
            />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
