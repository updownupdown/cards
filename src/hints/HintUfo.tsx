import { isBoardInputLocked } from "@/components/Cards/input-lock";
import { defaultAnimDuration } from "@/constants/animation";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useTranslation } from "@/i18n";
import {
  Colors,
  FontWeight,
  LayerZIndexes,
  rgba,
  textShadow,
  UfoColors,
  UfoEffectColors,
} from "@/styles/styles";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import type { Hint, HintTarget } from "./hint";
import {
  getHintBoard,
  measureHintDock,
  setHintUfoOut,
  useActiveHint,
  useLastHintCall,
  type HintBoard,
  type HintSpot,
} from "./hint-store";

/**
 * "Help from Above": what the header's UFO does when pressed.
 *
 * - Beacons: each place in the hint lights up with a beacon (a bright core
 *   and rings pinging out from it), one step after another. A hint with a
 *   note (a move worth explaining) says it in a bubble under the header's
 *   UFO.
 * - Autopilot: the UFO flies out of the header to the hint and plays it. To
 *   move a card, it hovers over it, switches on its tractor beam and carries
 *   it across; to press a button or tap a card, it zaps it. Then it flies
 *   home. A note rides along in its bubble. Tapping anywhere before
 *   it acts sends it home without playing.
 *
 * It plays a hint by tapping its targets as a player would (HintBoard.tap),
 * so nothing in a game knows Autopilot is there.
 */

/** What to pick up, tap or press: the UFO's own green. */
const GREEN = UfoEffectColors.green;
const BEACON_INK = UfoEffectColors.greenGlow;
/** Where a card goes: pink, so "from" and "to" never look alike. */
const PINK = UfoEffectColors.pink;
const PINK_INK = UfoEffectColors.pinkGlow;
/** The tractor beam that carries a card across. */
const BEAM = UfoEffectColors.blue;
/** Its highlights: the hot cone under the UFO and the pool on the card. */
const BEAM_LIGHT = "#c4f1ff";
const DARK = Colors.K950;
const useNativeDriver = Platform.OS !== "web";

// Beacons
const STEP_DELAY_MS = 650;
const APPEAR_MS = 200;
const PING_MS = 1250;
const PINGS = 3;
const FADE_MS = 300;

// The flying UFO
const UFO_FONT_SIZE = 30;
const POP_MS = 260;
const BEAM_MS = 300;
const BEAM_HOLD_MS = 450;
/**
 * The beam's width on the card. It goes by the UFO, which is the same size
 * on every screen, not by the card: narrower than the UFO's underside.
 */
const BEAM_WIDTH = UFO_FONT_SIZE * 0.85;
/** The beam's width under the UFO, as a share of its width on the card. */
const BEAM_NECK = 0.68;
const ZAP_MS = 180;
/**
 * Hints show only where to look, not words: the move speaks for itself, and
 * games would otherwise each need their own messages. A hint with a note
 * (a move worth explaining) says it, and "No hint available" always shows.
 */
const SHOW_HINT_TEXT = false;
const NOTHING_TO_SAY_MS = 1800;
const HOME_DELAY_MS = 450;
const BUBBLE_WIDTH = 168;

function beaconsDuration(lastDelay: number) {
  return lastDelay + APPEAR_MS + PINGS * PING_MS + FADE_MS;
}

/** How high over its target the UFO hovers: the length of its beam. */
function hoverLift(size: number) {
  return Math.max(58, Math.min(110, size * 1.25));
}

type Translate = (key: string, values?: Record<string, unknown>) => string;

function hintText(t: Translate, hint: Hint | null) {
  if (!hint) return t("hint.none");
  return (
    hint.message.note ?? t(`hint.${hint.message.key}`, hint.message.values)
  );
}

/** Whether the UFO says the hint's words: always for a note or no hint. */
function saysText(hint: Hint | null) {
  return !hint || !!hint.message.note || SHOW_HINT_TEXT;
}

type BeaconKind = "from" | "to";

