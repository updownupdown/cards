import { StyleSheet, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SoftBlob } from "./SoftBlob";
import {
  hash01,
  type SceneProps,
  seeded,
  useLoop,
} from "./BackgroundAnimations";

// The wind blows left to right. Every grain and veil reads one shared clock,
// so the whole scene moves with the same gusts. Nothing depends on where the
// dunes are in the background.

const GRAIN_COUNT = 45;
const VEIL_COUNT = 2;
const SAND = "#e6c38b";
/** Grains come in a few shades of sand. */
const GRAIN_COLORS = ["#f1d9ad", "#e6c38b", "#d9a85f", "#c98d4a", "#b87a3e"];
/** Room outside the screen where grains wrap round. */
const PAD = 12;

/** The shared clock's loop. Long, so its wrap-round is rarely seen. */
const CLOCK_MS = 600_000;
/** One gust in each stretch this long, at a different moment in each. */
const GUST_EVERY_MS = 8000;
/** How long a gust lasts, rising and dying away. */
const GUST_MS = 2200;
/** How much faster a grain is blown at the height of a gust, in px/s. */
const GUST_PEAK = 240;
/** The extra distance one whole gust carries a grain. */
const GUST_DISTANCE = (GUST_PEAK * GUST_MS) / 1000 / 2;

/**
 * The wind at a moment on the clock: how hard the gust is blowing (0 to 1),
 * and how far all the gusts so far have pushed a grain beyond its own drift.
 * Each gust rises and falls as a smooth hump, whose distance is summed
 * exactly, so grains speed up and settle back without ever jumping.
 */
function windAt(ms: number) {
  "worklet";
  const stretch = Math.floor(ms / GUST_EVERY_MS);
  const start = (0.05 + hash01(stretch, 91) * 0.6) * (GUST_EVERY_MS - GUST_MS);
  const within = ms - stretch * GUST_EVERY_MS - start;
  const u = Math.min(1, Math.max(0, within / GUST_MS));
  const turn = Math.PI * 2 * u;
  return {
    strength: (1 - Math.cos(turn)) / 2,
    distance:
      stretch * GUST_DISTANCE +
      GUST_DISTANCE * (u - Math.sin(turn) / (Math.PI * 2)),
  };
}

/**
 * A grain of sand carried across the screen as it slowly falls, swaying a
 * little. Each gust hurries it along and brightens it; lighter grains are
 * blown further.
 */
function Grain({
  index,
  clock,
  width,
  height,
}: SceneProps & { index: number; clock: SharedValue<number> }) {
  const size = 1 + seeded(index, 10) * 1.6;
  const brightness = 0.35 + seeded(index, 14) * 0.55;
  const drift = 60 + seeded(index, 12) * 90;
  const fall = 10 + seeded(index, 15) * 30;
  const lightness = 0.7 + seeded(index, 16) * 0.6;
  const start = { x: seeded(index, 17), y: seeded(index, 13) };
  const sway = {
    reach: 1.5 + seeded(index, 18) * 3,
    periodMs: 1600 + seeded(index, 19) * 1800,
    phase: seeded(index, 20) * Math.PI * 2,
  };
  const spanX = width + PAD * 2;
  const spanY = height + PAD * 2;

  const style = useAnimatedStyle(() => {
    const ms = clock.value * CLOCK_MS;
    const wind = windAt(ms);
    const x =
      (start.x * spanX + (drift * ms) / 1000 + wind.distance * lightness) %
      spanX;
    const y = (start.y * spanY + (fall * ms) / 1000) % spanY;
    const swaying =
      Math.sin((ms / sway.periodMs) * Math.PI * 2 + sway.phase) * sway.reach;
    return {
      opacity: brightness * (0.5 + 0.5 * wind.strength),
      transform: [
        { translateX: x - PAD + swaying * 0.5 },
        { translateY: y - PAD + swaying },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: GRAIN_COLORS[index % GRAIN_COLORS.length],
        },
        style,
      ]}
    />
  );
}

/** A thin, wide veil of dust carried through low on a strong gust. */
function Veil({
  index,
  clock,
  width,
  height,
}: SceneProps & { index: number; clock: SharedValue<number> }) {
  const veilWidth = width * (1.1 + seeded(index, 71) * 0.5);
  const veilHeight = 36 + seeded(index, 72) * 30;
  const baseY = (0.5 + seeded(index, 73) * 0.35) * height;
  const sweep = useLoop(
    7000 + seeded(index, 74) * 4000,
    seeded(index, 75) * 6000,
  );

  const style = useAnimatedStyle(() => {
    const t = sweep.value;
    const edges = Math.min(1, t * 5, (1 - t) * 5);
    const { strength } = windAt(clock.value * CLOCK_MS);
    return {
      opacity: 0.22 * edges * strength,
      transform: [
        { translateX: -veilWidth + t * (width + veilWidth) },
        { translateY: baseY },
      ],
    };
  });

  return (
    <Animated.View style={[styles.particle, style]}>
      <SoftBlob width={veilWidth} height={veilHeight} color={SAND} />
    </Animated.View>
  );
}

/**
 * Sand blowing across the screen: grains in a few shades drift past as they
 * settle, and every few seconds a gust hurries them all along, with a faint
 * veil of dust carried through on it.
 */
export function Sand(props: SceneProps) {
  const clock = useLoop(CLOCK_MS, 0);

  return (
    <>
      <View style={styles.haze} />
      {Array.from({ length: VEIL_COUNT }, (_, index) => (
        <Veil key={`v${index}`} index={index} clock={clock} {...props} />
      ))}
      {Array.from({ length: GRAIN_COUNT }, (_, index) => (
        <Grain key={`g${index}`} index={index} clock={clock} {...props} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  haze: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(198, 146, 77, 0.08)",
  },
  particle: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
