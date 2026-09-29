import { useRef } from "react";
import { Animated as RNAnimated, StyleSheet } from "react-native";
import {
  type SceneProps,
  seeded,
  useAnimatedValueLoop,
} from "./BackgroundAnimations";

function DustParticle({
  index,
  width,
  height,
}: SceneProps & { index: number }) {
  const phase = seeded(index, 130);
  const progress = useRef(new RNAnimated.Value(phase)).current;
  const size = 0.5 + seeded(index, 131) * 1.1;
  const startX = seeded(index, 132) * width;
  const startY = -size * 2;
  const endY = height + size * 1.5;
  const horizontalTravel = (seeded(index, 133) - 0.5) * width * 0.4;
  const duration = 100000 + seeded(index, 134) * 5000;
  const opacity = 0.2 + seeded(index, 135) * 0.4;

  useAnimatedValueLoop(progress, duration);

  return (
    <RNAnimated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
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
          ],
        },
      ]}
    />
  );
}

export function Dust({ width, height }: SceneProps) {
  return (
    <>
      {Array.from({ length: 65 }, (_, index) => (
        <DustParticle key={index} width={width} height={height} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#fff1c9",
    boxShadow: "0 0 2px rgba(255, 213, 138, 0.7)",
  },
});
