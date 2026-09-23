import { useTranslation } from "@/i18n";
import { Icon } from "@/icons/Icon";
import { Colors, rgba, textShadow } from "@/styles/styles";
import { useCallback, useEffect, useRef, useState } from "react";
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

/** Neon inks for the alien script; each glyph takes one at random. */
const ALIEN_INKS = [
  "#7dffb0",
  "#6ee7ff",
  "#ff7ce5",
  "#c79bff",
  "#ffe36e",
  "#ff9f6b",
];
/** Roughly this share of glyphs glow in their own ink. */
const ALIEN_GLOW_SHARE = 0.35;
/** How long one ripple of light takes to run along the script. */
const SHIMMER_PERIOD_MS = 2400;
const SHIMMER_SAMPLES = Array.from({ length: 13 }, (_, index) => index / 12);

type AlienGlyph = {
  char: string;
  ink: string;
  glow: boolean;
  /** Where this glyph sits in the shimmer's cycle, 0-1. */
  phase: number;
  /** A small nudge off the baseline, so the line wobbles. */
  lift: number;
};
type AlienWord = AlienGlyph[];

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Alien script standing in for the line underneath: one word per word, at
 * about half its length, so it reads as a translation without crowding the
 * bubble. Glyph by glyph it runs along the shimmer, which is what makes the
 * light ripple from one end of the line to the other.
 */
function generateAlienScript(spokenLine: string): AlienWord[] {
  let index = 0;
  return spokenLine
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      Array.from({ length: Math.max(1, Math.ceil(word.length / 2)) }, () => {
        const glyph: AlienGlyph = {
          char: pick(ALIEN_GLYPHS),
          ink: pick(ALIEN_INKS),
          glow: Math.random() < ALIEN_GLOW_SHARE,
          phase: (index * 0.07) % 1,
          lift: Math.sin(index * 1.7) * 1.2,
        };
        index += 1;
        return glyph;
      }),
    );
}

