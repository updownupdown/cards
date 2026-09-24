import { StyleSheet } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { type SceneProps, seeded, useLoop } from "./BackgroundAnimations";

/** A flock's birds and how it is laid out, picked once at mount. */
type FlockPlan = {
  birds: number;
  /** Whether they string out in a V, or straggle along in a loose line. */
  formation: "v" | "line";
  /** Nearer flocks are a little bigger and darker. */
  scale: number;
  /** Height in the sky, as a share of the scene height. */
  altitude: number;
  direction: 1 | -1;
  crossingMs: number;
  /** Time out of sight after crossing, before the flock comes round again. */
  awayMs: number;
  delay: number;
};

const FLOCKS: FlockPlan[] = [
  {
    birds: 7,
    formation: "v",
    scale: 1,
    altitude: 0.14,
    direction: 1,
    crossingMs: 48000,
    awayMs: 22000,
    delay: 1500,
  },
  {
    birds: 5,
    formation: "v",
    scale: 0.8,
    altitude: 0.27,
    direction: 1,
    crossingMs: 58000,
    awayMs: 34000,
    delay: 19000,
  },
  {
    birds: 2,
    formation: "line",
    scale: 0.9,
    altitude: 0.07,
    direction: 1,
    crossingMs: 42000,
    awayMs: 51000,
    delay: 40000,
  },
];

// Only the first two flocks fly in a V, so there are never more than two Vs in
// the sky at once. Every flock flies left to right.

/** Wingspan of a bird at scale 1, in pixels: far off, a flick of ink. */
const WINGSPAN = 11;
/** Wing angle above level while gliding, in degrees: a shallow V. */
const GLIDE_ANGLE = 10;
/** The wings sweep between these angles when flapping: up into a V, then
 *  down past level. They turn at the body and never shrink, so a bird never
 *  thins away to nothing mid-stroke. */
const STROKE_TOP = 38;
const STROKE_BOTTOM = -24;
/** Room outside the screen where a flock starts and ends its crossing. */
const OFFSCREEN = 90;

/** Where each bird flies relative to the leader, in wingspans. */
function formationOffsets(plan: FlockPlan, flock: number) {
  return Array.from({ length: plan.birds }, (_, bird) => {
    const jitterX = (seeded(flock * 10 + bird, 31) - 0.5) * 0.8;
    const jitterY = (seeded(flock * 10 + bird, 32) - 0.5) * 0.6;
    if (plan.formation === "v") {
      // The leader at the point, the rest alternating down each arm.
      const rank = Math.ceil(bird / 2);
      const side = bird % 2 === 0 ? 1 : -1;
      return { x: -rank * 1.6 + jitterX, y: side * rank * 1.1 + jitterY };
    }
    return { x: -bird * 2.2 + jitterX * 2, y: jitterY * 3 };
  });
}

