import { Typography } from "@/components/common/Text";
import { REVEAL_TIMING } from "@/components/common/reveal-timing";
import { getQuoteAuthor } from "@/data/quote-authors";
import { rgba } from "@/styles/styles";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  ImageBackground,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { G, Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { buildPortrait, type PortraitModel } from "./fourier";
import {
  fitPenText,
  inkWidthFor,
  planPenTiming,
  shiftBlock,
  type PenBlock,
  type PenStroke,
  type PenTiming,
} from "./pen-text";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  /** The quote as the player reads it (translated or not). */
  text: string;
  author: string;
  source: string;
  /** The game's background and colour, redrawn over the game's UI. */
  background: ImageSourcePropType;
  overlayColor: string;
  /** Just before the scene clears: the screen behind can change unseen. */
  onUncover?: () => void;
  onDone: () => void;
};

export const INK = "#f7f3ea";
const OVERLAY_OPACITY = 0.86;

// --- Timeline (ms) -------------------------------------------------------------

export const REVEAL_TIMES = {
  /** The UI fades away as the background is redrawn over it. */
  backdropMs: REVEAL_TIMING.fadeInMs,
  /** The pen starts writing. */
  writeAt: REVEAL_TIMING.fadeInMs + 200,
  /** The portrait appears this long after the writing starts... */
  portraitDelayMs: 2000,
  /** ...and takes at least this long to resolve. */
  portraitMinMs: 3000,
  /** Each letter fades in over the time it is written, plus this. */
  letterFadeMs: 450,
  afterWritingMs: 300,
  /** The author fades in whole, then the source. */
  authorFadeMs: 900,
  sourceFadeMs: 900,
  /** Everything stays up at least this long once the source is in. */
  holdMs: REVEAL_TIMING.holdMs,
  outMs: REVEAL_TIMING.fadeOutMs,
};

// Pen speed, as a share of the font size per millisecond, and the longest
// the quote may take (a long one is written faster).
const PEN_SPEED = 0.0715;
const PEN_MAX_MS = 6150;
const QUOTE_MAX_SIZE = 32;
const QUOTE_MIN_SIZE = 14;

// Fourier series: terms kept, and points drawn per frame.
const SERIES_TERMS = 160;
const HARMONIC_POINTS = 360;

// Author and source: Outfit Light.
const AUTHOR_SIZE = 20;
const SOURCE_SIZE = 13;

const PAD_X = 24;
const PAD_Y = 28;
const PORTRAIT_GAP = 20;
const AUTHOR_GAP = 18;
const SOURCE_GAP = 4;
const PORTRAIT_INK = 1.5;

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

function easeOut(value: number) {
  "worklet";
  return 1 - Math.pow(1 - value, 3);
}

// --- Plan ----------------------------------------------------------------------

export type QuoteRevealPlan = {
  canvas: { width: number; height: number };
  quote: { block: PenBlock; timing: PenTiming; fadeEnds: number[] };
  portrait: {
    model: PortraitModel;
    x: number;
    start: number;
    end: number;
  } | null;
  maxWidth: number;
  authorAt: number;
  sourceAt: number;
  /** When the scene starts to clear. */
  outStart: number;
  total: number;
};

/** Rough height of Outfit text wrapped at `width`. */
function estimateOutfitHeight(text: string, fontSize: number, width: number) {
  const perLine = Math.max(8, Math.floor(width / (fontSize * 0.5)));
  const lines = text
    .split("\n")
    .reduce((sum, line) => sum + Math.ceil((line.length * 1.1) / perLine), 0);
  return lines * fontSize * 1.45;
}

/**
 * Sizes everything to the screen and times it: the quote is written, the
 * portrait resolves above it meanwhile, then the author and the source fade in
 * below, and all of it holds before the scene clears.
 */
