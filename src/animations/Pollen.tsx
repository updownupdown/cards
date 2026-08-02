import { useEffect, useRef } from "react";
import {
  Platform,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
} from "react-native";
import { type SceneProps, seeded } from "./BackgroundAnimations";

const POLLEN_COLORS = [
  "#fffdf0",
  "#f5eed8",
  "#e8d8b4",
  "#f6e7a6",
  "#e9ca68",
  "#fff1a8",
];

function PollenSpeck({ index, width, height }: SceneProps & { index: number }) {
  const fall = useRef(new RNAnimated.Value(0)).current;
  const horizontalPosition = useRef(new RNAnimated.Value(0)).current;
  const initialPhase = seeded(index, 116);
  const size = 1.05 + seeded(index, 110) * 2.1;
  const duration = 26000 + seeded(index, 114) * 18000;
  const startY = -size * (2 + seeded(index, 115) * 10);

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;
    const direction = seeded(index, 112) < 0.5 ? -1 : 1;

    function drift(fromProgress: number) {
      const verticalDistance = height + size * 2 - startY;
      const startX =
        direction === 1
          ? -width * 0.2 + Math.random() * width * 0.45
          : width * 0.75 + Math.random() * width * 0.45;
      const travel = direction * verticalDistance * (0.6 + Math.random() * 0.4);
      const cycleDuration = duration * (0.8 + Math.random() * 0.4);

      fall.setValue(fromProgress);
      horizontalPosition.setValue(startX + travel * fromProgress);
      animation = RNAnimated.parallel([
        RNAnimated.timing(fall, {
          toValue: 1,
          duration: cycleDuration * (1 - fromProgress),
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(horizontalPosition, {
          toValue: startX + travel,
          duration: cycleDuration * (1 - fromProgress),
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished && !cancelled) drift(0);
      });
    }

    drift(initialPhase);
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [
    duration,
    fall,
    height,
    horizontalPosition,
    index,
    initialPhase,
    size,
    startY,
    width,
  ]);

  return (
    <RNAnimated.View
      style={[
        styles.pollen,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: POLLEN_COLORS[index % POLLEN_COLORS.length],
          opacity: 0.225 + seeded(index, 120) * 0.225,
          transform: [
            { translateX: horizontalPosition },
            {
              translateY: fall.interpolate({
                inputRange: [0, 1],
                outputRange: [startY, height + size * 2],
              }),
            },
          ],
        },
      ]}
    />
  );
}

export function Pollen(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 42 }, (_, index) => (
        <PollenSpeck key={index} {...props} index={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  pollen: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
