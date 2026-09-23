import { rgba } from "@/styles/styles";
import { useEffect, useRef } from "react";
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  View,
} from "react-native";

const ORBIT_STAR_COLORS = ["#ffe9a8", "#ffb454", "#fff2c2", "#ff9d3d", "#ffd76a"];

// A real black hole at this scale would be far too small to draw, so nothing
// is: the centre is implied entirely by the swarm of stars whipping around it.
// The swarm stays inside the clear space at the hub, closer in than the
// innermost game node.
const SWARM_RADIUS = 118; // 74, +60%
const ORBIT_STAR_COUNT = 14;
const ORBIT_MIN_RADIUS = 26; // 16, +60%
const ORBIT_MAX_RADIUS = SWARM_RADIUS;
const ORBIT_SAMPLES = 28; // interpolation points per lap, for a smooth path
// Screen y grows downward, so a decreasing angle turns anti-clockwise - the
// same way the map's spiral arms wind.
const ORBIT_DIRECTION = -1;


// A handful of stars caught in orbit, seeded once for the life of the app
// (there's only ever one black hole, so this doesn't need to be reproducible
// the way the per-node seeded data does). Each gets its own radius, speed and
// roundness so the cluster reads as gravity at work rather than one uniform
// spinning ring, but they all turn the same way as the galaxy's spiral arms.
const ORBIT_STARS = Array.from({ length: ORBIT_STAR_COUNT }, (_, index) => {
  const radiusX =
    ORBIT_MIN_RADIUS + Math.random() * (ORBIT_MAX_RADIUS - ORBIT_MIN_RADIUS);
  const isElliptical = Math.random() < 0.8;
  const radiusY = isElliptical ? radiusX * (0.25 + Math.random() * 0.5) : radiusX;
  return {
    radiusX,
    radiusY,
    startAngle: Math.random() * Math.PI * 2,
    // Closer-in stars orbit faster, like real gravity, plus some jitter.
    periodMs: 4200 + (radiusX / ORBIT_MAX_RADIUS) * 14000 + Math.random() * 3500,
    // 1.1-2.6, +50%.
    size: 1.65 + Math.random() * 2.25,
    color: ORBIT_STAR_COLORS[index % ORBIT_STAR_COLORS.length],
  };
});

const ORBIT_SAMPLE_POINTS = Array.from(
  { length: ORBIT_SAMPLES + 1 },
  (_, i) => i / ORBIT_SAMPLES,
);

function OrbitStar({
  star,
  animationsEnabled,
}: {
  star: (typeof ORBIT_STARS)[number];
  animationsEnabled: boolean;
}) {
  const progress = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!animationsEnabled) return;

    let animation: RNAnimated.CompositeAnimation | undefined;
    const start = () => {
      animation?.stop();
      animation = RNAnimated.loop(
        RNAnimated.timing(progress, {
          toValue: 1,
          duration: star.periodMs,
          easing: RNEasing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
      );
      animation.start();
    };

    start();

    if (typeof document === "undefined") {
      return () => animation?.stop();
    }

    // On web these orbits are driven by requestAnimationFrame, which the
    // browser suspends while the tab is hidden. The loop can come back stalled
    // rather than resuming, leaving the stars frozen mid-orbit, so it is
    // restarted whenever the page becomes visible again.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      animation?.stop();
    };
  }, [animationsEnabled, progress, star.periodMs]);

  const translateX = progress.interpolate({
    inputRange: ORBIT_SAMPLE_POINTS,
    outputRange: ORBIT_SAMPLE_POINTS.map(
      (t) =>
        Math.cos(star.startAngle + ORBIT_DIRECTION * t * Math.PI * 2) *
        star.radiusX,
    ),
  });
  const translateY = progress.interpolate({
    inputRange: ORBIT_SAMPLE_POINTS,
    outputRange: ORBIT_SAMPLE_POINTS.map(
      (t) =>
        Math.sin(star.startAngle + ORBIT_DIRECTION * t * Math.PI * 2) *
        star.radiusY,
    ),
  });

  const dot = (
    <View
      style={{
        width: star.size,
        height: star.size,
        borderRadius: star.size,
        backgroundColor: star.color,
        boxShadow: `0 0 ${star.size * 2}px ${rgba(star.color, 0.65)}`,
      }}
    />
  );

  if (!animationsEnabled) {
    const x = Math.cos(star.startAngle) * star.radiusX;
    const y = Math.sin(star.startAngle) * star.radiusY;
    return (
      <View
        style={{
          position: "absolute",
          left: x - star.size / 2,
          top: y - star.size / 2,
        }}
      >
        {dot}
      </View>
    );
  }

  return (
    <RNAnimated.View
      style={{
        position: "absolute",
        left: -star.size / 2,
        top: -star.size / 2,
        transform: [{ translateX }, { translateY }],
      }}
    >
      {dot}
    </RNAnimated.View>
  );
}

/**
 * A purely decorative point of interest at the centre of the map, in world
 * space: it pans and zooms exactly like every node (see NodesMap), and renders
 * behind them. It is not interactive - the map's tap handling ignores it, and
 * it exposes no press target of its own.
 */
export function NodesBlackHole({
  size = SWARM_RADIUS * 2,
  animationsEnabled,
}: {
  size?: number;
  animationsEnabled: boolean;
}) {

  return (
    <View
      style={{
        position: "absolute",
        left: -size / 2,
        top: -size / 2,
        width: size,
        height: size,
      }}
    >

      <View
        style={{
          position: "absolute",
          left: size / 2,
          top: size / 2,
        }}
      >
        {ORBIT_STARS.map((star, index) => (
          <OrbitStar
            key={index}
            star={star}
            animationsEnabled={animationsEnabled}
          />
        ))}
      </View>

    </View>
  );
}
