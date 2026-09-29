import { useRef } from "react";
import { Animated as RNAnimated, StyleSheet } from "react-native";
import {
  animationStyles,
  type SceneProps,
  seeded,
  useAnimatedValueLoop,
} from "./BackgroundAnimations";

function RainDrop({ index, width, height }: SceneProps & { index: number }) {
  const progress = useRef(new RNAnimated.Value(0)).current;
  const length = 10 + seeded(index, 52) * 18;
  const startY = -length - seeded(index, 50) * Math.min(height * 0.35, 160);
  const endY = height + length;
  const angle = -(4 + seeded(index, 53) * 8);
  const horizontalTravel = (endY - startY) * Math.tan((-angle * Math.PI) / 180);
  const overshoot = width * 0.2;
  const startX =
    -overshoot + seeded(index, 51) * (width + overshoot * 2 - horizontalTravel);
  const duration = 550 + seeded(index, 54) * 500;

  useAnimatedValueLoop(progress, duration);

  return (
    <RNAnimated.View
      style={[
        animationStyles.particle,
        styles.drop,
        {
          height: length,
          opacity: 0.06 + seeded(index, 55) * 0.2,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [startX, startX + horizontalTravel],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [startY, endY],
              }),
            },
            { rotate: `${angle}deg` },
          ],
        },
      ]}
    />
  );
}

export function Rain(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 54 }, (_, index) => (
        <RainDrop key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  drop: {
    width: 1,
    backgroundColor: "#d7ecff",
    borderRadius: 1,
  },
});