/** One glyph of alien script, brightening as the shimmer passes through it. */
function AlienGlyphText({
  glyph,
  shimmer,
}: {
  glyph: AlienGlyph;
  shimmer: RNAnimated.Value;
}) {
  const opacity = shimmer.interpolate({
    inputRange: SHIMMER_SAMPLES,
    outputRange: SHIMMER_SAMPLES.map(
      (t) => 0.5 + 0.5 * Math.cos((t - glyph.phase) * Math.PI * 2),
    ),
  });
  return (
    <RNAnimated.Text
      style={[
        alienGlyphStyle,
        {
          color: glyph.ink,
          opacity,
          transform: [{ translateY: glyph.lift }],
        },
        glyph.glow ? textShadow(glyph.ink, 6) : null,
      ]}
    >
      {glyph.char}
    </RNAnimated.Text>
  );
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

/** True while the UFO is on screen because the player caught it. */
function isHeld(phase: string) {
  return phase === "caught" || phase === "fleeing";
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
  summons,
  onCatch,
}: {
  width: number;
  height: number;
  /** Whether timed flights may happen. Summoned ones ignore this. */
  animationsEnabled: boolean;
  /** Goes up by one each time a flight is summoned on demand. */
  summons: number;
  onCatch: () => void;
}) {
  const { t } = useTranslation("nodes");
  const progress = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(1)).current;
  const [phase, setPhase] = useState<
    "hidden" | "flying" | "caught" | "fleeing"
  >("hidden");
  const [message, setMessage] = useState<AlienWord[]>([]);
  const [samples, setSamples] = useState<{ x: number[]; y: number[] } | null>(
    null,
  );
  const flightRef = useRef<FlightParams | null>(null);
  // The fly-past fade (in, hold, out) as one sequence. Stopping `opacity`
  // alone does not stop it: during the hold the running step is a delay, not
  // an animation of `opacity`, so the fade-out would still fire afterwards
  // and make a caught UFO vanish mid-message.
  const fadeRef = useRef<RNAnimated.CompositeAnimation | null>(null);
  const lastProgressRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  /** Sends the UFO across the sky once; `onLanded` runs if it gets across. */
  const startFlight = useCallback(
    (onLanded?: () => void) => {
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
      opacity.setValue(0);
      scale.setValue(1);
      setPhase("flying");

      RNAnimated.timing(progress, {
        toValue: 1,
        duration,
        easing: RNEasing.inOut(RNEasing.sin),
        useNativeDriver: Platform.OS !== "web",
      }).start(({ finished }) => {
        if (!finished) return;
        setPhase("hidden");
        onLanded?.();
      });
      fadeRef.current = RNAnimated.sequence([
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
      ]);
      fadeRef.current.start();
    },
    [height, opacity, progress, scale, width],
  );

  // Timed flights, now and then, while the gate is open.
  useEffect(() => {
    if (!animationsEnabled || width <= 0 || height <= 0) return;

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function schedule() {
      timer = setTimeout(
        () => {
          if (cancelled) return;
          // A summoned UFO may already be in the air; wait for the next slot.
          if (phaseRef.current !== "hidden") {
            schedule();
            return;
          }
          startFlight(() => {
            if (!cancelled) schedule();
          });
        },
        randomBetween(50000, 130000),
      );
    }

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      // Catching grants a skip, which closes the gate at once. A caught or
      // fleeing UFO is showing the player its message, so it is left alone;
      // one merely passing by is stopped and put away.
      if (isHeld(phaseRef.current)) return;
      progress.stopAnimation();
      fadeRef.current?.stop();
      opacity.stopAnimation();
      if (phaseRef.current === "flying") setPhase("hidden");
    };
  }, [animationsEnabled, height, opacity, progress, startFlight, width]);

  // A summoned flight leaves straight away, gate or no gate, unless one is
  // already on screen.
  const handledSummons = useRef(summons);
  useEffect(() => {
    if (summons === handledSummons.current) return;
    handledSummons.current = summons;
    if (phaseRef.current !== "hidden" || width <= 0 || height <= 0) return;
    startFlight();
  }, [height, startFlight, summons, width]);

  // The caught UFO's script shimmers: one looping value, read by every glyph
  // at its own phase, so a ripple of light runs through the line.
  const shimmer = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (phase !== "caught") return;
    const loop = RNAnimated.loop(
      RNAnimated.timing(shimmer, {
        toValue: 1,
        duration: SHIMMER_PERIOD_MS,
        easing: RNEasing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, shimmer]);

  if (phase === "hidden") return null;

  const handleCatch = () => {
    if (phase !== "flying") return;
    progress.stopAnimation((value) => {
      lastProgressRef.current = value;
    });
    fadeRef.current?.stop();
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

  // The ship and its message are siblings inside one moving container. The
  // dismiss button used to sit inside the ship's own Pressable, and both are
  // buttons, which on web nests a <button> inside a <button>.
  return (
    <RNAnimated.View
      testID="nodes-ufo"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("mercySkip.ufoLabel")}
        onPress={handleCatch}
        disabled={phase !== "flying"}
        // Generous: the UFO is a small, fast-moving target flying over nodes,
        // and a near-miss should never accidentally select the node beneath it.
        hitSlop={26}
      >
        <View style={touchPadStyle} />
        <Text
          style={{
            fontSize: caught ? 32 : 26,
            ...textShadow(rgba(Colors.brightGreen, 0.55), 8),
          }}
        >
          🛸
        </Text>
      </Pressable>

      {caught && (
        <View style={bubbleContainerStyle}>
          <View style={bubbleStyle}>
            <View style={alienLineStyle}>
              {message.map((word, wordIndex) => (
                <View key={wordIndex} style={alienWordStyle}>
                  {word.map((glyph, glyphIndex) => (
                    <AlienGlyphText
                      key={glyphIndex}
                      glyph={glyph}
                      shimmer={shimmer}
                    />
                  ))}
                </View>
              ))}
            </View>
            <Text style={bubbleCaptionStyle}>{t("mercySkip.granted")}</Text>
          </View>
          {/* Outside the bubble's corner and in the ship's own green, so it
              reads as the one way to close the message. Nothing else does:
              the UFO stays until this is pressed. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("mercySkip.dismiss")}
            onPress={handleDismiss}
            hitSlop={14}
            style={dismissButtonStyle}
          >
            <Icon name="close" size={DISMISS_ICON_SIZE} color={Colors.K950} />
          </Pressable>
        </View>
      )}
    </RNAnimated.View>
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
  // Stretched, so the bubble fills the container and the dismiss button,
  // positioned against the container, lands on the bubble's own corner.
  alignItems: "stretch" as const,
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

const alienLineStyle = {
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  justifyContent: "center" as const,
  columnGap: 4,
  rowGap: 2,
};

const alienWordStyle = {
  flexDirection: "row" as const,
};

const alienGlyphStyle = {
  fontSize: 8,
  lineHeight: 12,
  letterSpacing: 0.5,
};

const bubbleCaptionStyle = {
  color: Colors.K100,
  fontSize: 12,
  textAlign: "center" as const,
  marginTop: 5,
};

/** Big enough to find at a glance on a small, moving, scaled-up ship. */
const DISMISS_SIZE = 32;
const DISMISS_ICON_SIZE = 18;

const dismissButtonStyle = {
  position: "absolute" as const,
  top: -DISMISS_SIZE / 2 + 2,
  right: -DISMISS_SIZE / 2 + 2,
  width: DISMISS_SIZE,
  height: DISMISS_SIZE,
  borderRadius: DISMISS_SIZE / 2,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: Colors.brightGreen,
  borderWidth: 2,
  borderColor: Colors.K950,
};
