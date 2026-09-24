import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet } from "react-native";
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type SingularityGraphicProps = {
  size: number;
  /** Cards swallowed so far, the opening Ace included. Each new one makes the
   *  hole flare, and it grows a little as it fills. */
  absorbed?: number;
};

const useNativeDriver = Platform.OS !== "web";

// The artwork is drawn in a 400 x 260 box; the disk is seen almost edge-on.
const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 260;
const CENTRE = { x: 200, y: 130 };
/** How flat the disk looks: its apparent height over its width. */
const DISK_TILT = 0.18;
/** Where a spark vanishes: just inside the shadow's edge. */
const HORIZON_RADIUS = 70;
/** The shadow's radii; a spark on the far side is hidden while inside it. */
const SHADOW = { rx: 73, ry: 69 };
/** How big the hole is drawn before its first card, and once it has
 *  swallowed every card. */
const START_SIZE = 0.5;
const FULL_SIZE = 1.14;
/** Roughly how long a card takes to fly from its pile into the hole. */
const CARD_FLIGHT_MS = 320;

const SPARK_SAMPLES = Array.from({ length: 61 }, (_, index) => index / 60);
const SPARK_COLORS = ["#fff3c2", "#ffc46b", "#ff8a4c"];

/**
 * Matter spiralling in: each spark is drawn round the disk, slowly at first
 * and then faster and faster, stretching out as it nears the horizon, where it
 * winks out. Picked once for the life of the app, like the other scenery.
 */
const SPARKS = Array.from({ length: 7 }, (_, index) => ({
  startAngle: (index / 7) * Math.PI * 2 + Math.random() * 0.6,
  turns: 1.1 + Math.random() * 0.7,
  startRadius: 150 + Math.random() * 45,
  duration: 7800 + Math.random() * 7200,
  delay: Math.random() * 12000,
  size: 1.6 + Math.random() * 1.4,
  color: SPARK_COLORS[index % SPARK_COLORS.length],
}));

function Spark({
  spark,
  toPixels,
}: {
  spark: (typeof SPARKS)[number];
  toPixels: (x: number, y: number) => { x: number; y: number };
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let stopped = false;
    let animation: Animated.CompositeAnimation | undefined;
    const fall = () => {
      if (stopped) return;
      progress.setValue(0);
      animation = Animated.timing(progress, {
        toValue: 1,
        duration: spark.duration,
        easing: Easing.linear,
        useNativeDriver,
      });
      animation.start(({ finished }) => {
        if (finished) fall();
      });
    };
    const timer = setTimeout(fall, spark.delay);
    return () => {
      stopped = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [progress, spark]);

  // Radius shrinks slowly and then all at once; the angle speeds up with it,
  // the way orbits tighten as they fall inwards. Sparks are drawn over the
  // hole, so one on the far side of the disk is hidden while the hole is in
  // front of it; on the near side it crosses in front.
  const path = SPARK_SAMPLES.map((t) => {
    const radius =
      spark.startRadius - (spark.startRadius - HORIZON_RADIUS) * t ** 1.8;
    const angle = spark.startAngle + spark.turns * Math.PI * 2 * t ** 1.25;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius * DISK_TILT;
    const behindHole =
      Math.sin(angle) < 0 && (dx / SHADOW.rx) ** 2 + (dy / SHADOW.ry) ** 2 < 1;
    const fade = t < 0.12 ? t / 0.12 : t > 0.88 ? (1 - t) / 0.12 : 1;
    return {
      ...toPixels(CENTRE.x + dx, CENTRE.y + dy),
      opacity: behindHole ? 0 : fade,
    };
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: -spark.size / 2,
        top: -spark.size / 2,
        width: spark.size,
        height: spark.size,
        borderRadius: spark.size,
        backgroundColor: spark.color,
        boxShadow: `0 0 ${spark.size * 3}px ${spark.color}`,
        opacity: progress.interpolate({
          inputRange: SPARK_SAMPLES,
          outputRange: path.map((point) => point.opacity),
        }),
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: SPARK_SAMPLES,
              outputRange: path.map((point) => point.x),
            }),
          },
          {
            translateY: progress.interpolate({
              inputRange: SPARK_SAMPLES,
              outputRange: path.map((point) => point.y),
            }),
          },
          // Stretched along its path as the pull gets stronger.
          {
            scaleX: progress.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [1, 1.6, 3],
            }),
          },
        ],
      }}
    />
  );
}

