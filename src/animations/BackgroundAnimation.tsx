import { useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import Leaf from "@/assets/images/leaf.svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  G,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { GameAnimation, GameAnimations } from "./types";

type SceneProps = {
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
  width: number;
  xDirection?: 1 | -1;
  y: number;
};

type LeafParticleProps = SceneProps & {
  color: string;
  index: number;
  wind: RNAnimated.Value;
  windCurrent: { current: number };
};

type SandParticleProps = SceneProps & {
  color: string;
  draft: RNAnimated.Value;
  index: number;
  wind: RNAnimated.Value;
};

const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const CLOUD_WIDTH = 240;
const CLOUD_HEIGHT = 120;
const CLOUD_BLUR = 4;
const CLOUD_PADDING = CLOUD_BLUR * 6;
const CLOUD_RENDER_WIDTH = CLOUD_WIDTH + CLOUD_PADDING * 2;
const CLOUD_RENDER_HEIGHT = CLOUD_HEIGHT + CLOUD_PADDING * 2;
const CLOUD_COLS = 30;
const CLOUD_ROWS = 15;
const STAR_COLORS = ["#ffffff", "#eef8ff", "#d9efff", "#b9ddff", "#91c7ff"];

const cloudContourCache = new Map<number, string[]>();

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const smoothX = tx * tx * (3 - 2 * tx);
  const smoothY = ty * ty * (3 - 2 * ty);
  const top = lerp(
    seeded(x0 + seed * 31, y0 + seed * 17),
    seeded(x0 + 1 + seed * 31, y0 + seed * 17),
    smoothX,
  );
  const bottom = lerp(
    seeded(x0 + seed * 31, y0 + 1 + seed * 17),
    seeded(x0 + 1 + seed * 31, y0 + 1 + seed * 17),
    smoothX,
  );

  return lerp(top, bottom, smoothY);
}

function fbm(x: number, y: number, seed: number) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let amplitudeTotal = 0;

  for (let octave = 0; octave < 5; octave += 1) {
    total +=
      valueNoise(x * frequency, y * frequency, seed + octave) * amplitude;
    amplitudeTotal += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / amplitudeTotal;
}

function getCloudContours(seed: number) {
  const cached = cloudContourCache.get(seed);
  if (cached) return cached;

  const brightness = seeded(seed, 32);
  const contrast = 0.75 + seeded(seed, 33) * 0.65;
  const thresholdBias = (0.5 - brightness) * 0.09;
  const thresholds = [0.43, 0.53, 0.63, 0.73].map(
    (threshold) => 0.58 + (threshold - 0.58) * contrast + thresholdBias,
  );
  const paths = thresholds.map(() => "");
  const cellWidth = CLOUD_WIDTH / CLOUD_COLS;
  const cellHeight = CLOUD_HEIGHT / CLOUD_ROWS;

  for (let row = 0; row < CLOUD_ROWS; row += 1) {
    for (let col = 0; col < CLOUD_COLS; col += 1) {
      const normalizedX = ((col + 0.5) / CLOUD_COLS) * 2 - 1;
      const normalizedY = ((row + 0.5) / CLOUD_ROWS) * 2 - 1;
      const envelope = Math.max(
        0,
        1 - normalizedX * normalizedX - normalizedY * normalizedY * 1.7,
      );
      const broadNoise = fbm(
        normalizedX * 1.7 + seed * 0.37,
        normalizedY * 1.9,
        seed,
      );
      const detailNoise = fbm(
        normalizedX * 3.4 - seed * 0.19,
        normalizedY * 3.1 + seed * 0.11,
        seed + 23,
      );
      const noise = broadNoise * 0.5 + detailNoise * 0.18;
      const density = noise * envelope + envelope * 0.56;
      const cellPath = `M${col * cellWidth} ${row * cellHeight}h${cellWidth}v${cellHeight}h-${cellWidth}z`;

      thresholds.forEach((threshold, band) => {
        if (density >= threshold) paths[band] += cellPath;
      });
    }
  }

  cloudContourCache.set(seed, paths);
  return paths;
}

