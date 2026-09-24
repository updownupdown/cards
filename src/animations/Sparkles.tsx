import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import {
  hash01,
  type SceneProps,
  seeded,
  useLoop,
} from "./BackgroundAnimations";

type SparkleLook = {
  count: number;
  colors: string[];
  /** Arm length, smallest to largest, in pixels. */
  size: [number, number];
  /** How long one flash lasts. */
  flashMs: [number, number];
  /** The dark wait before the next flash. */
  gapMs: [number, number];
  /** Whether the sparkle turns as it flashes, like a catching facet. */
  turns: boolean;
  /** Each ray crosses the centre, so it makes two strands: its angle, and
   *  its length next to the longest. Glints on water flare mostly sideways. */
  rays: { angle: number; length: number }[];
  /** Brightest opacity at the height of a flash. */
  peak: number;
  salt: number;
};

/** Flashes in one pass of a sparkle's loop, each somewhere new. */
const FLASHES_PER_LOOP = 9;

function between([low, high]: [number, number], share: number) {
  return low + (high - low) * share;
}

function Sparkle({
  index,
  look,
  width,
  height,
}: SceneProps & { index: number; look: SparkleLook }) {
  const key = look.salt * 100 + index;
  const arm = between(look.size, seeded(key, 1));
  const flashMs = between(look.flashMs, seeded(key, 2));
  const cycleMs = flashMs + between(look.gapMs, seeded(key, 3));
  const color = look.colors[index % look.colors.length];
  // Starts partway through, so the scene is already going when it opens.
  const offset = seeded(key, 4);
  const loop = useLoop(cycleMs * FLASHES_PER_LOOP, 0);

  const style = useAnimatedStyle(() => {
    const at = (loop.value * FLASHES_PER_LOOP + offset) % FLASHES_PER_LOOP;
    const flash = Math.floor(at);
    const t = ((at - flash) * cycleMs) / flashMs;
    if (t >= 1) return { opacity: 0 };
    const glow = Math.sin(t * Math.PI);
    return {
      opacity: look.peak * glow,
      transform: [
        { translateX: hash01(flash, key * 2 + 1) * width - arm },
        { translateY: hash01(flash, key * 2 + 2) * height - arm },
        { scale: 0.3 + 0.7 * glow },
        { rotate: look.turns ? `${t * 70}deg` : "0deg" },
      ],
    };
  });

  const thickness = Math.max(0.7, arm * 0.16);
  const core = thickness * 2.2;
  return (
    <Animated.View
      style={[styles.sparkle, { width: arm * 2, height: arm * 2 }, style]}
    >
      {look.rays.map(({ angle, length }) => (
        <View
          key={angle}
          style={[
            styles.ray,
            {
              width: arm * 2 * length,
              height: thickness,
              top: arm - thickness / 2,
              left: arm - arm * length,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
            },
          ]}
        />
      ))}
      <View
        style={[
          styles.core,
          {
            width: core,
            height: core,
            borderRadius: core / 2,
            top: arm - core / 2,
            left: arm - core / 2,
            backgroundColor: color,
            boxShadow: `0 0 ${arm}px ${color}`,
          },
        ]}
      />
    </Animated.View>
  );
}

function Sparkles({ look, ...scene }: SceneProps & { look: SparkleLook }) {
  return (
    <>
      {Array.from({ length: look.count }, (_, index) => (
        <Sparkle key={index} index={index} look={look} {...scene} />
      ))}
    </>
  );
}

const GLITTER: SparkleLook = {
  count: 8,
  colors: ["#fff3cf", "#ffd98a", "#f5c35a", "#ffe9ad"],
  size: [2.5, 4.5],
  flashMs: [700, 1200],
  gapMs: [2400, 7200],
  turns: true,
  // Eight strands: a long cross, with a shorter one between its arms.
  rays: [
    { angle: 0, length: 1 },
    { angle: 45, length: 0.55 },
    { angle: 90, length: 1 },
    { angle: 135, length: 0.55 },
  ],
  peak: 0.8,
  salt: 1,
};

const GLINTS: SparkleLook = {
  count: 9,
  colors: ["#ffffff", "#f2fbff", "#dff4ff"],
  size: [1.5, 4],
  flashMs: [220, 480],
  gapMs: [700, 3200],
  turns: false,
  rays: [
    { angle: 0, length: 1 },
    { angle: 90, length: 0.45 },
  ],
  peak: 0.35,
  salt: 2,
};

/**
 * Glitter: small gold eight-pointed sparkles winking in and out here and there,
 * each turning a little as it catches the light. One UI-thread loop a
 * sparkle, which moves it somewhere new for every flash.
 */
export function Glitter(props: SceneProps) {
  return <Sparkles look={GLITTER} {...props} />;
}

/**
 * Glints: sun on water, lots of tiny quick flashes flaring sideways, each in
 * a new place.
 */
export function Glints(props: SceneProps) {
  return <Sparkles look={GLINTS} {...props} />;
}

const styles = StyleSheet.create({
  sparkle: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  ray: {
    position: "absolute",
    borderRadius: 1,
  },
  core: {
    position: "absolute",
  },
});
