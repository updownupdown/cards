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
import {
  parseChapterText,
  planReveal,
  REVEAL,
  ROLE_STAR,
  SKY_IN_AT,
  SKY_IN_MS,
  STAR_TINTS,
  type EdgePlan,
  type GlyphPlan,
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

// Before the plan exists the clock runs up to the moment text would start, so
// the starfield fades in while the letters are being measured and mounted.
const PRE_TEXT_MS = SKY_IN_AT + SKY_IN_MS;
// Animated letters are mounted a few at a time, so no single frame stalls
// while the starfield fades in. Nothing is visible before the text starts.
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
  plan: GlyphPlan;
  times: RevealTimes;
};

/** Most letters: read, then shrink into a speck of star dust. One mapper. */
const DustGlyph = memo(function DustGlyph({
  char,
  box,
  fontSize,
  clock,
  plan,
  times,
}: GlyphProps) {
  const style = useAnimatedStyle(() => {
    const t = clock.value;
    const appear = easeInOut(clamp01((t - plan.tIn) / REVEAL.wordFadeMs));
    const e = easeInOut(clamp01((t - plan.tFly) / plan.flyMs));
    const { x, y } = flight(plan, e);
    const landed = clamp01((t - plan.tFly - plan.flyMs) / 800);
    const twinkle =
      1 -
      plan.twinkle *
        landed *
        0.5 *
        (1 + Math.sin(t * plan.pulseA + plan.phase));
    const out = 1 - clamp01((t - times.starsOut) / REVEAL.starsOutMs);
    return {
      opacity: (appear * (1 - e) + plan.starOpacity * twinkle * e) * out,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 1 + (plan.endScale - 1) * e },
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

/** The few letters that become the constellation's bright stars. */
const StarGlyph = memo(function StarGlyph({
  char,
  box,
  fontSize,
  clock,
  plan,
  times,
}: GlyphProps) {
  const dotSize = plan.dotSize;

  const wrapperStyle = useAnimatedStyle(() => {
    const t = clock.value;
    const appear = easeInOut(clamp01((t - plan.tIn) / REVEAL.wordFadeMs));
    const e = easeInOut(clamp01((t - plan.tFly) / plan.flyMs));
    const { x, y } = flight(plan, e);
    const out = 1 - clamp01((t - times.starsOut) / REVEAL.starsOutMs);
    return {
      opacity: (appear * (1 - e) + e) * out,
      transform: [{ translateX: x }, { translateY: y }],
    };
  });

  // The letter shrinks and fades as its star brightens.
  const letterStyle = useAnimatedStyle(() => {
    const e = easeInOut(clamp01((clock.value - plan.tFly) / plan.flyMs));
    return {
      opacity: 1 - smoothstep(0.35, 0.8, e),
      transform: [{ scale: 1 + (plan.endScale - 1) * e }],
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    const t = clock.value;
    const e = easeInOut(clamp01((t - plan.tFly) / plan.flyMs));
    const landed = clamp01((t - plan.tFly - plan.flyMs) / 600);
    const wave =
      0.6 * Math.sin(t * plan.pulseA + plan.phase) +
      0.4 * Math.sin(t * plan.pulseB * 2.3 + plan.phase * 1.7);
    const pulse = 1 + landed * wave * 0.384;
    return {
      opacity: smoothstep(0.55, 1, e) * (0.8 + 0.2 * pulse),
      transform: [{ scale: (0.4 + 0.6 * e) * pulse }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          alignItems: "center",
          justifyContent: "center",
        },
        wrapperStyle,
      ]}
    >
      <Animated.Text
        allowFontScaling={false}
        style={[textStyle(fontSize), { color: TEXT_COLOR }, letterStyle]}
      >
        {char}
      </Animated.Text>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: STAR_TINTS[plan.tint],
            boxShadow: plan.bright
              ? `0 0 ${dotSize * 2.6}px ${dotSize * 0.6}px ${rgba(GLOW_COLOR, 0.95)}`
              : `0 0 ${dotSize * 1.8}px ${dotSize * 0.35}px ${rgba(GLOW_COLOR, 0.75)}`,
          },
          dotStyle,
        ]}
      />
    </Animated.View>
  );
});

const Edge = memo(function Edge({
  edge,
  times,
  clock,
}: {
  edge: EdgePlan;
  times: RevealTimes;
  clock: SharedValue<number>;
}) {
  const rotate = `${edge.angle}rad`;
  const style = useAnimatedStyle(() => {
    const t = clock.value;
    const progress = clamp01((t - edge.tDraw) / edge.drawMs);
    const out = 1 - clamp01((t - times.linesOut) / REVEAL.linesOutMs);
    return {
      opacity: progress > 0 ? out : 0,
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

/** One slow streak across the sky, from where the player tapped. */
const ShootingStar = memo(function ShootingStar({ shot }: { shot: Shot }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: shot.durationMs,
      easing: Easing.out(Easing.quad),
    });
    return () => cancelAnimation(progress);
  }, [progress, shot.durationMs]);

  const ux = Math.cos(shot.angle);
  const uy = Math.sin(shot.angle);
  const rotate = `${shot.angle}rad`;

  // The head travels and fades; the tail grows out behind it.
  const headStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const distance = p * shot.travel;
    return {
      opacity: 0.7 * smoothstep(0, 0.1, p) * (1 - smoothstep(0.55, 1, p)),
      transform: [
        { translateX: ux * distance },
        { translateY: uy * distance },
        { rotate },
      ],
    };
  });
  const tailStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 0.05 + 0.95 * smoothstep(0, 0.4, progress.value) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: shot.x - shot.tail,
          top: shot.y - 1,
          width: shot.tail,
          height: 2,
          transformOrigin: "100% 50%",
        },
        headStyle,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: "100% 50%", borderRadius: 1, overflow: "hidden" },
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
      <View
        style={{
          position: "absolute",
          right: -1.5,
          top: -0.5,
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: STAR_COLOR,
          boxShadow: `0 0 5px 1px ${rgba(GLOW_COLOR, 0.5)}`,
        }}
      />
    </Animated.View>
  );
});

