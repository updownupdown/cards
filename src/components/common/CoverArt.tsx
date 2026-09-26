import {
  GAME_THUMBNAIL_ASPECTS,
  GAME_THUMBNAIL_ASSETS,
  type GameThumbnailName,
} from "@/data/game-thumbnails";
import { Image } from "expo-image";
import { useState } from "react";
import { View, type ViewStyle } from "react-native";

type Props = {
  thumbnail: GameThumbnailName;
  /** The tallest the artwork may be; it is as wide as its container allows. */
  maxHeight: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/**
 * A game's cover art whole, uncropped: as large as fits the container's width
 * and maxHeight, at the artwork's own aspect ratio.
 */
export function CoverArt({ thumbnail, maxHeight, borderRadius, style }: Props) {
  const [availableWidth, setAvailableWidth] = useState(0);
  const aspect = GAME_THUMBNAIL_ASPECTS[thumbnail];
  const width = Math.min(availableWidth, maxHeight * aspect);

  return (
    <View
      style={[{ width: "100%", alignItems: "center" }, style]}
      onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Image
          source={GAME_THUMBNAIL_ASSETS[thumbnail]}
          // Every image is bundled; see HomeCard for why only memory caching.
          cachePolicy="memory"
          contentFit="cover"
          style={{ width, height: width / aspect, borderRadius }}
        />
      )}
    </View>
  );
}
