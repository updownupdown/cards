import {
  getKeyLineIndices,
  getTaoConstellation,
} from "@/data/tao-constellations";
import { rgba } from "@/styles/styles";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  BackHandler,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { BreathButton, type BreathStage } from "./BreathButton";
import {
  parseChapterText,
  planReveal,
  REVEAL,
  ROLE_STAR,
  SKY_IN_AT,
  SKY_IN_MS,
  STAR_TINTS,
  starGlow,
  BLOOM_AT,
  EXIT_TOTAL_MS,
  EXIT_UNCOVER_MS,
  type EdgePlan,
  type GlyphPlan,
  type StarPlan,
  type ParsedText,
  type RevealPlan,
  type RevealTimes,
} from "./timeline";

type Props = {
  chapter: number;
  /** The chapter as the player reads it (translated or not). */
  text: string;
  /** Just before the sky clears: the screen behind can change unseen. */
  onUncover?: () => void;
  onDone: () => void;
};

const TEXT_COLOR = "#e8f1ff";
const STAR_COLOR = "#ffffff";
const GLOW_COLOR = "#9cc9ff";
const LINE_COLOR = "rgba(190, 220, 255, 0.55)";
const FONT_FAMILY = "Outfit_300Light";
const MAX_FONT_SIZE = 19;
const MIN_FONT_SIZE = 10;
const LINE_HEIGHT = 1.45;

// Animated stars and letters are mounted a few at a time, so no single frame
// stalls while the starfield fades in. The figure starts to form just after
// its plan is ready, by when they are all in place.
const MOUNT_CHUNK = 60;
const PAD_X = 24;
// Taps can't hurry the reveal; each one sends a slow shooting star instead.
const SHOOTING_STAR_POOL = 3;

type Box = { x: number; y: number; w: number; h: number };

