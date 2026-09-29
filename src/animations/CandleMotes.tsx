import { useRef } from "react";
import { Animated as RNAnimated, StyleSheet } from "react-native";
import {
  type SceneProps,
  seeded,
  useAnimatedValueLoop,
} from "./BackgroundAnimations";

const COLORS = ["#ffc670", "#ffb14d", "#ffdca0", "#ffa65c"];

/** A warm speck that climbs slowly, swaying like the air above a flame. */
function Mote({ index, width, height }: SceneProps & { index: number }) {
  const progress = useRef(new RNAnimated.Value(seeded(index, 200))).current;
  const size = 2 + seeded(index, 201) * 2.5;
  const color = COLORS[index % COLORS.length];
  const originX = width * seeded(index, 202);
  const originY = height * (0.55 + seeded(index, 203) * 0.5);
  const rise = height * (0.25 + seeded(index, 204) * 0.3);
  const sway = 10 + seeded(index, 205) * 18;
  const duration = 14000 + seeded(index, 206) * 10000;

  useAnimatedValueLoop(progress, duration);

  return (
    <RNAnimated.View
      style={[
        styles.mote,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          boxShadow: `0 0 ${size * 3}px ${color}cc`,
          opacity: progress.interpolate({
            inputRange: [0, 0.15, 0.7, 1],
            outputRange: [0, 0.85, 0.5, 0],
          }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                outputRange: [
                  originX,
                  originX + sway,
                  originX - sway * 0.4,
                  originX + sway * 0.7,
                  originX - sway,
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
                inputRange: [0, 0.3, 1],
                outputRange: [0.6, 1.1, 0.5],
              }),
            },
          ],
        },
      ]}
    />
  );
}

export function CandleMotes(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 18 }, (_, index) => (
        <Mote key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  mote: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
