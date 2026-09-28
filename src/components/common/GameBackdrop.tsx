import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import type { GameMenuInfo } from "@/data/games-data";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

/** How soft the artwork is behind a game: its shapes still show, softened. */
const BLUR_RADIUS = 14;

/** The artwork a game's backdrop is drawn from. */
export function gameBackdropSource(game: GameMenuInfo) {
  return game.thumbnail ? GAME_THUMBNAIL_ASSETS[game.thumbnail] : null;
}

/**
 * A game's own artwork, blurred, filling the screen behind the board (and
 * behind a quote's reveal). It is drawn a little larger than the screen, so
 * the blur's soft edges fall outside it.
 */
export function GameBackdrop({
  source,
}: {
  source: ReturnType<typeof gameBackdropSource>;
}) {
  if (!source) return null;
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { overflow: "hidden", pointerEvents: "none" },
      ]}
    >
      <Image
        source={source}
        // Every image is bundled; see HomeCard for why only memory caching.
        cachePolicy="memory"
        contentFit="cover"
        blurRadius={BLUR_RADIUS}
        style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.15 }] }]}
      />
    </View>
  );
}
