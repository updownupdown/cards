import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  hash01,
  loopFrom,
  type SceneProps,
  seeded,
  useAnimationsPaused,
} from "./BackgroundAnimations";

const STAR_COLORS = ["#ffffff", "#eef8ff", "#d9efff", "#b9ddff", "#91c7ff"];
const STAR_COUNT = 60;

// Everything here loops on the UI thread. Previously three "shimmer lanes"
// were restarted from JS after every twinkle (several times a second), and
// each shooting star re-rendered React to pick its angle and colour.

const SHOT_FADE_IN = 0.12;
const SHOT_FADE_OUT = 0.35;

function ShootingStar({ width, height }: SceneProps) {
  // Picked once at mount (previously re-rolled per shot via a React render).
  const [appearance] = useState(() => ({
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    trailLength: 28 + Math.random() * 44,
    wait: 6000 + Math.random() * 14000,
    travel: 320 + Math.random() * 980,
  }));
  const total = appearance.wait + appearance.travel;

  const progress = useSharedValue(0);
  const cycle = useSharedValue(0);

  const paused = useAnimationsPaused();

  useEffect(() => {
    if (paused) return;
    progress.value = loopFrom(progress.value, total);
    return () => cancelAnimation(progress);
  }, [paused, progress, total]);

  // A new path for every shot.
  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous !== null && current < previous) cycle.value += 1;
    },
  );

  const animatedStyle = useAnimatedStyle(() => {
    const shot = (progress.value * total - appearance.wait) / appearance.travel;
    if (shot <= 0) return { opacity: 0 };

    const random = (salt: number) => hash01(salt, cycle.value + 1);
    const startX = random(1) * width;
    const startY = random(2) * height;
    const angle = random(3) * Math.PI * 2;
    const length =
      Math.min(width, height) * 0.3 + random(4) * Math.max(width, height) * 0.4;

    const opacity =
      shot < SHOT_FADE_IN
        ? shot / SHOT_FADE_IN
        : shot > 1 - SHOT_FADE_OUT
          ? Math.max(0, (1 - shot) / SHOT_FADE_OUT)
          : 1;

    return {
      opacity,
      transform: [
        { translateX: startX + Math.cos(angle) * length * shot },
        { translateY: startY + Math.sin(angle) * length * shot },
        { rotate: `${angle}rad` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.shootingStar, animatedStyle]}>
      <View
        style={[
          styles.shootingStarTrail,
          {
            backgroundColor: appearance.color,
            width: appearance.trailLength,
            left: -appearance.trailLength,
          },
        ]}
      />
      <View
        style={[styles.shootingStarHead, { backgroundColor: appearance.color }]}
      />
    </Animated.View>
  );
}

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
      <ShootingStar width={width} height={height} />
    </>
  );
}

const styles = StyleSheet.create({
  star: {
    position: "absolute",
  },
  shootingStar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 3,
    height: 3,
  },
  shootingStarTrail: {
    position: "absolute",
    top: 1,
    height: 1,
    opacity: 0.45,
  },
  shootingStarHead: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
