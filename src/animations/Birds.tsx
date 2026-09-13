import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
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
import {
  Drifter,
  type SceneProps,
  seeded,
  useAnimationsPaused,
} from "./BackgroundAnimations";

const BIRD_COLORS = ["#111111", "#2b2b2b", "#38291f", "#4a4038"];
const FLAP_BURSTS = 3;

function Bird({ color }: { color: string }) {
  return (
    <View style={styles.bird}>
      <View style={[styles.wing, styles.leftWing, { borderTopColor: color }]} />
      <View
        style={[styles.wing, styles.rightWing, { borderTopColor: color }]}
      />
    </View>
  );
}

type Flap = {
  compression: number;
  lift: number;
  downDuration: number;
  upDuration: number;
};

function FlappingBird({ index, scale }: { index: number; scale: number }) {
  const color = BIRD_COLORS[index % BIRD_COLORS.length];

  // A few bursts of flaps picked at mount and repeated on the UI thread
  // (previously each burst was re-rolled and restarted from JS). The wing and
  // the lift share step durations so they stay in step across repeats.
  const [bursts] = useState(() =>
    Array.from({ length: FLAP_BURSTS }, (_, burst) => ({
      pause:
        burst === 0
          ? 1000 + seeded(index, 45) * 9000
          : 2500 + Math.random() * 7000,
      flaps: Array.from(
        { length: 1 + Math.floor(Math.random() * 5) },
        (): Flap => ({
          compression: 0.2 + Math.random() * 0.2,
          lift: -(3 + Math.random() * 5),
          downDuration: 200 + Math.random() * 190,
          upDuration: 420 + Math.random() * 380,
        }),
      ),
    })),
  );

  const wingScale = useSharedValue(1);
  const flapLift = useSharedValue(0);
  const gravity = useSharedValue((seeded(index, 40) - 0.5) * 20);
  const paused = useAnimationsPaused();

  useEffect(() => {
    if (paused) return;
    const sine = Easing.inOut(Easing.sin);
    const wingSteps = bursts.flatMap(({ pause, flaps }) =>
      flaps.flatMap((flap, flapIndex) => {
        const down = withTiming(flap.compression, {
          duration: flap.downDuration,
          easing: sine,
        });
        return [
          flapIndex === 0 ? withDelay(pause, down) : down,
          withTiming(1, {
            duration: flap.upDuration,
            easing: Easing.out(Easing.sin),
          }),
        ];
      }),
    );
    const liftSteps = bursts.flatMap(({ pause, flaps }) =>
      flaps.flatMap((flap, flapIndex) => {
        const up = withTiming(flap.lift, {
          duration: flap.downDuration,
          easing: Easing.out(Easing.sin),
        });
        return [
          flapIndex === 0 ? withDelay(pause, up) : up,
          withTiming(0, { duration: flap.upDuration, easing: sine }),
        ];
      }),
    );

    wingScale.value = withRepeat(withSequence(...wingSteps), -1, false);
    flapLift.value = withRepeat(withSequence(...liftSteps), -1, false);
    gravity.value = withRepeat(
      withSequence(
        withTiming(42 + seeded(index, 42) * 25, {
          duration: 15000 + seeded(index, 43) * 9000,
          easing: Easing.linear,
        }),
        withTiming(-24 - seeded(index, 44) * 20, { duration: 0 }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(wingScale);
      cancelAnimation(flapLift);
      cancelAnimation(gravity);
    };
  }, [bursts, flapLift, gravity, index, paused, wingScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: gravity.value + flapLift.value },
      { scale },
      { scaleX: wingScale.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.blur}>
        <Bird color={color} />
      </View>
    </Animated.View>
  );
}

export function Birds(props: SceneProps) {
  const scaleSeeds = Array.from({ length: 6 }, (_, index) => seeded(index, 41));
  const minScaleSeed = Math.min(...scaleSeeds);
  const maxScaleSeed = Math.max(...scaleSeeds);

  return (
    <>
      {Array.from({ length: 6 }, (_, index) => {
        const scale =
          0.2 +
          ((scaleSeeds[index] - minScaleSeed) / (maxScaleSeed - minScaleSeed)) *
            0.8;
        const duration =
          (30000 - scale * 14000) * (0.9 + seeded(index, 20) * 0.2);

        return (
          <Drifter
            key={index}
            {...props}
            delay={index === 0 ? 0 : 1000 + seeded(index, 21) * 9000}
            duration={duration}
            xDirection={index % 3 === 0 ? -1 : 1}
            y={0.08 + seeded(index, 22) * 0.38}
          >
            <FlappingBird index={index} scale={scale} />
          </Drifter>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  bird: {
    width: 24,
    height: 10,
    flexDirection: "row",
  },
  wing: {
    width: 12,
    height: 7,
    borderTopWidth: 2,
    borderRadius: 8,
  },
  blur: Platform.select({
    web: { filter: "blur(1px)" },
    android: { filter: "blur(1px)" },
    default: {
      shadowColor: "#000000",
      shadowOpacity: 0.8,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 0 },
    },
  }),
  leftWing: {
    transform: [{ rotate: "18deg" }],
  },
  rightWing: {
    transform: [{ rotate: "-18deg" }],
  },
});