/** A move's later steps are where it goes; everything else is acted on. */
function beaconKind(hint: Hint, stepIndex: number): BeaconKind {
  return hint.steps.length >= 2 && stepIndex > 0 ? "to" : "from";
}

// —— Beacon ———————————————————————————————————————————————————————————

/**
 * A beacon on a hint target. "from" (what to pick up, tap or press): green
 * rings ping out of a bright core. "to" (where it goes): pink rings close in
 * on a landing ring.
 */
function Beacon({
  spot,
  kind,
  delay = 0,
  pings = PINGS,
}: {
  spot: HintSpot;
  kind: BeaconKind;
  delay?: number;
  pings?: number;
}) {
  const to = kind === "to";
  const ink = to ? PINK : GREEN;
  const glow = to ? PINK_INK : BEACON_INK;
  const presence = useRef(new Animated.Value(0)).current;
  const ping = useRef(new Animated.Value(0)).current;

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
        Animated.timing(ping, {
          toValue: 1,
          duration: PING_MS,
          easing: Easing.linear,
          useNativeDriver,
        }),
        { iterations: pings },
      ),
      Animated.timing(presence, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, ping, pings, presence]);

  const size = Math.max(64, spot.size * 1.5);
  const core = Math.max(16, Math.round(spot.size * 0.22));

  // Two rings, half a ping apart, each growing out of the core and fading
  // (or, for "to", closing in on it).
  const ring = (offset: number) => {
    const phase =
      offset === 0
        ? ping
        : ping.interpolate({
            inputRange: [0, 1 - offset, 1 - offset + 0.0001, 1],
            outputRange: [offset, 1, 0, offset],
          });
    return (
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: ink,
          // A dark edge keeps the ring clear on pale cards.
          boxShadow: `0 0 0 1.5px ${rgba(DARK, 0.45)}, 0 0 12px ${rgba(glow, 0.7)}`,
          opacity: Animated.multiply(
            presence,
            phase.interpolate(
              to
                ? { inputRange: [0, 0.2, 0.85, 1], outputRange: [0, 1, 0.8, 0] }
                : { inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] },
            ),
          ),
          transform: [
            {
              scale: phase.interpolate({
                inputRange: [0, 1],
                outputRange: to ? [1.15, 0.3] : [0.2, 1.15],
              }),
            },
          ],
        }}
      />
    );
  };

  return (
    <View
      style={{
        position: "absolute",
        left: spot.x - size / 2,
        top: spot.y - size / 2,
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {ring(0)}
      {ring(0.5)}
      <Animated.View
        style={{
          // "to" lands on a ring (a landing pad), "from" glows as a dot.
          width: to ? core * 1.7 : core,
          height: to ? core * 1.7 : core,
          borderRadius: core,
          backgroundColor: to ? rgba(PINK, 0.25) : GREEN,
          borderWidth: to ? 3.5 : 2.5,
          borderColor: to ? PINK : Colors.white,
          boxShadow: `0 0 0 1.5px ${rgba(DARK, 0.5)}, 0 0 ${core}px ${glow}`,
          opacity: presence,
          transform: [
            {
              scale: Animated.multiply(
                presence,
                ping.interpolate({
                  inputRange: [0, 0.15, 0.4, 1],
                  outputRange: [1, 1.25, 1, 1],
                }),
              ),
            },
          ],
        }}
      />
    </View>
  );
}

// —— Bubble ———————————————————————————————————————————————————————————

/**
 * The UFO's words. The tail points up (at the header's UFO, `tailX` along) or
 * to the side the flying UFO is on.
 */
function Bubble({
  text,
  tail,
  tailX = BUBBLE_WIDTH / 2,
}: {
  text: string;
  tail: "up" | "left" | "right";
  tailX?: number;
}) {
  return (
    <View style={bubbleStyle}>
      <View
        style={[
          tailStyle,
          tail === "up"
            ? {
                top: -7,
                left: Math.max(14, Math.min(BUBBLE_WIDTH - 26, tailX - 6)),
                transform: [{ rotate: "45deg" }],
              }
            : tail === "left"
              ? { left: -7, bottom: 12, transform: [{ rotate: "-45deg" }] }
              : { right: -7, bottom: 12, transform: [{ rotate: "135deg" }] },
        ]}
      />
      <Text style={bubbleTextStyle}>{text}</Text>
    </View>
  );
}

// —— Beams ————————————————————————————————————————————————————————————

/**
 * The tractor beam: a column of light from the UFO down onto the card, nearly
 * as wide at the top as at the bottom, bright down its middle and soft at its
 * edges. Cones of light pick it out: a hot one inside it, under the UFO, and
 * a faint one spreading outside it. It ends in a pool of light on the card.
 */
function TractorBeam({ lift, value }: { lift: number; value: Animated.Value }) {
  const top = UFO_FONT_SIZE * 0.3;
  const width = BEAM_WIDTH;
  const neck = width * BEAM_NECK;
  // The haze and the pool spread wider than the beam itself.
  const spread = width * 1.7;
  const pool = spread * 0.14;
  const base = lift - top;
  const height = base + pool;
  const middle = spread / 2;
  /** A cone down the middle, `from` wide under the UFO and `to` on the card. */
  const cone = (from: number, to: number, end = base) =>
    `M${middle - from / 2},0 L${middle + from / 2},0 L${middle + to / 2},${end} L${middle - to / 2},${end} Z`;
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: -middle,
        top,
        width: spread,
        height,
        opacity: value,
        transformOrigin: "top",
        transform: [{ scaleY: value }],
        pointerEvents: "none",
      }}
    >
      <Svg width={spread} height={height}>
        <Defs>
          <LinearGradient id="beamHaze" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={BEAM} stopOpacity={0} />
            <Stop offset="0.5" stopColor={BEAM} stopOpacity={0.3} />
            <Stop offset="1" stopColor={BEAM} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="beamColumn" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={BEAM} stopOpacity={0.15} />
            <Stop offset="0.5" stopColor={BEAM} stopOpacity={0.8} />
            <Stop offset="1" stopColor={BEAM} stopOpacity={0.15} />
          </LinearGradient>
          <LinearGradient id="beamCore" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.white} stopOpacity={0.9} />
            <Stop offset="0.5" stopColor={BEAM_LIGHT} stopOpacity={0.3} />
            <Stop offset="1" stopColor={BEAM_LIGHT} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id="beamPool">
            <Stop offset="0" stopColor={Colors.white} stopOpacity={0.9} />
            <Stop offset="0.4" stopColor={BEAM_LIGHT} stopOpacity={0.6} />
            <Stop offset="1" stopColor={BEAM} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={cone(neck, spread)} fill="url(#beamHaze)" />
        <Path d={cone(neck, width)} fill="url(#beamColumn)" />
        <Path
          d={cone(neck * 0.6, width * 0.5, base * 0.75)}
          fill="url(#beamCore)"
        />
        <Ellipse
          cx={middle}
          cy={base}
          rx={middle}
          ry={pool}
          fill="url(#beamPool)"
        />
      </Svg>
    </Animated.View>
  );
}

