import { useTranslation } from "@/i18n";
import { ActionButton } from "@/components/ui/Nocturne";
import { UfoFrame } from "@/components/common/UfoFrame";
import { UfoSaucer } from "@/components/common/UfoSaucer";
import {
  Colors,
  FontWeight,
  textShadow,
  UFO_INKS,
  UfoColors,
} from "@/styles/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

/**
 * The alien script, the same in every language: edit freely. Spaces split
 * words; every other character is shown as it is, punctuation included.
 */
const ALIEN_GRANTED = "✦⟡❖◈✧ ⌘✺⬡※☄✩❢ ◈⌬✪❖⟡✧⋆ ◈※ʾ⬡✺☄ ✩⌘✪◈⟡∴ ✦❖⌬✧❢";
/** Said on the quick visit after a Mercy Skip is spent. */
const ALIEN_VISIT = "✧⌘❖⟡ ◈✦✺⬡❢";

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

/** The alien script takes the UFO's own colours, a random ink per glyph. */
const ALIEN_INKS = UFO_INKS;
/** Roughly this share of glyphs glow in their own ink. */
const ALIEN_GLOW_SHARE = 0.3;
/** Roughly this share of glyphs flicker; the rest hold steady. */
const ALIEN_FLICKER_SHARE = 0.4;
/**
 * One cycle of the shared flicker clock. Each flickering glyph dips at its
 * own random moments within it, so the effect never lines up into a sweep.
 */
const SHIMMER_PERIOD_MS = 4200;
const SHIMMER_SAMPLES = Array.from({ length: 25 }, (_, index) => index / 24);

type AlienGlyph = {
  char: string;
  ink: string;
  glow: boolean;
  /** Opacity at each of SHIMMER_SAMPLES, or null for a glyph that holds. */
  flicker: number[] | null;
  /** A small nudge off the baseline, so the line wobbles. */
  lift: number;
};
type AlienWord = AlienGlyph[];

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * A flicker for one glyph: steady for most of the cycle, with one or two
 * brief, shallow dips at random points. Kept off the cycle's ends so the
 * loop joins without a jump.
 */
function randomFlicker() {
  const levels = SHIMMER_SAMPLES.map(() => 1);
  const dips = 1 + Math.floor(Math.random() * 2);
  for (let dip = 0; dip < dips; dip += 1) {
    const at = 2 + Math.floor(Math.random() * (SHIMMER_SAMPLES.length - 4));
    const depth = 0.5 + Math.random() * 0.2;
    levels[at] = Math.min(levels[at], depth);
    levels[at - 1] = Math.min(levels[at - 1], (1 + depth) / 2);
    levels[at + 1] = Math.min(levels[at + 1], (1 + depth) / 2);
  }
  return levels;
}

/**
 * One of the fixed alien lines, dressed for display: each glyph takes a
 * random ink, and a random few glow or flicker.
 */
function parseAlienScript(line: string): AlienWord[] {
  let index = 0;
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      Array.from(word).map((char): AlienGlyph => {
        const glyph: AlienGlyph = {
          char,
          ink: pick(ALIEN_INKS),
          glow: Math.random() < ALIEN_GLOW_SHARE,
          flicker: Math.random() < ALIEN_FLICKER_SHARE ? randomFlicker() : null,
          lift: Math.sin(index * 1.7) * 1.2,
        };
        index += 1;
        return glyph;
      }),
    );
}

/** The line's text runs, alternating plain and **bold**. */
function boldRuns(line: string) {
  return line
    .split("**")
    .map((text, index) => ({ text, bold: index % 2 === 1 }));
}

