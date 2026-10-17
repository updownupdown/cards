import { useTabOnStage } from "@/components/Home/TabReady";
import { rgba } from "@/styles/styles";
import { useEffect, useRef } from "react";
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  View,
} from "react-native";

const ORBIT_STAR_COLORS = [
  "#ffe9a8",
  "#ffb454",
  "#fff2c2",
  "#ff9d3d",
  "#ffd76a",
];

// A real black hole at this scale would be far too small to draw, so nothing
// is: the centre is implied entirely by the swarm of stars whipping around it.
// The swarm stays inside the clear space at the hub, closer in than the
// innermost game game dot.
const SWARM_RADIUS = 118; // 74, +60%
const ORBIT_STAR_COUNT = 14;
/** How close in any star may swing at its nearest approach. */
const ORBIT_MIN_PERIAPSIS = 12;
const ORBIT_MIN_RADIUS = 26; // 16, +60%
const ORBIT_MAX_RADIUS = SWARM_RADIUS;
// Samples per lap, even in time, for a smooth path. Eccentric orbits whip
// round their nearest point, so they need more of them than a circle would.
const ORBIT_SAMPLES = 72;
// Screen y grows downward, so a decreasing angle turns anti-clockwise - the
// same way the map's spiral arms wind.
const ORBIT_DIRECTION = -1;

// A handful of stars caught in orbit, seeded once for the life of the app
// (there's only ever one black hole, so this doesn't need to be reproducible
// the way the per-game dot seeded data does). Each follows its own Kepler orbit:
// its own size, eccentricity (from near-circular to long and thin), tilt and
// starting point, all with the black hole at one focus, so the cluster reads
// as gravity at work rather than one spinning ring. They all still turn the
// same way as the galaxy's spiral arms.
const ORBIT_STARS = Array.from({ length: ORBIT_STAR_COUNT }, (_, index) => {
  // About a quarter keep to near-circular orbits; the rest stretch out.
  const eccentricity =
    Math.random() < 0.25 ? Math.random() * 0.12 : 0.2 + Math.random() * 0.62;
  // Fit the whole orbit inside the swarm: its far point inside the rim, and
  // its near point clear of the centre.
  const largest = ORBIT_MAX_RADIUS / (1 + eccentricity);
  const smallest = Math.min(
    largest,
    Math.max(ORBIT_MIN_RADIUS, ORBIT_MIN_PERIAPSIS / (1 - eccentricity)),
  );
  const semiMajor = smallest + Math.random() * (largest - smallest);
  return {
    semiMajor,
    semiMinor: semiMajor * Math.sqrt(1 - eccentricity ** 2),
    eccentricity,
    tilt: Math.random() * Math.PI * 2,
    startPhase: Math.random(),
    // Bigger orbits take longer, like real gravity, plus some jitter.
    periodMs:
      4200 + (semiMajor / ORBIT_MAX_RADIUS) * 14000 + Math.random() * 3500,
    // 1.1-2.6, +50%.
    size: 1.65 + Math.random() * 2.25,
    color: ORBIT_STAR_COLORS[index % ORBIT_STAR_COLORS.length],
  };
});

type OrbitStarData = (typeof ORBIT_STARS)[number];

/**
 * Where a star is a share `phase` of the way through its lap, relative to
 * the black hole. Solving Kepler's equation makes it sweep equal areas in
 * equal times: slow at its far point, fast as it swings round the centre.
 */
function orbitPosition(star: OrbitStarData, phase: number) {
  const meanAnomaly = phase * Math.PI * 2;
  let eccentricAnomaly = meanAnomaly;
  for (let step = 0; step < 8; step += 1) {
    eccentricAnomaly -=
      (eccentricAnomaly -
        star.eccentricity * Math.sin(eccentricAnomaly) -
        meanAnomaly) /
      (1 - star.eccentricity * Math.cos(eccentricAnomaly));
  }
  // In the orbit's own frame, with the black hole at the focus.
  const alongX =
    star.semiMajor * (Math.cos(eccentricAnomaly) - star.eccentricity);
  const alongY = ORBIT_DIRECTION * star.semiMinor * Math.sin(eccentricAnomaly);
  const cos = Math.cos(star.tilt);
  const sin = Math.sin(star.tilt);
  return { x: alongX * cos - alongY * sin, y: alongX * sin + alongY * cos };
}

const ORBIT_SAMPLE_POINTS = Array.from(
  { length: ORBIT_SAMPLES + 1 },
  (_, i) => i / ORBIT_SAMPLES,
);

function OrbitStar({
  star,
  animationsEnabled,
  running,
}: {
  star: OrbitStarData;
  animationsEnabled: boolean;
  running: boolean;
}) {
  const progress = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!animationsEnabled || !running) return;

    // Back from a rest, the orbit starts its lap afresh, out of sight: a loop
    // would otherwise go round from where it stopped, and jump back there.
    progress.setValue(0);
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
  }, [animationsEnabled, progress, running, star.periodMs]);

  const path = ORBIT_SAMPLE_POINTS.map((t) =>
    orbitPosition(star, star.startPhase + t),
  );
  const translateX = progress.interpolate({
    inputRange: ORBIT_SAMPLE_POINTS,
    outputRange: path.map((point) => point.x),
  });
  const translateY = progress.interpolate({
    inputRange: ORBIT_SAMPLE_POINTS,
    outputRange: path.map((point) => point.y),
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
    const { x, y } = path[0];
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
 * space: it pans and zooms exactly like every game dot (see CampaignMap), and renders
 * behind them. It is not interactive - the map's tap handling ignores it, and
 * it exposes no press target of its own.
 */
export function CampaignBlackHole({
  size = SWARM_RADIUS * 2,
  animationsEnabled,
}: {
  size?: number;
  animationsEnabled: boolean;
}) {
  // Out of sight, behind another Home tab, the stars rest.
  const running = useTabOnStage();
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
            running={running}
          />
        ))}
      </View>
    </View>
  );
}
