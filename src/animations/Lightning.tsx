import { useEffect, useRef, useState } from "react";
import { Animated as RNAnimated, Platform, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  animationStyles,
  type SceneProps,
  seeded,
  useAnimatedValueLoop,
  useAnimationsPaused,
} from "./BackgroundAnimations";

// A storm: Rain's drops, heavier and more of them, with lightning.

function RainDrop({ index, width, height }: SceneProps & { index: number }) {
  const progress = useRef(new RNAnimated.Value(0)).current;
  const length = 14 + seeded(index, 52) * 22;
  const startY = -length - seeded(index, 50) * Math.min(height * 0.35, 160);
  const endY = height + length;
  const angle = -(6 + seeded(index, 53) * 9);
  const horizontalTravel = (endY - startY) * Math.tan((-angle * Math.PI) / 180);
  const overshoot = width * 0.2;
  const startX =
    -overshoot + seeded(index, 51) * (width + overshoot * 2 - horizontalTravel);
  const duration = 450 + seeded(index, 54) * 400;

  useAnimatedValueLoop(progress, duration);

  return (
    <RNAnimated.View
      style={[
        animationStyles.particle,
        styles.drop,
        {
          height: length,
          opacity: 0.12 + seeded(index, 55) * 0.26,
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

type BoltStroke = { d: string; width: number };

/** How many times a bolt's channels can fork, one inside another. */
const BOLT_DEPTH = 2;

/**
 * One jagged channel of a bolt, as an SVG path, forking now and then into
 * thinner, shorter channels, which may fork once more. Forks are spaced out
 * along the whole channel rather than bunched near its start. The heading is
 * measured from straight down.
 */
function channel(
  strokes: BoltStroke[],
  x: number,
  y: number,
  heading: number,
  reach: number,
  width: number,
  depth: number,
) {
  const segments = Math.max(3, Math.round(reach / 16));
  const step = reach / segments;
  let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
  // Segments to go before this channel may fork again.
  let rest = 2 + Math.floor(Math.random() * 3);
  for (let segment = 0; segment < segments; segment += 1) {
    // Wanders a little overall, and zigzags sharply segment by segment.
    heading += (Math.random() - 0.5) * 0.25;
    // The main channel keeps heading down; forks stay fairly close to it.
    const limit = depth === BOLT_DEPTH ? 0.35 : 0.8;
    heading = Math.max(-limit, Math.min(limit, heading));
    const zig = heading + (Math.random() - 0.5) * 1.1;
    const length = step * (0.6 + Math.random() * 0.8);
    x += Math.sin(zig) * length;
    y += Math.cos(zig) * length;
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    rest -= 1;
    const left = 1 - segment / segments;
    const chance = depth === BOLT_DEPTH ? 0.3 : 0.15;
    if (depth > 0 && rest <= 0 && left > 0.1 && Math.random() < chance) {
      rest = 4 + Math.floor(Math.random() * 4);
      const side = Math.random() < 0.5 ? -1 : 1;
      channel(
        strokes,
        x,
        y,
        heading + side * (0.3 + Math.random() * 0.45),
        reach * (0.12 + Math.random() * 0.16),
        width * 0.6,
        depth - 1,
      );
    }
  }
  strokes.push({ d, width });
}

/** A branching bolt from the top of the sky, thickest along its main channel. */
function bolt(width: number, height: number) {
  const strokes: BoltStroke[] = [];
  channel(
    strokes,
    (0.2 + Math.random() * 0.6) * width,
    0,
    (Math.random() - 0.5) * 0.3,
    (0.65 + Math.random() * 0.25) * height,
    1.8,
    BOLT_DEPTH,
  );
  return strokes;
}

/**
 * Lightning now and then: the sky flickers bright two or three times, and
 * more often than not a bolt branches down from the top. Scheduled from JS, since
 * a strike comes only every several seconds.
 */
function Strikes({ width, height }: SceneProps) {
  const paused = useAnimationsPaused();
  const flash = useRef(new RNAnimated.Value(0)).current;
  const [strokes, setStrokes] = useState<BoltStroke[] | null>(null);

  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const useNativeDriver = Platform.OS !== "web";
    const to = (toValue: number, duration: number) =>
      RNAnimated.timing(flash, { toValue, duration, useNativeDriver });

    const strike = () => {
      if (cancelled) return;
      setStrokes(Math.random() < 0.65 ? bolt(width, height) : null);
      RNAnimated.sequence([
        to(1, 50),
        to(0.15, 90),
        to(0.8, 60),
        to(0.3, 120),
        to(0.6, 50),
        to(0, 500),
      ]).start(() => {
        if (!cancelled) schedule();
      });
    };
    const schedule = () => {
      timer = setTimeout(strike, 12000 + Math.random() * 18000);
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      flash.stopAnimation();
      flash.setValue(0);
    };
  }, [flash, height, paused, width]);

  return (
    <>
      <RNAnimated.View
        style={[
          styles.sky,
          styles.flash,
          {
            opacity: flash.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.28],
            }),
          },
        ]}
      />
      {strokes && (
        <RNAnimated.View style={[styles.sky, { opacity: flash }]}>
          <Svg width={width} height={height}>
            {strokes.map(({ d, width: strokeWidth }) => (
              <Path
                key={d}
                d={d}
                stroke="#cfe0ff"
                strokeWidth={strokeWidth * 3.5}
                strokeOpacity={0.22}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            ))}
            {strokes.map(({ d, width: strokeWidth }) => (
              <Path
                key={d}
                d={d}
                stroke="#ffffff"
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </Svg>
        </RNAnimated.View>
      )}
    </>
  );
}

export function Lightning(props: SceneProps) {
  return (
    <>
      <Strikes {...props} />
      {Array.from({ length: 74 }, (_, index) => (
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
  sky: {
    ...StyleSheet.absoluteFillObject,
  },
  flash: {
    backgroundColor: "#e8f0ff",
  },
});