/** The zap: a quick bolt down onto a button or card, with a flash. */
function Zap({ lift, value }: { lift: number; value: Animated.Value }) {
  const top = UFO_FONT_SIZE * 0.3;
  const flash = 26;
  return (
    <>
      <Animated.View
        style={{
          position: "absolute",
          left: -2,
          top,
          width: 4,
          height: lift - top,
          borderRadius: 2,
          backgroundColor: Colors.white,
          boxShadow: `0 0 8px 2px ${GREEN}`,
          opacity: value,
          transformOrigin: "top",
          transform: [{ scaleY: value }],
          pointerEvents: "none",
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          left: -flash / 2,
          top: lift - flash / 2,
          width: flash,
          height: flash,
          borderRadius: flash / 2,
          backgroundColor: rgba(GREEN, 0.8),
          borderWidth: 2,
          borderColor: Colors.white,
          opacity: value.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [0, 0, 1],
          }),
          transform: [
            {
              scale: value.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0.2, 0.2, 1.3],
              }),
            },
          ],
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// —— The flight ———————————————————————————————————————————————————————

/** One flight's controls: everything it waits on stops when it's called off. */
class Flight {
  aborted = false;
  private stops = new Set<() => void>();

  abort() {
    if (this.aborted) return;
    this.aborted = true;
    this.stops.forEach((stop) => stop());
    this.stops.clear();
  }

