import { rgba } from "@/styles/styles";
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import type { HintTarget } from "./hint";
import { clearActiveHint, useActiveHint } from "./hint-store";

/** Where a hint highlight goes on the board, and how big it is. */
export type HintSpot = { x: number; y: number; size: number };

const GLOW_COLOR = "#ffd34d";
const STEP_DELAY_MS = 650;
const APPEAR_MS = 200;
const PULSE_MS = 1000;
const PULSE_GAP_MS = 250;
const PULSES = 3;
const FADE_MS = 300;
// Above every card, below nothing that matters: the layer takes no touches.
const HINT_Z_INDEX = 20000;
const useNativeDriver = Platform.OS !== "web";

function glowDuration(delay: number) {
  return delay + APPEAR_MS + PULSES * (PULSE_MS + PULSE_GAP_MS) + FADE_MS;
}

function HintGlow({ spot, delay }: { spot: HintSpot; delay: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const presence = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(presence, {
        toValue: 1,
        duration: APPEAR_MS,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: PULSE_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver,
          }),
          Animated.delay(PULSE_GAP_MS),
        ]),
        { iterations: PULSES },
      ),
      Animated.timing(presence, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, presence, pulse]);

  const ringSize = spot.size;
  const dotSize = Math.max(12, Math.round(spot.size * 0.2));

  return (
    <View
      style={{
        position: "absolute",
        left: spot.x - ringSize / 2,
        top: spot.y - ringSize / 2,
        width: ringSize,
        height: ringSize,
        alignItems: "center",
        justifyContent: "center",
        zIndex: HINT_Z_INDEX,
        pointerEvents: "none",
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: Math.max(2, ringSize * 0.05),
          borderColor: GLOW_COLOR,
          backgroundColor: rgba(GLOW_COLOR, 0.3),
          boxShadow: `0 0 ${Math.round(ringSize * 0.25)}px ${rgba(GLOW_COLOR, 0.8)}`,
          opacity: Animated.multiply(
            presence,
            pulse.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [0, 0.95, 0],
            }),
          ),
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1.3],
              }),
            },
          ],
        }}
      />
      <Animated.View
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: GLOW_COLOR,
          borderWidth: 2,
          borderColor: "#ffffff",
          boxShadow: `0 0 ${Math.round(dotSize * 0.6)}px ${rgba("#000000", 0.6)}`,
          opacity: presence,
          transform: [{ scale: presence }],
        }}
      />
    </View>
  );
}

/**
 * Draws the hint on screen over a card map: a growing, fading glow with a dot
 * at its centre on each target, one step after another.
 */
export function HintLayer({
  locate,
}: {
  locate: (target: HintTarget) => HintSpot | null;
}) {
  const active = useActiveHint();
  const glows =
    active?.hint.steps.flatMap((step, stepIndex) =>
      step.flatMap((target, targetIndex) => {
        const spot = locate(target);
        return spot
          ? [
              {
                key: `${active.id}-${stepIndex}-${targetIndex}`,
                spot,
                delay: stepIndex * STEP_DELAY_MS,
              },
            ]
          : [];
      }),
    ) ?? [];
  const lastDelay = glows.reduce((max, glow) => Math.max(max, glow.delay), 0);
  const activeId = active?.id;

  useEffect(() => {
    if (activeId === undefined) return;
    const timer = setTimeout(
      () => clearActiveHint(activeId),
      glowDuration(lastDelay) + 100,
    );
    return () => clearTimeout(timer);
  }, [activeId, lastDelay]);

  return glows.map((glow) => (
    <HintGlow key={glow.key} spot={glow.spot} delay={glow.delay} />
  ));
}
