import FlyingSaucer from "@/assets/images/flying-saucer.svg";
import { isBoardInputLocked } from "@/components/Cards/input-lock";
import { defaultAnimDuration } from "@/constants/animation";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons/Icon";
import { usePalette } from "@/styles/palette";
import {
  Colors,
  layoutDims,
  FontWeight,
  LayerZIndexes,
  rgba,
  UfoColors,
  UfoEffectColors,
} from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import type { Hint, HintTarget } from "./hint";
import {
  getHintBoard,
  measureHintDock,
  setHintUfoHovering,
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
 *   UFO, and the beacons keep pinging until it has been up READ_MS. The
 *   UFO stays home but hovers over its button while they're lit.
 * - Autopilot: the UFO flies out of the header to the hint and plays it. To
 *   move a card, it hovers over it, switches on its tractor beam and carries
 *   it across; to press a button or tap a card, it zaps it. Then it flies
 *   home. A note rides along in its bubble: the UFO hovers over the first
 *   target until the note has been up READ_MS, then plays on. Tapping
 *   anywhere before it acts sends it home without playing.
 *
 * It plays a hint by tapping its targets as a player would (HintBoard.tap),
 * so nothing in a game knows Autopilot is there.
 */

/** What to pick up, tap or press: the UFO's own green. */
const GREEN = UfoEffectColors.green;
const BEACON_INK = UfoEffectColors.greenGlow;
const PINK_INK = UfoEffectColors.pinkGlow;
/** The tractor beam that carries a card across, in shades of blue. */
const BEAM = UfoEffectColors.blue;
const BEAM_DEEP = UfoEffectColors.blueGlow;
const BEAM_PALE = "#9fe0ff";
const DARK = Colors.K950;
const useNativeDriver = Platform.OS !== "web";

// Beacons
const STEP_DELAY_MS = 1000;
const APPEAR_MS = 200;
const PING_MS = 1250;
const PINGS = 4;
/** The two colours a beacon alternates between, from the UFO's palette. */
const GREEN_TINTS = [UfoEffectColors.green, UfoEffectColors.blue] as const;
const PINK_TINTS = [UfoEffectColors.pink, UfoEffectColors.rose] as const;
/** One round of a beacon's colour shift, there and back. */
const TINT_MS = 1400;
/** The cue ring that opens a beacon: one big sweep, so it catches the eye. */
/** How long the burst has the beacon to itself. */
/** The laser's reach from the header's UFO to a beacon, and its fade after. */
const LASER_MS = 100;
const LASER_FADE_MS = 200;
const BURST_LEAD_MS = 100;
const BURST_MS = 1100;
const BURST_SCALE = 3;
const FADE_MS = 300;

// The flying UFO
const UFO_FONT_SIZE = 34;
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
/**
 * Where the beam and the zap start, below the UFO's middle: up inside its
 * disc, so the saucer (drawn over them) hides the beam's flat top.
 */
const BEAM_TOP = UFO_FONT_SIZE * 0.1;
const ZAP_MS = 180;
/**
 * Hints show only where to look, not words: the move speaks for itself, and
 * games would otherwise each need their own messages. A hint with a note
 * (a move worth explaining) says it, and "No hint available" always shows.
 */
const SHOW_HINT_TEXT = false;
/** How long words stay up, long or short, so there's time to read them. */
export const READ_MS = 4000;
const HOME_DELAY_MS = 450;
const BUBBLE_WIDTH = 200;

/** Pings enough for the beacons to last READ_MS when there are words. */
function beaconPings(says: boolean) {
  return says
    ? Math.max(PINGS, Math.ceil((READ_MS - APPEAR_MS - FADE_MS) / PING_MS))
    : PINGS;
}

function beaconsDuration(lastDelay: number, says: boolean) {
  return (
    lastDelay + LASER_MS + APPEAR_MS + beaconPings(says) * PING_MS + FADE_MS
  );
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
 * rings ping out of a bright core. "to" (where it goes): the same, in purple,
 * but the rings close in on the core.
 */
function Beacon({
  spot,
  kind,
  delay = 0,
  pings = PINGS,
  laserFrom,
}: {
  spot: HintSpot;
  kind: BeaconKind;
  delay?: number;
  pings?: number;
  /** Where a laser comes from (the header's UFO), in the same space as the spot. */
  laserFrom?: { x: number; y: number } | null;
}) {
  const to = kind === "to";
  const glow = to ? PINK_INK : BEACON_INK;
  const size = Math.max(64, spot.size * 1.5);
  const core = Math.max(13.6, Math.round(spot.size * 0.22 * 0.85));
  const presence = useRef(new Animated.Value(0)).current;
  const ping = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  // 0 to 1 the laser reaches out to the target, 1 to 2 it fades.
  const laser = useRef(new Animated.Value(0)).current;
  const hasLaser = !!laserFrom;
  // One clock for every colour in the beacon, so its rings and dot match.
  const tint = useRef(new Animated.Value(0)).current;
  const tints = to ? PINK_TINTS : GREEN_TINTS;

  useEffect(() => {
    const shift = Animated.loop(
      Animated.timing(tint, {
        toValue: 1,
        duration: TINT_MS,
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    shift.start();
    return () => shift.stop();
  }, [tint]);

  // One layer per colour, fading in and out in turn: the native driver
  // can't animate a colour itself.
  const tinted = (layer: (color: string) => object) =>
    tints.map((color, index) => (
      <Animated.View
        key={color}
        style={[
          { position: "absolute", width: size, height: size },
          layer(color),
          {
            opacity: tint.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: index === 0 ? [1, 0, 1] : [0, 1, 0],
            }),
          },
        ]}
      />
    ));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(laser, {
        toValue: 1,
        duration: hasLaser ? LASER_MS : 0,
        easing: Easing.out(Easing.quad),
        useNativeDriver,
      }),
      Animated.parallel([
        Animated.timing(laser, {
          toValue: 2,
          duration: hasLaser ? LASER_FADE_MS : 0,
          useNativeDriver,
        }),
        // The burst announces the beacon: it goes first, and the rest follows.
        Animated.timing(burst, {
          toValue: 1,
          duration: BURST_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
        Animated.sequence([
          Animated.delay(BURST_LEAD_MS),
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
        ]),
      ]),
      Animated.timing(presence, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [burst, delay, hasLaser, laser, ping, pings, presence]);

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
          opacity: Animated.multiply(
            presence,
            phase.interpolate(
              to
                ? {
                    inputRange: [0, 0.2, 0.85, 1],
                    outputRange: [0, 0.85, 0.68, 0],
                  }
                : {
                    inputRange: [0, 0.1, 0.7, 1],
                    outputRange: [0, 0.85, 0.7225, 0],
                  },
            ),
          ),
          transform: [
            {
              scale: phase.interpolate({
                inputRange: [0, 1],
                outputRange: to ? [0.9775, 0.255] : [0.17, 0.9775],
              }),
            },
          ],
        }}
      >
        {tinted((color) => ({
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          // A dark edge keeps the ring clear on pale cards.
          boxShadow: `0 0 0 1px ${rgba(DARK, 0.45)}`,
        }))}
      </Animated.View>
    );
  };

  // Once, as the beacon appears: a ring far bigger than the rest, growing
  // out ("from") or closing in ("to"), to draw the eye from across the screen.
  const burstRing = (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        opacity: burst.interpolate({
          inputRange: [0, 0.1, 0.75, 1],
          outputRange: [0, 1, 0.9, 0],
        }),
        transform: [
          {
            scale: burst.interpolate({
              inputRange: [0, 1],
              outputRange: to ? [BURST_SCALE, 0.3] : [0.2, BURST_SCALE],
            }),
          },
        ],
      }}
    >
      {tinted((color) => ({
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: color,
      }))}
    </Animated.View>
  );

  // A thin line from the UFO to the target, drawn out from the UFO's end.
  const beam = laserFrom
    ? (() => {
        const dx = spot.x - laserFrom.x;
        const dy = spot.y - laserFrom.y;
        const length = Math.hypot(dx, dy);
        return (
          <Animated.View
            style={{
              position: "absolute",
              left: size / 2 - dx,
              top: size / 2 - dy - LASER_HEIGHT / 2,
              width: length,
              height: LASER_HEIGHT,
              transformOrigin: "left center",
              opacity: laser.interpolate({
                inputRange: [0, 0.05, 1, 2],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                { rotate: `${Math.atan2(dy, dx)}rad` },
                {
                  scaleX: laser.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, 1, 1],
                  }),
                },
              ],
            }}
          >
            <LaserBeam length={length} tints={tints} tint={tint} />
          </Animated.View>
        );
      })()
    : null;

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
      {beam}
      {burstRing}
      {ring(0)}
      {ring(0.5)}
      <Animated.View
        style={{
          width: core,
          height: core,
          borderRadius: core,
          overflow: "hidden",
          borderWidth: 2.5,
          borderColor: Colors.white,
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
      >
        {tinted((color) => ({
          backgroundColor: color,
          width: "100%",
          height: "100%",
        }))}
      </Animated.View>
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

/** The laser's wave: how far it swings, and how long one wave is. */
const LASER_AMPLITUDE = 2;
const LASER_WAVELENGTH = 40;
const LASER_HEIGHT = LASER_AMPLITUDE * 2 + 10;
const FLOW_MS = 700;

/** A value that runs 0 to 1, over and over, until the component goes. */
function useLoop(duration: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, value]);
  return value;
}