/** One glyph of alien script; a few of them flicker now and then. */
function AlienGlyphText({
  glyph,
  shimmer,
}: {
  glyph: AlienGlyph;
  shimmer: RNAnimated.Value;
}) {
  // Steady glyphs skip the animated value entirely, so only the flickering
  // few cost anything per frame.
  const opacity = glyph.flicker
    ? shimmer.interpolate({
        inputRange: SHIMMER_SAMPLES,
        outputRange: glyph.flicker,
      })
    : 1;
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

/** A line of alien script, wrapping between words. */
function AlienLine({
  message,
  shimmer,
}: {
  message: AlienWord[];
  shimmer: RNAnimated.Value;
}) {
  return (
    <View style={alienLineStyle}>
      {message.map((word, wordIndex) => (
        <View key={wordIndex} style={alienWordStyle}>
          {word.map((glyph, glyphIndex) => (
            <AlienGlyphText key={glyphIndex} glyph={glyph} shimmer={shimmer} />
          ))}
        </View>
      ))}
    </View>
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

/** True while the UFO is on screen to talk to the player, not passing by. */
function isHeld(phase: string) {
  return phase === "caught" || phase === "fleeing" || phase === "visiting";
}

/** How long the visiting UFO hangs in the sky with its message. */
const VISIT_HOVER_MS = 2000;

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
export function CampaignUFO({
  width,
  height,
  animationsEnabled,
  summons,
  visits,
  onCatch,
}: {
  width: number;
  height: number;
  /** Whether timed flights may happen. Summoned ones ignore this. */
  animationsEnabled: boolean;
  /** Goes up by one each time a flight is summoned on demand. */
  summons: number;
  /** Goes up by one each time the UFO should drop by after a Mercy Skip. */
  visits: number;
  onCatch: () => void;
}) {
  const { t } = useTranslation("campaign");
  const progress = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(1)).current;
  const [phase, setPhase] = useState<
    "hidden" | "flying" | "caught" | "fleeing" | "visiting"
  >("hidden");
  const [showVisitBubble, setShowVisitBubble] = useState(false);
  const visitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (visitTimerRef.current) clearTimeout(visitTimerRef.current);
    },
    [],
  );
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
        // On top of the Campaign tab's first 10 seconds with the gate shut, a
        // flight comes 20 to 120 seconds after opening the map.
        randomBetween(10000, 110000),
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

  /**
   * A short visit to acknowledge a Mercy Skip just spent: the UFO flies in,
   * growing, hovers a moment with a word in its own script, and flies off.
   * Nothing to tap: it is only saying thanks.
   */
  const startVisit = useCallback(() => {
    const useNative = Platform.OS !== "web";
    const fromLeft = Math.random() < 0.5;
    const hover = { x: width / 2, y: height * CAUGHT_POSITION };
    const arrive: FlightParams = {
      startX: fromLeft ? -40 : width + 40,
      startY: height * 0.2,
      endX: hover.x,
      endY: hover.y,
      waveCycles: 0,
      waveAmplitude: 0,
    };
    flightRef.current = arrive;
    lastProgressRef.current = 1;
    setSamples(samplesFromFlight(arrive));
    setMessage(parseAlienScript(ALIEN_VISIT));
    setShowVisitBubble(false);
    progress.setValue(0);
    opacity.setValue(0);
    scale.setValue(0.5);
    setPhase("visiting");

    const arriveMs = 1400;
    RNAnimated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: useNative,
    }).start();
    RNAnimated.timing(scale, {
      toValue: 1.35,
      duration: arriveMs,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: useNative,
    }).start();
    RNAnimated.timing(progress, {
      toValue: 1,
      duration: arriveMs,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: useNative,
    }).start(({ finished }) => {
      if (!finished) return;
      setShowVisitBubble(true);
      visitTimerRef.current = setTimeout(() => {
        setShowVisitBubble(false);
        const leave: FlightParams = {
          startX: hover.x,
          startY: hover.y,
          endX: fromLeft ? width + 80 : -80,
          endY: -60,
          waveCycles: 0,
          waveAmplitude: 0,
        };
        flightRef.current = leave;
        setSamples(samplesFromFlight(leave));
        progress.setValue(0);
        const leaveMs = 900;
        const leaving = {
          duration: leaveMs,
          easing: RNEasing.in(RNEasing.quad),
          useNativeDriver: useNative,
        };
        RNAnimated.timing(progress, { toValue: 1, ...leaving }).start(
          ({ finished: gone }) => {
            if (gone) setPhase("hidden");
          },
        );
        RNAnimated.timing(scale, { toValue: 0.4, ...leaving }).start();
        RNAnimated.timing(opacity, { toValue: 0, ...leaving }).start();
      }, VISIT_HOVER_MS);
    });
  }, [height, opacity, progress, scale, width]);

  // A visit takes over from a UFO merely passing by, but never from one the
  // player is reading.
  const handledVisits = useRef(visits);
  useEffect(() => {
    if (visits === handledVisits.current) return;
    handledVisits.current = visits;
    if (isHeld(phaseRef.current) || width <= 0 || height <= 0) return;
    progress.stopAnimation();
    fadeRef.current?.stop();
    opacity.stopAnimation();
    startVisit();
  }, [height, opacity, progress, startVisit, visits, width]);

  // The UFO's script flickers while it is showing: one looping clock, which
  // each of the few flickering glyphs reads with its own random dips.
  const shimmer = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (phase !== "caught" && phase !== "visiting") return;
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
    setMessage(parseAlienScript(ALIEN_GRANTED));
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
  const visiting = phase === "visiting";

  // The ship and its message are siblings inside one moving container. The
  // dismiss button used to sit inside the ship's own Pressable, and both are
  // buttons, which on web nests a <button> inside a <button>.
  return (
    <RNAnimated.View
      testID="campaign-ufo"
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
        // Generous: the UFO is a small, fast-moving target flying over game dots,
        // and a near-miss should never accidentally select the game dot beneath it.
        hitSlop={26}
      >
        <View style={touchPadStyle} />
        {/* The same saucer that Help from Above flies, in a fainter glow:
            over the dark sky the full one drowns the drawing. */}
        <UfoSaucer
          size={caught || visiting ? SAUCER_BIG : SAUCER_SIZE}
          glow={SAUCER_GLOW}
        />
      </Pressable>

      {caught && (
        <View style={bubbleContainerStyle}>
          <UfoFrame radius={BUBBLE_RADIUS} style={bubbleStyle}>
            <AlienLine message={message} shimmer={shimmer} />
            <Text style={bubbleCaptionStyle}>
              {boldRuns(t("mercySkip.granted")).map(({ text, bold }, index) =>
                bold ? (
                  <Text key={index} style={bubbleCaptionBoldStyle}>
                    {text}
                  </Text>
                ) : (
                  text
                ),
              )}
            </Text>
            {/* The one way to close the message: the UFO stays until it is
                pressed. */}
            <ActionButton
              label={t("mercySkip.dismiss")}
              small
              color={UfoColors.green}
              ink={UfoColors.black}
              style={thanksButtonStyle}
              onPress={handleDismiss}
            />
          </UfoFrame>
        </View>
      )}

      {visiting && showVisitBubble && (
        <View style={bubbleContainerStyle}>
          {/* Just the short alien line, so the bubble shrinks to fit it. */}
          <UfoFrame
            radius={BUBBLE_RADIUS}
            style={[bubbleStyle, { alignSelf: "center" }]}
          >
            <AlienLine message={message} shimmer={shimmer} />
          </UfoFrame>
        </View>
      )}
    </RNAnimated.View>
  );
}