function clamp01(value: number) {
  "worklet";
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function easeInOut(value: number) {
  "worklet";
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function smoothstep(from: number, to: number, value: number) {
  "worklet";
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/** Position along the flight path, relative to where the letter was read. */
function flight(plan: GlyphPlan, e: number) {
  "worklet";
  const u = 1 - e;
  const a = 3 * u * u * e;
  const b = 3 * u * e * e;
  const c = e * e * e;
  return {
    x: a * plan.c1x + b * plan.c2x + c * plan.dx,
    y: a * plan.c1y + b * plan.c2y + c * plan.dy,
  };
}

function estimateFontSize(parsed: ParsedText, width: number, height: number) {
  const byHeight =
    height / (parsed.lines.length * LINE_HEIGHT + parsed.paragraphCount * 0.7);
  // Allow long lines to wrap a little rather than shrinking everything.
  const byWidth = width / (parsed.longestLine * 0.44);
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, byHeight, byWidth));
}

const textStyle = (fontSize: number) =>
  ({
    fontFamily: FONT_FAMILY,
    fontSize,
    lineHeight: fontSize * LINE_HEIGHT,
    includeFontPadding: false,
  }) as const;

// --- Measuring ---------------------------------------------------------------

/**
 * Lays the chapter out as it will be read (centred lines, wrapped when
 * needed) with plain views, and reports where every letter landed. Invisible;
 * the animated letters are placed on these positions afterwards.
 */
const MeasureText = memo(function MeasureText({
  parsed,
  fontSize,
  insets,
  availableHeight,
  onTooTall,
  onMeasured,
}: {
  parsed: ParsedText;
  fontSize: number;
  insets: { top: number; bottom: number };
  availableHeight: number;
  onTooTall: (height: number) => void;
  onMeasured: (boxes: Box[]) => void;
}) {
  const lineHeight = fontSize * LINE_HEIGHT;
  const store = useRef({
    glyphs: [] as (Box | undefined)[],
    words: [] as ({ x: number; y: number } | undefined)[],
    lines: [] as ({ x: number; y: number } | undefined)[],
    block: undefined as { x: number; y: number } | undefined,
    counts: { glyphs: 0, words: 0, lines: 0 },
    done: false,
  });

  const check = () => {
    const m = store.current;
    if (
      m.done ||
      !m.block ||
      m.counts.glyphs < parsed.glyphs.length ||
      m.counts.words < parsed.words.length ||
      m.counts.lines < parsed.lines.length
    ) {
      return;
    }
    m.done = true;
    onMeasured(
      parsed.glyphs.map((glyph, index) => {
        const g = m.glyphs[index]!;
        const w = m.words[glyph.word]!;
        const l = m.lines[glyph.line]!;
        return {
          x: m.block!.x + l.x + w.x + g.x,
          y: m.block!.y + l.y + w.y + g.y,
          w: g.w,
          h: g.h,
        };
      }),
    );
  };

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: 0,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: PAD_X,
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        },
      ]}
    >
      <View
        style={{ width: "100%" }}
        onLayout={(event) => {
          const { x, y, height } = event.nativeEvent.layout;
          if (height > availableHeight) {
            onTooTall(height);
            return;
          }
          store.current.block = { x, y };
          check();
        }}
      >
        {parsed.lines.map((line, lineIndex) => (
          <View
            key={lineIndex}
            onLayout={(event) => {
              const m = store.current;
              if (!m.lines[lineIndex]) m.counts.lines += 1;
              const { x, y } = event.nativeEvent.layout;
              m.lines[lineIndex] = { x, y };
              check();
            }}
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              columnGap: fontSize * 0.3,
              marginTop:
                line.paragraphStart && lineIndex > 0 ? lineHeight * 0.7 : 0,
            }}
          >
            {line.words.map((wordIndex) => (
              <View
                key={wordIndex}
                onLayout={(event) => {
                  const m = store.current;
                  if (!m.words[wordIndex]) m.counts.words += 1;
                  const { x, y } = event.nativeEvent.layout;
                  m.words[wordIndex] = { x, y };
                  check();
                }}
                style={{ flexDirection: "row" }}
              >
                {parsed.words[wordIndex].glyphs.map((glyphIndex) => (
                  <Text
                    key={glyphIndex}
                    allowFontScaling={false}
                    onLayout={(event: LayoutChangeEvent) => {
                      const m = store.current;
                      if (!m.glyphs[glyphIndex]) m.counts.glyphs += 1;
                      const { x, y, width, height } = event.nativeEvent.layout;
                      m.glyphs[glyphIndex] = { x, y, w: width, h: height };
                      check();
                    }}
                    style={textStyle(fontSize)}
                  >
                    {parsed.glyphs[glyphIndex].char}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

// --- Letters -----------------------------------------------------------------

type GlyphProps = {
  char: string;
  box: Box;
  fontSize: number;
  clock: SharedValue<number>;
  exitAt: SharedValue<number>;
  plan: GlyphPlan;
  times: RevealTimes;
};

/** How far through its flight a letter is, 0 at its star and 1 in the text. */
function written(plan: GlyphPlan, t: number) {
  "worklet";
  return easeInOut(clamp01((t - plan.tFly) / plan.flyMs));
}

/** How much of the words is left as the player closes the chapter. */
function textOut(exitAt: number, t: number) {
  "worklet";
  return 1 - easeInOut(clamp01((t - exitAt) / REVEAL.exitTextMs));
}

/**
 * A letter of the chapter. Most start in the sky as a speck of star dust,
 * the rest hidden in a named star; when their word is read they fly down
 * into the text, growing into a letter as they come. One mapper each.
 */
const Glyph = memo(function Glyph({
  char,
  box,
  fontSize,
  clock,
  exitAt,
  plan,
  times,
}: GlyphProps) {
  const style = useAnimatedStyle(() => {
    const t = clock.value;
    const e = written(plan, t);
    const { x, y } = flight(plan, 1 - e);
    let sky = 0;
    if (plan.role !== ROLE_STAR) {
      // Star dust: fades in with the figure, twinkles, dims behind the words.
      const born = easeInOut(clamp01((t - plan.tBorn) / REVEAL.dustFadeMs));
      const twinkle =
        1 - plan.twinkle * 0.5 * (1 + Math.sin(t * plan.pulseA + plan.phase));
      const dimmed =
        1 -
        (1 - REVEAL.dustDim) *
          easeInOut(clamp01((t - times.dim) / REVEAL.dimMs));
      sky = plan.starOpacity * born * twinkle * dimmed;
    }
    // Brightening as it comes, and read once it lands.
    const opacity = sky * (1 - e) + smoothstep(0, 0.5, e);
    // A speck of light for most of the way; the letter takes shape as it
    // arrives.
    const grow = smoothstep(0.55, 1, e);
    return {
      opacity: opacity * textOut(exitAt.value, t),
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: plan.speckScale + (1 - plan.speckScale) * grow },
      ],
    };
  });
  return (
    <Animated.Text
      allowFontScaling={false}
      style={[
        textStyle(fontSize),
        {
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          color: TEXT_COLOR,
        },
        style,
      ]}
    >
      {char}
    </Animated.Text>
  );
});

/** How bright the figure still is as the player closes the chapter. */
function starsOut(exitAt: number, t: number) {
  "worklet";
  return (
    1 -
    easeInOut(clamp01((t - exitAt - REVEAL.exitStarsAtMs) / REVEAL.exitStarsMs))
  );
}

/**
 * One of the constellation's named stars: it lights up in the pen's order,
 * dims behind the words, and flares as its letter leaves it.
 */
const StarDot = memo(function StarDot({
  star,
  times,
  clock,
  exitAt,
}: {
  star: StarPlan;
  times: RevealTimes;
  clock: SharedValue<number>;
  exitAt: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const t = clock.value;
    const pop = clamp01((t - star.tIn) / REVEAL.starPopMs);
    // Up past its size, then settling.
    const popScale =
      pop < 0.6
        ? 0.2 + (1.3 - 0.2) * (pop / 0.6)
        : 1.3 - 0.3 * ((pop - 0.6) / 0.4);
    const landed = clamp01((t - star.tIn - REVEAL.starPopMs) / 600);
    const wave =
      0.6 * Math.sin(t * star.pulseA + star.phase) +
      0.4 * Math.sin(t * star.pulseB * 2.3 + star.phase * 1.7);
    const pulse = 1 + landed * wave * 0.3;
    const dimmed =
      1 -
      (1 - REVEAL.starDim) * easeInOut(clamp01((t - times.dim) / REVEAL.dimMs));
    // A soft flare as its letter sets off.
    const since = star.tWrite < 0 ? -1 : (t - star.tWrite) / 900;
    const flare = since > 0 && since < 1 ? Math.sin(Math.PI * since) : 0;
    return {
      opacity:
        smoothstep(0, 0.4, pop) *
        (0.8 + 0.2 * pulse) *
        Math.min(1, dimmed + flare * 0.6) *
        starsOut(exitAt.value, t),
      transform: [{ scale: popScale * pulse * (1 + flare * 0.35) }],
    };
  });
  const color = STAR_TINTS[star.tint];
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: star.x - star.dotSize / 2,
          top: star.y - star.dotSize / 2,
          width: star.dotSize,
          height: star.dotSize,
          borderRadius: star.dotSize / 2,
          backgroundColor: color,
          boxShadow: starGlow(color, star.dotSize, !!star.bright),
        },
        style,
      ]}
    />
  );
});