/** Two layers, one per colour, that fade into each other and back with `tint`. */
function shifting(
  tint: Animated.Value,
  colors: readonly [string, string],
  layer: (color: string) => React.ReactNode,
) {
  return colors.map((color, index) => (
    <Animated.View
      key={color}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        opacity: tint.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: index === 0 ? [1, 0, 1] : [0, 1, 0],
        }),
      }}
    >
      {layer(color)}
    </Animated.View>
  ));
}

/** A sine wave along x, `phase` radians in, as an SVG path. */
function wavePath(length: number, phase: number) {
  const points: string[] = [];
  for (let x = 0; x <= length; x += 2) {
    const y =
      LASER_HEIGHT / 2 +
      LASER_AMPLITUDE * Math.sin((x / LASER_WAVELENGTH) * 2 * Math.PI + phase);
    points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

/**
 * A laser along x, `length` long: a hard white core, with two strands of
 * coloured light winding about it in a sine wave that flows along the beam,
 * and a soft glow around all of it. Its colour shifts between `colors`.
 */
function LaserBeam({
  length,
  tints,
  tint,
}: {
  length: number;
  tints: readonly [string, string];
  tint: Animated.Value;
}) {
  const flow = useLoop(FLOW_MS);
  // Drawn a wave longer at each end, and slid one wave along: seamless.
  const total = length + LASER_WAVELENGTH * 2;
  const paths = useMemo(
    () => [wavePath(total, 0), wavePath(total, Math.PI)],
    [total],
  );
  return (
    <View
      style={{
        width: length,
        height: LASER_HEIGHT,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {shifting(tint, tints, (color) => (
        <Animated.View
          style={{
            position: "absolute",
            left: -LASER_WAVELENGTH,
            width: total,
            height: LASER_HEIGHT,
            transform: [
              {
                translateX: flow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, LASER_WAVELENGTH],
                }),
              },
            ],
          }}
        >
          <Svg width={total} height={LASER_HEIGHT}>
            <Path
              d={paths[0]}
              stroke={color}
              strokeWidth={6}
              strokeOpacity={0.18}
              fill="none"
            />
            <Path
              d={paths[0]}
              stroke={color}
              strokeWidth={1.6}
              strokeOpacity={0.95}
              fill="none"
            />
            <Path
              d={paths[1]}
              stroke={color}
              strokeWidth={1.6}
              strokeOpacity={0.6}
              fill="none"
            />
          </Svg>
        </Animated.View>
      ))}
      <Svg
        width={length}
        height={LASER_HEIGHT}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Line
          x1={0}
          y1={LASER_HEIGHT / 2}
          x2={length}
          y2={LASER_HEIGHT / 2}
          stroke={Colors.white}
          strokeWidth={1}
          strokeOpacity={0.95}
        />
      </Svg>
    </View>
  );
}

/**
 * The tractor beam: a column of light from the UFO down onto the card, nearly
 * as wide at the top as at the bottom, bright down its middle and soft at its
 * edges. Cones of light pick it out: a hot one inside it, under the UFO, and
 * a faint one spreading outside it. It ends in a pool of light on the card.
 */
function TractorBeam({ lift, value }: { lift: number; value: Animated.Value }) {
  const top = BEAM_TOP;
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
  /** A cone's fill: bright to the sides' edges at `edge`, `centre` in the middle. */
  const across = (id: string, color: string, edge: number, centre: number) => (
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <Stop offset="0" stopColor={color} stopOpacity={edge} />
      <Stop offset="0.5" stopColor={color} stopOpacity={centre} />
      <Stop offset="1" stopColor={color} stopOpacity={edge} />
    </LinearGradient>
  );
  /** A cone's fill that fades out down its length. */
  const down = (id: string, color: string, start: number, end: number) => (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor={color} stopOpacity={start} />
      <Stop offset="1" stopColor={color} stopOpacity={end} />
    </LinearGradient>
  );
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
          {across("beamHaze", BEAM_DEEP, 0, 0.35)}
          {across("beamColumn", BEAM, 0.12, 0.7)}
          {across("beamSheen", BEAM_PALE, 0, 0.55)}
          {down("beamCore", Colors.white, 0.95, 0)}
          {down("beamThread", Colors.white, 1, 0.35)}
          {down("beamGlint", BEAM_PALE, 0.7, 0)}
          <RadialGradient id="beamPool">
            <Stop offset="0" stopColor={Colors.white} stopOpacity={0.9} />
            <Stop offset="0.4" stopColor={BEAM_PALE} stopOpacity={0.6} />
            <Stop offset="1" stopColor={BEAM} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* Deep blue, wide and faint, for depth. */}
        <Path d={cone(neck, spread)} fill="url(#beamHaze)" />
        <Path d={cone(neck, width)} fill="url(#beamColumn)" />
        {/* A paler cone, narrowing to the card. */}
        <Path d={cone(neck * 0.85, width * 0.6)} fill="url(#beamSheen)" />
        {/* A faint pale one flaring out under the UFO. */}
        <Path
          d={cone(neck * 0.3, width * 0.95, base * 0.55)}
          fill="url(#beamGlint)"
        />
        {/* Hot white ones: a wide one fading down, a thread right through. */}
        <Path
          d={cone(neck * 0.6, width * 0.5, base * 0.75)}
          fill="url(#beamCore)"
        />
        <Path d={cone(neck * 0.14, width * 0.12)} fill="url(#beamThread)" />
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
  const top = BEAM_TOP;
  const flash = 26;
  const tint = useLoop(TINT_MS);
  const length = lift - top;
  return (
    <>
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: top - LASER_HEIGHT / 2,
          width: length,
          height: LASER_HEIGHT,
          opacity: value,
          transformOrigin: "left center",
          transform: [{ rotate: "90deg" }, { scaleX: value }],
          pointerEvents: "none",
        }}
      >
        <LaserBeam length={length} tints={GREEN_TINTS} tint={tint} />
      </Animated.View>
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

