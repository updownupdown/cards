import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { type SceneProps, seeded, useLoop } from "./BackgroundAnimations";

const BEE_COUNT = 5;

function Bee({ index, width, height }: SceneProps & { index: number }) {
  const home = {
    x: (0.12 + seeded(index, 61) * 0.76) * width,
    y: (0.1 + seeded(index, 62) * 0.7) * height,
  };
  const reach = {
    x: 30 + seeded(index, 63) * 60,
    y: 16 + seeded(index, 64) * 36,
  };
  // Whole-number frequencies close the path, so each lap joins the next with
  // no jump; 1:2 is a figure-of-eight, 2:3 a busier knot.
  const lapsX = seeded(index, 65) < 0.5 ? 1 : 2;
  const lapsY = lapsX + 1;
  const phase = seeded(index, 66) * Math.PI * 2;
  const size = 0.8 + seeded(index, 67) * 0.45;

  const path = useLoop(
    9000 + seeded(index, 68) * 7000,
    seeded(index, 69) * 2500,
  );
  const wings = useLoop(90, 0);

  const beeStyle = useAnimatedStyle(() => {
    const turn = path.value * Math.PI * 2;
    const x = home.x + Math.sin(turn * lapsX + phase) * reach.x;
    const y =
      home.y +
      Math.sin(turn * lapsY) * reach.y +
      // A little jitter on top: bees never fly quite straight.
      Math.sin(turn * 23 + phase) * 1.5;
    // Faces the way it is travelling across the screen.
    const heading = Math.cos(turn * lapsX + phase) >= 0 ? 1 : -1;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scaleX: heading * size },
        { scaleY: size },
      ],
    };
  });

  const wingStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleY: 0.3 + 0.7 * Math.abs(Math.sin(wings.value * Math.PI * 2)),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.bee, beeStyle]}>
      <Animated.View style={[styles.wing, styles.backWing, wingStyle]} />
      <Animated.View style={[styles.wing, styles.frontWing, wingStyle]} />
      <View style={styles.body}>
        <View style={[styles.stripe, { left: 2.5 }]} />
        <View style={[styles.stripe, { left: 5.5 }]} />
      </View>
      <View style={styles.head} />
    </Animated.View>
  );
}

/**
 * Honeybees going about their business: each buzzes round its own patch of
 * the screen on a looping figure-of-eight, turning to face the way it flies,
 * its wings a blur. Two UI-thread loops a bee, nothing on the JS thread.
 */
export function Bees(props: SceneProps) {
  return (
    <>
      {Array.from({ length: BEE_COUNT }, (_, index) => (
        <Bee key={index} index={index} {...props} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bee: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 14,
    height: 10,
  },
  body: {
    position: "absolute",
    left: 1,
    top: 4,
    width: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f4b23a",
    overflow: "hidden",
  },
  stripe: {
    position: "absolute",
    top: 0,
    width: 1.6,
    height: 6,
    backgroundColor: "#3b2a12",
  },
  head: {
    position: "absolute",
    left: 10,
    top: 4.5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2c2010",
  },
  wing: {
    position: "absolute",
    top: 0,
    width: 6,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(235, 245, 255, 0.6)",
    transformOrigin: "50% 100%",
  },
  backWing: { left: 2 },
  frontWing: { left: 5.5 },
});
