import { ShootingStar } from "@/components/common/ShootingStar";
import { Colors, rgba, theme } from "@/styles/styles";
import { memo, useMemo, useState } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

/** The night laid over the starfield image, so the pages read over it. */
const OVERLAY_OPACITY = 0.7;

/**
 * The sky behind every Home tab: the starfield image under a veil of the
 * theme's night, with a comet now and then. In landscape the portrait image
 * is turned on its side, so it always covers the screen.
 */
export const StarfieldBackdrop = memo(function StarfieldBackdrop({
  animated,
  comets,
}: {
  animated: boolean;
  /** Comets only while Home is on screen. */
  comets: boolean;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cometColors = useMemo(() => [theme.ink, theme.accent2], []);
  const landscape = size.width > size.height;
  const imageWidth = landscape ? size.height : size.width;
  const imageHeight = landscape ? size.width : size.height;
  return (
    <View
      testID="home-starfield-background"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.night,
          overflow: "hidden",
          pointerEvents: "none",
        },
      ]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
          Math.abs(current.width - width) > 1 ||
          Math.abs(current.height - height) > 1
            ? { width, height }
            : current,
        );
      }}
    >
      {size.width > 0 && (
        <>
          <ImageBackground
            source={require("../../../assets/images/starfield.webp")}
            resizeMode="cover"
            style={{
              position: "absolute",
              left: (size.width - imageWidth) / 2,
              top: (size.height - imageHeight) / 2,
              width: imageWidth,
              height: imageHeight,
              transform: landscape ? [{ rotate: "90deg" }] : undefined,
            }}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: rgba(Colors.starfieldOverlay, OVERLAY_OPACITY),
              },
            ]}
          />
          <ShootingStar
            width={size.width}
            height={size.height}
            animationsEnabled={animated && comets}
            colors={cometColors}
            head={false}
            peakOpacity={0.55}
            durationScale={2}
            minIntervalMs={7000}
            maxIntervalMs={16000}
            maxSpeed={700}
          />
        </>
      )}
    </View>
  );
});