// —— The UFO ————————————————————————————————————————————————————————————

type AnimatedNumber =
  number | Animated.AnimatedInterpolation<number> | Animated.Value;

/**
 * The UFO itself, in a soft green glow. Out and about, it's the flying
 * saucer, its pilot waving from under the dome; on its button, it's the
 * header's icon.
 * It turns from one into the other as it lifts off and lands.
 */
function UfoGlyph({
  size,
  glowing = 1,
  saucer = 1,
}: {
  size: number;
  /** How much of its glow shows (it fades in as it lifts off its button). */
  glowing?: AnimatedNumber;
  /** 1 for the flying saucer, 0 for the header's icon. */
  saucer?: AnimatedNumber;
}) {
  const palette = usePalette();
  const glow = size * 1.6;
  const icon =
    typeof saucer === "number"
      ? 1 - saucer
      : saucer.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          position: "absolute",
          left: (size - glow) / 2,
          top: (size - glow) / 2,
          opacity: glowing,
        }}
      >
        <Svg width={glow} height={glow}>
          <Defs>
            <RadialGradient id="ufoGlow">
              <Stop offset="0" stopColor={GREEN} stopOpacity={0.55} />
              <Stop offset="0.6" stopColor={GREEN} stopOpacity={0.18} />
              <Stop offset="1" stopColor={GREEN} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={glow / 2}
            cy={glow / 2}
            rx={glow / 2}
            ry={glow / 2}
            fill="url(#ufoGlow)"
          />
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: "absolute", opacity: icon }}>
        <Icon name="ufo" size={size} color={palette.accent} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", opacity: saucer }}>
        <FlyingSaucer width={size} height={size} />
      </Animated.View>
    </View>
  );
}