function useLoop(duration: number, delay: number) {
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

function useWind(width: number) {
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

function useLeafWind(width: number) {
  const wind = useRef(new RNAnimated.Value(0)).current;
  const windCurrent = useRef(0);

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;
    const listener = wind.addListener(({ value }) => {
      windCurrent.current = value;
    });

    function gust() {
      const magnitude = Math.random();
      const duration = 2500 + magnitude * 6500;
      const displacement = width * (0.08 + magnitude * 0.55);

      animation = RNAnimated.timing(wind, {
        toValue: windCurrent.current - displacement,
        duration,
        easing: RNEasing.inOut(RNEasing.sin),
        useNativeDriver: Platform.OS !== "web",
      });
      animation.start(({ finished }) => {
        if (finished && !cancelled) gust();
      });
    }

    gust();

    return () => {
      cancelled = true;
      animation?.stop();
      wind.removeListener(listener);
    };
  }, [width, wind]);

  return { wind, windCurrent };
}

function useSandWind(width: number) {
  const wind = useRef(new RNAnimated.Value(0)).current;
  const windCurrent = useRef(0);

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;
    const listener = wind.addListener(({ value }) => {
      windCurrent.current = value;
    });

    function gust() {
      const speed = width * (0.425 + Math.random() * 0.175);
      const duration = 18000 + Math.random() * 10000;

      animation = RNAnimated.timing(wind, {
        toValue: windCurrent.current + speed * (duration / 1000),
        duration,
        easing: RNEasing.linear,
        useNativeDriver: Platform.OS !== "web",
      });
      animation.start(({ finished }) => {
        if (finished && !cancelled) gust();
      });
    }

    gust();

    return () => {
      cancelled = true;
      animation?.stop();
      wind.removeListener(listener);
    };
  }, [width, wind]);

  return wind;
}