const Edge = memo(function Edge({
  edge,
  times,
  clock,
  exitAt,
}: {
  edge: EdgePlan;
  times: RevealTimes;
  clock: SharedValue<number>;
  exitAt: SharedValue<number>;
}) {
  const rotate = `${edge.angle}rad`;
  const style = useAnimatedStyle(() => {
    const t = clock.value;
    const progress = clamp01((t - edge.tDraw) / edge.drawMs);
    const dimmed =
      1 -
      (1 - REVEAL.lineDim) * easeInOut(clamp01((t - times.dim) / REVEAL.dimMs));
    return {
      opacity: progress > 0 ? dimmed * starsOut(exitAt.value, t) : 0,
      transform: [{ rotate }, { scaleX: Math.max(progress, 0.0001) }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: edge.x,
          top: edge.y - 0.5,
          width: edge.length,
          height: 1,
          backgroundColor: LINE_COLOR,
          transformOrigin: "0% 50%",
        },
        style,
      ]}
    />
  );
});

// --- Shooting stars ------------------------------------------------------------

type Shot = {
  id: number;
  x: number;
  y: number;
  angle: number;
  travel: number;
  tail: number;
  durationMs: number;
};

const TAIL_COLORS = [rgba(GLOW_COLOR, 0), rgba(STAR_COLOR, 0.5)] as const;

