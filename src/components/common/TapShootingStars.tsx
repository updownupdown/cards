import { rgba } from "@/styles/styles";
import { haptics } from "@/utils/haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Platform,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PointerEvent,
  type ViewProps,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/*
 * A hidden game in the sky of a collectible reveal: tap, and a shooting star
 * sets off from under the finger towards the far side of the screen. There
 * is nothing on screen to say it is there; it is found.
 *
 * It rewards being played with:
 *
 * - Taps in quick succession (within COMBO_WINDOW_MS of each other) build a
 *   run, and the stars' colour climbs with it, white through candle, gold,
 *   amber, rose and violet to electric blue, then every colour in turn once
 *   the run is long. Long runs also send stars in pairs, then in threes.
 *   Every SHOWER_EVERY taps in a run, a shower of small stars rains from the
 *   top of the sky. Pause, and the run starts over at white.
 * - Holding before letting go charges the star: a glow grows under the
 *   finger, and the star is bigger, longer and slower the longer the hold,
 *   up to CHARGE_MS. Held to the full, it bursts into sparks where it burns
 *   out.
 *
 * Moving the finger scrolls the page as it always did, and sends nothing.
 */

/** Taps this far apart (release to the next press) still count as a run. */
export const COMBO_WINDOW_MS = 1000;
/** Holding this long makes the biggest star; longer changes nothing. */
export const CHARGE_MS = 1400;
/** A hold shorter than this is a tap: the plain star, size 1. */
const QUICK_TAP_MS = 120;
/** How much bigger than a tap's star a fully charged one is. */
const MAX_EXTRA_SIZE = 2.2;
/** Moving this far is a scroll, not a tap. */
const TAP_SLOP = 10;
/** From this many taps in a run, each sends a pair; from the next, three. */
export const PAIR_AT = 9;
export const TRIO_AT = 13;
/** Every this many taps in a run, a shower. */
export const SHOWER_EVERY = 20;
const SHOWER_COUNT = 12;
const SHOWER_OVER_MS = 1400;
/** The most stars in flight at once; the oldest make way. */
const POOL = 24;

/**
 * The run's colours, two taps each; past the last, every tap has a hue of
 * its own.
 */
export const COMBO_COLORS = [
  "#ffffff", // white
  "#fff3c4", // candle
  "#ffd166", // gold
  "#ff9f43", // amber
  "#ff6b8a", // rose
  "#d16bff", // violet
  "#5ad1ff", // electric blue
] as const;

