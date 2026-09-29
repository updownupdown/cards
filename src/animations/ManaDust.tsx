import { useRef } from "react";
import { Animated as RNAnimated, StyleSheet } from "react-native";
import {
  type SceneProps,
  seeded,
  useAnimatedValueLoop,
} from "./BackgroundAnimations";

const COLORS = ["#7ff7ff", "#bda0ff", "#ff9ee8", "#fff3a3", "#8dffcf"];

function Spark({ index, width, height }: SceneProps & { index: number }) {
  const progress = useRef(new RNAnimated.Value(seeded(index, 100))).current;
  const size = 1 + Math.floor(seeded(index, 101) * 3);
  const originX = width * seeded(index, 102);
  const originY = height * (0.45 + seeded(index, 103));
  const rise = height * (0.05 + seeded(index, 104) * 0.4);
  const orbit = 8 + seeded(index, 105) * 5;
  const duration = 6000 + seeded(index, 106) * 6000;

  useAnimatedValueLoop(progress, duration);

  return (
    <RNAnimated.View
      style={[
        styles.spark,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS[index % COLORS.length],
          boxShadow: `0 0 ${size * 2}px ${COLORS[index % COLORS.length]}e6`,
          opacity: progress.interpolate({
            inputRange: [0, 0.12, 0.65, 1],
            outputRange: [0, 1, 0.75, 0],
          }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [
                  originX,
                  originX + orbit,
                  originX,
                  originX - orbit,
                  originX,
                ],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [originY, originY - rise],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0.4, 1.35, 0.8, 0.2],
              }),
            },
          ],
        },
      ]}
    />
  );
}

export function ManaDust(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 22 }, (_, index) => (
        <Spark key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  spark: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