/**
 * One slow streak across the sky, from where the player tapped. It starts as
 * a point, draws out into a line as its head runs ahead, then closes up from
 * the tail to a point where the head burnt out.
 */
const ShootingStar = memo(function ShootingStar({ shot }: { shot: Shot }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: shot.durationMs,
      easing: Easing.linear,
    });
    return () => cancelAnimation(progress);
  }, [progress, shot.durationMs]);

  // The trail is never most of the path, or it would not be seen to grow.
  const trail = Math.min(shot.tail, shot.travel * 0.8);
  // The head covers the path in this share of the time; the tail sets off
  // late by the rest of it, and arrives as the streak ends.
  const headUntil = shot.travel / (shot.travel + trail);

  // Brightening as it burns and dimming as it dies, but visible at both
  // ends, so the line is seen drawing out and closing up.
  const streakStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity:
        0.7 * (0.4 + 0.6 * Math.sin(Math.PI * p)) * smoothstep(0, 0.06, p),
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
      {
        translateX: Math.min(1, progress.value / headUntil) * shot.travel,
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: shot.x,
          top: shot.y - 1,
          width: shot.travel,
          height: 2,
          transformOrigin: "0% 50%",
          transform: [{ rotate: `${shot.angle}rad` }],
        },
        streakStyle,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: "0% 50%", borderRadius: 1, overflow: "hidden" },
          tailStyle,
        ]}
      >
        {Platform.OS === "web" ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundImage: `linear-gradient(to right, ${TAIL_COLORS.join(", ")})`,
              },
            ]}
          />
        ) : (
          <LinearGradient
            colors={TAIL_COLORS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: -1.5,
            top: -0.5,
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: STAR_COLOR,
            boxShadow: `0 0 5px 1px ${rgba(GLOW_COLOR, 0.5)}`,
          },
          headStyle,
        ]}
      />
    </Animated.View>
  );
});

// --- The reveal --------------------------------------------------------------

/**
 * Full-screen reveal of a newly earned Tao chapter: its constellation forms
 * over a starfield, then dims while its stars write the chapter out. Covers
 * its parent and swallows every touch until it is closed, so place it last
 * in the screen's tree. It can't be hurried (it is meant to be calm): taps
 * send shooting stars across the sky, and the button at the bottom is a
 * breathing guide until a little after the chapter is written, when it
 * becomes Continue.
 */
export function TaoReveal(props: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const tapRef = useRef<((x: number, y: number) => void) | null>(null);
  return (
    <View
      testID="tao-reveal"
      // Swallow every touch: the game and its header are locked until done.
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) =>
        tapRef.current?.(
          event.nativeEvent.locationX,
          event.nativeEvent.locationY,
        )
      }
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) => current ?? { width, height });
      }}
      style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
    >
      {size && (
        <RevealScene
          {...props}
          width={size.width}
          height={size.height}
          tapRef={tapRef}
        />
      )}
    </View>
  );
}

/** Kept clear at the bottom for the breathing button. */
const BUTTON_ROOM = 112;
/** The clock simply runs; nothing waits on it reaching the end. */
const CLOCK_RUN_MS = 60 * 60 * 1000;
/** Before the player closes it, the exit is "never". */
const NOT_YET = Number.MAX_SAFE_INTEGER;