/** The saucer's size flying past, and once it has stopped to talk. */
const SAUCER_SIZE = 30;
const SAUCER_BIG = 36;
/** The share of the saucer's usual green glow it keeps over the map. */
const SAUCER_GLOW = 0.4;

// An invisible, generously-sized touch target centred on the UFO glyph, so a
// slightly-off tap still catches it instead of falling through to a game dot.
const touchPadStyle = {
  position: "absolute" as const,
  left: (SAUCER_SIZE - 62) / 2,
  top: (SAUCER_SIZE - 62) / 2,
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
  // Stretched, so the bubble fills the container.
  alignItems: "stretch" as const,
};

const BUBBLE_RADIUS = 20;

const bubbleStyle = {
  paddingHorizontal: 12,
  paddingTop: 10,
  paddingBottom: 8,
};

const alienLineStyle = {
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  justifyContent: "center" as const,
  // Wide enough to read plainly as the spaces between words.
  columnGap: 8,
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
  fontFamily: FontWeight[400],
  fontSize: 12,
  textAlign: "center" as const,
  marginTop: 5,
};

const bubbleCaptionBoldStyle = {
  fontFamily: FontWeight[700],
  color: UfoColors.green,
};

const thanksButtonStyle = {
  alignSelf: "center" as const,
  marginTop: 10,
  marginBottom: 4,
};
