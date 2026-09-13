import Leaf from "@/assets/images/leaf.svg";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import {
  hash01,
  type SceneProps,
  seeded,
  useAnimationsPaused,
} from "./BackgroundAnimations";

const LEAF_COUNT = 24;
const LEAF_COLORS = ["#9b3f24", "#c35b28", "#d8892f", "#b79a36", "#7f4828"];

// Runs entirely on the UI thread: one frame callback advances every leaf. This
// used to be Animated sequences restarted from JS, with the wind value and all
// 24 leaves subscribed to wind updates via listeners — which, on a native-
// driven value, sends every frame's value back to the JS thread 25 times.

type LeafState = {
  cycle: number;
  startTime: number;
  delay: number;
  duration: number;
  startX: number;
  startY: number;
  windAtStart: number;
  response: number;
  scale: number;
  staticX: number;
  turnsX: number;
  turnsY: number;
  turnsZ: number;
};

/** Wind displacement over time: a slow leftward drift with a gentle surge. */
function windAt(time: number, width: number) {
  "worklet";
  const drift = -(time / 8000) * 0.2 * width;
  const surge = 0.05 * width * Math.sin((time / 8000) * Math.PI * 2);
  return drift + surge;
}

function createLeaf(
  index: number,
  cycle: number,
  now: number,
  initialDelay: number,
  size: number,
  width: number,
  wind: number,
): LeafState {
  "worklet";
  const random = (salt: number) => hash01(index * 31 + salt, cycle * 17 + 1);
  const depth = random(1);
  const axis = random(2);
  const rotationSpeed = axis < 0.25 ? 0.5 + random(3) : 2 + random(3) * 4;
  const staticX = axis < 0.5 ? random(4) * 360 - 180 : 0;
  const turns = 360 * rotationSpeed;

  return {
    cycle,
    startTime: now,
    delay: cycle === 0 ? initialDelay : 500 + random(5) * 5000,
    duration: 18000 + random(6) * 7000,
    startX: random(7) * width,
    startY: -size * (1.5 + random(8) * 2),
    windAtStart: wind,
    response: 0.5 + depth * 0.5,
    scale: 0.7 + depth * 0.4,
    staticX,
    turnsX: axis > 0.5 ? turns : staticX,
    turnsY: axis > 0.25 && axis <= 0.5 ? turns : 0,
    turnsZ: axis <= 0.25 ? turns : 0,
  };
}

type LeafParticleProps = {
  index: number;
  color: string;
  size: number;
  height: number;
  width: number;
  time: SharedValue<number>;
  leaves: SharedValue<LeafState[]>;
};

function LeafParticle({
  index,
  color,
  size,
  height,
  width,
  time,
  leaves,
}: LeafParticleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const leaf = leaves.value[index];
    if (!leaf) return { opacity: 0 };

    const now = time.value;
    const elapsed = now - leaf.startTime - leaf.delay;
    const progress = elapsed <= 0 ? 0 : Math.min(elapsed / leaf.duration, 1);
    const x =
      leaf.startX + (windAt(now, width) - leaf.windAtStart) * leaf.response;
    const y = leaf.startY + (height + size - leaf.startY) * progress;
    const rotateX = leaf.staticX + (leaf.turnsX - leaf.staticX) * progress;

    return {
      opacity: 1,
      transform: [
        { perspective: 400 },
        { translateX: x },
        { translateY: y },
        { scale: leaf.scale },
        { rotateX: `${rotateX}deg` },
        { rotateY: `${leaf.turnsY * progress}deg` },
        { rotateZ: `${leaf.turnsZ * progress}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.leaf, { width: size, height: size }, animatedStyle]}
    >
      <Leaf color={color} width={size} height={size} />
    </Animated.View>
  );
}

export function Leaves({ width, height }: SceneProps) {
  const [sizes] = useState(() =>
    Array.from({ length: LEAF_COUNT }, (_, index) => 4 + seeded(index, 8) * 10),
  );
  const [initialDelays] = useState(() =>
    Array.from(
      { length: LEAF_COUNT },
      (_, index) => index * 350 + seeded(index, 7) * 16000,
    ),
  );

  const time = useSharedValue(0);
  const leaves = useSharedValue<LeafState[]>([]);

  const paused = useAnimationsPaused();

  // The scene's own clock advances only while running, so a pause freezes the
  // leaves instead of letting their falls finish unseen.
  const frameCallback = useFrameCallback((frame) => {
    "worklet";
    const now = time.value + (frame.timeSincePreviousFrame ?? 0);
    const wind = windAt(now, width);
    time.value = now;

    leaves.modify((list) => {
      "worklet";
      for (let index = 0; index < LEAF_COUNT; index++) {
        const size = sizes[index];
        const leaf = list[index];

        if (!leaf) {
          list[index] = createLeaf(
            index,
            0,
            now,
            initialDelays[index],
            size,
            width,
            wind,
          );
          continue;
        }

        const elapsed = now - leaf.startTime - leaf.delay;
        const x = leaf.startX + (wind - leaf.windAtStart) * leaf.response;

        // Start a new fall once this one ends, or the wind blows it off screen.
        if (elapsed >= leaf.duration || x < -size || x > width) {
          list[index] = createLeaf(
            index,
            leaf.cycle + 1,
            now,
            0,
            size,
            width,
            wind,
          );
        }
      }
      return list;
    });
  });

  useEffect(() => {
    frameCallback.setActive(!paused);
  }, [frameCallback, paused]);

  return (
    <>
      {sizes.map((size, index) => (
        <LeafParticle
          key={index}
          index={index}
          color={LEAF_COLORS[index % LEAF_COLORS.length]}
          size={size}
          width={width}
          height={height}
          time={time}
          leaves={leaves}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: "absolute",
    top: 0,
    left: 0,
    backfaceVisibility: "visible",
  },
});
