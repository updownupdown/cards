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
  type StyleProp,
  type ViewProps,
  type ViewStyle,
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
 * A hidden game in the sky of a Tao chapter or a quote, in the Gallery and
 * in the reveal after a win: tap, and a shooting star sets off from under
 * the finger in some direction. There is nothing on screen to say it is
 * there; it is found.
 *
 * It rewards being played with:
 *
 * - Taps in quick succession (within COMBO_WINDOW_MS of each other) build a
 *   run. Every star has a hue of its own, scanning round the wheel, but the
 *   first in a run is all but white; the longer the run, the deeper the
 *   colour, and the longer and brighter the trail. Long runs also send
 *   stars in pairs, then in threes, and every SHOWER_EVERY taps in a run a
 *   shower of small stars rains from the top of the sky. Pause, and the
 *   run starts over.
 * - Holding before letting go charges the star: a glow grows under the
 *   finger, and the trail is longer and brighter the longer the hold, up to
 *   CHARGE_MS. Held to the full, it bursts into sparks where it burns out.
 *
 * A trail is drawn the way a real one is seen: the path is fixed in space,
 * and the light sweeps along it, a particle burning from where it ignites
 * to where it burns out. Moving the finger scrolls the page as it always
 * did, and sends nothing.
 */

/** Taps this far apart (release to the next press) still count as a run. */
export const COMBO_WINDOW_MS = 1000;
/** Holding this long makes the longest star; longer changes nothing. */
export const CHARGE_MS = 1400;
/** A hold shorter than this is a tap: no charge. */
const QUICK_TAP_MS = 120;
/** Moving this far is a scroll, not a tap. */
const TAP_SLOP = 10;
/** From this many taps in a run, each sends a pair; from the next, three. */
export const PAIR_AT = 9;
export const TRIO_AT = 13;
/** Every this many taps in a run, a shower. */
export const SHOWER_EVERY = 20;
const SHOWER_COUNT = 12;
const SHOWER_OVER_MS = 2800;
/** The stars of a pair or a fan set off this far apart. */
export const FAN_BEAT_MS = 140;
/** The most stars in flight at once; the oldest make way. */
const POOL = 24;
/** Taps this many into a run have the deepest colour and longest trails. */
export const RUN_FULL_AT = 11;