/** One hover: a bob up and down, twice, and a swing from side to side. */
const HOVER_MS = 2600;
const HOVER_IN_MS = 300;
const HOVER_OUT_MS = 250;
const HOVER_LIFT = 3;
const HOVER_DRIFT = 2.5;
const HOVER_SWING_DEG = 7;

/** sin(2π·turns·t) at a few points, for an interpolation over a loop. */
function wave(turns: number) {
  const inputRange = Array.from({ length: 17 }, (_, index) => index / 16);
  return {
    inputRange,
    outputRange: inputRange.map((t) => Math.sin(2 * Math.PI * turns * t)),
  };
}

/**
 * Beacons mode: the header's UFO doesn't fly off, but it comes alive while
 * the beacons are lit, hovering over its button: bobbing, drifting and
 * swinging a little, as it does when it flies (Autopilot). It eases into the
 * hover and back to rest, so it leaves and lands on the button's icon.
 */
function HoverUfo({
  dock,
  size,
  hovering,
  onRest,
}: {
  dock: HintSpot;
  size: number;
  hovering: boolean;
  onRest: () => void;
}) {
  const time = useRef(new Animated.Value(0)).current;
  const amount = useRef(new Animated.Value(0)).current;
  const latestOnRest = useRef(onRest);
  latestOnRest.current = onRest;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(time, {
        toValue: 1,
        duration: HOVER_MS,
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [time]);

  useEffect(() => {
    const animation = Animated.timing(amount, {
      toValue: hovering ? 1 : 0,
      duration: hovering ? HOVER_IN_MS : HOVER_OUT_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver,
    });
    animation.start(({ finished }) => {
      if (finished && !hovering) latestOnRest.current();
    });
    return () => animation.stop();
  }, [amount, hovering]);

  const swing = Animated.multiply(amount, time.interpolate(wave(1)));
  const bob = Animated.multiply(amount, time.interpolate(wave(2)));
  return (
    <Animated.View
      testID="hint-ufo-hover"
      style={{
        position: "absolute",
        left: dock.x - size / 2,
        top: dock.y - size / 2,
        pointerEvents: "none",
        transform: [
          {
            translateX: swing.interpolate({
              inputRange: [-1, 1],
              outputRange: [-HOVER_DRIFT, HOVER_DRIFT],
            }),
          },
          {
            // Up off the button, then bobbing about there.
            translateY: Animated.add(
              Animated.multiply(amount, -HOVER_LIFT),
              bob.interpolate({
                inputRange: [-1, 1],
                outputRange: [-HOVER_LIFT / 2, HOVER_LIFT / 2],
              }),
            ),
          },
          {
            rotate: swing.interpolate({
              inputRange: [-1, 1],
              outputRange: [`-${HOVER_SWING_DEG}deg`, `${HOVER_SWING_DEG}deg`],
            }),
          },
        ],
      }}
    >
      <UfoGlyph size={size} glowing={amount} saucer={amount} />
    </Animated.View>
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

// —— HintUfo ——————————————————————————————————————————————————————————

/**
 * Shows the header UFO's hints over the game screen. Mounted once by
 * GameWrapper, above the board and header, below the win box.
 */
export function HintUfo({ onAutopilotMove }: { onAutopilotMove: () => void }) {
  const { t: translate } = useTranslation("game");
  const t = translate as unknown as Translate;
  const { width: screenWidth } = useViewportDimensions();
  const { spacing } = useResponsiveMetrics();
  /** The header button's icon, which the UFO leaves as and lands back as. */
  const dockIconSize = spacing(layoutDims.menuIconSize);
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

  /** Beacons mode: the header's UFO hovers over its button while they're lit. */
  const [hover, setHover] = useState<{
    dock: HintSpot;
    hovering: boolean;
  } | null>(null);

  // —— Autopilot ——
  const flightRef = useRef<Flight | null>(null);
  const [flying, setFlying] = useState(false);
  const [interruptible, setInterruptible] = useState(false);
  const [effect, setEffect] = useState<"beam" | "zap" | null>(null);
  const [lift, setLift] = useState(60);
  const [bubble, setBubble] = useState<{
    text: string;
    side: "left" | "right";
  } | null>(null);
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(0)).current;
  /** The header's icon (0) turning into the flying saucer (1). */
  const saucer = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const beam = useRef(new Animated.Value(0)).current;
  const zap = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  const latest = useRef({ t, screenWidth, onAutopilotMove, dockIconSize });
  latest.current = { t, screenWidth, onAutopilotMove, dockIconSize };

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

  // The hover settles back onto the button once the beacons are out.
  useEffect(() => {
    if (!beacons)
      setHover((current) => current && { ...current, hovering: false });
  }, [beacons]);

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
      beacons.hasHint
        ? beaconsDuration(lastDelay, beacons.says) + 100
        : READ_MS,
    );
    return () => clearTimeout(timer);
  }, [beacons]);

  // Called off when the game goes.
  useEffect(
    () => () => {
      flightRef.current?.abort();
      setHintUfoOut(false);
      setHintUfoHovering(false);
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
    // Autopilot may have taken off while this was measuring.
    if (dock && !flightRef.current) {
      setHover({ dock: toLocal(dock), hovering: true });
      setHintUfoHovering(true);
    }
  }

  async function flyHint(hint: Hint | null) {
    const flight = new Flight();
    flightRef.current = flight;
    setBeacons(null);
    // Out of a hover (Beacons mode), it flies from where it is.
    setHover(null);
    setHintUfoHovering(false);
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
    // When the note went up: the UFO waits over the first target until it
    // has been up READ_MS.
    let saidAt: number | null = null;
    const flyOver = async (
      spot: HintSpot,
      duration?: number,
      easing?: (value: number) => number,
    ) => {
      const local = toLocal(spot);
      const up = hoverLift(local.size);
      setLift(up);
      if (saysText(hint)) {
        setBubble({ text, side: sideFor(local.x) });
        saidAt ??= Date.now();
      }
      const distance = Math.hypot(local.x - here.x, local.y - up - here.y);
      return moveTo(
        local.x,
        local.y - up,
        duration ?? Math.max(350, Math.min(900, distance * 1.1)),
        easing,
      );
    };

    // Out of the header.
    const docked = latest.current.dockIconSize / UFO_FONT_SIZE;
    position.setValue(here);
    scale.setValue(docked);
    saucer.setValue(0);
    opacity.setValue(1);
    beam.setValue(0);
    zap.setValue(0);
    setEffect(null);
    setBubble(null);
    setInterruptible(true);
    setFlying(true);
    setHintUfoOut(true);
    await flight.run(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: POP_MS,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver,
        }),
        Animated.timing(saucer, {
          toValue: 1,
          duration: POP_MS,
          useNativeDriver,
        }),
      ]),
    );

    let played = false;
    if (!hint || !board) {
      setBubble({ text, side: sideFor(dock.x) });
      await flight.wait(READ_MS);
    } else {
      const isMove = hint.steps.length >= 2;
      let grabbed: HintTarget | null = null;
      /** Where the grabbed card was picked up. */
      let grabbedAt: HintSpot | null = null;
      // Set once the card has gone where it's going.
      let carried = false;
      steps: for (const [stepIndex, step] of hint.steps.entries()) {
        for (const [targetIndex, target] of step.entries()) {
          if (flight.aborted) break steps;

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
            // The card, where it's going; if it hasn't left (the game
            // didn't take the move), where it should have gone.
            const moved =
              grabbed && "card" in grabbed ? board.locate(grabbed) : null;
            const landed =
              moved &&
              !(
                grabbedAt &&
                Math.hypot(moved.x - grabbedAt.x, moved.y - grabbedAt.y) <=
                  grabbedAt.size / 2
              )
                ? moved
                : destination;
            if (landed) {
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
          if (!(await flyOver(spot))) break steps;
          if (stepIndex === 0 && targetIndex === 0 && saidAt !== null) {
            const left = READ_MS - (Date.now() - saidAt);
            if (left > 0 && !(await flight.wait(left))) break steps;
          }

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
            grabbedAt = spot;
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
          toValue: docked,
          duration: 600,
          easing: Easing.in(Easing.quad),
          useNativeDriver,
        }),
        // Back into the header's icon as it lands.
        Animated.timing(saucer, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.cubic),
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
        <Beacon
          key={key}
          spot={spot}
          delay={delay}
          kind={kind}
          pings={beaconPings(beacons.says)}
          laserFrom={beacons.dock}
        />
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

      {hover && (
        <HoverUfo
          dock={hover.dock}
          size={dockIconSize}
          hovering={hover.hovering}
          onRest={() => {
            setHover((current) => (current?.hovering ? current : null));
            setHintUfoHovering(false);
          }}
        />
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
          {/* Over the beam and the zap, which start up inside it. */}
          <Animated.View
            style={{
              position: "absolute",
              zIndex: 1,
              left: -UFO_FONT_SIZE / 2,
              top: -UFO_FONT_SIZE / 2,
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
            <UfoGlyph size={UFO_FONT_SIZE} saucer={saucer} />
          </Animated.View>
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
  fontSize: 17,
  lineHeight: 22,
  textAlign: "center" as const,
};
