import { useEffect, useRef } from "react";
import {
  Platform,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
  View,
} from "react-native";
import { type SceneProps, seeded } from "./BackgroundAnimations";

const PETAL_COLORS = ["#ffd6e3", "#ffc2d6", "#ffe5ed", "#f7a9c2"];

function Petal({ index, width, height }: SceneProps & { index: number }) {
  const progress = useRef(new RNAnimated.Value(0)).current;
  const size = 5 + seeded(index, 81) * 5;
  const startX = seeded(index, 82) * width * 0.9 - width * 0.1;
  const diagonalTravel = width * (0.18 + seeded(index, 83) * 0.18);
  const sway = 8 + seeded(index, 84) * 16;
  const duration = 9000 + seeded(index, 85) * 7000;
  const startY = -size * (2.5 + seeded(index, 87) * 8);
  const endY = height + size * 2;
  const distance = endY - startY;

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function fall(delay = 0) {
      progress.setValue(0);
      animation = RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.timing(progress, {
          toValue: 1,
          duration: duration * (0.85 + Math.random() * 0.3),
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished && !cancelled) fall(Math.random() * 1200);
      });
    }

    fall(seeded(index, 80) * duration);
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [duration, index, progress]);

  const translateX = RNAnimated.add(
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [startX, startX + diagonalTravel],
    }),
    progress.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, sway, -sway * 0.5, sway, 0],
    }),
  );

  return (
    <RNAnimated.View
      style={[
        styles.petalContainer,
        {
          transform: [
            { translateX },
            {
              translateY: progress.interpolate({
                inputRange: [0, 0.22, 0.5, 0.76, 1],
                outputRange: [
                  startY,
                  startY + distance * 0.2,
                  startY + distance * 0.52,
                  startY + distance * 0.75,
                  endY,
                ],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", `${540 + seeded(index, 86) * 540}deg`],
              }),
            },
            {
              scaleX: progress.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [1, 0.35, 1, 0.45, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.petal,
          {
            backgroundColor: PETAL_COLORS[index % PETAL_COLORS.length],
            width: size,
            height: size * 0.7,
            borderRadius: size,
          },
        ]}
      />
    </RNAnimated.View>
  );
}

export function CherryBlossom(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 24 }, (_, index) => (
        <Petal key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  petalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  petal: {
    transform: [{ rotate: "-20deg" }],
  },
});