  run(animation: Animated.CompositeAnimation) {
    if (this.aborted) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const stop = () => animation.stop();
      this.stops.add(stop);
      animation.start(({ finished }) => {
        this.stops.delete(stop);
        resolve(finished && !this.aborted);
      });
    });
  }

  wait(ms: number) {
    if (this.aborted) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const stop = () => {
        clearTimeout(timer);
        resolve(false);
      };
      const timer = setTimeout(() => {
        this.stops.delete(stop);
        resolve(!this.aborted);
      }, ms);
      this.stops.add(stop);
    });
  }
}

/** Taps a target once the board takes taps again (cards may be moving). */
async function tapWhenFree(board: HintBoard, target: HintTarget, hint: Hint) {
  for (let tries = 0; tries < 30 && isBoardInputLocked(); tries += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  try {
    return board.tap(target, hint);
  } catch (error) {
    if (__DEV__) console.warn("Autopilot tap failed", error);
    return false;
  }
}

/** Lets the game take in a tap (re-render with what it selected). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 90));

/** Two frames: long enough for the game to re-render after a tap. */
const nextFrames = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );

type FlightStop = { key: string; spot: HintSpot; kind: BeaconKind };

// —— HintUfo ——————————————————————————————————————————————————————————

/**
 * Shows the header UFO's hints over the game screen. Mounted once by
 * GameWrapper, above the board and header, below the win box.
 */
