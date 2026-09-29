import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  type SceneProps,
  seeded,
  useAnimationsPaused,
} from "./BackgroundAnimations";

const PETAL_COLORS = ["#ffd6e3", "#ffc2d6", "#ffe5ed", "#f7a9c2"];

function Petal({ index, width, height }: SceneProps & { index: number }) {
  const size = 4 + seeded(index, 81) * 4;
  const startX = seeded(index, 82) * width * 0.9 - width * 0.1;
  const diagonalTravel = width * (0.18 + seeded(index, 83) * 0.18);
  const sway = 8 + seeded(index, 84) * 16;
  const duration = (9000 + seeded(index, 85) * 7000) * 2;
  const spin = 540 + seeded(index, 86) * 540;
  const startY = -size * (2.5 + seeded(index, 87) * 8);
  const endY = height + size * 2;
  const distance = endY - startY;

  // Picked once per petal (previously re-rolled from JS after every fall).
  const [timing] = useState(() => ({
    fall: duration * (0.85 + Math.random() * 0.3),
    pause: Math.random() * 1200,
  }));

  const progress = useSharedValue(0);
  const paused = useAnimationsPaused();
  const hasStartedRef = useRef(false);

  // Falls, rests below the screen for a moment, then starts again — all on
  // the UI thread. After a pause it finishes the fall it was in.
  useEffect(() => {
    if (paused) return;

    const falls = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: timing.fall, easing: Easing.linear }),
        withDelay(timing.pause, withTiming(1, { duration: 0 })),
      ),
      -1,
      false,
    );

    if (hasStartedRef.current) {
      progress.value = withSequence(
        withTiming(1, {
          duration: timing.fall * (1 - progress.value),
          easing: Easing.linear,
        }),
        falls,
      );
    } else {
      progress.value = 0;
      progress.value = withDelay(seeded(index, 80) * duration, falls);
      hasStartedRef.current = true;
    }

    return () => cancelAnimation(progress);
  }, [duration, index, paused, progress, timing]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;

    return {
      transform: [
        {
          translateX:
            interpolate(p, [0, 1], [startX, startX + diagonalTravel]) +
            interpolate(
              p,
              [0, 0.25, 0.5, 0.75, 1],
              [0, sway, -sway * 0.5, sway, 0],
            ),
        },
        {
          translateY: interpolate(
            p,
            [0, 0.22, 0.5, 0.76, 1],
            [
              startY,
              startY + distance * 0.2,
              startY + distance * 0.52,
              startY + distance * 0.75,
              endY,
            ],
          ),
        },
        { rotate: `${p * spin}deg` },
        {
          scaleX: interpolate(
            p,
            [0, 0.25, 0.5, 0.75, 1],
            [1, 0.35, 1, 0.45, 1],
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.petalContainer, animatedStyle]}>
      <View
        style={[
          styles.petal,
          {
            backgroundColor: PETAL_COLORS[index % PETAL_COLORS.length],
            width: size,
            height: size * 0.7,
            borderRadius: size,
          },
        ]}
      />
    </Animated.View>
  );
}

export function CherryBlossom(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 24 }, (_, index) => (
        <Petal key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  petalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  petal: {
    transform: [{ rotate: "-20deg" }],
  },
});