function Bird({
  flock,
  bird,
  plan,
  offset,
  crossing,
}: {
  flock: number;
  bird: number;
  plan: FlockPlan;
  offset: { x: number; y: number };
  crossing: SharedValue<number>;
}) {
  const key = flock * 10 + bird;
  const phase = seeded(key, 33) * Math.PI * 2;
  const wobble = 1.5 + seeded(key, 34) * 2.5;
  const flap = useLoop(520 + seeded(key, 35) * 260, seeded(key, 36) * 500);
  const span = WINGSPAN * plan.scale * (0.85 + seeded(key, 37) * 0.3);

  // Stretches of flapping between long glides, each bird on its own rhythm,
  // as a real flock never beats in time. Returns how much the bird is
  // flapping (0 to 1) and where in its stroke it is (-1 to 1).
  const wingbeat = (crossingValue: number, flapValue: number) => {
    "worklet";
    const t = crossingValue * (plan.crossingMs + plan.awayMs);
    const rhythm = Math.sin(t / 2600 + phase);
    return {
      t,
      flapping: Math.min(1, Math.max(0, (rhythm + 0.2) / 0.5)),
      stroke: Math.sin(flapValue * Math.PI * 2),
    };
  };

  const wingAngle = (crossingValue: number, flapValue: number) => {
    "worklet";
    const { flapping, stroke } = wingbeat(crossingValue, flapValue);
    const flapped =
      STROKE_BOTTOM + ((stroke + 1) / 2) * (STROKE_TOP - STROKE_BOTTOM);
    return GLIDE_ANGLE * (1 - flapping) + flapped * flapping;
  };

  const style = useAnimatedStyle(() => {
    const { t, flapping, stroke } = wingbeat(crossing.value, flap.value);
    return {
      transform: [
        { translateX: Math.sin(t / 3900 + phase) * wobble },
        {
          translateY:
            Math.sin(t / 3100 + phase * 1.3) * wobble -
            // Each downstroke lifts the bird a touch.
            flapping * stroke * 0.7,
        },
      ],
    };
  });
  const leftWingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wingAngle(crossing.value, flap.value)}deg` }],
  }));
  const rightWingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-wingAngle(crossing.value, flap.value)}deg` }],
  }));

  const wing = { width: span / 2 + 0.6, height: Math.max(1, span * 0.11) };
  return (
    <Animated.View
      style={[
        styles.bird,
        {
          left: offset.x * WINGSPAN * plan.scale * plan.direction - span / 2,
          top: offset.y * WINGSPAN * plan.scale - span * 0.15,
          width: span,
          height: span * 0.3,
        },
        style,
      ]}
    >
      <Animated.View
        style={[styles.wing, styles.leftWing, wing, { left: 0 }, leftWingStyle]}
      />
      <Animated.View
        style={[
          styles.wing,
          styles.rightWing,
          wing,
          { left: span / 2 - 0.6 },
          rightWingStyle,
        ]}
      />
    </Animated.View>
  );
}

function Flock({
  flock,
  plan,
  width,
  height,
}: SceneProps & { flock: number; plan: FlockPlan }) {
  const cycleMs = plan.crossingMs + plan.awayMs;
  const crossingShare = plan.crossingMs / cycleMs;
  const crossing = useLoop(cycleMs, plan.delay);
  const offsets = formationOffsets(plan, flock);
  const baseY = plan.altitude * height;
  const drift = seeded(flock, 38) * Math.PI * 2;
  const climb = (seeded(flock, 39) - 0.5) * 0.12 * height;

  const style = useAnimatedStyle(() => {
    const along = crossing.value / crossingShare;
    if (along > 1) {
      return { opacity: 0, transform: [{ translateX: -1000 }] };
    }
    const travel = width + OFFSCREEN * 2;
    const x =
      plan.direction === 1
        ? -OFFSCREEN + along * travel
        : width + OFFSCREEN - along * travel;
    // A long, lazy rise and fall, with a gentle climb or descent overall.
    const y =
      baseY +
      Math.sin(along * Math.PI * 1.6 + drift) * 14 +
      (along - 0.5) * climb;
    return { opacity: 1, transform: [{ translateX: x }, { translateY: y }] };
  });

  return (
    <Animated.View
      style={[styles.flock, { opacity: 0.45 + plan.scale * 0.25 }]}
    >
      <Animated.View style={[styles.flock, style]}>
        {offsets.map((offset, bird) => (
          <Bird
            key={bird}
            flock={flock}
            bird={bird}
            plan={plan}
            offset={offset}
            crossing={crossing}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Birds far off across the sky: a few small flocks, one in a loose V, cross
 * slowly now and then. Each bird is a flick of two strokes that beats its
 * wings in short bursts between long glides, bobbing a little in its place in
 * the formation. One UI-thread style a flock and one a bird.
 */
export function Birds(props: SceneProps) {
  return (
    <>
      {FLOCKS.map((plan, flock) => (
        <Flock key={flock} flock={flock} plan={plan} {...props} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  flock: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  bird: {
    position: "absolute",
  },
  wing: {
    position: "absolute",
    bottom: 0,
    borderRadius: 1,
    backgroundColor: "#1d1b1a",
  },
  leftWing: { transformOrigin: "100% 50%" },
  rightWing: { transformOrigin: "0% 50%" },
});