export function SingularityGraphic({
  size,
  absorbed = 1,
}: SingularityGraphicProps) {
  const { settings } = useGlobalSettings();
  const luminosity = useRef(new Animated.Value(0)).current;
  const intensity = useRef(new Animated.Value(0)).current;
  const motion = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(luminosity, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(luminosity, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    const drift = Animated.loop(
      Animated.timing(motion, {
        toValue: 1,
        duration: 15000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    const intensityPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(intensity, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(intensity, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    const orbit = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 27000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );

    pulse.start();
    drift.start();
    intensityPulse.start();
    orbit.start();
    return () => {
      pulse.stop();
      drift.stop();
      intensityPulse.stop();
      orbit.stop();
    };
  }, [intensity, luminosity, motion, rotation]);

  // Settled at 1; each swallowed card replays it from 0.
  const feed = useRef(new Animated.Value(1)).current;
  const growth = useRef(new Animated.Value(growthFor(absorbed))).current;
  const lastAbsorbed = useRef(absorbed);
  useEffect(() => {
    const previous = lastAbsorbed.current;
    lastAbsorbed.current = absorbed;
    Animated.timing(growth, {
      toValue: growthFor(absorbed),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start();
    // Only a card going in makes it flare; an undo just lets it shrink back.
    if (absorbed <= previous) return;
    feed.setValue(0);
    // The new count arrives as the card sets off, so the flare waits for it
    // to reach the hole.
    Animated.sequence([
      Animated.delay(CARD_FLIGHT_MS),
      Animated.timing(feed, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]).start();
  }, [absorbed, feed, growth]);

  // Each swallowed card makes the hole's light swell and brighten for a
  // moment before settling.
  const flare = feed.interpolate({
    inputRange: [0, 0.14, 1],
    outputRange: [0, 0.85, 0],
  });
  const ringSwell = feed.interpolate({
    inputRange: [0, 0.14, 1],
    outputRange: [1, 1.1, 1],
  });
  const glowSwell = feed.interpolate({
    inputRange: [0, 0.14, 1],
    outputRange: [1, 1.16, 1],
  });
  const glowFlare = feed.interpolate({
    inputRange: [0, 0.14, 1],
    outputRange: [0, 0.3, 0],
  });

  const glowOpacity = luminosity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });
  const glowScale = luminosity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.025],
  });
  const redDrift = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-9, 12, -9],
  });
  const redOpacity = motion.interpolate({
    inputRange: [0, 0.38, 0.7, 1],
    outputRange: [0.38, 0.72, 0.48, 0.38],
  });
  const photonOpacity = luminosity.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.76, 0.9, 1],
  });
  const bloomOpacity = intensity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const width = size * 6.825;
  const height = size * 4.225;
  // The artwork's box fits the height; this maps its coordinates to pixels.
  const unit = height / VIEW_HEIGHT;
  const inset = (width - VIEW_WIDTH * unit) / 2;
  const toPixels = (x: number, y: number) => ({
    x: inset + x * unit,
    y: y * unit,
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width,
          height,
          pointerEvents: "none",
          transform: [
            { translateX: -width / 2 },
            { translateY: -height / 2 },
            { scale: growth },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: Animated.add(glowOpacity, glowFlare),
            transform: [{ scale: Animated.multiply(glowScale, glowSwell) }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 260">
          <Defs>
            <RadialGradient id="outerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#fff2b0" stopOpacity="0.82" />
              <Stop offset="14%" stopColor="#ffbd45" stopOpacity="0.68" />
              <Stop offset="38%" stopColor="#d94b18" stopOpacity="0.34" />
              <Stop offset="72%" stopColor="#541017" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#050309" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="hotGas" cx="48%" cy="50%" rx="52%" ry="50%">
              <Stop offset="0%" stopColor="#fffdf0" stopOpacity="0.98" />
              <Stop offset="10%" stopColor="#ffe79a" stopOpacity="0.96" />
              <Stop offset="28%" stopColor="#ef9b37" stopOpacity="0.84" />
              <Stop offset="53%" stopColor="#a3311c" stopOpacity="0.52" />
              <Stop offset="78%" stopColor="#35101a" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#040207" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Ellipse cx="200" cy="130" rx="196" ry="100" fill="url(#outerGlow)" />
          <Ellipse cx="200" cy="130" rx="171" ry="42" fill="url(#hotGas)" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: redOpacity,
            transform: [{ translateX: redDrift }, { scale: glowScale }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 260">
          <Defs>
            <RadialGradient id="redPlasma" cx="42%" cy="48%" rx="58%" ry="52%">
              <Stop offset="0%" stopColor="#ffb078" stopOpacity="0.76" />
              <Stop offset="18%" stopColor="#e83e24" stopOpacity="0.72" />
              <Stop offset="48%" stopColor="#8b1220" stopOpacity="0.42" />
              <Stop offset="78%" stopColor="#390619" stopOpacity="0.16" />
              <Stop offset="100%" stopColor="#13020d" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="200" cy="130" rx="78" ry="124" fill="url(#redPlasma)" />
        </Svg>
      </Animated.View>

      <Svg
        style={styles.layer}
        width="100%"
        height="100%"
        viewBox="0 0 400 260"
      >
        <Defs>
          <RadialGradient id="diskGlow" cx="48%" cy="48%" rx="52%" ry="52%">
            <Stop offset="0%" stopColor="#fffef1" stopOpacity="1" />
            <Stop offset="9%" stopColor="#fff3bc" stopOpacity="0.98" />
            <Stop offset="25%" stopColor="#eaa14d" stopOpacity="0.88" />
            <Stop offset="50%" stopColor="#8c2a1e" stopOpacity="0.58" />
            <Stop offset="76%" stopColor="#2a0b16" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#030106" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="innerLight" cx="47%" cy="45%" rx="54%" ry="55%">
            <Stop offset="0%" stopColor="#fffef7" stopOpacity="1" />
            <Stop offset="18%" stopColor="#ffe8a3" stopOpacity="0.95" />
            <Stop offset="42%" stopColor="#c96931" stopOpacity="0.7" />
            <Stop offset="72%" stopColor="#41101a" stopOpacity="0.26" />
            <Stop offset="100%" stopColor="#020105" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Ellipse cx="200" cy="130" rx="194" ry="34" fill="url(#diskGlow)" />
        <Ellipse
          cx="194"
          cy="130"
          rx="168"
          ry="20"
          fill="url(#innerLight)"
          opacity="0.82"
        />
      </Svg>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: photonOpacity,
            transform: [{ rotate: spin }, { scale: ringSwell }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 260">
          <Defs>
            <RadialGradient id="discColor" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffb348" stopOpacity="0.82" />
              <Stop offset="38%" stopColor="#f05a24" stopOpacity="0.78" />
              <Stop offset="68%" stopColor="#b62220" stopOpacity="0.62" />
              <Stop offset="86%" stopColor="#71101c" stopOpacity="0.34" />
              <Stop offset="100%" stopColor="#3d0816" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="photonGlow" cx="36%" cy="31%" rx="64%" ry="64%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="10%" stopColor="#fffefa" stopOpacity="1" />
              <Stop offset="24%" stopColor="#fff1bd" stopOpacity="0.98" />
              <Stop offset="42%" stopColor="#ffc354" stopOpacity="0.92" />
              <Stop offset="62%" stopColor="#f26325" stopOpacity="0.76" />
              <Stop offset="76%" stopColor="#d83d20" stopOpacity="0.68" />
              <Stop offset="89%" stopColor="#9e171d" stopOpacity="0.34" />
              <Stop offset="100%" stopColor="#64101b" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="photonEdge" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="58%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="76%" stopColor="#ffffff" stopOpacity="0.72" />
              <Stop offset="90%" stopColor="#ffffff" stopOpacity="0.24" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
            <Mask id="photonEdgeMask">
              <Ellipse
                cx="200"
                cy="130"
                rx="91"
                ry="85"
                fill="url(#photonEdge)"
              />
            </Mask>
          </Defs>
          <Ellipse cx="200" cy="130" rx="98" ry="92" fill="url(#discColor)" />
          <Ellipse
            cx="200"
            cy="130"
            rx="91"
            ry="85"
            fill="url(#photonGlow)"
            mask="url(#photonEdgeMask)"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: Animated.add(bloomOpacity, flare),
            transform: [{ rotate: spin }, { scale: ringSwell }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 260">
          <Defs>
            <RadialGradient id="whiteBloom" cx="36%" cy="31%" rx="64%" ry="64%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="16%" stopColor="#ffffff" stopOpacity="0.98" />
              <Stop offset="34%" stopColor="#fffbe8" stopOpacity="0.72" />
              <Stop offset="58%" stopColor="#ffd781" stopOpacity="0.3" />
              <Stop offset="82%" stopColor="#ff8a3d" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#ff542c" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="bloomEdge" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="52%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="72%" stopColor="#ffffff" stopOpacity="0.62" />
              <Stop offset="88%" stopColor="#ffffff" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
            <Mask id="bloomEdgeMask">
              <Ellipse
                cx="200"
                cy="130"
                rx="91"
                ry="85"
                fill="url(#bloomEdge)"
              />
            </Mask>
          </Defs>
          <Ellipse
            cx="200"
            cy="130"
            rx="91"
            ry="85"
            fill="url(#whiteBloom)"
            mask="url(#bloomEdgeMask)"
          />
        </Svg>
      </Animated.View>

      <Svg
        style={styles.layer}
        width="100%"
        height="100%"
        viewBox="0 0 400 260"
      >
        <Defs>
          <RadialGradient id="shadow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#000000" stopOpacity="1" />
            <Stop offset="72%" stopColor="#000001" stopOpacity="1" />
            <Stop offset="88%" stopColor="#080309" stopOpacity="0.99" />
            <Stop offset="100%" stopColor="#2a1015" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="200" cy="130" rx="73" ry="69" fill="url(#shadow)" />
      </Svg>

      {/* Gravitational lensing, the way it is drawn in Interstellar: light
          from the far side of the disk is bent into a ring round the hole,
          bright over the top and fainter underneath, while the near side of
          the disk passes in front of it. Brighter on the left, the side
          turning towards us. Everything is drawn with soft gradients, a
          blur that costs nothing to draw. */}
      <Svg
        style={styles.layer}
        width="100%"
        height="100%"
        viewBox="0 0 400 260"
      >
        <Defs>
          {/* A soft ring: bright at the photon ring's radius (76 of 86),
              falling away to either side. */}
          <RadialGradient id="lensRing" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="68%" stopColor="#ffb561" stopOpacity="0" />
            <Stop offset="79%" stopColor="#ffc877" stopOpacity="0.18" />
            <Stop offset="85%" stopColor="#ffe3a8" stopOpacity="0.6" />
            <Stop offset="88.4%" stopColor="#fff6d6" stopOpacity="1" />
            <Stop offset="91.5%" stopColor="#ffe3a8" stopOpacity="0.55" />
            <Stop offset="96%" stopColor="#ffb561" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#ff8a4c" stopOpacity="0" />
          </RadialGradient>
          {/* Fades the ring towards the right and, below the disk, down to
              a faint echo of its upper arc. */}
          <LinearGradient
            id="lensFadeX"
            x1="114"
            y1="0"
            x2="286"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <Stop offset="22%" stopColor="#ffffff" stopOpacity="0.85" />
            <Stop offset="45%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="78%" stopColor="#ffffff" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
          </LinearGradient>
          <LinearGradient
            id="lensFadeY"
            x1="0"
            y1="124"
            x2="0"
            y2="146"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
          </LinearGradient>
          <Mask id="lensMask">
            <Rect x="0" y="0" width="400" height="260" fill="url(#lensFadeX)" />
            <Rect
              x="0"
              y="124"
              width="400"
              height="136"
              fill="url(#lensFadeY)"
            />
          </Mask>
          {/* The near side of the disk: a soft streak, brightest a little
              left of centre, fading out along its length and across it. */}
          <RadialGradient id="nearDisk" cx="44%" cy="50%" rx="56%" ry="50%">
            <Stop offset="0%" stopColor="#fff3cc" stopOpacity="0.95" />
            <Stop offset="30%" stopColor="#ffd08a" stopOpacity="0.62" />
            <Stop offset="62%" stopColor="#ff9a52" stopOpacity="0.26" />
            <Stop offset="85%" stopColor="#c24a24" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#7a1a1c" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nearCore" cx="45%" cy="50%" rx="55%" ry="50%">
            <Stop offset="0%" stopColor="#fffaf0" stopOpacity="0.9" />
            <Stop offset="40%" stopColor="#ffe6b0" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#ffb561" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <G mask="url(#lensMask)">
          <Ellipse cx="200" cy="131" rx="86" ry="83" fill="url(#lensRing)" />
        </G>
        <Ellipse cx="200" cy="133" rx="190" ry="12" fill="url(#nearDisk)" />
        <Ellipse cx="196" cy="133" rx="158" ry="4.5" fill="url(#nearCore)" />
      </Svg>

      {settings.showAnimations &&
        SPARKS.map((spark, index) => (
          <Spark key={index} spark={spark} toPixels={toPixels} />
        ))}
    </Animated.View>
  );
}

/** How big the hole is drawn: START_SIZE at the opening Ace, growing
 *  steadily to FULL_SIZE with the last of the 52 cards. */
function growthFor(absorbed: number) {
  const share = Math.min(1, Math.max(0, (absorbed - 1) / 51));
  return START_SIZE + share * (FULL_SIZE - START_SIZE);
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