export function planQuoteReveal(
  quote: { text: string; source: string },
  portraitPath: string | undefined,
  screen: { width: number; height: number; top: number; bottom: number },
): QuoteRevealPlan {
  const times = REVEAL_TIMES;
  const maxWidth = Math.min(screen.width - PAD_X * 2, 460);
  const available = screen.height - screen.top - screen.bottom - PAD_Y * 2;
  const sourceHeight = estimateOutfitHeight(
    quote.source,
    SOURCE_SIZE,
    maxWidth,
  );
  const portraitHeight = portraitPath
    ? Math.max(110, Math.min(230, available * 0.3))
    : 0;
  const quoteHeight =
    available -
    (portraitPath ? portraitHeight + PORTRAIT_GAP : 0) -
    AUTHOR_GAP -
    AUTHOR_SIZE * 1.45 -
    SOURCE_GAP -
    sourceHeight;

  const fitted = fitPenText(
    quote.text,
    { width: maxWidth, height: Math.max(60, quoteHeight) },
    { maxSize: QUOTE_MAX_SIZE, minSize: QUOTE_MIN_SIZE },
  );
  const model = portraitPath
    ? buildPortrait(portraitPath, portraitHeight, SERIES_TERMS)
    : null;

  // The portrait above, centred; the quote below.
  const canvasWidth = Math.max(fitted.width, model?.width ?? 0);
  const quoteTop = model ? model.height + PORTRAIT_GAP : 0;
  const block = shiftBlock(fitted, (canvasWidth - fitted.width) / 2, quoteTop);
  const timing = planPenTiming(block, {
    start: times.writeAt,
    speed: block.fontSize * PEN_SPEED,
    maxMs: PEN_MAX_MS,
  });
  const fadeEnds = timing.t1.map((t1) => t1 + times.letterFadeMs);
  const written = fadeEnds.length
    ? fadeEnds[fadeEnds.length - 1]
    : times.writeAt;

  let portrait: QuoteRevealPlan["portrait"] = null;
  let drawn = written;
  if (model) {
    const start = times.writeAt + times.portraitDelayMs;
    const end = Math.max(written, start + times.portraitMinMs);
    portrait = { model, x: (canvasWidth - model.width) / 2, start, end };
    drawn = end;
  }

  const authorAt = drawn + times.afterWritingMs;
  const sourceAt = authorAt + times.authorFadeMs;
  const outStart = sourceAt + times.sourceFadeMs + times.holdMs;
  return {
    canvas: { width: canvasWidth, height: quoteTop + block.height },
    quote: { block, timing, fadeEnds },
    portrait,
    maxWidth,
    authorAt,
    sourceAt,
    outStart,
    total: outStart + times.outMs,
  };
}

// --- Commit windows --------------------------------------------------------------

/**
 * Which items (in time order) have finished and which have started, updated
 * only when either count changes. Finished items render as plain, static
 * paths, so only the few in progress are animated on any frame.
 */
function useTimeWindow(
  clock: SharedValue<number>,
  t0: number[],
  t1: number[],
  lookaheadMs = 60,
) {
  const [range, setRange] = useState({ done: 0, started: 0 });
  const update = useCallback(
    (done: number, started: number) => setRange({ done, started }),
    [],
  );
  useAnimatedReaction(
    () => {
      const t = clock.value;
      const count = t1.length;
      let done = 0;
      while (done < count && t1[done] <= t) done++;
      let started = done;
      while (started < count && t0[started] <= t + lookaheadMs) started++;
      return done * 100000 + started;
    },
    (packed, previous) => {
      if (packed === previous) return;
      scheduleOnRN(update, Math.floor(packed / 100000), packed % 100000);
    },
    [t0, t1, lookaheadMs],
  );
  return range;
}

/** Whether the clock has passed `time`; flips once. */
function useClockPassed(clock: SharedValue<number>, time: number) {
  const [passed, setPassed] = useState(false);
  useAnimatedReaction(
    () => clock.value >= time,
    (now, previous) => {
      if (now && !previous) scheduleOnRN(setPassed, true);
    },
    [time],
  );
  return passed;
}

// --- Writing ---------------------------------------------------------------------