// --- The reveal --------------------------------------------------------------

/**
 * Full-screen reveal of a newly earned Tao chapter: the chapter is read out
 * over a starfield, then its letters fly into the chapter's constellation.
 * Covers its parent and swallows every touch until it finishes, so place it
 * last in the screen's tree. It can't be skipped (it is meant to be calm);
 * taps send shooting stars across the sky instead.
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
  const [layout, setLayout] = useState<{
    plan: RevealPlan;
    boxes: Box[];
  } | null>(null);
  const plan = layout?.plan ?? null;
  const [mountedCount, setMountedCount] = useState(0);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finish = useCallback(() => onDoneRef.current(), []);
  const onUncoverRef = useRef(onUncover);
  onUncoverRef.current = onUncover;
  const uncover = useCallback(() => onUncoverRef.current?.(), []);

  // Without a figure there is nothing to reveal.
  useEffect(() => {
    if (!constellation) finish();
  }, [constellation, finish]);

  // --- Fit the text to the screen, then plan from the measured letters. ---
  const availableHeight = height - insets.top - insets.bottom - 56;
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
        screen: { width, height, top: insets.top, bottom: insets.bottom },
      });
      setLayout({ plan: next, boxes });
    },
    [constellation, fontSize, height, insets.bottom, insets.top, parsed, width],
  );

  // Mount the animated letters (then the lines) a chunk per frame.
  const mountTotal = plan ? plan.glyphs.length + plan.edges.length : 0;
  useEffect(() => {
    if (!plan || mountedCount >= mountTotal) return;
    const frame = requestAnimationFrame(() =>
      setMountedCount((count) => Math.min(mountTotal, count + MOUNT_CHUNK)),
    );
    return () => cancelAnimationFrame(frame);
  }, [mountTotal, mountedCount, plan]);

  // --- Clock --------------------------------------------------------------
  useEffect(() => {
    clock.value = withTiming(PRE_TEXT_MS, {
      duration: PRE_TEXT_MS,
      easing: Easing.linear,
    });
    return () => cancelAnimation(clock);
  }, [clock]);

  useEffect(() => {
    if (!plan) return;
    const total = plan.times.total;
    clock.value = withTiming(
      total,
      { duration: Math.max(0, total - clock.value), easing: Easing.linear },
      (finished) => {
        if (finished) scheduleOnRN(finish);
      },
    );
  }, [clock, finish, plan]);

  // The back button can't skip it, but mustn't leave the game either.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  // --- Layers -------------------------------------------------------------
  const times = plan?.times ?? null;

  useAnimatedReaction(
    () => (times ? clock.value >= times.uncover : false),
    (now, previous) => {
      if (now && !previous) scheduleOnRN(uncover);
    },
    [times],
  );

  // --- Shooting stars -------------------------------------------------------
  const [shots, setShots] = useState<Shot[]>([]);
  const shotCount = useRef(0);
  tapRef.current = (x, y) => {
    // Only while the sky is up.
    const t = clock.get();
    if (t < SKY_IN_AT + 500 || (times && t > times.skyOut)) return;
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
    const fadeOut = times
      ? 1 - easeInOut(clamp01((t - times.skyOut) / REVEAL.skyOutMs))
      : 1;
    return { opacity: fadeIn * fadeOut };
  });

  const glyphCount = plan?.glyphs.length ?? 0;
  const mountedGlyphs = Math.min(mountedCount, glyphCount);
  const mountedEdges = Math.max(0, mountedCount - glyphCount);

  return (
    // Touches go to TaoReveal's own view, which knows where they landed.
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
          insets={insets}
          availableHeight={availableHeight}
          onTooTall={onTooTall}
          onMeasured={onMeasured}
        />
      )}

      {layout && times && (
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          {layout.plan.edges.slice(0, mountedEdges).map((edge, index) => (
            <Edge key={index} edge={edge} times={times} clock={clock} />
          ))}
          {layout.plan.glyphs
            .slice(0, mountedGlyphs)
            .map((glyphPlan, index) => {
              const Component =
                glyphPlan.role === ROLE_STAR ? StarGlyph : DustGlyph;
              return (
                <Component
                  key={index}
                  char={parsed.glyphs[index].char}
                  box={layout.boxes[index]}
                  fontSize={fontSize}
                  clock={clock}
                  plan={glyphPlan}
                  times={times}
                />
              );
            })}
        </View>
      )}

      {shots.map((shot) => (
        <ShootingStar key={shot.id} shot={shot} />
      ))}
    </View>
  );
}