export function comboColor(count: number): string {
  const level = Math.floor((Math.max(1, count) - 1) / 2);
  if (level < COMBO_COLORS.length) return COMBO_COLORS[level];
  return hslToHex((count * 47) % 360, 100, 72);
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function clamp01(value: number) {
  "worklet";
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep(from: number, to: number, value: number) {
  "worklet";
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

// --- One star ------------------------------------------------------------------

export type Shot = {
  id: number;
  kind: "tap" | "shower";
  x: number;
  y: number;
  angle: number;
  travel: number;
  tail: number;
  durationMs: number;
  color: string;
  /** 1 for a tap; up to 1 + MAX_EXTRA_SIZE for a full hold. */
  size: number;
  /** How bright, 0 to 1: climbs with the run, and with the charge. */
  brightness: number;
  /** Sparks where it burns out: a fully charged star. */
  burst: boolean;
};

const SPARKS = 8;

/**
 * One streak across the sky. It starts as a point, draws out into a line as
 * its head runs ahead, then closes up from the tail to a point where the
 * head burnt out. Its colour and size are the shot's; nothing about it is
 * animated but its progress, so a test can read them off its styles.
 */
const ShootingStar = memo(function ShootingStar({
  shot,
  onEnd,
}: {
  shot: Shot;
  onEnd: (id: number) => void;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: shot.durationMs,
      easing: Easing.linear,
    });
    const timer = setTimeout(() => onEnd(shot.id), shot.durationMs + 50);
    return () => {
      cancelAnimation(progress);
      clearTimeout(timer);
    };
  }, [onEnd, progress, shot.durationMs, shot.id]);

  // The trail is never most of the path, or it would not be seen to grow.
  const trail = Math.min(shot.tail, shot.travel * 0.8);
  // The head covers the path in this share of the time; the tail sets off
  // late by the rest of it, and arrives as the streak ends.
  const headUntil = shot.travel / (shot.travel + trail);
  const thickness = 2 * shot.size;
  const headSize = 3 * shot.size;
  const peak = 0.7 + 0.3 * shot.brightness;
  const glow = rgba(shot.color, 0.35 + 0.4 * shot.brightness);

  // Brightening as it burns and dimming as it dies, but visible at both
  // ends, so the line is seen drawing out and closing up.
  const streakStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: peak * (0.4 + 0.6 * Math.sin(Math.PI * p)) * smoothstep(0, 0.06, p),
    };
  });
  const tailStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const head = Math.min(1, p / headUntil) * shot.travel;
    const tail = Math.max(0, (p - (1 - headUntil)) / headUntil) * shot.travel;
    return {
      transform: [
        { translateX: tail },
        { scaleX: Math.max(0.001, (head - tail) / shot.travel) },
      ],
    };
  });
  const headStyle = useAnimatedStyle(() => ({
    opacity: 1 - smoothstep(0.85, 1, progress.value),
    transform: [
      { translateX: Math.min(1, progress.value / headUntil) * shot.travel },
    ],
  }));

  const tailColors = useMemo(
    () => [rgba(shot.color, 0), rgba(shot.color, 0.55)] as const,
    [shot.color],
  );

  return (
    <Animated.View
      testID={`shooting-star:${shot.kind}:${shot.id}`}
      style={[
        {
          position: "absolute",
          left: shot.x,
          top: shot.y - thickness / 2,
          width: shot.travel,
          height: thickness,
          transformOrigin: "0% 50%",
          transform: [{ rotate: `${shot.angle}rad` }],
        },
        streakStyle,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transformOrigin: "0% 50%",
            borderRadius: thickness / 2,
            overflow: "hidden",
          },
          tailStyle,
        ]}
      >
        {Platform.OS === "web" ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundImage: `linear-gradient(to right, ${tailColors.join(", ")})`,
              } as object,
            ]}
          />
        ) : (
          <LinearGradient
            colors={tailColors}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
      <Animated.View
        testID="shooting-star-head"
        style={[
          {
            position: "absolute",
            left: -headSize / 2,
            top: thickness / 2 - headSize / 2,
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            backgroundColor: shot.color,
            boxShadow: `0 0 ${4 + 3 * shot.size}px ${shot.size}px ${glow}`,
          },
          headStyle,
        ]}
      />
      {shot.burst &&
        Array.from({ length: SPARKS }, (_, index) => (
          <Spark
            key={index}
            index={index}
            shot={shot}
            progress={progress}
            headUntil={headUntil}
          />
        ))}
    </Animated.View>
  );
});

/** One of the sparks a fully charged star bursts into where it burns out. */
function Spark({
  index,
  shot,
  progress,
  headUntil,
}: {
  index: number;
  shot: Shot;
  progress: { value: number };
  headUntil: number;
}) {
  const theta = (index / SPARKS) * Math.PI * 2 + 0.4;
  const reach = (14 + (index % 3) * 6) * shot.size;
  const dx = Math.cos(theta) * reach;
  const dy = Math.sin(theta) * reach;
  const dot = Math.max(2, shot.size);
  const style = useAnimatedStyle(() => {
    const t = smoothstep(headUntil, 1, progress.value);
    const out = 1 - (1 - t) * (1 - t);
    return {
      opacity: t <= 0 ? 0 : 1 - t,
      transform: [{ translateX: dx * out }, { translateY: dy * out }],
    };
  });
  return (
    <Animated.View
      testID="shooting-star-spark"
      style={[
        {
          position: "absolute",
          left: shot.travel - dot / 2,
          top: shot.size - dot / 2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: shot.color,
          boxShadow: `0 0 4px 1px ${rgba(shot.color, 0.6)}`,
        },
        style,
      ]}
    />
  );
}

// --- The glow under a held finger ---------------------------------------------

const GLOW_SIZE = 64;

function ChargeGlow({
  x,
  y,
  color,
  charge,
}: {
  x: number;
  y: number;
  color: string;
  charge: { value: number };
}) {
  // Nothing for the first moments, so a tap never flashes.
  const haloStyle = useAnimatedStyle(() => {
    const c = charge.value;
    return {
      opacity: 0.55 * smoothstep(0.08, 0.4, c),
      transform: [{ scale: 0.15 + 0.85 * c }],
    };
  });
  const coreStyle = useAnimatedStyle(() => ({
    opacity: smoothstep(0.08, 0.3, charge.value),
    transform: [{ scale: 0.5 + 0.9 * charge.value }],
  }));
  return (
    <>
      <Animated.View
        testID="shooting-star-charge"
        style={[
          {
            position: "absolute",
            left: x - GLOW_SIZE / 2,
            top: y - GLOW_SIZE / 2,
            width: GLOW_SIZE,
            height: GLOW_SIZE,
            borderRadius: GLOW_SIZE / 2,
            backgroundColor: rgba(color, 0.22),
            boxShadow: `0 0 28px 10px ${rgba(color, 0.28)}`,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            left: x - 4,
            top: y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            boxShadow: `0 0 10px 3px ${rgba(color, 0.7)}`,
          },
          coreStyle,
        ]}
      />
    </>
  );
}