export function HintUfo({ onAutopilotMove }: { onAutopilotMove: () => void }) {
  const { t: translate } = useTranslation("game");
  const t = translate as unknown as Translate;
  const { width: screenWidth } = useViewportDimensions();
  const call = useLastHintCall();
  const active = useActiveHint();
  const root = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });

  const measureRoot = () =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 100);
      root.current?.measureInWindow?.((x, y) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          origin.current = { x, y };
        }
        clearTimeout(timer);
        resolve();
      });
    });
  const toLocal = (spot: HintSpot): HintSpot => ({
    ...spot,
    x: spot.x - origin.current.x,
    y: spot.y - origin.current.y,
  });

  // —— Beacons ——
  const [beacons, setBeacons] = useState<{
    id: number;
    hasHint: boolean;
    /** Whether the bubble under the dock shows the hint's words. */
    says: boolean;
    spots: { key: string; spot: HintSpot; delay: number; kind: BeaconKind }[];
    text: string;
    dock: HintSpot | null;
  } | null>(null);

  // —— Autopilot ——
  const flightRef = useRef<Flight | null>(null);
  const [flying, setFlying] = useState(false);
  const [interruptible, setInterruptible] = useState(false);
  const [stop, setStop] = useState<FlightStop | null>(null);
  const [effect, setEffect] = useState<"beam" | "zap" | null>(null);
  const [lift, setLift] = useState(60);
  const [bubble, setBubble] = useState<{
    text: string;
    side: "left" | "right";
  } | null>(null);
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const beam = useRef(new Animated.Value(0)).current;
  const zap = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  const latest = useRef({ t, screenWidth, onAutopilotMove });
  latest.current = { t, screenWidth, onAutopilotMove };

  // The UFO bobs gently while it's out.
  useEffect(() => {
    if (!flying) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, flying]);

  // A press of the header's UFO.
  const handledCall = useRef(call?.id);
  useEffect(() => {
    if (!call || call.id === handledCall.current) return;
    handledCall.current = call.id;
    if (call.mode === "autopilot") {
      if (!flightRef.current) void flyHint(call.hint);
      return;
    }
    void showBeacons(call.id, call.hint);
  }, [call]);

  // Beacons go as soon as their hint does (a move, an undo, a new deal).
  useEffect(() => {
    if (beacons?.hasHint && active?.id !== beacons.id) setBeacons(null);
  }, [active, beacons]);

  useEffect(() => {
    if (!beacons) return;
    const lastDelay = beacons.spots.reduce(
      (max, spot) => Math.max(max, spot.delay),
      0,
    );
    const timer = setTimeout(
      () => setBeacons((current) => (current === beacons ? null : current)),
      beacons.hasHint ? beaconsDuration(lastDelay) + 100 : NOTHING_TO_SAY_MS,
    );
    return () => clearTimeout(timer);
  }, [beacons]);

  // Called off when the game goes.
  useEffect(
    () => () => {
      flightRef.current?.abort();
      setHintUfoOut(false);
    },
    [],
  );

  async function showBeacons(id: number, hint: Hint | null) {
    const board = getHintBoard();
    await Promise.all([board?.measure(), measureRoot()]);
    const dock = await measureHintDock();
    const text = hintText(latest.current.t, hint);
    AccessibilityInfo.announceForAccessibility?.(text);
    const spots =
      hint && board
        ? hint.steps.flatMap((step, stepIndex) =>
            step.flatMap((target, targetIndex) => {
              const spot = board.locate(target);
              return spot
                ? [
                    {
                      key: `${id}-${stepIndex}-${targetIndex}`,
                      spot: toLocal(spot),
                      delay: stepIndex * STEP_DELAY_MS,
                      kind: beaconKind(hint, stepIndex),
                    },
                  ]
                : [];
            }),
          )
        : [];
    setBeacons({
      id,
      hasHint: !!hint,
      says: saysText(hint),
      spots,
      text,
      dock: dock && toLocal(dock),
    });
  }

  async function flyHint(hint: Hint | null) {
    const flight = new Flight();
    flightRef.current = flight;
    setBeacons(null);
    const board = getHintBoard();
    await Promise.all([board?.measure(), measureRoot()]);
    const measuredDock = await measureHintDock();
    const { t: translate, screenWidth: width } = latest.current;
    const dock = measuredDock
      ? toLocal(measuredDock)
      : { x: width - 60, y: 40, size: 40 };
    const text = hintText(translate, hint);
    AccessibilityInfo.announceForAccessibility?.(text);

    const sideFor = (x: number) => (x > width / 2 ? "left" : "right");
    let here = { x: dock.x, y: dock.y };
    const moveTo = (
      x: number,
      y: number,
      duration: number,
      easing = Easing.inOut(Easing.cubic),
    ) => {
      here = { x, y };
      return flight.run(
        Animated.timing(position, {
          toValue: { x, y },
          duration,
          easing,
          useNativeDriver,
        }),
      );
    };
    const flyOver = async (
      spot: HintSpot,
      duration?: number,
      easing?: (value: number) => number,
    ) => {
      const local = toLocal(spot);
      const up = hoverLift(local.size);
      setLift(up);
      if (saysText(hint)) setBubble({ text, side: sideFor(local.x) });
      const distance = Math.hypot(local.x - here.x, local.y - up - here.y);
      return moveTo(
        local.x,
        local.y - up,
        duration ?? Math.max(350, Math.min(900, distance * 1.1)),
        easing,
      );
    };

    // Out of the header.
    position.setValue(here);
    scale.setValue(0.6);
    opacity.setValue(1);
    beam.setValue(0);
    zap.setValue(0);
    setStop(null);
    setEffect(null);
    setBubble(null);
    setInterruptible(true);
    setFlying(true);
    setHintUfoOut(true);
    await flight.run(
      Animated.timing(scale, {
        toValue: 1,
        duration: POP_MS,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver,
      }),
    );

    let played = false;
    if (!hint || !board) {
      setBubble({ text, side: sideFor(dock.x) });
      await flight.wait(NOTHING_TO_SAY_MS);
    } else {
      const isMove = hint.steps.length >= 2;
      let grabbed: HintTarget | null = null;
      // Set once the card has gone where it's going.
      let carried = false;
      steps: for (const [stepIndex, step] of hint.steps.entries()) {
        for (const [targetIndex, target] of step.entries()) {
          if (flight.aborted) break steps;
          const key = `${stepIndex}-${targetIndex}`;

          if (isMove && stepIndex > 0) {
            if (carried) continue;
            // Carry the card across: tap where it goes, then follow it.
            const destination = board.locate(target);
            if (!(await tapWhenFree(board, target, hint))) break steps;
            played = true;
            setInterruptible(false);
            // Where the card lands shows once the game has taken the tap, a
            // frame or two, which is also when the card sets off. The UFO
            // flies there in the card's own time and easing (AnimatedCard's
            // timed move), so the beam keeps hold of it all the way.
            await nextFrames();
            const landed =
              (grabbed && "card" in grabbed && board.locate(grabbed)) ||
              destination;
            if (landed) {
              setStop({ key, spot: toLocal(landed), kind: "to" });
              await flyOver(
                landed,
                defaultAnimDuration,
                Easing.out(Easing.quad),
              );
            }
            continue;
          }

          const spot = board.locate(target);
          if (!spot) break steps;
          setStop({
            key,
            spot: toLocal(spot),
            kind: beaconKind(hint, stepIndex),
          });
          if (!(await flyOver(spot))) break steps;

          if (isMove) {
            // Tractor beam on; nothing is tapped until it's ready to carry,
            // so calling it off before then leaves the game as it was.
            setEffect("beam");
            await flight.run(
              Animated.timing(beam, {
                toValue: 1,
                duration: BEAM_MS,
                easing: Easing.out(Easing.quad),
                useNativeDriver,
              }),
            );
            if (!(await flight.wait(BEAM_HOLD_MS))) break steps;
            setInterruptible(false);
            if (!(await tapWhenFree(board, target, hint))) break steps;
            grabbed = target;
            // In a game that moves a card on one tap, it is already on its
            // way: the UFO goes with it, in the card's own time and easing,
            // and where it goes isn't tapped as well (that tap would be a
            // second move, or at least a second step to undo).
            await nextFrames();
            const landed = "card" in target ? board.locate(target) : null;
            if (
              landed &&
              Math.hypot(landed.x - spot.x, landed.y - spot.y) > spot.size / 2
            ) {
              carried = true;
              played = true;
              setStop({ key: `${key}-to`, spot: toLocal(landed), kind: "to" });
              await flyOver(
                landed,
                defaultAnimDuration,
                Easing.out(Easing.quad),
              );
              continue;
            }
            await settle();
          } else {
            setEffect("zap");
            zap.setValue(0);
            if (
              !(await flight.run(
                Animated.timing(zap, {
                  toValue: 1,
                  duration: ZAP_MS,
                  easing: Easing.in(Easing.quad),
                  useNativeDriver,
                }),
              ))
            ) {
              break steps;
            }
            setInterruptible(false);
            if (!(await tapWhenFree(board, target, hint))) break steps;
            played = true;
            await settle();
            Animated.timing(zap, {
              toValue: 0,
              duration: ZAP_MS,
              useNativeDriver,
            }).start();
          }
        }
      }
    }
    if (played) latest.current.onAutopilotMove();

    // Home again. A flight called off still gets home, just at once.
    const home = new Flight();
    flightRef.current = home;
    setInterruptible(false);
    Animated.timing(beam, {
      toValue: 0,
      duration: BEAM_MS,
      useNativeDriver,
    }).start();
    await home.wait(flight.aborted ? 0 : HOME_DELAY_MS);
    setEffect(null);
    setStop(null);
    setBubble(null);
    await home.run(
      Animated.parallel([
        Animated.timing(position, {
          toValue: { x: dock.x, y: dock.y },
          duration: 600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver,
        }),
        Animated.timing(scale, {
          toValue: 0.6,
          duration: 600,
          easing: Easing.in(Easing.quad),
          useNativeDriver,
        }),
      ]),
    );
    opacity.setValue(0);
    setFlying(false);
    setHintUfoOut(false);
    if (flightRef.current === home) flightRef.current = null;
  }

  const bubbleLeft = (dock: HintSpot) =>
    Math.max(
      12,
      Math.min(screenWidth - BUBBLE_WIDTH - 12, dock.x - BUBBLE_WIDTH / 2),
    );

  return (
    <View
      ref={root}
      collapsable={false}
      style={[
        pointerEventsStyles.boxNone,
        {
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: LayerZIndexes.hintUfo,
        },
      ]}
    >
      {beacons?.spots.map(({ key, spot, delay, kind }) => (
        <Beacon key={key} spot={spot} delay={delay} kind={kind} />
      ))}
      {beacons?.dock && beacons.says && (
        <View
          style={{
            position: "absolute",
            top: beacons.dock.y + beacons.dock.size / 2 + 10,
            left: bubbleLeft(beacons.dock),
            pointerEvents: "none",
          }}
        >
          <Bubble
            text={beacons.text}
            tail="up"
            tailX={beacons.dock.x - bubbleLeft(beacons.dock)}
          />
        </View>
      )}

      {flying && stop && (
        <Beacon key={stop.key} spot={stop.spot} kind={stop.kind} pings={2} />
      )}

      {/* Tapping anywhere calls the UFO home, until it acts. */}
      {flying && (
        <Pressable
          accessible={false}
          onPress={() => {
            if (interruptible) flightRef.current?.abort();
          }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        />
      )}

      {flying && (
        <Animated.View
          testID="hint-ufo"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            opacity,
            transform: [{ translateX: position.x }, { translateY: position.y }],
            pointerEvents: "none",
          }}
        >
          {effect === "beam" && <TractorBeam lift={lift} value={beam} />}
          {effect === "zap" && <Zap lift={lift} value={zap} />}
          <Animated.Text
            style={{
              position: "absolute",
              left: -UFO_FONT_SIZE * 0.7,
              top: -UFO_FONT_SIZE * 0.7,
              width: UFO_FONT_SIZE * 1.4,
              textAlign: "center",
              fontSize: UFO_FONT_SIZE,
              lineHeight: UFO_FONT_SIZE * 1.4,
              ...textShadow(rgba(GREEN, 0.7), 10),
              transform: [
                { scale },
                {
                  translateY: bob.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-2.5, 2.5],
                  }),
                },
              ],
            }}
          >
            🛸
          </Animated.Text>
          {bubble && (
            <View
              style={{
                position: "absolute",
                bottom: 6,
                ...(bubble.side === "right"
                  ? { left: UFO_FONT_SIZE * 0.8 }
                  : { right: UFO_FONT_SIZE * 0.8 }),
              }}
            >
              <Bubble
                text={bubble.text}
                tail={bubble.side === "right" ? "left" : "right"}
              />
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const bubbleStyle = {
  width: BUBBLE_WIDTH,
  backgroundColor: rgba(Colors.K950, 0.95),
  borderColor: rgba(UfoColors.green, 0.4),
  borderWidth: 1,
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

const tailStyle = {
  position: "absolute" as const,
  width: 12,
  height: 12,
  backgroundColor: rgba(Colors.K950, 0.95),
  borderColor: rgba(UfoColors.green, 0.4),
  borderTopWidth: 1,
  borderLeftWidth: 1,
};

const bubbleTextStyle = {
  color: Colors.K100,
  fontFamily: FontWeight[400],
  fontSize: 13,
  lineHeight: 17,
  textAlign: "center" as const,
};
