import { memo, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { circlesPath } from "./figure";

/**
 * Loose stars between the backdrop and the constellations, drifting slower
 * than the sky as it pans, like the campaign map's layers. Each layer is one
 * SVG path, tiled 2 x 2 so it can wrap around forever: three layers cost
 * three paths and three tiny per-frame styles, however far the sky pans.
 */

const LAYERS = [
  { count: 70, factor: 0.05, radius: [0.45, 0.8], opacity: 0.45 },
  { count: 45, factor: 0.11, radius: [0.7, 1.1], opacity: 0.5 },
  { count: 24, factor: 0.2, radius: [1, 1.5], opacity: 0.4 },
] as const;
const COLOR = "#d9efff";

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Props = {
  width: number;
  height: number;
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** Without animations the stars hold still. */
  moving: boolean;
};

export const ParallaxStars = memo(function ParallaxStars({
  width,
  height,
  x,
  y,
  moving,
}: Props) {
  const paths = useMemo(
    () =>
      LAYERS.map((layer, index) => {
        const random = seeded(7717 * (index + 1));
        const tile = Array.from({ length: layer.count }, () => ({
          x: random() * width,
          y: random() * height,
          r: layer.radius[0] + random() * (layer.radius[1] - layer.radius[0]),
        }));
        // The same tile four times, so any shift within one tile is covered.
        return circlesPath(
          [0, 1].flatMap((column) =>
            [0, 1].flatMap((row) =>
              tile.map((star) => ({
                ...star,
                x: star.x + column * width,
                y: star.y + row * height,
              })),
            ),
          ),
        );
      }),
    [height, width],
  );

  return (
    <View
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {LAYERS.map((layer, index) => (
        <StarLayer
          key={index}
          d={paths[index]}
          opacity={layer.opacity}
          factor={moving ? layer.factor : 0}
          width={width}
          height={height}
          x={x}
          y={y}
        />
      ))}
    </View>
  );
});

function StarLayer({
  d,
  opacity,
  factor,
  width,
  height,
  x,
  y,
}: {
  d: string;
  opacity: number;
  factor: number;
  width: number;
  height: number;
  x: SharedValue<number>;
  y: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const wrap = (value: number, size: number) =>
      (((value * factor) % size) + size) % size;
    return {
      transform: [
        { translateX: wrap(x.value, width) - width },
        { translateY: wrap(y.value, height) - height },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: width * 2,
          height: height * 2,
        },
        style,
      ]}
    >
      <Svg width={width * 2} height={height * 2}>
        <Path d={d} fill={COLOR} fillOpacity={opacity} />
      </Svg>
    </Animated.View>
  );
}