function clamp01(value: number) {
  "worklet";
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep(from: number, to: number, value: number) {
  "worklet";
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

/**
 * The colour of the nth star in a run: hues scan round the wheel from star
 * to star (by the golden angle, so neighbours differ), and the colour
 * deepens with the run, from all but white to fully saturated by
 * RUN_FULL_AT. `jitter` (0 to 1) varies it a little.
 */
export function starColor(count: number, jitter = 0.5): string {
  const hue = (count * 137.508 + jitter * 40) % 360;
  const run = clamp01((count - 1) / (RUN_FULL_AT - 1));
  const saturation = clamp01(0.06 + 0.94 * run + (jitter - 0.5) * 0.12);
  const lightness = 0.95 - 0.3 * saturation;
  return hslToHex(hue, saturation, lightness);
}

// --- One star ------------------------------------------------------------------

export type Shot = {
  id: number;
  kind: "tap" | "shower";
  /** Where the path starts, and its direction. */
  x: number;
  y: number;
  angle: number;
  /** The path's length, and how much of it is lit at once. */
  travel: number;
  tail: number;
  durationMs: number;
  color: string;
  /** 0 to 1: how bright it burns. */
  brightness: number;
  /** Sparks where it burns out: a fully charged star. */
  burst: boolean;
};

const SPARKS = 8;
/** The trail's thickness; the glow needs some room above and below. */
const LINE = 2;
const LANE = 6;

/**
 * One streak across the sky. The path is fixed; a lit length sweeps along
 * it, brightest at its leading edge where the particle is burning, fading
 * behind, until it has swept off the far end. Nothing about it is animated
 * but the sweep, so a test can read colour and length off its styles.
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

  const tail = Math.min(shot.tail, shot.travel * 0.9);
  const sweep = shot.travel + tail;
  /** When the burning edge reaches the end of the path, as a share of the sweep. */
  const burnOutAt = shot.travel / sweep;
  const peak = 0.55 + 0.45 * shot.brightness;

  // It is seen igniting, burns brightest along the way, and is gone soon
  // after the burning edge leaves the path.
  const laneStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity:
        peak *
        smoothstep(0, 0.08, p) *
        (1 - smoothstep(burnOutAt, 1, p) * 0.85) *
        (1 - smoothstep(0.92, 1, p)),
    };
  });
  const litStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -tail + progress.value * sweep }],
  }));

  const stops = useMemo(
    () =>
      [
        rgba(shot.color, 0),
        rgba(shot.color, 0.12),
        rgba(shot.color, 0.45),
        shot.color,
        rgba(shot.color, 0.75),
      ] as const,
    [shot.color],
  );
  const locations = [0, 0.4, 0.78, 0.96, 1] as const;
  const glow = `0 0 ${2 + 2 * shot.brightness}px ${rgba(shot.color, 0.35 + 0.45 * shot.brightness)}`;

  return (
    <Animated.View
      testID={`shooting-star:${shot.kind}:${shot.id}`}
      style={[
        {
          position: "absolute",
          left: shot.x,
          top: shot.y - LANE / 2,
          width: shot.travel,
          height: LANE,
          transformOrigin: "0% 50%",
          transform: [{ rotate: `${shot.angle}rad` }],
          overflow: "hidden",
        },
        laneStyle,
      ]}
    >
      <Animated.View
        testID="shooting-star-trail"
        style={[
          {
            position: "absolute",
            left: 0,
            top: (LANE - LINE) / 2,
            width: tail,
            height: LINE,
            borderRadius: LINE / 2,
            boxShadow: glow,
          },
          litStyle,
        ]}
      >
        {Platform.OS === "web" ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: LINE / 2,
                backgroundImage: `linear-gradient(to right, ${stops
                  .map((stop, index) => `${stop} ${locations[index] * 100}%`)
                  .join(", ")})`,
              } as object,
            ]}
          />
        ) : (
          <LinearGradient
            colors={stops}
            locations={locations}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { borderRadius: LINE / 2 }]}
          />
        )}
      </Animated.View>
      {shot.burst &&
        Array.from({ length: SPARKS }, (_, index) => (
          <Spark
            key={index}
            index={index}
            shot={shot}
            progress={progress}
            burnOutAt={burnOutAt}
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
  burnOutAt,
}: {
  index: number;
  shot: Shot;
  progress: { value: number };
  burnOutAt: number;
}) {
  const theta = (index / SPARKS) * Math.PI * 2 + 0.4;
  const reach = 14 + (index % 3) * 6;
  const dx = Math.cos(theta) * reach;
  const dy = Math.sin(theta) * reach;
  const dot = 2;
  const style = useAnimatedStyle(() => {
    const t = smoothstep(burnOutAt, 1, progress.value);
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
          left: shot.travel - dot / 2 - 2,
          top: LANE / 2 - dot / 2,
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

// --- Islands -------------------------------------------------------------------

/**
 * Touches that began on an island. The same native event reaches every
 * handler up the tree, so an island notes it on the way up and the sky,
 * above, leaves it alone. Nothing is stopped: buttons and pickers work as
 * they always did.
 */
const islandTouches = new WeakSet<object>();

const noteIsland = (event: { nativeEvent: object }) => {
  islandTouches.add(event.nativeEvent);
};

/** Spread on any view: presses that begin inside it send no stars. */
export const skyIslandProps: ViewProps =
  Platform.OS === "web"
    ? { onPointerDown: noteIsland }
    : { onTouchStart: noteIsland };

/**
 * A view whose presses belong to what is inside it (a button, a picker, a
 * bar) and never to the sky.
 */
export function SkyIsland({
  children,
  style,
  testID,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={testID} style={style} {...skyIslandProps}>
      {children}
    </View>
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
};

/**
 * Listens for taps and holds on a sky's root and draws the stars they
 * send. Spread `rootProps` on the root view (the touch events bubble up to
 * it from the page, so the page scrolls as before and no touch is taken
 * from it), call `onLayout` from the root's own, and render `layer` over
 * the page. Wrap buttons and bars in a SkyIsland.
 */
export function useTapShootingStars({ enabled, width, height }: Options) {
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

  /**
   * A star from a press: any direction; longer and brighter with the run
   * and the charge, and a little different every time.
   */
  const makeShot = useCallback(
    (from: Press, charge: number, burst: boolean): Shot => {
      const { width, height } = sizeRef.current;
      const across = Math.max(width, height, 1);
      const run = clamp01((from.count - 1) / (RUN_FULL_AT - 1));
      const length =
        (0.8 + 0.4 * Math.random()) * (1 + 0.6 * run + 1.0 * charge);
      const travel = Math.min(across * 1.2, width * 0.45 * length);
      const tail = Math.min(
        travel * 0.9,
        travel * (0.35 + 0.25 * Math.random()) * (1 + 0.3 * charge),
      );
      const speed = 260 + 160 * Math.random();
      return {
        id: (nextId.current += 1),
        kind: "tap",
        x: from.x,
        y: from.y,
        angle: Math.random() * Math.PI * 2,
        travel,
        tail,
        durationMs: ((travel + tail) / speed) * 1000,
        color: from.color,
        brightness: clamp01(
          0.25 + 0.3 * Math.random() + 0.45 * run + 0.5 * charge,
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
        const travel = height * (0.25 + Math.random() * 0.45);
        const tail = travel * (0.3 + Math.random() * 0.4);
        const speed = 240 + 200 * Math.random();
        later((index / SHOWER_COUNT) * SHOWER_OVER_MS, () =>
          add({
            id: (nextId.current += 1),
            kind: "shower",
            x: Math.random() * width,
            y: -10 + Math.random() * height * 0.2,
            angle: Math.PI / 2 + side * (0.35 + Math.random() * 0.3),
            travel,
            tail,
            durationMs: ((travel + tail) / speed) * 1000,
            color: hslToHex((from.count * 47 + index * 30) % 360, 1, 0.7),
            brightness: 0.3 + Math.random() * 0.7,
            burst: false,
          }),
        );
      }
    },
    [add, later],
  );

  const launch = useCallback(
    (from: Press, heldMs: number) => {
      const charge = clamp01((heldMs - QUICK_TAP_MS) / CHARGE_MS);
      // A fan: the same way, roughly, a beat apart, far enough apart to be
      // seen as more than one.
      const spreads =
        from.count >= TRIO_AT
          ? [0, -0.45, 0.45]
          : from.count >= PAIR_AT
            ? [0, 0.4]
            : [0];
      const heading = Math.random() * Math.PI * 2;
      spreads.forEach((spread, index) => {
        const shot = makeShot(from, charge, charge >= 1 && index === 0);
        shot.angle = heading + spread;
        if (index === 0) add(shot);
        else later(FAN_BEAT_MS * index, () => add(shot));
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
      const now = Date.now();
      const x = pageX - offset.current.x;
      const y = pageY - offset.current.y;
      const count =
        now - run.current.releasedAt <= COMBO_WINDOW_MS
          ? run.current.count + 1
          : 1;
      const color = starColor(count, Math.random());
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
  // no touches. Both bubble, so neither takes the touch from the page. A
  // press that began on an island is left to it.
  const rootProps = useMemo<ViewProps & { ref: typeof rootRef }>(() => {
    if (Platform.OS === "web") {
      const at = (event: PointerEvent) =>
        event.nativeEvent as unknown as {
          pointerId: number;
          clientX: number;
          clientY: number;
          isPrimary?: boolean;
          button?: number;
        };
      return {
        ref: rootRef,
        onPointerDown: (event) => {
          if (islandTouches.has(event.nativeEvent)) return;
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
        if (islandTouches.has(event.nativeEvent)) return;
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