const INK_LINE = {
  stroke: INK,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

/**
 * A stroke (a letter, or part of one) being written: revealed along its
 * length at the pen's pace, and fading in as it goes.
 */
const ActiveStroke = memo(function ActiveStroke({
  stroke,
  t0,
  t1,
  fadeEnd,
  clock,
  ink,
}: {
  stroke: PenStroke;
  t0: number;
  t1: number;
  fadeEnd: number;
  clock: SharedValue<number>;
  ink: number;
}) {
  const { length } = stroke;
  const span = Math.max(1, t1 - t0);
  const fadeSpan = Math.max(1, fadeEnd - t0);
  const dashProps = useAnimatedProps(() => {
    const t = clock.value;
    const p = clamp01((t - t0) / span);
    return {
      strokeDashoffset: length * (1 - p),
      strokeOpacity: p > 0 ? easeOut(clamp01((t - t0) / fadeSpan)) : 0,
    };
  });
  return (
    <AnimatedPath
      {...INK_LINE}
      d={stroke.d}
      strokeWidth={ink}
      strokeDasharray={[length, length + ink * 4]}
      animatedProps={dashProps}
    />
  );
});

const QuoteStrokes = memo(function QuoteStrokes({
  block,
  timing,
  fadeEnds,
  clock,
}: {
  block: PenBlock;
  timing: PenTiming;
  fadeEnds: number[];
  clock: SharedValue<number>;
}) {
  const ink = inkWidthFor(block.fontSize);
  const { done, started } = useTimeWindow(clock, timing.t0, fadeEnds);
  return (
    <>
      {block.strokes.slice(0, done).map((stroke, i) => (
        <Path key={`s${i}`} {...INK_LINE} d={stroke.d} strokeWidth={ink} />
      ))}
      {block.strokes.slice(done, started).map((stroke, j) => (
        <ActiveStroke
          key={`a${done + j}`}
          stroke={stroke}
          t0={timing.t0[done + j]}
          t1={timing.t1[done + j]}
          fadeEnd={fadeEnds[done + j]}
          clock={clock}
          ink={ink}
        />
      ))}
    </>
  );
});

// --- Portrait --------------------------------------------------------------------

/**
 * The whole portrait at once, resolving from a circle as the terms of its
 * Fourier series come in, one after another, and fading in over the same time.
 */
function HarmonicsPortrait({
  model,
  start,
  end,
  clock,
}: {
  model: PortraitModel;
  start: number;
  end: number;
  clock: SharedValue<number>;
}) {
  const span = end - start;
  const { freq, re, im } = model;
  const termCount = freq.length;
  const circleRadius = model.height * 0.4;
  const finished = useClockPassed(clock, end);

  const shapeProps = useAnimatedProps(() => {
    const u = clamp01((clock.value - start) / span);
    // The early terms carry the likeness, so they get most of the time.
    const terms = Math.max(1, (termCount - 1) * Math.pow(u, 2.2));
    const last = Math.min(termCount - 1, Math.ceil(terms));
    const xs: number[] = [];
    const ys: number[] = [];
    for (let m = 0; m <= HARMONIC_POINTS; m++) {
      xs.push(0);
      ys.push(0);
    }
    for (let k = 1; k <= last; k++) {
      const weight = clamp01(terms - (k - 1));
      const step = (2 * Math.PI * freq[k]) / HARMONIC_POINTS;
      const sr = Math.cos(step);
      const si = Math.sin(step);
      // Rotate each term's phasor point by point instead of calling cos/sin.
      let zr = re[k] * weight;
      let zi = im[k] * weight;
      for (let m = 0; m <= HARMONIC_POINTS; m++) {
        xs[m] += zr;
        ys[m] += zi;
        const next = zr * sr - zi * si;
        zi = zr * si + zi * sr;
        zr = next;
      }
    }
    // A line drawn there and back has no round first harmonic, so the shape
    // starts as a true circle and melts into the series.
    const melt = easeInOut(clamp01(u / 0.35));
    let d = "";
    for (let m = 0; m <= HARMONIC_POINTS; m++) {
      const angle = Math.PI / 2 + (2 * Math.PI * m) / HARMONIC_POINTS;
      const cx = circleRadius * Math.cos(angle);
      const cy = circleRadius * Math.sin(angle);
      const x = re[0] + cx + (xs[m] - cx) * melt;
      const y = im[0] + cy + (ys[m] - cy) * melt;
      d += `${m === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return { d, strokeOpacity: u };
  });

  if (finished) {
    return <Path {...INK_LINE} d={model.traceD} strokeWidth={PORTRAIT_INK} />;
  }
  return (
    <AnimatedPath
      {...INK_LINE}
      strokeWidth={PORTRAIT_INK}
      animatedProps={shapeProps}
    />
  );
}

// --- The reveal ------------------------------------------------------------------

/**
 * Full-screen reveal of a newly earned quote. The game's own background is
 * redrawn over its UI with a stronger overlay, so the board and buttons fade
 * away and only the scenery stays; the quote is written out in a hand, the
 * author's portrait resolves above it meanwhile, and the author and source
 * fade in below. Covers its parent and swallows every touch until it
 * finishes, so place it last in the screen's tree. It can't be skipped.
 */
export function QuoteReveal(props: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  return (
    <View
      testID="quote-reveal"
      // Swallow every touch: the game and its header are locked until done.
      onStartShouldSetResponder={() => true}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) => current ?? { width, height });
      }}
      style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
    >
      {size && <RevealScene {...props} {...size} />}
    </View>
  );
}

function RevealScene({
  text,
  author,
  source,
  background,
  overlayColor,
  onUncover,
  onDone,
  width,
  height,
}: Props & { width: number; height: number }) {
  const insets = useSafeAreaInsets();
  const clock = useSharedValue(0);
  const portraitPath = getQuoteAuthor(author)?.portrait;
  const plan = useMemo(
    () =>
      planQuoteReveal({ text, source }, portraitPath, {
        width,
        height,
        top: insets.top,
        bottom: insets.bottom,
      }),
    [height, insets.bottom, insets.top, portraitPath, source, text, width],
  );

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finish = useCallback(() => onDoneRef.current(), []);
  const onUncoverRef = useRef(onUncover);
  onUncoverRef.current = onUncover;
  const uncover = useCallback(() => onUncoverRef.current?.(), []);

  useEffect(() => {
    clock.value = withTiming(
      plan.total,
      { duration: plan.total, easing: Easing.linear },
      (finished) => {
        if (finished) scheduleOnRN(finish);
      },
    );
    return () => cancelAnimation(clock);
  }, [clock, finish, plan]);

  useAnimatedReaction(
    () => clock.value >= plan.outStart,
    (now, previous) => {
      if (now && !previous) scheduleOnRN(uncover);
    },
    [plan],
  );

  // The back button can't skip it, but mustn't leave the game either.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  const { backdropMs, outMs, authorFadeMs, sourceFadeMs } = REVEAL_TIMES;
  const backdropStyle = useAnimatedStyle(() => {
    const t = clock.value;
    const fadeIn = easeInOut(clamp01(t / backdropMs));
    const fadeOut = 1 - easeInOut(clamp01((t - plan.outStart) / outMs));
    return { opacity: fadeIn * fadeOut };
  });
  const contentStyle = useAnimatedStyle(() => ({
    opacity:
      1 - easeInOut(clamp01((clock.value - plan.outStart) / (outMs * 0.7))),
  }));
  const authorStyle = useAnimatedStyle(() => ({
    opacity: easeInOut(clamp01((clock.value - plan.authorAt) / authorFadeMs)),
  }));
  const sourceStyle = useAnimatedStyle(() => ({
    opacity: easeInOut(clamp01((clock.value - plan.sourceAt) / sourceFadeMs)),
  }));

  const { canvas } = plan;
  // Room round the canvas, so round line ends aren't clipped.
  const margin = 8;
  const lineStyle = (size: number) => ({
    maxWidth: plan.maxWidth,
    textAlign: "center" as const,
    fontFamily: Typography.fontFamily[300],
    fontSize: size,
    lineHeight: size * 1.45,
  });

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          // Opaque even before the image has loaded, so the UI never shows.
          { backgroundColor: overlayColor },
          backdropStyle,
        ]}
      >
        <ImageBackground
          source={background}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: rgba(overlayColor, OVERLAY_OPACITY) },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            paddingTop: insets.top + PAD_Y,
            paddingBottom: insets.bottom + PAD_Y,
            paddingHorizontal: PAD_X,
            alignItems: "center",
            justifyContent: "center",
          },
          contentStyle,
        ]}
      >
        <View style={{ width: canvas.width, height: canvas.height }}>
          <Svg
            width={canvas.width + margin * 2}
            height={canvas.height + margin * 2}
            viewBox={`${-margin} ${-margin} ${canvas.width + margin * 2} ${canvas.height + margin * 2}`}
            style={{ position: "absolute", left: -margin, top: -margin }}
          >
            {plan.portrait && (
              <G transform={`translate(${plan.portrait.x} 0)`}>
                <HarmonicsPortrait
                  model={plan.portrait.model}
                  start={plan.portrait.start}
                  end={plan.portrait.end}
                  clock={clock}
                />
              </G>
            )}
            <QuoteStrokes
              block={plan.quote.block}
              timing={plan.quote.timing}
              fadeEnds={plan.quote.fadeEnds}
              clock={clock}
            />
          </Svg>
        </View>
        <Animated.Text
          allowFontScaling={false}
          style={[
            lineStyle(AUTHOR_SIZE),
            { marginTop: AUTHOR_GAP, color: INK },
            authorStyle,
          ]}
        >
          {author}
        </Animated.Text>
        <Animated.Text
          allowFontScaling={false}
          style={[
            lineStyle(SOURCE_SIZE),
            { marginTop: SOURCE_GAP, color: rgba(INK, 0.7) },
            sourceStyle,
          ]}
        >
          {source}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
