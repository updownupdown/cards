import { useEffect, useRef } from "react";
import {
  Platform,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
} from "react-native";
import {
  type SceneProps,
  seeded,
  useAnimationsPaused,
} from "./BackgroundAnimations";

const GREEN_COLORS = [
  { light: "#e8ff75", glow: "#d7ff52" },
  { light: "#cfff72", glow: "#aeea3f" },
  { light: "#f0ff9a", glow: "#dcff63" },
];
const WARM_COLORS = [
  { light: "#ffe878", glow: "#ffd84d" },
  { light: "#ffb85c", glow: "#ff9238" },
  { light: "#ffaaa0", glow: "#ff7f73" },
];

function FireflyLight({
  index,
  width,
  height,
}: SceneProps & { index: number }) {
  const driftX = useRef(new RNAnimated.Value(0)).current;
  const driftY = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0.15)).current;
  const scale = useRef(new RNAnimated.Value(0.7)).current;
  const size = 2 + seeded(index, 60) * 2.5;
  const palette = index < 9 ? GREEN_COLORS : WARM_COLORS;
  const color = palette[index % palette.length];
  const paused = useAnimationsPaused();

  useEffect(() => {
    if (paused) return;
    const nativeDriver = Platform.OS !== "web";
    const drift = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.parallel([
          RNAnimated.timing(driftX, {
            toValue: (seeded(index, 61) - 0.5) * width * 0.18,
            duration: 3500 + seeded(index, 62) * 3500,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: nativeDriver,
          }),
          RNAnimated.timing(driftY, {
            toValue: (seeded(index, 63) - 0.5) * height * 0.15,
            duration: 3500 + seeded(index, 64) * 3500,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: nativeDriver,
          }),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(driftX, {
            toValue: (seeded(index, 65) - 0.5) * width * 0.14,
            duration: 4000 + seeded(index, 66) * 4000,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: nativeDriver,
          }),
          RNAnimated.timing(driftY, {
            toValue: (seeded(index, 67) - 0.5) * height * 0.18,
            duration: 4000 + seeded(index, 68) * 4000,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: nativeDriver,
          }),
        ]),
      ]),
    );
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(250 + seeded(index, 69) * 1800),
        RNAnimated.parallel([
          RNAnimated.timing(opacity, {
            toValue: 0.95,
            duration: 450 + seeded(index, 70) * 650,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: nativeDriver,
          }),
          RNAnimated.timing(scale, {
            toValue: 1.3,
            duration: 450 + seeded(index, 70) * 650,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: nativeDriver,
          }),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(opacity, {
            toValue: 0.08,
            duration: 700 + seeded(index, 71) * 1000,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: nativeDriver,
          }),
          RNAnimated.timing(scale, {
            toValue: 0.65,
            duration: 700 + seeded(index, 71) * 1000,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: nativeDriver,
          }),
        ]),
      ]),
    );

    drift.start();
    pulse.start();
    return () => {
      drift.stop();
      pulse.stop();
    };
  }, [driftX, driftY, height, index, opacity, paused, scale, width]);

  return (
    <RNAnimated.View
      style={[
        styles.light,
        {
          left: seeded(index, 72) * width,
          top: seeded(index, 73) * height,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color.light,
          boxShadow: `0 0 ${size * 2}px ${color.glow}e6`,
          opacity,
          transform: [
            { translateX: driftX },
            { translateY: driftY },
            { scale },
          ],
        },
      ]}
    />
  );
}

export function Firefly(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 18 }, (_, index) => (
        <FireflyLight key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  light: {
    position: "absolute",
  },
});
