import { useEffect, useRef } from "react";
import {
  Platform,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export type SceneProps = {
  width: number;
  height: number;
};

type FallingParticleProps = SceneProps & {
  color: string;
  duration: number;
  phase: number;
  size: number;
  sway: number;
  x: number;
  gentleSway?: boolean;
  wind?: RNAnimated.Value;
  renderParticle?: (color: string, size: number) => React.ReactNode;
  flicker?: boolean;
};

type DrifterProps = SceneProps & {
  children: React.ReactNode;
  delay: number;
  duration: number;
  travelPadding?: number;
  xDirection?: 1 | -1;
  y: number;
};

export const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export function useLoop(duration: number, delay: number) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );

    return () => cancelAnimation(progress);
  }, [delay, duration, progress]);

  return progress;
}

function useFallingLoop(
  duration: number,
  phase: number,
  initialX: number,
  width: number,
) {
  const progress = useRef(new RNAnimated.Value(phase)).current;
  const x = useRef(new RNAnimated.Value(initialX * width)).current;

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function startFall(fromProgress: number) {
      const cycleDuration = duration * (0.75 + Math.random() * 0.5);

      animation = RNAnimated.timing(progress, {
        toValue: 1,
        duration: cycleDuration * (1 - fromProgress),
        easing: RNEasing.linear,
        useNativeDriver: Platform.OS !== "web",
      });
      animation.start(({ finished }) => {
        if (!finished || cancelled) return;

        progress.setValue(0);
        x.setValue(Math.random() * width);
        startFall(0);
      });
    }

    startFall(phase);

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [duration, phase, progress, width, x]);

  return { progress, x };
}

export function useWind(width: number) {
  const wind = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function swing(direction: -1 | 1) {
      const calmDuration = 7000 + Math.random() * 2000;
      const calmPause = 2000 + Math.random() * 1500;
      const buildDuration = 7000 + Math.random() * 3000;
      const strength = width * (0.04 + Math.random() * 0.08);

      animation = RNAnimated.sequence([
        RNAnimated.timing(wind, {
          toValue: 0,
          duration: calmDuration,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.delay(calmPause),
        RNAnimated.timing(wind, {
          toValue: direction * strength,
          duration: buildDuration,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished && !cancelled) swing(direction === 1 ? -1 : 1);
      });
    }

    wind.setValue(-width * (0.04 + Math.random() * 0.08));
    swing(1);

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [width, wind]);

  return wind;
}

function useFlicker(enabled: boolean) {
  const opacity = useRef(new RNAnimated.Value(enabled ? 0.03 : 0.75)).current;

  useEffect(() => {
    if (!enabled) return;

    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function pulse() {
      const baseline = 0.02 + Math.random() * 0.05;
      const peak = 0.7 + Math.random() * 0.3;

      animation = RNAnimated.sequence([
        RNAnimated.delay(180 + Math.random() * 1300),
        RNAnimated.timing(opacity, {
          toValue: peak,
          duration: 35 + Math.random() * 80,
          easing: RNEasing.out(RNEasing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(opacity, {
          toValue: baseline,
          duration: 60 + Math.random() * 140,
          easing: RNEasing.in(RNEasing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished && !cancelled) pulse();
      });
    }

    pulse();

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [enabled, opacity]);

  return opacity;
}

export function FallingParticle({
  color,
  duration,
  phase,
  size,
  sway,
  x,
  width,
  height,
  gentleSway = false,
  wind,
  renderParticle,
  flicker = false,
}: FallingParticleProps) {
  const fall = useFallingLoop(duration, phase, x, width);
  const flickerOpacity = useFlicker(flicker);
  const swayOffset = gentleSway
    ? fall.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-sway, sway],
      })
    : fall.progress.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [-sway, sway, -sway, sway, -sway],
      });

  return (
    <RNAnimated.View
      style={[
        animationStyles.particle,
        {
          backgroundColor: renderParticle ? undefined : color,
          borderRadius: renderParticle ? 0 : size / 2,
          height: size,
          width: size,
          opacity: flicker ? flickerOpacity : 0.75,
          transform: [
            {
              translateX: RNAnimated.add(
                RNAnimated.add(fall.x, swayOffset),
                wind ?? 0,
              ),
            },
            {
              translateY: fall.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-size * 1.5, height + size * 1.5],
              }),
            },
            {
              rotate: renderParticle
                ? fall.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "540deg"],
                  })
                : "0deg",
            },
          ],
        },
      ]}
    >
      {renderParticle?.(color, size)}
    </RNAnimated.View>
  );
}

export function Drifter({
  children,
  delay,
  duration,
  width,
  height,
  travelPadding = 100,
  xDirection = 1,
  y,
}: DrifterProps) {
  const progress = useLoop(duration, delay);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          xDirection === 1
            ? -travelPadding + progress.value * (width + travelPadding * 2)
            : width +
              travelPadding -
              progress.value * (width + travelPadding * 2),
      },
    ],
  }));

  return (
    <Animated.View
      style={[animationStyles.drifter, { top: y * height }, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

export const animationStyles = StyleSheet.create({
  nonInteractive: {
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    top: 0,
  },
  drifter: {
    position: "absolute",
    left: 0,
  },
});
