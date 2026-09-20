import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Platform,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
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
  wind?: SharedValue<number>;
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

/**
 * True while a modal or overlay covers the game. Scenes freeze in place and
 * carry on from there when it closes.
 */
export const AnimationPausedContext = createContext(false);

export function useAnimationsPaused() {
  return useContext(AnimationPausedContext);
}

/** A linear 0→1 loop that continues from `from` rather than restarting. */
export function loopFrom(from: number, duration: number) {
  const linear = { easing: Easing.linear };
  return withSequence(
    withTiming(1, { ...linear, duration: duration * (1 - from) }),
    withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { ...linear, duration }),
      ),
      -1,
      false,
    ),
  );
}

/**
 * The same loop for a core Animated value (native-driven scenes): finishes the
 * current pass from wherever it was paused, then repeats from 0.
 */
export function useAnimatedValueLoop(
  progress: RNAnimated.Value,
  duration: number,
) {
  const paused = useAnimationsPaused();

  useEffect(() => {
    if (paused) return;

    let cancelled = false;
    let animation: RNAnimated.CompositeAnimation | undefined;
    const useNativeDriver = Platform.OS !== "web";

    const repeat = () => {
      if (cancelled) return;
      progress.setValue(0);
      animation = RNAnimated.loop(
        RNAnimated.timing(progress, {
          toValue: 1,
          duration,
          easing: RNEasing.linear,
          useNativeDriver,
        }),
      );
      animation.start();
    };

    progress.stopAnimation((current) => {
      if (cancelled) return;
      if (current <= 0 || current >= 1) {
        repeat();
        return;
      }
      animation = RNAnimated.timing(progress, {
        toValue: 1,
        duration: duration * (1 - current),
        easing: RNEasing.linear,
        useNativeDriver,
      });
      animation.start(({ finished }) => {
        if (finished) repeat();
      });
    });

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [duration, paused, progress]);
}

export const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export function useLoop(duration: number, delay: number) {
  const progress = useSharedValue(0);
  const paused = useAnimationsPaused();
  const hasStartedRef = useRef(false);
  const remainingDelayRef = useRef(delay);

  useEffect(() => {
    if (paused) return;

    // The start delay applies once; after a pause the loop carries on from
    // where it stopped.
    const loop = loopFrom(progress.value, duration);
    const remainingDelay = remainingDelayRef.current;
    const delayStartedAt = Date.now();
    progress.value = hasStartedRef.current
      ? loop
      : withDelay(remainingDelay, loop);

    return () => {
      if (!hasStartedRef.current) {
        const elapsed = Date.now() - delayStartedAt;
        remainingDelayRef.current = Math.max(0, remainingDelay - elapsed);
        hasStartedRef.current = remainingDelayRef.current === 0;
      }
      cancelAnimation(progress);
    };
  }, [delay, duration, paused, progress]);

  return progress;
}

// The loops below run entirely on the UI thread (Reanimated). They used to be
// Animated sequences restarted from a JS callback at the end of every cycle,
// so each particle woke the JS thread every few seconds. Randomness that was
// re-rolled per cycle is now either picked once at mount, or derived on the UI
// thread from the cycle count with a hash.

/** Pseudo-random 0..1 from two numbers; usable inside worklets. */
export function hash01(a: number, b: number) {
  "worklet";
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function useFallingLoop(
  duration: number,
  phase: number,
  initialX: number,
  width: number,
) {
  // Picked once per particle (previously re-rolled each fall).
  const [cycleDuration] = useState(
    () => duration * (0.75 + Math.random() * 0.5),
  );
  const [seed] = useState(() => Math.random() * 1000);
  const progress = useSharedValue(phase);
  const cycle = useSharedValue(0);
  const paused = useAnimationsPaused();

  // Starts at `phase` (the initial value), and after a pause from where it
  // stopped.
  useEffect(() => {
    if (paused) return;
    progress.value = loopFrom(progress.value, cycleDuration);
    return () => cancelAnimation(progress);
  }, [cycleDuration, paused, progress]);

  // Count each wrap back to the top, so the particle re-enters at a new x.
  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous !== null && current < previous) {
        cycle.value += 1;
      }
    },
  );

  return { progress, cycle, seed, initialX: initialX * width };
}

