import { useTranslation } from "@/i18n";
import { UfoGuideBox } from "@/components/common/UfoGuideBox";
import { useUfoOnScreen } from "@/components/common/UfoStage";
import { UfoSaucer } from "@/components/common/UfoSaucer";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { layoutDims } from "@/styles/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  Pressable,
  View,
} from "react-native";

const SAMPLE_COUNT = 40;
const SAMPLE_T = Array.from(
  { length: SAMPLE_COUNT + 1 },
  (_, i) => i / SAMPLE_COUNT,
);
// A gentle sine bob layered over the flight path, +20% over the original.
const WAVE_AMPLITUDE = 24;
/** Where a visiting ship hovers, as a share of screen height. */
const VISIT_POSITION = 0.44;
/** How far under the Mercy Skip note a caught ship waits. */
const UNDER_NOTE = 24;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
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

/** How long the visiting UFO hangs in the sky. */
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
 * once caught, waits under its note until the note is put away.
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
  noteTop,
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
  /** Where the Mercy Skip note goes: under the header, as the Odyssey's
   *  introduction does. */
  noteTop: number;
}) {
  const { t } = useTranslation("campaign");
  const { spacing, ui } = useResponsiveMetrics();
  const progress = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(1)).current;
  const [phase, setPhase] = useState<
    "hidden" | "flying" | "caught" | "fleeing" | "visiting"
  >("hidden");
  // While it's up, no other UFO is (the tab bar's keeps away).
  useUfoOnScreen(phase !== "hidden");
  const visitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (visitTimerRef.current) clearTimeout(visitTimerRef.current);
    },
    [],
  );
  // Where the Mercy Skip note ends, once drawn: the caught ship waits under it.
  const [noteBottom, setNoteBottom] = useState<number | null>(null);
  const caughtAt = useRef({ x: 0, y: 0 });
  const [samples, setSamples] = useState<{ x: number[]; y: number[] } | null>(
    null,
  );
  const flightRef = useRef<FlightParams | null>(null);
  // The fly-past fade (in, hold, out) as one sequence. Stopping `opacity`
  // alone does not stop it: during the hold the running step is a delay, not
  // an animation of `opacity`, so the fade-out would still fire afterwards
  // and make a caught UFO vanish while its note is up.
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
      // fleeing UFO is with its note, so it is left alone;
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
    const hover = { x: width / 2, y: height * VISIT_POSITION };
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
      visitTimerRef.current = setTimeout(() => {
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

  // Caught wherever it happened to be, the ship drifts in under its note,
  // which sits where the Odyssey's introduction does, and waits there.
  useEffect(() => {
    if (phase !== "caught" || noteBottom === null) return;
    const from = caughtAt.current;
    const approach: FlightParams = {
      startX: from.x,
      startY: from.y,
      endX: (width - SAUCER_BIG) / 2,
      endY: noteBottom + UNDER_NOTE,
      waveCycles: 0,
      waveAmplitude: 0,
    };
    flightRef.current = approach;
    lastProgressRef.current = 1;
    setSamples(samplesFromFlight(approach));
    progress.setValue(0);
    const useNativeDriver = Platform.OS !== "web";
    RNAnimated.timing(progress, {
      toValue: 1,
      duration: 700,
      easing: RNEasing.inOut(RNEasing.quad),
      useNativeDriver,
    }).start();
    RNAnimated.timing(scale, {
      toValue: 1.35,
      duration: 700,
      easing: RNEasing.out(RNEasing.quad),
      useNativeDriver,
    }).start();
  }, [noteBottom, phase, progress, scale, width]);

  if (phase === "hidden") return null;

  const handleCatch = () => {
    if (phase !== "flying") return;
    progress.stopAnimation((value) => {
      lastProgressRef.current = value;
    });
    fadeRef.current?.stop();
    opacity.stopAnimation();
    opacity.setValue(1);
    caughtAt.current = flightRef.current
      ? positionAt(flightRef.current, lastProgressRef.current)
      : { x: width / 2, y: height / 2 };
    setNoteBottom(null);
    setPhase("caught");
    onCatch();
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

  return (
    <>
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
          // Generous: the UFO is a small, fast-moving target flying over game
          // dots, and a near-miss should never select the game dot beneath it.
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
      </RNAnimated.View>

      {/* The note, in the UFO's box like the Odyssey's introduction and in
          its place. Its button is the one way to close it: the UFO stays
          until it is pressed. */}
      {caught && (
        <View
          style={{
            position: "absolute",
            top: noteTop,
            left: 0,
            right: 0,
            alignItems: "center",
            paddingHorizontal: spacing(layoutDims.pagePadding / 2),
          }}
        >
          <View
            onLayout={(event) => {
              const { y, height: noteHeight } = event.nativeEvent.layout;
              setNoteBottom(noteTop + y + noteHeight);
            }}
            style={{ width: "100%", maxWidth: ui.contentMaxWidth }}
          >
            <UfoGuideBox
              title={t("mercySkip.title")}
              text={t("mercySkip.granted")}
              closeLabel={t("mercySkip.dismiss")}
              onClose={handleDismiss}
            />
          </View>
        </View>
      )}
    </>
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
