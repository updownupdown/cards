import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  hash01,
  loopFrom,
  type SceneProps,
  seeded,
  useAnimationsPaused,
} from "./BackgroundAnimations";

const POLLEN_COLORS = [
  "#fffdf0",
  "#f5eed8",
  "#e8d8b4",
  "#f6e7a6",
  "#e9ca68",
  "#fff1a8",
];

function PollenSpeck({ index, width, height }: SceneProps & { index: number }) {
  const initialPhase = seeded(index, 116);
  const size = (1.05 + seeded(index, 110) * 2.1) * 0.7;
  const duration = 52000 + seeded(index, 114) * 36000;
  const startY = -size * (2 + seeded(index, 115) * 10);
  const endY = height + size * 2;
  const direction = seeded(index, 112) < 0.5 ? -1 : 1;

  // Picked once per speck (previously re-rolled from JS after every drift).
  const [cycleDuration] = useState(
    () => duration * (0.8 + Math.random() * 0.4),
  );

  const progress = useSharedValue(initialPhase);
  const cycle = useSharedValue(0);

  const paused = useAnimationsPaused();

  // Drifts down on a loop, all on the UI thread: from its initial phase, and
  // after a pause from where it stopped.
  useEffect(() => {
    if (paused) return;
    progress.value = loopFrom(progress.value, cycleDuration);
    return () => cancelAnimation(progress);
  }, [cycleDuration, paused, progress]);

  // Each new drift enters from a different place.
  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous !== null && current < previous) cycle.value += 1;
    },
  );

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const entry = hash01(index * 7 + 1, cycle.value + 1);
    const spread = hash01(index * 7 + 2, cycle.value + 1);

    const startX =
      direction === 1
        ? -width * 0.2 + entry * width * 0.45
        : width * 0.75 + entry * width * 0.45;
    const travel = direction * (endY - startY) * (0.6 + spread * 0.4);
    const eased = -(Math.cos(Math.PI * p) - 1) / 2;

    return {
      transform: [
        { translateX: startX + travel * eased },
        { translateY: startY + (endY - startY) * p },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.pollen,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: POLLEN_COLORS[index % POLLEN_COLORS.length],
          opacity: 0.225 + seeded(index, 120) * 0.225,
        },
        animatedStyle,
      ]}
    />
  );
}

export function Pollen(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 42 }, (_, index) => (
        <PollenSpeck key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  pollen: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