export function useWind(width: number) {
  const wind = useSharedValue(-width * (0.04 + Math.random() * 0.08));

  // A calm → gust → calm → opposite gust cycle, with timings picked at mount.
  const [params] = useState(() => ({
    calm: 7000 + Math.random() * 2000,
    pause: 2000 + Math.random() * 1500,
    build: 7000 + Math.random() * 3000,
    strength: 0.04 + Math.random() * 0.08,
  }));

  const paused = useAnimationsPaused();

  useEffect(() => {
    if (paused) return;
    const sine = { easing: Easing.inOut(Easing.sin) };
    const strength = width * params.strength;

    wind.value = withRepeat(
      withSequence(
        withTiming(0, { ...sine, duration: params.calm }),
        withDelay(
          params.pause,
          withTiming(strength, { ...sine, duration: params.build }),
        ),
        withTiming(0, { ...sine, duration: params.calm }),
        withDelay(
          params.pause,
          withTiming(-strength, { ...sine, duration: params.build }),
        ),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(wind);
  }, [params, paused, width, wind]);

  return wind;
}

const FLICKER_PULSES = 4;

function useFlicker(enabled: boolean) {
  const opacity = useSharedValue(enabled ? 0.03 : 0.75);

  // A few random pulses picked at mount, repeated.
  const [pulses] = useState(() =>
    Array.from({ length: FLICKER_PULSES }, () => ({
      delay: 180 + Math.random() * 1300,
      peak: 0.7 + Math.random() * 0.3,
      rise: 35 + Math.random() * 80,
      baseline: 0.02 + Math.random() * 0.05,
      fall: 60 + Math.random() * 140,
    })),
  );

  const paused = useAnimationsPaused();

  useEffect(() => {
    if (!enabled || paused) return;

    const steps = pulses.flatMap((pulse) => [
      withDelay(
        pulse.delay,
        withTiming(pulse.peak, {
          duration: pulse.rise,
          easing: Easing.out(Easing.quad),
        }),
      ),
      withTiming(pulse.baseline, {
        duration: pulse.fall,
        easing: Easing.in(Easing.quad),
      }),
    ]);

    opacity.value = withRepeat(withSequence(...steps), -1, false);

    return () => cancelAnimation(opacity);
  }, [enabled, opacity, paused, pulses]);

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
  const { progress, cycle, seed, initialX } = useFallingLoop(
    duration,
    phase,
    x,
    width,
  );
  const flickerOpacity = useFlicker(flicker);
  const spins = !!renderParticle;

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    // First fall starts at the given x; later falls re-enter at a random x.
    const baseX =
      cycle.value === 0 ? initialX : hash01(seed, cycle.value) * width;
    const swayOffset = gentleSway
      ? interpolate(t, [0, 1], [-sway, sway])
      : interpolate(
          t,
          [0, 0.25, 0.5, 0.75, 1],
          [-sway, sway, -sway, sway, -sway],
        );

    return {
      opacity: flicker ? flickerOpacity.value : 0.75,
      transform: [
        { translateX: baseX + swayOffset + (wind ? wind.value : 0) },
        {
          translateY: interpolate(
            t,
            [0, 1],
            [-size * 1.5, height + size * 1.5],
          ),
        },
        { rotate: spins ? `${t * 540}deg` : "0deg" },
      ],
    };
  }, [flicker, gentleSway, height, initialX, seed, size, spins, sway, width]);

  return (
    <Animated.View
      style={[
        animationStyles.particle,
        {
          backgroundColor: renderParticle ? undefined : color,
          borderRadius: renderParticle ? 0 : size / 2,
          height: size,
          width: size,
        },
        animatedStyle,
      ]}
    >
      {renderParticle?.(color, size)}
    </Animated.View>
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
