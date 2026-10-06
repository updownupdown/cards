import { usePalette } from "@/styles/palette";
import { rgba, UFO_INKS, UfoColors } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * How the UFO's boxes are dressed. All sit on the colour theme's own
 * surfaces; each marks the box as the UFO's in its own way.
 *
 * - "night": the theme's deepest shade, its hairline border slowly turning
 *   through the UFO's three inks.
 * - "glass": the theme's raised surface, a still green hairline and a faint
 *   green glow.
 * - "aurora": the theme's raised surface, a thin green-purple-blue band
 *   across the top.
 */
export type UfoFrameStyle = "night" | "glass" | "aurora";
export const UFO_FRAME_STYLE: UfoFrameStyle = "aurora";

/** One slow turn through the UFO's three inks. */
const CYCLE_MS = 9000;

/**
 * Each ink's border opacity along the cycle: full at its own third, fading
 * into the next. Crossing over, both sit at 0.75, so the border never dims.
 */
function inkOpacity(index: number) {
  const count = UFO_INKS.length;
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let step = 0; step <= count * 2; step += 1) {
    const at = step / (count * 2);
    // How far, in thirds, this point is from the ink's own (wrapping round).
    const away = Math.abs(
      ((at * count - index + count * 1.5) % count) - count / 2,
    );
    inputRange.push(at);
    outputRange.push(away === 0 ? 1 : away === 0.5 ? 0.75 : 0);
  }
  return { inputRange, outputRange };
}

const OPACITIES = UFO_INKS.map((_, index) => inkOpacity(index));

/** The hairline border turning through the UFO's inks ("night"). */
function TurningBorder({ radius }: { radius: number }) {
  const cycle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(cycle, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [cycle]);

  return UFO_INKS.map((ink, index) => (
    <Animated.View
      key={ink}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: rgba(ink, 0.6),
        opacity: cycle.interpolate(OPACITIES[index]),
        pointerEvents: "none",
      }}
    />
  ));
}

const AURORA = [UfoColors.green, UfoColors.purple, UfoColors.blue] as const;

/** A thin band of the UFO's inks across the top of the box ("aurora"). */
function AuroraBand() {
  const band = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.85,
    pointerEvents: "none" as const,
  };
  return Platform.OS === "web" ? (
    <View
      style={[
        band,
        { backgroundImage: `linear-gradient(to right, ${AURORA.join(", ")})` },
      ]}
    />
  ) : (
    <LinearGradient
      colors={AURORA}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={band}
    />
  );
}

/**
 * The UFO's box, which marks what belongs to it: Mercy Skip's bubble, the
 * Help from Above panels and the win box's note that the UFO helped.
 */
export function UfoFrame({
  radius,
  variant = UFO_FRAME_STYLE,
  style,
  children,
}: {
  radius: number;
  variant?: UfoFrameStyle;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const theme = usePalette();
  const look: ViewStyle =
    variant === "night"
      ? { backgroundColor: rgba(theme.night, 0.94) }
      : variant === "glass"
        ? {
            backgroundColor: theme.raise,
            borderWidth: 1,
            borderColor: rgba(UfoColors.green, 0.28),
            boxShadow: `0 0 18px ${rgba(UfoColors.green, 0.1)}`,
          }
        : { backgroundColor: theme.raise, overflow: "hidden" };

  return (
    <View style={[{ borderRadius: radius }, look, style]}>
      {variant === "night" && <TurningBorder radius={radius} />}
      {variant === "aurora" && <AuroraBand />}
      {children}
    </View>
  );
}
