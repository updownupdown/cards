import { useTranslation } from "@/i18n";
import { Colors, rgba, textShadow } from "@/styles/styles";
import { useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

const ALIEN_GLYPHS = [
  "✦",
  "✧",
  "⋆",
  "✺",
  "❖",
  "◈",
  "⟡",
  "⬡",
  "∴",
  "∵",
  "※",
  "⌘",
  "☄",
  "✩",
  "✪",
  "⌬",
];

const SAMPLE_COUNT = 40;
const SAMPLE_T = Array.from(
  { length: SAMPLE_COUNT + 1 },
  (_, i) => i / SAMPLE_COUNT,
);
// A gentle sine bob layered over the flight path, +20% over the original.
const WAVE_AMPLITUDE = 24;
/** Where a caught ship settles, as a share of screen height: high enough that
 *  the bubble above it clears the header, low enough to miss the panel. */
const CAUGHT_POSITION = 0.44;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * Glyphs standing in for the line underneath, word for word and letter for
 * letter, so the bubble comes out the size the caption below it leads you to
 * expect rather than a stub or a wall of symbols.
 */
function generateAlienScript(spokenLine: string) {
  return spokenLine
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      Array.from(
        { length: word.length },
        () => ALIEN_GLYPHS[Math.floor(Math.random() * ALIEN_GLYPHS.length)],
      ).join(""),
    )
    .join(" ");
}

type FlightParams = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  waveCycles: number;
  waveAmplitude: number;
};

function samplesFromFlight(flight: FlightParams) {
  return {
    x: SAMPLE_T.map((t) => flight.startX + (flight.endX - flight.startX) * t),
    y: SAMPLE_T.map(
      (t) =>
        flight.startY +
        (flight.endY - flight.startY) * t +
        Math.sin(t * Math.PI * 2 * flight.waveCycles) * flight.waveAmplitude,
    ),
  };
}

function positionAt(flight: FlightParams, t: number) {
  return {
    x: flight.startX + (flight.endX - flight.startX) * t,
    y:
      flight.startY +
      (flight.endY - flight.startY) * t +
      Math.sin(t * Math.PI * 2 * flight.waveCycles) * flight.waveAmplitude,
  };
}

const AnimatedPressable = RNAnimated.createAnimatedComponent(Pressable);

/**
 * A rare, tappable UFO that drifts across the sky with a gentle bob, and
 * stays put — with its message readable — until explicitly dismissed.
 * Screen-space (not part of the pannable world), so it's unaffected by the
 * map camera transform and can use a plain Pressable reliably on every
 * platform.
 */