function RevealScene({
  chapter,
  text,
  onUncover,
  onDone,
  width,
  height,
  tapRef,
}: Props & {
  width: number;
  height: number;
  tapRef: RefObject<((x: number, y: number) => void) | null>;
}) {
  const insets = useSafeAreaInsets();
  const parsed = useMemo(() => parseChapterText(text), [text]);
  const constellation = getTaoConstellation(chapter);
  const clock = useSharedValue(0);
  const exitAt = useSharedValue(NOT_YET);
  const [layout, setLayout] = useState<{
    plan: RevealPlan;
    boxes: Box[];
  } | null>(null);
  const plan = layout?.plan ?? null;
  const [mountedCount, setMountedCount] = useState(0);
  const [stage, setStage] = useState<BreathStage>("hidden");

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finish = useCallback(() => onDoneRef.current(), []);
  const onUncoverRef = useRef(onUncover);
  onUncoverRef.current = onUncover;

  // Without a figure there is nothing to reveal.
  useEffect(() => {
    if (!constellation) finish();
  }, [constellation, finish]);

  // --- Fit the text to the screen, then plan from the measured letters. ---
  const bottom = insets.bottom + BUTTON_ROOM;
  const availableHeight = height - insets.top - bottom - 40;
  const [fontSize, setFontSize] = useState(() =>
    estimateFontSize(parsed, width - PAD_X * 2, availableHeight),
  );
  const fitAttempts = useRef(0);

  const onTooTall = useCallback(
    (measuredHeight: number) => {
      if (fitAttempts.current >= 4 || fontSize <= MIN_FONT_SIZE) return;
      fitAttempts.current += 1;
      const ratio = Math.min(
        0.97,
        Math.max(0.6, (availableHeight / measuredHeight) * 0.98),
      );
      setFontSize(Math.max(MIN_FONT_SIZE, fontSize * ratio));
    },
    [availableHeight, fontSize],
  );

  const onMeasured = useCallback(
    (boxes: Box[]) => {
      if (!constellation) return;
      const next = planReveal({
        parsed,
        boxes: boxes.map((box) => ({
          cx: box.x + box.w / 2,
          cy: box.y + box.h / 2,
        })),
        fontSize,
        constellation,
        keyLines: getKeyLineIndices(constellation),
        screen: { width, height, top: insets.top, bottom },
        // Never in the past: the figure forms from its first speck.
        start: Math.max(BLOOM_AT, clock.get() + 250),
      });
      setLayout({ plan: next, boxes });
    },
    [bottom, clock, constellation, fontSize, height, insets.top, parsed, width],
  );

  // Mount the stars and lines, then the letters, a chunk per frame.
  const mountTotal = plan
    ? plan.stars.length + plan.edges.length + plan.glyphs.length
    : 0;
  useEffect(() => {
    if (!plan || mountedCount >= mountTotal) return;
    const frame = requestAnimationFrame(() =>
      setMountedCount((count) => Math.min(mountTotal, count + MOUNT_CHUNK)),
    );
    return () => cancelAnimationFrame(frame);
  }, [mountTotal, mountedCount, plan]);

  // --- Clock --------------------------------------------------------------
  useEffect(() => {
    clock.value = withTiming(CLOCK_RUN_MS, {
      duration: CLOCK_RUN_MS,
      easing: Easing.linear,
    });
    return () => cancelAnimation(clock);
  }, [clock]);

  // The back button can't skip it, but mustn't leave the game either.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  // --- The button's stages ----------------------------------------------------
  const times = plan?.times ?? null;
  const showBreath = useCallback(
    () => setStage((current) => (current === "hidden" ? "breathing" : current)),
    [],
  );
  const showContinue = useCallback(
    () => setStage((current) => (current === "closing" ? current : "continue")),
    [],
  );
  // It comes in as the figure dims and the writing begins...
  useAnimatedReaction(
    () => (times ? clock.value >= times.dim : false),
    (now, previous) => {
      if (now && !previous) scheduleOnRN(showBreath);
    },
    [times],
  );
  // ...and can close the chapter a little after it is all written.
  useAnimatedReaction(
    () => (times ? clock.value >= times.canClose : false),
    (now, previous) => {
      if (now && !previous) scheduleOnRN(showContinue);
    },
    [times],
  );

  const exitTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => exitTimers.current.forEach(clearTimeout), []);
  const close = useCallback(() => {
    if (stage !== "continue") return;
    setStage("closing");
    exitAt.value = clock.value;
    exitTimers.current.push(
      setTimeout(() => onUncoverRef.current?.(), EXIT_UNCOVER_MS),
      setTimeout(finish, EXIT_TOTAL_MS),
    );
  }, [clock, exitAt, finish, stage]);

  // --- Shooting stars -------------------------------------------------------
  const [shots, setShots] = useState<Shot[]>([]);
  const shotCount = useRef(0);
  tapRef.current = (x, y) => {
    // Only while the sky is up.
    if (clock.get() < SKY_IN_AT + 500 || stage === "closing") return;
    const id = (shotCount.current += 1);
    const heading = x < width / 2 ? 0 : Math.PI;
    const dip = (0.25 + Math.random() * 0.35) * (heading === 0 ? 1 : -1);
    const shot: Shot = {
      id,
      x,
      y,
      angle: heading + dip,
      travel: width * (0.35 + Math.random() * 0.2),
      tail: 140 + Math.random() * 90,
      durationMs: 1850 + Math.random() * 570,
    };
    setShots((current) => [...current, shot].slice(-SHOOTING_STAR_POOL));
  };

  const skyStyle = useAnimatedStyle(() => {
    const t = clock.value;
    const fadeIn = easeInOut(clamp01((t - SKY_IN_AT) / SKY_IN_MS));
    const fadeOut =
      1 -
      easeInOut(
        clamp01((t - exitAt.value - REVEAL.exitSkyAtMs) / REVEAL.exitSkyMs),
      );
    return { opacity: fadeIn * fadeOut };
  });

  const starCount = plan?.stars.length ?? 0;
  const edgeCount = plan?.edges.length ?? 0;
  const mountedStars = Math.min(mountedCount, starCount);
  const mountedEdges = Math.min(
    Math.max(0, mountedCount - starCount),
    edgeCount,
  );
  const mountedGlyphs = Math.max(0, mountedCount - starCount - edgeCount);

  return (
    <>
      {/* Touches go to TaoReveal's own view, which knows where they landed. */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            // Opaque even before the starfield image has loaded.
            { backgroundColor: "#05080e" },
            skyStyle,
          ]}
        >
          <ImageBackground
            source={require("../../../assets/images/starfield.webp")}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(6, 10, 18, 0.72)" },
            ]}
          />
        </Animated.View>

        {!layout && constellation && (
          <MeasureText
            key={fontSize}
            parsed={parsed}
            fontSize={fontSize}
            insets={{ top: insets.top, bottom }}
            availableHeight={availableHeight}
            onTooTall={onTooTall}
            onMeasured={onMeasured}
          />
        )}

        {layout && times && (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
            {layout.plan.edges.slice(0, mountedEdges).map((edge, index) => (
              <Edge
                key={index}
                edge={edge}
                times={times}
                clock={clock}
                exitAt={exitAt}
              />
            ))}
            {layout.plan.stars.slice(0, mountedStars).map((star, index) => (
              <StarDot
                key={index}
                star={star}
                times={times}
                clock={clock}
                exitAt={exitAt}
              />
            ))}
            {layout.plan.glyphs
              .slice(0, mountedGlyphs)
              .map((glyphPlan, index) => (
                <Glyph
                  key={index}
                  char={parsed.glyphs[index].char}
                  box={layout.boxes[index]}
                  fontSize={fontSize}
                  clock={clock}
                  exitAt={exitAt}
                  plan={glyphPlan}
                  times={times}
                />
              ))}
          </View>
        )}

        {shots.map((shot) => (
          <ShootingStar key={shot.id} shot={shot} />
        ))}
      </View>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: insets.bottom + 32,
          alignItems: "center",
          pointerEvents: "box-none",
        }}
      >
        <BreathButton stage={stage} onContinue={close} />
      </View>
    </>
  );
}