// --- The hook ------------------------------------------------------------------

type Press = {
  pointer: number;
  x: number;
  y: number;
  at: number;
  /** Its place in the run, counting this press. */
  count: number;
  color: string;
};

type Options = {
  /** Presses are ignored while off; stars in flight finish. */
  enabled: boolean;
  width: number;
  height: number;
  /** Where presses belong to something else, such as a button. */
  ignore?: (x: number, y: number) => boolean;
};

/**
 * Listens for taps and holds on a reveal's root and draws the stars they
 * send. Spread `rootProps` on the root view (the touch events bubble up to
 * it from the page, so the page scrolls as before and no touch is taken
 * from it), call `onLayout` from the root's own, and render `layer` over
 * the page.
 */
export function useTapShootingStars({
  enabled,
  width,
  height,
  ignore,
}: Options) {
  const rootRef = useRef<View>(null);
  const offset = useRef({ x: 0, y: 0 });
  const [shots, setShots] = useState<Shot[]>([]);
  const [glow, setGlow] = useState<{
    x: number;
    y: number;
    color: string;
  } | null>(null);
  const press = useRef<Press | null>(null);
  const run = useRef({ count: 0, releasedAt: -Infinity });
  const nextId = useRef(0);
  const charge = useSharedValue(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const fullTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };
  const ignoreRef = useRef(ignore);
  ignoreRef.current = ignore;

  const later = useCallback((ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      if (fullTimer.current) clearTimeout(fullTimer.current);
    };
  }, []);

  const onLayout = useCallback(() => {
    rootRef.current?.measureInWindow?.((x, y) => {
      offset.current = { x, y };
    });
  }, []);

  const add = useCallback((shot: Shot) => {
    setShots((current) => [...current, shot].slice(-POOL));
  }, []);
  const onEnd = useCallback((id: number) => {
    setShots((current) => current.filter((shot) => shot.id !== id));
  }, []);

  const makeShot = useCallback(
    (from: Press, size: number, spread: number, burst: boolean): Shot => {
      const { width } = sizeRef.current;
      const heading = from.x < width / 2 ? 0 : Math.PI;
      const dip =
        (0.25 + Math.random() * 0.35) * (heading === 0 ? 1 : -1) + spread;
      const grand = 1 + 0.35 * (size - 1);
      return {
        id: (nextId.current += 1),
        kind: "tap",
        x: from.x,
        y: from.y,
        angle: heading + dip,
        travel: width * (0.35 + Math.random() * 0.2) * grand,
        tail: (140 + Math.random() * 90) * grand,
        durationMs: (1850 + Math.random() * 570) * grand,
        color: from.color,
        size,
        brightness: Math.max(
          Math.min(1, (from.count - 1) / (2 * COMBO_COLORS.length)),
          (size - 1) / MAX_EXTRA_SIZE,
        ),
        burst,
      };
    },
    [],
  );

  const shower = useCallback(
    (from: Press) => {
      const { width, height } = sizeRef.current;
      const side = from.x < width / 2 ? -1 : 1;
      for (let index = 0; index < SHOWER_COUNT; index += 1) {
        later((index / SHOWER_COUNT) * SHOWER_OVER_MS, () =>
          add({
            id: (nextId.current += 1),
            kind: "shower",
            x: Math.random() * width,
            y: -10 + Math.random() * height * 0.2,
            angle: Math.PI / 2 + side * (0.35 + Math.random() * 0.3),
            travel: height * (0.35 + Math.random() * 0.25),
            tail: 90 + Math.random() * 70,
            durationMs: 1100 + Math.random() * 500,
            color: hslToHex((from.count * 47 + index * 30) % 360, 100, 72),
            size: 0.7 + Math.random() * 0.6,
            brightness: 1,
            burst: false,
          }),
        );
      }
    },
    [add, later],
  );

  const launch = useCallback(
    (from: Press, heldMs: number) => {
      const t = clamp01((heldMs - QUICK_TAP_MS) / CHARGE_MS);
      const size = 1 + MAX_EXTRA_SIZE * t;
      const spreads =
        from.count >= TRIO_AT
          ? [0, -0.16, 0.16]
          : from.count >= PAIR_AT
            ? [0, 0.12]
            : [0];
      spreads.forEach((spread, index) => {
        const shot = makeShot(from, size, spread, t >= 1 && index === 0);
        if (index === 0) add(shot);
        else later(90 * index, () => add(shot));
      });
      if (from.count % SHOWER_EVERY === 0) shower(from);
    },
    [add, later, makeShot, shower],
  );

  const settle = useCallback(
    (ms: number) => {
      press.current = null;
      setGlow(null);
      charge.value = withTiming(0, { duration: ms });
      if (fullTimer.current) {
        clearTimeout(fullTimer.current);
        fullTimer.current = null;
      }
    },
    [charge],
  );

  const begin = useCallback(
    (pointer: number, pageX: number, pageY: number) => {
      if (!enabledRef.current || press.current) return;
      const x = pageX - offset.current.x;
      const y = pageY - offset.current.y;
      if (ignoreRef.current?.(x, y)) return;
      const now = Date.now();
      const count =
        now - run.current.releasedAt <= COMBO_WINDOW_MS
          ? run.current.count + 1
          : 1;
      const color = comboColor(count);
      press.current = { pointer, x, y, at: now, count, color };
      setGlow({ x, y, color });
      charge.value = 0;
      charge.value = withSequence(
        withTiming(1, { duration: CHARGE_MS, easing: Easing.out(Easing.quad) }),
        withRepeat(
          withTiming(0.82, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
      fullTimer.current = setTimeout(() => haptics.validTarget(), CHARGE_MS);
    },
    [charge],
  );

  const move = useCallback(
    (pointer: number, pageX: number, pageY: number) => {
      const current = press.current;
      if (!current || current.pointer !== pointer) return;
      const x = pageX - offset.current.x;
      const y = pageY - offset.current.y;
      if (Math.hypot(x - current.x, y - current.y) > TAP_SLOP) {
        // A scroll: nothing is sent, and the run is over.
        run.current = { count: 0, releasedAt: -Infinity };
        settle(150);
      }
    },
    [settle],
  );

  const cancel = useCallback(
    (pointer: number) => {
      const current = press.current;
      if (!current || current.pointer !== pointer) return;
      run.current = { count: 0, releasedAt: -Infinity };
      settle(150);
    },
    [settle],
  );

  const end = useCallback(
    (pointer: number) => {
      const current = press.current;
      if (!current || current.pointer !== pointer) return;
      const now = Date.now();
      settle(250);
      run.current = { count: current.count, releasedAt: now };
      launch(current, now - current.at);
    },
    [launch, settle],
  );

  // Touch events on native; pointer events on the web, where a mouse sends
  // no touches. Both bubble, so neither takes the touch from the page.
  const rootProps = useMemo<ViewProps & { ref: typeof rootRef }>(() => {
    if (Platform.OS === "web") {
      const at = (event: PointerEvent) => {
        const native = event.nativeEvent as unknown as {
          pointerId: number;
          clientX: number;
          clientY: number;
          isPrimary?: boolean;
          button?: number;
        };
        return native;
      };
      return {
        ref: rootRef,
        onPointerDown: (event) => {
          const e = at(event);
          if (e.isPrimary === false || (e.button ?? 0) !== 0) return;
          begin(e.pointerId, e.clientX, e.clientY);
        },
        onPointerMove: (event) => {
          const e = at(event);
          move(e.pointerId, e.clientX, e.clientY);
        },
        onPointerUp: (event) => end(at(event).pointerId),
        onPointerCancel: (event) => cancel(at(event).pointerId),
        onPointerLeave: (event) => cancel(at(event).pointerId),
      };
    }
    const at = (event: GestureResponderEvent) => {
      const { identifier, pageX, pageY } = event.nativeEvent;
      return { pointer: Number(identifier), pageX, pageY };
    };
    return {
      ref: rootRef,
      onTouchStart: (event) => {
        const e = at(event);
        begin(e.pointer, e.pageX, e.pageY);
      },
      onTouchMove: (event) => {
        const e = at(event);
        move(e.pointer, e.pageX, e.pageY);
      },
      onTouchEnd: (event) => end(at(event).pointer),
      onTouchCancel: (event) => cancel(at(event).pointer),
    };
  }, [begin, cancel, end, move]);

  const layer: ReactNode = (
    <View
      testID="shooting-star-sky"
      style={[
        StyleSheet.absoluteFill,
        { overflow: "hidden", pointerEvents: "none" },
      ]}
    >
      {shots.map((shot) => (
        <ShootingStar key={shot.id} shot={shot} onEnd={onEnd} />
      ))}
      {glow && (
        <ChargeGlow x={glow.x} y={glow.y} color={glow.color} charge={charge} />
      )}
    </View>
  );

  return { rootProps, onLayout, layer };
}
