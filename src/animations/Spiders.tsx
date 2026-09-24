import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  hash01,
  type SceneProps,
  seeded,
  useLoop,
} from "./BackgroundAnimations";

/** Room below the thread's end for the spider's body and legs. */
const BODY_ROOM = 22;
/** How far above the scene's top edge a resting spider waits, with margin. */
const HIDE_ABOVE = BODY_ROOM * 2;
/** The thread a hidden spider keeps above the top edge. */
const THREAD_SLACK = 2;
/** Leg angles on one side, front to back; the other side mirrors them. */
const LEG_ANGLES = [-55, -22, 12, 42];

// One visit, in milliseconds: let down, hang swinging, climb back up, then
// stay out of sight a long while before the next.
const DESCEND_MS = 9500;
const HANG_MS = 21000;
const CLIMB_MS = 4500;
const AWAY_MS = 21000;
const VISIT_MS = DESCEND_MS + HANG_MS + CLIMB_MS + AWAY_MS;
const VISIT_STEPS = [
  0,
  DESCEND_MS / VISIT_MS,
  (DESCEND_MS + HANG_MS) / VISIT_MS,
  (DESCEND_MS + HANG_MS + CLIMB_MS) / VISIT_MS,
  1,
];
/** Visits in one pass of the loop, each at its own spot and length. */
const VISITS_PER_LOOP = 7;
/** Shortest and longest drop below the top edge, as shares of the height. */
const SHORTEST_DROP = 0.11;
const LONGEST_DROP = 0.6;
const SWING_DEGREES = 3.5;
const SWING_PERIOD_MS = 3500;

function Spider({ width, height }: SceneProps) {
  const size = 0.85 + seeded(0, 73) * 0.35;
  // The thread is sized for the longest drop and scaled down to each one.
  const threadLength = HIDE_ABOVE + LONGEST_DROP * height + THREAD_SLACK;

  const loop = useLoop(VISIT_MS * VISITS_PER_LOOP, 3000);

  /** Which visit this is, and how far through it. */
  const visitAt = (value: number) => {
    "worklet";
    const at = Math.min(value * VISITS_PER_LOOP, VISITS_PER_LOOP - 1e-6);
    const visit = Math.floor(at);
    return { visit, progress: at - visit };
  };

  /** How far the spider has let itself down, measured from its hiding place. */
  const dropFor = (value: number) => {
    "worklet";
    const { visit, progress } = visitAt(value);
    const longest =
      HIDE_ABOVE +
      (SHORTEST_DROP + hash01(visit, 72) * (LONGEST_DROP - SHORTEST_DROP)) *
        height;
    return {
      drop: interpolate(
        progress,
        VISIT_STEPS,
        [0, longest, longest, 0, 0],
        Extrapolation.CLAMP,
      ),
      longest,
    };
  };

  // Each visit picks a new spot; the thread swings from its anchor, harder
  // the further down the spider hangs.
  const swingStyle = useAnimatedStyle(() => {
    const { visit, progress } = visitAt(loop.value);
    const { drop, longest } = dropFor(loop.value);
    const x = (0.14 + hash01(visit, 71) * 0.72) * width;
    const swing =
      Math.sin(((progress * VISIT_MS) / SWING_PERIOD_MS) * Math.PI * 2) *
      SWING_DEGREES *
      (drop / longest);
    return { transform: [{ translateX: x }, { rotate: `${swing}deg` }] };
  });

  const threadStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: (dropFor(loop.value).drop + THREAD_SLACK) / threadLength },
    ],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dropFor(loop.value).drop }, { scale: size }],
  }));

  return (
    <Animated.View
      style={[styles.anchor, { height: threadLength + BODY_ROOM }, swingStyle]}
    >
      <Animated.View
        style={[styles.thread, { height: threadLength }, threadStyle]}
      />
      <Animated.View style={[styles.spider, bodyStyle]}>
        {LEG_ANGLES.map((angle) => (
          <View
            key={`l${angle}`}
            style={[
              styles.leg,
              styles.leftLeg,
              { transform: [{ rotate: `${-angle}deg` }] },
            ]}
          />
        ))}
        {LEG_ANGLES.map((angle) => (
          <View
            key={`r${angle}`}
            style={[
              styles.leg,
              styles.rightLeg,
              { transform: [{ rotate: `${angle}deg` }] },
            ]}
          />
        ))}
        <View style={styles.head} />
        <View style={styles.abdomen}>
          <View style={styles.sheen} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Now and then a spider lets itself down on a thread, somewhere new each
 * time and by a different length: it hangs swinging gently for a while, then
 * climbs back up out of sight. Three UI-thread styles, nothing on the JS
 * thread.
 */
export function Spiders(props: SceneProps) {
  return <Spider {...props} />;
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    top: -HIDE_ABOVE,
    left: -10,
    width: 20,
    // Swing from the point the thread hangs from.
    transformOrigin: "50% 0%",
  },
  thread: {
    position: "absolute",
    left: 9.5,
    top: 0,
    width: 1,
    backgroundColor: "rgba(245, 245, 250, 0.6)",
    transformOrigin: "50% 0%",
  },
  spider: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 20,
    height: 18,
    transformOrigin: "50% 0%",
  },
  head: {
    position: "absolute",
    left: 7.5,
    top: 0,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#3a302d",
  },
  abdomen: {
    position: "absolute",
    left: 5.5,
    top: 4,
    width: 9,
    height: 11,
    borderRadius: 5,
    backgroundColor: "#453834",
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    left: 2,
    top: 2,
    width: 3,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 235, 220, 0.25)",
  },
  leg: {
    position: "absolute",
    top: 6,
    width: 9,
    height: 1,
    borderRadius: 0.5,
    backgroundColor: "#56473f",
  },
  leftLeg: { left: 1, transformOrigin: "100% 50%" },
  rightLeg: { left: 10, transformOrigin: "0% 50%" },
});
