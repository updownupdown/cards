import { useEffect, useRef } from "react";
import {
  Platform,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
  View,
} from "react-native";
import { Drifter, type SceneProps, seeded } from "./BackgroundAnimations";

const BIRD_COLORS = ["#111111", "#2b2b2b", "#38291f", "#4a4038"];

function Bird({ color }: { color: string }) {
  return (
    <View style={styles.bird}>
      <View style={[styles.wing, styles.leftWing, { borderTopColor: color }]} />
      <View
        style={[styles.wing, styles.rightWing, { borderTopColor: color }]}
      />
    </View>
  );
}

function FlappingBird({ index, scale }: { index: number; scale: number }) {
  const wingScale = useRef(new RNAnimated.Value(1)).current;
  const flapLift = useRef(new RNAnimated.Value(0)).current;
  const gravity = useRef(
    new RNAnimated.Value((seeded(index, 40) - 0.5) * 20),
  ).current;
  const color = BIRD_COLORS[index % BIRD_COLORS.length];

  useEffect(() => {
    let flapAnimation: RNAnimated.CompositeAnimation | undefined;
    let altitudeAnimation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function flap(isFirstBurst = false) {
      const flapCount = 1 + Math.floor(Math.random() * 5);
      const flaps: RNAnimated.CompositeAnimation[] = [];

      for (let count = 0; count < flapCount; count += 1) {
        const compression = 0.2 + Math.random() * 0.2;
        const lift = -(3 + Math.random() * 5);

        flaps.push(
          RNAnimated.parallel([
            RNAnimated.timing(wingScale, {
              toValue: compression,
              duration: 180 + Math.random() * 170,
              easing: RNEasing.inOut(RNEasing.sin),
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.timing(flapLift, {
              toValue: lift,
              duration: 220 + Math.random() * 220,
              easing: RNEasing.out(RNEasing.sin),
              useNativeDriver: Platform.OS !== "web",
            }),
          ]),
          RNAnimated.parallel([
            RNAnimated.timing(wingScale, {
              toValue: 1,
              duration: 260 + Math.random() * 260,
              easing: RNEasing.out(RNEasing.sin),
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.timing(flapLift, {
              toValue: 0,
              duration: 420 + Math.random() * 380,
              easing: RNEasing.inOut(RNEasing.sin),
              useNativeDriver: Platform.OS !== "web",
            }),
          ]),
        );
      }

      flapAnimation = RNAnimated.sequence([
        RNAnimated.delay(
          isFirstBurst
            ? 1000 + seeded(index, 45) * 9000
            : 2500 + Math.random() * 7000,
        ),
        ...flaps,
      ]);
      flapAnimation.start(({ finished }) => {
        if (finished && !cancelled) flap();
      });
    }

    function fallWithGravity() {
      altitudeAnimation = RNAnimated.timing(gravity, {
        toValue: 42 + seeded(index, 42) * 25,
        duration: 15000 + seeded(index, 43) * 9000,
        easing: RNEasing.linear,
        useNativeDriver: Platform.OS !== "web",
      });
      altitudeAnimation.start(({ finished }) => {
        if (!finished || cancelled) return;

        gravity.setValue(-24 - seeded(index, 44) * 20);
        fallWithGravity();
      });
    }

    flap(true);
    fallWithGravity();

    return () => {
      cancelled = true;
      flapAnimation?.stop();
      altitudeAnimation?.stop();
    };
  }, [flapLift, gravity, index, wingScale]);

  return (
    <RNAnimated.View
      style={{
        transform: [
          { translateY: RNAnimated.add(gravity, flapLift) },
          { scale },
          { scaleX: wingScale },
        ],
      }}
    >
      <View style={styles.blur}>
        <Bird color={color} />
      </View>
    </RNAnimated.View>
  );
}

export function Birds(props: SceneProps) {
  const scaleSeeds = Array.from({ length: 6 }, (_, index) => seeded(index, 41));
  const minScaleSeed = Math.min(...scaleSeeds);
  const maxScaleSeed = Math.max(...scaleSeeds);

  return (
    <>
      {Array.from({ length: 6 }, (_, index) => {
        const scale =
          0.2 +
          ((scaleSeeds[index] - minScaleSeed) / (maxScaleSeed - minScaleSeed)) *
            0.8;
        const duration =
          (30000 - scale * 14000) * (0.9 + seeded(index, 20) * 0.2);

        return (
          <Drifter
            key={index}
            {...props}
            delay={index === 0 ? 0 : 1000 + seeded(index, 21) * 9000}
            duration={duration}
            xDirection={index % 3 === 0 ? -1 : 1}
            y={0.08 + seeded(index, 22) * 0.38}
          >
            <FlappingBird index={index} scale={scale} />
          </Drifter>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  bird: {
    width: 24,
    height: 10,
    flexDirection: "row",
  },
  wing: {
    width: 12,
    height: 7,
    borderTopWidth: 2,
    borderRadius: 8,
  },
  blur: Platform.select({
    web: { filter: "blur(1px)" },
    android: { filter: "blur(1px)" },
    default: {
      shadowColor: "#000000",
      shadowOpacity: 0.8,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 0 },
    },
  }),
  leftWing: {
    transform: [{ rotate: "18deg" }],
  },
  rightWing: {
    transform: [{ rotate: "-18deg" }],
  },
});
