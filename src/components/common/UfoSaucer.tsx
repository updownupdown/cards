import FlyingSaucer from "@/assets/images/flying-saucer.svg";
import { UfoEffectColors } from "@/styles/styles";
import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/** The glow reaches this far past the saucer, as a share of its size. */
export const UFO_GLOW_SCALE = 1.6;

/**
 * The soft green glow round the flying saucer, centred on a box `size`
 * wide. It spills past that box on every side.
 */
export function UfoGlow({
  size,
  strength = 1,
}: {
  size: number;
  /** Below 1 for a fainter glow, where the saucer itself should show. */
  strength?: number;
}) {
  // Each glow has its own gradient: on the web, every SVG shares one page of
  // ids, and a glow that unmounts must not take another's gradient with it.
  const id = `ufoGlow${useId().replace(/:/g, "")}`;
  const glow = size * UFO_GLOW_SCALE;
  const green = UfoEffectColors.green;
  return (
    <View
      style={{
        position: "absolute",
        left: (size - glow) / 2,
        top: (size - glow) / 2,
        pointerEvents: "none",
      }}
    >
      <Svg width={glow} height={glow}>
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor={green} stopOpacity={0.55 * strength} />
            <Stop
              offset="0.6"
              stopColor={green}
              stopOpacity={0.18 * strength}
            />
            <Stop offset="1" stopColor={green} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={glow / 2}
          cy={glow / 2}
          rx={glow / 2}
          ry={glow / 2}
          fill={`url(#${id})`}
        />
      </Svg>
    </View>
  );
}

/**
 * The flying saucer, its pilot waving from under the dome, in its glow: the
 * one UFO the app draws wherever it flies (Help from Above's, and Mercy
 * Skip's over the campaign map), the same on every platform.
 */
export function UfoSaucer({
  size,
  glow = 1,
}: {
  size: number;
  /** The glow's strength (see UfoGlow). */
  glow?: number;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <UfoGlow size={size} strength={glow} />
      <FlyingSaucer width={size} height={size} />
    </View>
  );
}