function useSandDraft(height: number) {
  const draft = useRef(new RNAnimated.Value(0)).current;
  const draftCurrent = useRef(0);

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;
    const listener = draft.addListener(({ value }) => {
      draftCurrent.current = value;
    });

    function draftCycle() {
      const start = draftCurrent.current;
      const gentleDistance = height * (0.05 + Math.random() * 0.15);
      const kickDistance = height * (0.8 + Math.random());

      animation = RNAnimated.sequence([
        RNAnimated.delay(3000 + Math.random() * 4000),
        RNAnimated.timing(draft, {
          toValue: start + gentleDistance,
          duration: 2500 + Math.random() * 3000,
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(draft, {
          toValue: start + gentleDistance + kickDistance,
          duration: 80 + Math.random() * 100,
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished && !cancelled) draftCycle();
      });
    }

    draftCycle();

    return () => {
      cancelled = true;
      animation?.stop();
      draft.removeListener(listener);
    };
  }, [draft, height]);

  return draft;
}

function FallingParticle({
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
  const opacity = flicker ? flickerOpacity : 0.75;

  return (
    <RNAnimated.View
      style={[
        styles.particle,
        {
          backgroundColor: renderParticle ? undefined : color,
          borderRadius: renderParticle ? 0 : size / 2,
          height: size,
          width: size,
        },
        {
          opacity,
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

function LeafParticle({
  color,
  index,
  width,
  height,
  wind,
  windCurrent,
}: LeafParticleProps) {
  const size = 4 + seeded(index, 8) * 10;
  const x = useRef(new RNAnimated.Value(0)).current;
  const y = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(1)).current;
  const windResponse = useRef(new RNAnimated.Value(1)).current;
  const rotationX = useRef(new RNAnimated.Value(0)).current;
  const rotationY = useRef(new RNAnimated.Value(0)).current;
  const rotationZ = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function reset(initial: boolean) {
      const startX = width * 2 - Math.random() * width * 1.75;
      let startY = initial ? seeded(index, 7) * height : -size;
      if (!initial && startX > width) startY = Math.random() * height * 0.5;

      const depth = Math.random();
      const response = 0.5 + depth * 0.5;
      const duration = 8000 + Math.random() * 7000;
      const axis = Math.random();
      const rotationSpeed =
        axis < 0.25 ? 0.5 + Math.random() : 2 + Math.random() * 4;
      const staticX = axis < 0.5 ? Math.random() * 360 - 180 : 0;

      x.setValue(startX - windCurrent.current * response);
      y.setValue(startY);
      scale.setValue(0.7 + depth * 0.55);
      windResponse.setValue(response);
      rotationX.setValue(staticX);
      rotationY.setValue(0);
      rotationZ.setValue(0);

      const turns = 360 * rotationSpeed;
      const rotationTargets = {
        x: axis > 0.5 ? turns : staticX,
        y: axis > 0.25 && axis <= 0.5 ? turns : 0,
        z: axis <= 0.25 ? turns : 0,
      };

      animation = RNAnimated.parallel([
        RNAnimated.timing(x, {
          toValue: -size - windCurrent.current * response,
          duration,
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(y, {
          toValue: height + size,
          duration,
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(rotationX, {
          toValue: rotationTargets.x,
          duration,
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(rotationY, {
          toValue: rotationTargets.y,
          duration,
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(rotationZ, {
          toValue: rotationTargets.z,
          duration,
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished && !cancelled) reset(false);
      });
    }

    reset(true);

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [
    height,
    index,
    rotationX,
    rotationY,
    rotationZ,
    scale,
    size,
    width,
    windCurrent,
    windResponse,
    x,
    y,
  ]);

  const rotationInput = [-3600, 3600];

  return (
    <RNAnimated.View
      style={[
        styles.leaf,
        {
          height: size,
          width: size,
          transform: [
            { perspective: 400 },
            {
              translateX: RNAnimated.add(
                x,
                RNAnimated.multiply(wind, windResponse),
              ),
            },
            { translateY: y },
            { scale },
            {
              rotateX: rotationX.interpolate({
                inputRange: rotationInput,
                outputRange: ["-3600deg", "3600deg"],
              }),
            },
            {
              rotateY: rotationY.interpolate({
                inputRange: rotationInput,
                outputRange: ["-3600deg", "3600deg"],
              }),
            },
            {
              rotateZ: rotationZ.interpolate({
                inputRange: rotationInput,
                outputRange: ["-3600deg", "3600deg"],
              }),
            },
          ],
        },
      ]}
    >
      <Leaf color={color} width={size} height={size} />
    </RNAnimated.View>
  );
}

function SandParticle({
  color,
  draft,
  index,
  width,
  height,
  wind,
}: SandParticleProps) {
  const travelWidth = width + 20;
  const travelHeight = height + 6;
  const size = 1 + Math.floor(seeded(index, 10) * 2);
  const startX = seeded(index, 11) * travelWidth;
  const startY = seeded(index, 13) * travelHeight;
  const speedVariation = 0.82 + seeded(index, 12) * 0.36;
  const draftVariation = 0.75 + seeded(index, 16) * 0.5;
  const windTravel = RNAnimated.multiply(wind, speedVariation);
  const translateX = RNAnimated.subtract(
    RNAnimated.modulo(RNAnimated.add(startX, windTravel), travelWidth),
    10,
  );
  const translateY = RNAnimated.subtract(
    RNAnimated.modulo(
      RNAnimated.add(startY, RNAnimated.multiply(draft, draftVariation)),
      travelHeight,
    ),
    3,
  );

  return (
    <RNAnimated.View
      style={[
        styles.sandGrain,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: 0.35 + seeded(index, 14) * 0.55,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
}

function Drifter({
  children,
  delay,
  duration,
  width: sceneWidth,
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
            ? -travelPadding + progress.value * (sceneWidth + travelPadding * 2)
            : sceneWidth +
              travelPadding -
              progress.value * (sceneWidth + travelPadding * 2),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.drifter, { top: y * height }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

function FallingSnow(props: SceneProps) {
  const wind = useWind(props.width);

  return (
    <>
      {Array.from({ length: 32 }, (_, index) => (
        <FallingParticle
          key={index}
          {...props}
          color={`rgba(255, 255, 255, ${seeded(index, 6) * 0.5 + 0.5})`}
          duration={7000 + seeded(index, 1) * 7000}
          gentleSway
          phase={seeded(index, 2)}
          size={1 + seeded(index, 3) * 3}
          sway={2 + seeded(index, 4) * 4}
          wind={wind}
          x={seeded(index, 5)}
        />
      ))}
    </>
  );
}

function FallingLeaves(props: SceneProps) {
  const colors = ["#9b3f24", "#c35b28", "#d8892f", "#b79a36", "#7f4828"];
  const { wind, windCurrent } = useLeafWind(props.width);

  return (
    <>
      {Array.from({ length: 18 }, (_, index) => (
        <LeafParticle
          key={index}
          {...props}
          color={colors[index % colors.length]}
          index={index}
          wind={wind}
          windCurrent={windCurrent}
        />
      ))}
    </>
  );
}

function SandStorm(props: SceneProps) {
  const wind = useSandWind(props.width);
  const draft = useSandDraft(props.height);

  return (
    <>
      <View style={styles.sandHaze} />
      {Array.from({ length: 60 }, (_, index) => (
        <SandParticle
          key={index}
          {...props}
          color="#d9a85f"
          draft={draft}
          index={index}
          wind={wind}
        />
      ))}
    </>
  );
}

function FallingEmbers(props: SceneProps) {
  const colors = ["#ffb347", "#ff7a2f", "#ffd27a"];
  const wind = useWind(props.width);

  return (
    <>
      {Array.from({ length: 28 }, (_, index) => (
        <FallingParticle
          key={index}
          {...props}
          flicker
          color={colors[index % colors.length]}
          duration={10000 + seeded(index, 15) * 8000}
          gentleSway
          phase={seeded(index, 16)}
          size={1 + seeded(index, 17) * 2.5}
          sway={1 + seeded(index, 18) * 3}
          wind={wind}
          x={seeded(index, 19)}
        />
      ))}
    </>
  );
}

function Bird() {
  return (
    <View style={styles.bird}>
      <View style={[styles.wing, styles.leftWing]} />
      <View style={[styles.wing, styles.rightWing]} />
    </View>
  );
}

function FlappingBird({ index, scale }: { index: number; scale: number }) {
  const wingScale = useRef(new RNAnimated.Value(1)).current;
  const flapLift = useRef(new RNAnimated.Value(0)).current;
  const altitude = useRef(
    new RNAnimated.Value((seeded(index, 40) - 0.5) * 24),
  ).current;

  useEffect(() => {
    let flapAnimation: RNAnimated.CompositeAnimation | undefined;
    let altitudeAnimation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function flap() {
      const flapCount = 1 + Math.floor(Math.random() * 3);
      const flaps: RNAnimated.CompositeAnimation[] = [];

      for (let count = 0; count < flapCount; count += 1) {
        const compression = 0.6 + Math.random() * 0.22;
        const lift = -(2 + Math.random() * 2.5);

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
        RNAnimated.delay(2500 + Math.random() * 7000),
        ...flaps,
      ]);
      flapAnimation.start(({ finished }) => {
        if (finished && !cancelled) flap();
      });
    }

    function driftAltitude() {
      altitudeAnimation = RNAnimated.timing(altitude, {
        toValue: (Math.random() - 0.5) * 24,
        duration: 4500 + Math.random() * 5000,
        easing: RNEasing.inOut(RNEasing.sin),
        useNativeDriver: Platform.OS !== "web",
      });
      altitudeAnimation.start(({ finished }) => {
        if (finished && !cancelled) driftAltitude();
      });
    }

    flap();
    driftAltitude();

    return () => {
      cancelled = true;
      flapAnimation?.stop();
      altitudeAnimation?.stop();
    };
  }, [altitude, flapLift, wingScale]);

  return (
    <RNAnimated.View
      style={{
        transform: [
          { translateY: RNAnimated.add(altitude, flapLift) },
          { scale },
          { scaleX: wingScale },
        ],
      }}
    >
      <Bird />
    </RNAnimated.View>
  );
}

function FlyingBirds(props: SceneProps) {
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

function Cloud({ scale, seed }: { scale: number; seed: number }) {
  const contours = getCloudContours(seed);
  const filterId = `cloud-noise-${seed}`;
  const brightness = seeded(seed, 32);
  const contrast = seeded(seed, 33);
  const cloudOpacity = 0.42 + brightness * 0.5;
  const bands = [
    {
      fill: contrast > 0.55 ? "#aeb9bf" : "#c6ced2",
      opacity: 0.08 + brightness * 0.12,
    },
    {
      fill: contrast > 0.55 ? "#ccd4d8" : "#d8dee1",
      opacity: 0.13 + brightness * 0.18,
    },
    {
      fill: contrast > 0.55 ? "#eef2f3" : "#e8ecee",
      opacity: 0.2 + brightness * 0.28,
    },
    {
      fill: brightness > 0.45 ? "#ffffff" : "#edf1f2",
      opacity: 0.28 + brightness * 0.42,
    },
  ];

  return (
    <View
      style={[styles.cloud, { opacity: cloudOpacity, transform: [{ scale }] }]}
    >
      <Svg
        width={CLOUD_RENDER_WIDTH}
        height={CLOUD_RENDER_HEIGHT}
        viewBox={`${-CLOUD_PADDING} ${-CLOUD_PADDING} ${CLOUD_RENDER_WIDTH} ${CLOUD_RENDER_HEIGHT}`}
      >
        <Defs>
          <Filter id={filterId} x="-30%" y="-60%" width="160%" height="220%">
            <FeGaussianBlur stdDeviation={CLOUD_BLUR} />
          </Filter>
        </Defs>
        <G filter={`url(#${filterId})`}>
          {contours.map((path, index) => (
            <Path
              key={index}
              d={path}
              fill={bands[index].fill}
              opacity={bands[index].opacity}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

function PassingCloud({
  index,
  width,
  height,
}: SceneProps & { index: number }) {
  const progress = useSharedValue(0);
  const scale = 0.65 + seeded(index, 26) * 0.75;
  const duration = 64000 + seeded(index, 23) * 60000;
  const startDelay = index * 15000 + seeded(index, 24) * 3000;
  const travelPadding = CLOUD_RENDER_WIDTH * scale + 30;
  const startY = (-0.265 + seeded(index, 25) * 0.57) * height;
  const verticalDistance =
    (seeded(index, 27) > 0.5 ? 1 : -1) *
    (height * (0.0128 + seeded(index, 28) * 0.04));
  const changesOpacity = seeded(index, 29) > 0.35;
  const opacityChange = 0.075 + seeded(index, 30) * 0.375;
  const gainsOpacity = seeded(index, 31) > 0.5;
  const startOpacity = changesOpacity && gainsOpacity ? 1 - opacityChange : 1;
  const endOpacity = changesOpacity && !gainsOpacity ? 1 - opacityChange : 1;

  useEffect(() => {
    progress.value = withDelay(
      startDelay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );

    return () => cancelAnimation(progress);
  }, [duration, progress, startDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: startOpacity + (endOpacity - startOpacity) * progress.value,
    transform: [
      {
        translateX:
          -travelPadding + progress.value * (width + travelPadding * 2),
      },
      { translateY: startY + progress.value * verticalDistance },
    ],
  }));

  return (
    <Animated.View style={[styles.cloudDrifter, animatedStyle]}>
      <Cloud scale={scale} seed={index + 1} />
    </Animated.View>
  );
}

function PassingClouds(props: SceneProps) {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <PassingCloud key={index} {...props} index={index} />
      ))}
    </>
  );
}

function ShootingStar({ width, height }: SceneProps) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const [appearance, setAppearance] = useState({
    angle: 0,
    color: "#ffffff",
    trailLength: 40,
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animation: RNAnimated.CompositeAnimation | undefined;
    let cancelled = false;

    function schedule() {
      timer = setTimeout(
        () => {
          const startX = Math.random() * width;
          const startY = Math.random() * height;
          let endX = Math.random() * width;
          let endY = Math.random() * height;
          const minimumDistance = Math.min(width, height) * 0.3;

          while (Math.hypot(endX - startX, endY - startY) < minimumDistance) {
            endX = Math.random() * width;
            endY = Math.random() * height;
          }

          const angle = Math.atan2(endY - startY, endX - startX);
          const fadeInDuration = 20 + Math.random() * 80;
          const holdDuration = 200 + Math.random() * 600;
          const fadeOutDuration = 100 + Math.random() * 300;
          const travelDuration =
            fadeInDuration + holdDuration + fadeOutDuration;

          setAppearance({
            angle,
            color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
            trailLength: 28 + Math.random() * 44,
          });
          translateX.setValue(startX);
          translateY.setValue(startY);
          opacity.setValue(0);

          animation = RNAnimated.parallel([
            RNAnimated.timing(translateX, {
              toValue: endX,
              duration: travelDuration,
              easing: RNEasing.linear,
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.timing(translateY, {
              toValue: endY,
              duration: travelDuration,
              easing: RNEasing.linear,
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.sequence([
              RNAnimated.timing(opacity, {
                toValue: 1,
                duration: fadeInDuration,
                easing: RNEasing.out(RNEasing.quad),
                useNativeDriver: Platform.OS !== "web",
              }),
              RNAnimated.delay(holdDuration),
              RNAnimated.timing(opacity, {
                toValue: 0,
                duration: fadeOutDuration,
                easing: RNEasing.in(RNEasing.quad),
                useNativeDriver: Platform.OS !== "web",
              }),
            ]),
          ]);
          animation.start(({ finished }) => {
            if (finished && !cancelled) schedule();
          });
        },
        6000 + Math.random() * 14000,
      );
    }

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [height, opacity, translateX, translateY, width]);

  return (
    <RNAnimated.View
      style={[
        styles.shootingStar,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate: `${appearance.angle}rad` },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.shootingStarTrail,
          {
            backgroundColor: appearance.color,
            width: appearance.trailLength,
            left: -appearance.trailLength,
          },
        ]}
      />
      <View
        style={[styles.shootingStarHead, { backgroundColor: appearance.color }]}
      />
    </RNAnimated.View>
  );
}

function ShimmeringStars({ width, height }: SceneProps) {
  const stars = useRef(
    Array.from({ length: 80 }, (_, index) => {
      const baseOpacity = 0.1 + seeded(index, 35) * 0.525;

      return {
        baseOpacity,
        opacity: new RNAnimated.Value(baseOpacity),
      };
    }),
  ).current;
  useEffect(() => {
    let cancelled = false;
    const activeStars = new Set<number>();
    const animations = new Set<RNAnimated.CompositeAnimation>();

    function startShimmerLane() {
      let starIndex = Math.floor(Math.random() * stars.length);
      while (activeStars.has(starIndex)) {
        starIndex = Math.floor(Math.random() * stars.length);
      }

      const star = stars[starIndex];
      const shimmerDuration = (300 + Math.random() * 700) / 1.5;
      const animation = RNAnimated.sequence([
        RNAnimated.timing(star.opacity, {
          toValue: 1,
          duration: shimmerDuration * 0.45,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(star.opacity, {
          toValue: star.baseOpacity,
          duration: shimmerDuration * 0.55,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]);

      activeStars.add(starIndex);
      animations.add(animation);
      animation.start(({ finished }) => {
        activeStars.delete(starIndex);
        animations.delete(animation);
        if (finished && !cancelled) startShimmerLane();
      });
    }

    Array.from({ length: 3 }, startShimmerLane);

    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.stop());
    };
  }, [stars]);

  return (
    <>
      {stars.map((star, index) => {
        const size = 1 + Math.floor(seeded(index, 36) * 3);

        return (
          <RNAnimated.View
            key={index}
            style={[
              styles.star,
              {
                backgroundColor:
                  STAR_COLORS[
                    Math.floor(seeded(index, 37) * STAR_COLORS.length)
                  ],
                width: size,
                height: size,
                borderRadius: size / 2,
                left: seeded(index, 38) * width,
                top: seeded(index, 39) * height,
                opacity: star.opacity,
              },
            ]}
          />
        );
      })}
      <ShootingStar width={width} height={height} />
    </>
  );
}

type Props = SceneProps & {
  animation?: GameAnimation;
};

export function BackgroundAnimation({ animation, width, height }: Props) {
  if (!animation || width <= 0 || height <= 0) return null;

  const sceneProps = { width, height };
  let scene: React.ReactNode;

  switch (animation) {
    case GameAnimations.FallingSnow:
      scene = <FallingSnow {...sceneProps} />;
      break;
    case GameAnimations.FallingLeaves:
      scene = <FallingLeaves {...sceneProps} />;
      break;
    case GameAnimations.SandStorm:
      scene = <SandStorm {...sceneProps} />;
      break;
    case GameAnimations.FallingEmbers:
      scene = <FallingEmbers {...sceneProps} />;
      break;
    case GameAnimations.FlyingBirds:
      scene = <FlyingBirds {...sceneProps} />;
      break;
    case GameAnimations.PassingClouds:
      scene = <PassingClouds {...sceneProps} />;
      break;
    case GameAnimations.ShimmeringStars:
      scene = <ShimmeringStars {...sceneProps} />;
      break;
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.nonInteractive]}>
      {scene}
    </View>
  );
}

const styles = StyleSheet.create({
  nonInteractive: {
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    top: 0,
  },
  leaf: {
    position: "absolute",
    top: 0,
    left: 0,
    backfaceVisibility: "visible",
  },
  drifter: {
    position: "absolute",
    left: 0,
  },
  sandHaze: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(198, 146, 77, 0.12)",
  },
  sandGrain: {
    position: "absolute",
    left: 0,
    width: 1,
    height: 1,
  },
  bird: {
    width: 24,
    height: 10,
    flexDirection: "row",
  },
  wing: {
    width: 12,
    height: 7,
    borderTopColor: "rgba(20, 24, 28, 0.55)",
    borderTopWidth: 2,
    borderRadius: 8,
  },
  leftWing: {
    transform: [{ rotate: "18deg" }],
  },
  rightWing: {
    transform: [{ rotate: "-18deg" }],
  },
  cloud: {
    width: CLOUD_RENDER_WIDTH,
    height: CLOUD_RENDER_HEIGHT,
  },
  cloudDrifter: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  star: {
    position: "absolute",
  },
  shootingStar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 3,
    height: 3,
  },
  shootingStarTrail: {
    position: "absolute",
    top: 1,
    height: 1,
    opacity: 0.45,
  },
  shootingStarHead: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