export function NodesUFO({
  width,
  height,
  animationsEnabled,
  onCatch,
}: {
  width: number;
  height: number;
  animationsEnabled: boolean;
  onCatch: () => void;
}) {
  const { t } = useTranslation("nodes");
  const progress = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(1)).current;
  const [phase, setPhase] = useState<
    "hidden" | "flying" | "caught" | "fleeing"
  >("hidden");
  const [message, setMessage] = useState("");
  const [samples, setSamples] = useState<{ x: number[]; y: number[] } | null>(
    null,
  );
  const flightRef = useRef<FlightParams | null>(null);
  const lastProgressRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (!animationsEnabled || width <= 0 || height <= 0) {
      // A gate closing (e.g. right after granting a skip) shouldn't yank
      // away a bubble the player just opened — only reset when nothing is
      // actively showing.
      if (phaseRef.current !== "caught") opacity.setValue(0);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function schedule() {
      timer = setTimeout(
        () => {
          if (cancelled) return;
          const goingRight = Math.random() < 0.5;
          const startY = randomBetween(height * 0.12, height * 0.55);
          const endY = startY + randomBetween(-60, 60);
          const startX = goingRight ? -40 : width + 40;
          const endX = goingRight ? width + 40 : -40;
          // Slower than before, with a few gentle bobs across the crossing.
          const duration = randomBetween(10000, 15500);
          const waveCycles = 2 + Math.random() * 1.5;

          const flight: FlightParams = {
            startX,
            startY,
            endX,
            endY,
            waveCycles,
            waveAmplitude: WAVE_AMPLITUDE,
          };
          flightRef.current = flight;
          setSamples(samplesFromFlight(flight));
          progress.setValue(0);
          scale.setValue(1);
          setPhase("flying");

          RNAnimated.timing(progress, {
            toValue: 1,
            duration,
            easing: RNEasing.inOut(RNEasing.sin),
            useNativeDriver: Platform.OS !== "web",
          }).start(({ finished }) => {
            if (!cancelled && finished) {
              setPhase("hidden");
              schedule();
            }
          });
          RNAnimated.sequence([
            RNAnimated.timing(opacity, {
              toValue: 1,
              duration: 500,
              easing: RNEasing.out(RNEasing.quad),
              useNativeDriver: Platform.OS !== "web",
            }),
            RNAnimated.delay(Math.max(0, duration - 1000)),
            RNAnimated.timing(opacity, {
              toValue: 0,
              duration: 500,
              easing: RNEasing.in(RNEasing.quad),
              useNativeDriver: Platform.OS !== "web",
            }),
          ]).start();
        },
        randomBetween(50000, 130000),
      );
    }

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      progress.stopAnimation();
      opacity.stopAnimation();
    };
  }, [animationsEnabled, height, opacity, progress, scale, width]);

  if (phase === "hidden") return null;

  const handleCatch = () => {
    if (phase !== "flying") return;
    progress.stopAnimation((value) => {
      lastProgressRef.current = value;
    });
    opacity.stopAnimation();
    opacity.setValue(1);
    setMessage(generateAlienScript(t("mercySkip.granted")));
    setPhase("caught");
    onCatch();

    // Caught wherever it happened to be, the bubble can end up clipped by an
    // edge or hidden behind the panel, so the ship drifts in to the middle of
    // the sky and reads it out there.
    const from = flightRef.current
      ? positionAt(flightRef.current, lastProgressRef.current)
      : { x: width / 2, y: height * CAUGHT_POSITION };
    const approach: FlightParams = {
      startX: from.x,
      startY: from.y,
      endX: width / 2,
      endY: height * CAUGHT_POSITION,
      waveCycles: 0,
      waveAmplitude: 0,
    };
    flightRef.current = approach;
    lastProgressRef.current = 1;
    setSamples(samplesFromFlight(approach));
    progress.setValue(0);
    RNAnimated.timing(progress, {
      toValue: 1,
      duration: 700,
      easing: RNEasing.inOut(RNEasing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start();

    RNAnimated.timing(scale, {
      toValue: 1.35,
      duration: 700,
      easing: RNEasing.out(RNEasing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const handleDismiss = () => {
    if (phase !== "caught" || !flightRef.current) return;
    const from = positionAt(flightRef.current, lastProgressRef.current);
    const fleeX = from.x < width / 2 ? -80 : width + 80;
    const fleeFlight: FlightParams = {
      startX: from.x,
      startY: from.y,
      endX: fleeX,
      endY: -60,
      waveCycles: 0,
      waveAmplitude: 0,
    };
    flightRef.current = fleeFlight;
    setSamples(samplesFromFlight(fleeFlight));
    progress.setValue(0);
    setPhase("fleeing");

    const fleeDuration = 900;
    RNAnimated.timing(progress, {
      toValue: 1,
      duration: fleeDuration,
      easing: RNEasing.in(RNEasing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (finished) setPhase("hidden");
    });
    RNAnimated.timing(scale, {
      toValue: 0.4,
      duration: fleeDuration,
      easing: RNEasing.in(RNEasing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start();
    RNAnimated.timing(opacity, {
      toValue: 0,
      duration: fleeDuration,
      easing: RNEasing.in(RNEasing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const translateX = samples
    ? progress.interpolate({ inputRange: SAMPLE_T, outputRange: samples.x })
    : 0;
  const translateY = samples
    ? progress.interpolate({ inputRange: SAMPLE_T, outputRange: samples.y })
    : 0;
  const caught = phase === "caught";

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={t("mercySkip.ufoLabel")}
      onPress={handleCatch}
      // Generous: the UFO is a small, fast-moving target flying over nodes,
      // and a near-miss should never accidentally select the node beneath it.
      hitSlop={26}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <View style={touchPadStyle} />
      {caught && (
        <View style={bubbleContainerStyle}>
          <View style={bubbleStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mercySkip.dismiss")}
              onPress={handleDismiss}
              hitSlop={10}
              style={dismissButtonStyle}
            >
              <Text style={dismissButtonTextStyle}>✕</Text>
            </Pressable>
            <Text style={bubbleTextStyle}>{message}</Text>
            <Text style={bubbleCaptionStyle}>{t("mercySkip.granted")}</Text>
          </View>
        </View>
      )}
      <Text
        style={{
          fontSize: caught ? 32 : 26,
          ...textShadow(rgba(Colors.brightGreen, 0.55), 8),
        }}
      >
        🛸
      </Text>
    </AnimatedPressable>
  );
}

// An invisible, generously-sized touch target centred on the UFO glyph, so a
// slightly-off tap still catches it instead of falling through to a node.
const touchPadStyle = {
  position: "absolute" as const,
  left: -18,
  top: -18,
  width: 62,
  height: 62,
};

const bubbleContainerStyle = {
  position: "absolute" as const,
  bottom: "100%" as const,
  left: "50%" as const,
  marginLeft: -90,
  marginBottom: 8,
  width: 180,
  alignItems: "center" as const,
};

const bubbleStyle = {
  backgroundColor: rgba(Colors.K950, 0.95),
  borderColor: rgba(Colors.brightGreen, 0.5),
  borderWidth: 1,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingTop: 10,
  paddingBottom: 8,
};

const bubbleTextStyle = {
  color: Colors.brightGreen,
  fontSize: 16,
  letterSpacing: 1,
  textAlign: "center" as const,
};

const bubbleCaptionStyle = {
  color: Colors.K100,
  fontSize: 12,
  textAlign: "center" as const,
  marginTop: 5,
};

const dismissButtonStyle = {
  position: "absolute" as const,
  top: -8,
  right: -8,
  width: 22,
  height: 22,
  borderRadius: 11,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: Colors.K800,
  borderWidth: 1,
  borderColor: rgba(Colors.brightGreen, 0.5),
};

const dismissButtonTextStyle = {
  color: Colors.K100,
  fontSize: 12,
  lineHeight: 12,
};
