import { usePalette } from "@/styles/palette";
import { rgba, UFO_INKS, UfoColors } from "@/styles/styles";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

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

/** The hairline border turning through the UFO's inks. */
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
        borderWidth: 2,
        borderColor: rgba(ink, 0.75),
        opacity: cycle.interpolate(OPACITIES[index]),
        pointerEvents: "none",
      }}
    />
  ));
}

/** The border at rest: a faint hairline in the UFO's green. */
function StillBorder({ radius }: { radius: number }) {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: radius,
        borderWidth: 0,
        borderColor: rgba(UfoColors.green, 0),
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * The UFO's box, which marks what belongs to it: Mercy Skip's bubble, the
 * Help from Above panels and the win box's note that the UFO helped. The
 * colour theme's deepest shade, with a hairline border slowly turning through
 * the UFO's three inks.
 */
export function UfoFrame({
  radius,
  still = false,
  style,
  children,
}: {
  radius: number;
  /** Keeps the border still (a panel with nothing to offer). */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const theme = usePalette();
  return (
    <View
      style={[
        { borderRadius: radius, backgroundColor: rgba(theme.night, 0.94) },
        style,
      ]}
    >
      {still ? (
        <StillBorder radius={radius} />
      ) : (
        <TurningBorder radius={radius} />
      )}
      {children}
    </View>
  );
}
