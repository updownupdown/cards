import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ShootingStar } from "@/components/common/ShootingStar";
import {
  type SceneProps,
  seeded,
  useAnimationsPaused,
} from "./BackgroundAnimations";

const STAR_COLORS = ["#ffffff", "#eef8ff", "#d9efff", "#b9ddff", "#91c7ff"];
const STAR_COUNT = 60;

// The twinkles loop on the UI thread. The shooting stars are the Campaign map's,
// with the same settings.

function TwinklingStar({
  index,
  width,
  height,
}: SceneProps & { index: number }) {
  const size = 1 + Math.floor(seeded(index, 36) * 3);
  const baseOpacity = 0.1 + seeded(index, 35) * 0.525;

  // Each star twinkles on its own slow cycle; across 80 stars that's a similar
  // rate of twinkles to the previous three lanes.
  const [timing] = useState(() => ({
    twinkle: (300 + Math.random() * 700) / 1.5,
    pause: 4000 + Math.random() * 44000,
  }));

  const opacity = useSharedValue(baseOpacity);
  const paused = useAnimationsPaused();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (paused) return;
    const sine = Easing.inOut(Easing.sin);
    // The staggered start applies once; after a pause the twinkles carry on.
    const startDelay = hasStartedRef.current
      ? 0
      : seeded(index, 34) * timing.pause;
    if (!hasStartedRef.current) opacity.value = baseOpacity;
    hasStartedRef.current = true;
    opacity.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: timing.twinkle * 0.45, easing: sine }),
          withTiming(baseOpacity, {
            duration: timing.twinkle * 0.55,
            easing: sine,
          }),
          withDelay(timing.pause, withTiming(baseOpacity, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );

    return () => cancelAnimation(opacity);
  }, [baseOpacity, index, opacity, paused, timing]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.star,
        {
          backgroundColor:
            STAR_COLORS[Math.floor(seeded(index, 37) * STAR_COLORS.length)],
          width: size,
          height: size,
          borderRadius: size / 2,
          left: seeded(index, 38) * width,
          top: seeded(index, 39) * height,
        },
        animatedStyle,
      ]}
    />
  );
}

export function Stars({ width, height }: SceneProps) {
  const paused = useAnimationsPaused();
  return (
    <>
      {Array.from({ length: STAR_COUNT }, (_, index) => (
        <TwinklingStar
          key={index}
          index={index}
          width={width}
          height={height}
        />
      ))}
      <ShootingStar
        width={width}
        height={height}
        animationsEnabled={!paused}
        colors={STAR_COLORS}
        peakOpacity={0.55}
        durationScale={1.4}
        minIntervalMs={9000}
        maxIntervalMs={22000}
      />
    </>
  );
}

const styles = StyleSheet.create({
  star: {
    position: "absolute",
  },
});
