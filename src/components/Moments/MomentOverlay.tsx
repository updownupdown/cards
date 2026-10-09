import { Card } from "@/components/Cards/Card";
import type { PlayingCard } from "@/components/Cards/card-utils";
import { Text } from "@/components/common/Text";
import { ZoomableImage } from "@/components/common/ZoomableImage";
import { getQuote } from "@/data/collectibles";
import {
  GAME_FULL_THUMBNAIL_ASSETS,
  GAME_THUMBNAIL_ASPECTS,
} from "@/data/game-thumbnails";
import { GAMES_DATA } from "@/data/games-registry";
import {
  getMomentFrequency,
  isMomentIntroduced,
  saveMomentFrequency,
  type Moment,
} from "@/data/moments";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import {
  isQuoteTranslated,
  localizeGameTitle,
  localizeQuote,
} from "@/i18n/content";
import { usePalette } from "@/styles/palette";
import { rgba } from "@/styles/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { MomentFrequencyPicker } from "./MomentFrequencyPicker";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Black comes up slowly; leaving is quicker, but never a cut. */
const IN_MS = 1400;
const OUT_MS = 700;
const BLACK = "#000000";

/** The breath to follow: in, held, out, held; twice, then it moves on. */
const BREATH = { inMs: 4000, holdInMs: 1000, outMs: 6000, holdOutMs: 1000 };
const BREATH_MS =
  BREATH.inMs + BREATH.holdInMs + BREATH.outMs + BREATH.holdOutMs;
const BREATHS = 2;
const BREATH_SMALL = 0.55;
/** One slow turn of the shapes, and of the waves along their edges. */
const DRIFT_MS = 40000;

const SETTLE_CARDS = 26;
const SETTLE_START_MS = 900;
const SETTLE_STAGGER_MS = 260;
const SETTLE_MS = 3400;

/** How long each moment stays before moving on by itself. */
const ARTWORK_MS = 10000;
const SETTLE_TOTAL_MS = 12500;
/** A quote stays long enough to be read slowly, and at least this long. */
const QUOTE_MIN_MS = 12000;
const QUOTE_MAX_MS = 24000;
const QUOTE_MS_PER_CHARACTER = 60;
const QUOTE_FADE_MS = 2200;
const QUOTE_AUTHOR_AT_MS = 2600;

export function momentDuration(moment: Moment) {
  switch (moment.kind) {
    case "intro":
      return null;
    case "breathe":
      return IN_MS + BREATHS * BREATH_MS;
    case "settle":
      return SETTLE_TOTAL_MS;
    case "artwork":
      return ARTWORK_MS;
    case "quote": {
      const length = getQuote(moment.quoteId)?.text.length ?? 0;
      return Math.min(
        QUOTE_MAX_MS,
        Math.max(QUOTE_MIN_MS, 5000 + length * QUOTE_MS_PER_CHARACTER),
      );
    }
  }
}

type Props = {
  moment: Moment;
  /** The breath's colour: the game's accent, or the app's. */
  accent: string;
  /** For the settling cards' backs. */
  cardBackKey?: string;
  /** How long to wait, hidden and letting taps through, before coming up. */
  delayMs?: number;
  onDone: () => void;
};

/**
 * A quiet moment, over the whole screen, on black: a breath to follow,
 * cards settling, a quote, or the game's picture to look into; or, the first
 * time, the choice of how often they come. At the foot, "Skip quiet moment",
 * filling as the moment runs, ends it at once; when it's full the moment
 * moves on by itself. Android's back button ends it too.
 */
export function MomentOverlay({
  moment,
  accent,
  cardBackKey,
  delayMs = 0,
  onDone,
}: Props) {
  const { t } = useTranslation("game");
  const { spacing } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const cover = useSharedValue(0);
  const progress = useSharedValue(0);
  const [shown, setShown] = useState(delayMs === 0);
  const closing = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const duration = momentDuration(moment);

  useEffect(() => {
    if (shown) return;
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, shown]);

  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    [],
  );
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    cancelAnimation(progress);
    // The first moment is the choice: closing it keeps whatever is picked.
    if (moment.kind === "intro" && !isMomentIntroduced()) {
      void saveMomentFrequency(getMomentFrequency());
    }
    cover.value = withTiming(0, {
      duration: OUT_MS,
      easing: Easing.inOut(Easing.quad),
    });
    exitTimer.current = setTimeout(() => onDoneRef.current(), OUT_MS);
  }, [cover, moment.kind, progress]);

  // The time left fills the skip button; held while the picture is zoomed
  // and while the app is away.
  const [held, setHeld] = useState(false);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setAway(state !== "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!shown || duration === null) return;
    if (held || away) {
      cancelAnimation(progress);
      return;
    }
    progress.value = withTiming(
      1,
      {
        duration: duration * (1 - progress.value),
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) scheduleOnRN(close);
      },
    );
  }, [away, close, duration, held, progress, shown]);

  useEffect(() => {
    if (!shown) return;
    cover.value = withTiming(1, {
      duration: IN_MS,
      easing: Easing.inOut(Easing.quad),
    });
  }, [cover, shown]);

  useEffect(() => {
    if (Platform.OS !== "android" || !shown) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        close();
        return true;
      },
    );
    return () => subscription.remove();
  }, [close, shown]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));

  if (!shown) return null;

  return (
    <Animated.View
      testID="moment-overlay"
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 1100, backgroundColor: BLACK },
        coverStyle,
      ]}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top + spacing(24),
          paddingHorizontal: spacing(28),
        }}
      >
        {moment.kind === "intro" && <IntroMoment />}
        {moment.kind === "breathe" && <Breath accent={accent} />}
        {moment.kind === "settle" && (
          <SettlingCards cardBackKey={cardBackKey} />
        )}
        {moment.kind === "quote" && <QuoteMoment quoteId={moment.quoteId} />}
        {moment.kind === "artwork" && (
          <ArtworkMoment path={moment.path} onZoomChange={setHeld} />
        )}
      </View>

      <View
        style={{
          alignItems: "center",
          paddingTop: spacing(16),
          paddingBottom: insets.bottom + spacing(28),
        }}
      >
        <MomentButton
          label={
            moment.kind === "intro" ? t("moments.continue") : t("moments.skip")
          }
          progress={duration === null ? undefined : progress}
          onPress={close}
        />
      </View>
    </Animated.View>
  );
}

/** A quiet pill at the foot, filling from the left as the moment runs. */
function MomentButton({
  label,
  progress,
  onPress,
}: {
  label: string;
  progress?: SharedValue<number>;
  onPress: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const palette = usePalette();
  const fillStyle = useAnimatedStyle(() => ({
    width: `${(progress?.value ?? 0) * 100}%`,
  }));
  return (
    <Animated.View entering={FadeIn.delay(IN_MS).duration(900)}>
      <Pressable
        testID="moment-skip"
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          minWidth: spacing(230),
          height: spacing(44),
          paddingHorizontal: spacing(22),
          borderRadius: spacing(22),
          borderWidth: 1,
          borderColor: rgba(palette.ink, 0.22),
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {progress && (
          <Animated.View
            style={[
              {
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                backgroundColor: rgba(palette.ink, 0.12),
              },
              fillStyle,
            ]}
          />
        )}
        <Text size="sm" weight={400} color={rgba(palette.ink, 0.75)}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** The first moment: what these are, and how often they should come. */
function IntroMoment() {
  const { t } = useTranslation("game");
  const { spacing, font } = useResponsiveMetrics();
  const palette = usePalette();
  return (
    <Animated.View
      entering={FadeIn.delay(IN_MS / 2).duration(1200)}
      style={{
        width: "100%",
        maxWidth: spacing(420),
        alignItems: "center",
        gap: spacing(28),
      }}
    >
      <View style={{ alignItems: "center", gap: spacing(12) }}>
        <Text serif color={palette.ink} style={{ fontSize: font(26) }}>
          {t("moments.introTitle")}
        </Text>
        <Text
          size="md"
          weight={400}
          color={palette.dim}
          style={{ textAlign: "center" }}
        >
          {t("moments.introText")}
        </Text>
      </View>
      <MomentFrequencyPicker />
      <Text
        size="sm"
        weight={400}
        color={rgba(palette.dim, 0.75)}
        style={{ textAlign: "center" }}
      >
        {t("moments.introLater")}
      </Text>
    </Animated.View>
  );
}

// --- The breath -----------------------------------------------------------

type Hsl = { h: number; s: number; l: number };

function toHsl(hex: string): Hsl {
  const value = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function fromHsl({ h, s, l }: Hsl): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) =>
    Math.round(Math.max(0, Math.min(1, x)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

/** A calm sea-green, for an accent too grey to colour a breath. */
const BREATH_FALLBACK: Hsl = { h: 172, s: 0.42, l: 0.55 };

/** Three shades round the accent, one for each shape. */
function breathColours(accent: string) {
  const base = toHsl(accent);
  const hue = base.s < 0.18 ? BREATH_FALLBACK : base;
  const s = Math.max(0.35, Math.min(0.65, hue.s));
  return [-22, 0, 22].map((shift) => {
    const h = (hue.h + shift + 360) % 360;
    return {
      light: fromHsl({ h, s, l: 0.74 }),
      mid: fromHsl({ h, s, l: 0.56 }),
      deep: fromHsl({ h, s: s * 0.9, l: 0.3 }),
    };
  });
}

/**
 * Each shape: its size, how much its edge wobbles, which way it turns, and
 * how far its centre wanders, so the three overlap unevenly, never nested.
 */
const BLOBS = [
  { radius: 72, wobble: 0.11, seed: 0.4, turn: 1, orbit: 10, opacity: 0.6 },
  { radius: 68, wobble: 0.13, seed: 2.1, turn: -1, orbit: 12, opacity: 0.6 },
  { radius: 64, wobble: 0.1, seed: 4.3, turn: 1, orbit: 9, opacity: 0.65 },
];
const BLOB_POINTS = 8;

/**
 * A soft closed shape round the centre: its edge swells and dips in waves
 * that travel round it, and the whole turns slowly. `drift` runs 0 to 1 and
 * loops without a jolt.
 */
function blobPath(
  drift: number,
  radius: number,
  wobble: number,
  seed: number,
  turn: number,
  orbit: number,
): string {
  "worklet";
  const tau = Math.PI * 2;
  // The centre wanders slowly round a small circle of its own.
  const cx = orbit * Math.cos(seed * 1.3 - turn * drift * tau);
  const cy = orbit * Math.sin(seed * 1.3 - turn * drift * tau);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < BLOB_POINTS; i += 1) {
    const angle = (i / BLOB_POINTS) * tau;
    const r =
      radius *
      (1 +
        wobble *
          (0.6 * Math.sin(2 * angle + seed + drift * tau * 3) +
            0.4 * Math.sin(3 * angle - seed * 1.7 - drift * tau * 2)));
    const at = angle + turn * drift * tau;
    xs.push(cx + Math.cos(at) * r);
    ys.push(cy + Math.sin(at) * r);
  }
  // A smooth curve through the points (Catmull-Rom, as cubic Béziers).
  let d = `M${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 0; i < BLOB_POINTS; i += 1) {
    const p0 = (i - 1 + BLOB_POINTS) % BLOB_POINTS;
    const p1 = i;
    const p2 = (i + 1) % BLOB_POINTS;
    const p3 = (i + 2) % BLOB_POINTS;
    const c1x = xs[p1] + (xs[p2] - xs[p0]) / 6;
    const c1y = ys[p1] + (ys[p2] - ys[p0]) / 6;
    const c2x = xs[p2] - (xs[p3] - xs[p1]) / 6;
    const c2y = ys[p2] - (ys[p3] - ys[p1]) / 6;
    d += `C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${xs[p2].toFixed(2)} ${ys[p2].toFixed(2)}`;
  }
  return `${d}Z`;
}

function Blob({ drift, index }: { drift: SharedValue<number>; index: number }) {
  const { radius, wobble, seed, turn, orbit, opacity } = BLOBS[index];
  const animatedProps = useAnimatedProps(() => ({
    d: blobPath(drift.value, radius, wobble, seed, turn, orbit),
  }));
  return (
    <AnimatedPath
      d={blobPath(0, radius, wobble, seed, turn, orbit)}
      fill={`url(#breath-${index})`}
      opacity={opacity}
      animatedProps={animatedProps}
    />
  );
}

/**
 * Soft shapes to breathe with, filled and lit from above, slowly turning
 * and changing shape: together they swell while you breathe in, rest, and
 * slowly shrink while you breathe out, twice, with the one word for each
 * half under them.
 */
function Breath({ accent }: { accent: string }) {
  const { t } = useTranslation("game");
  const { spacing } = useResponsiveMetrics();
  const palette = usePalette();
  const scale = useSharedValue(BREATH_SMALL);
  const drift = useSharedValue(0);
  const [inhaling, setInhaling] = useState<boolean | null>(null);
  const colours = useMemo(() => breathColours(accent), [accent]);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(drift);
  }, [drift]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let halves = 0;
    const phase = (inhale: boolean) => {
      if (!alive || halves >= BREATHS * 2) return;
      halves += 1;
      setInhaling(inhale);
      scale.value = withTiming(inhale ? 1 : BREATH_SMALL, {
        duration: inhale ? BREATH.inMs : BREATH.outMs,
        easing: Easing.inOut(Easing.sin),
      });
      timer = setTimeout(
        () => phase(!inhale),
        inhale
          ? BREATH.inMs + BREATH.holdInMs
          : BREATH.outMs + BREATH.holdOutMs,
      );
    };
    // Begins once the black has come up.
    timer = setTimeout(() => phase(true), IN_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [scale]);

  const size = spacing(280);
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(IN_MS)}
      style={{ alignItems: "center", gap: spacing(20) }}
    >
      <Animated.View style={[{ width: size, height: size }, breathStyle]}>
        <Svg width={size} height={size} viewBox="-100 -100 200 200">
          <Defs>
            <RadialGradient
              id="breath-glow"
              cx="0"
              cy="0"
              r="100"
              gradientUnits="userSpaceOnUse"
            >
              <Stop
                offset="0.55"
                stopColor={colours[1].mid}
                stopOpacity={0.22}
              />
              <Stop offset="1" stopColor={colours[1].mid} stopOpacity={0} />
            </RadialGradient>
            {colours.map((colour, index) => (
              <RadialGradient
                key={index}
                id={`breath-${index}`}
                cx="0"
                cy="0"
                r={BLOBS[index].radius * 1.15}
                fx={-BLOBS[index].radius * 0.3}
                fy={-BLOBS[index].radius * 0.4}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={colour.light} />
                <Stop offset="0.6" stopColor={colour.mid} />
                <Stop offset="1" stopColor={colour.deep} />
              </RadialGradient>
            ))}
          </Defs>
          <Path
            d="M-100 0a100 100 0 1 0 200 0a100 100 0 1 0 -200 0Z"
            fill="url(#breath-glow)"
          />
          {BLOBS.map((_, index) => (
            <Blob key={index} drift={drift} index={index} />
          ))}
        </Svg>
      </Animated.View>
      {/* The two words take turns in the same place. */}
      <View style={{ width: spacing(160), height: spacing(28) }}>
        {inhaling !== null && (
          <Animated.View
            key={inhaling ? "in" : "out"}
            entering={FadeIn.duration(900)}
            exiting={FadeOut.duration(600)}
            style={[StyleSheet.absoluteFill, { alignItems: "center" }]}
          >
            <Text serif color={rgba(palette.ink, 0.75)} size="lg">
              {inhaling ? t("moments.breatheIn") : t("moments.breatheOut")}
            </Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// --- A quote --------------------------------------------------------------

/** A collected quote on its own: the words, then who said them, and where. */
function QuoteMoment({ quoteId }: { quoteId: number }) {
  const { spacing, font } = useResponsiveMetrics();
  const palette = usePalette();
  const language = useDisplayLanguage();
  const { settings } = useGlobalSettings();
  const english = getQuote(quoteId);
  const quote = useMemo(
    () =>
      english &&
      settings.translateCollectibles &&
      isQuoteTranslated(quoteId, english, language)
        ? localizeQuote(quoteId, english, language)
        : english,
    [english, language, quoteId, settings.translateCollectibles],
  );
  if (!quote) return null;
  return (
    <View
      style={{
        alignItems: "center",
        gap: spacing(22),
        maxWidth: spacing(520),
      }}
    >
      <Animated.View entering={FadeIn.delay(IN_MS / 2).duration(QUOTE_FADE_MS)}>
        <Text
          serif
          italic
          color={palette.ink}
          style={{
            fontSize: font(24),
            lineHeight: font(33),
            textAlign: "center",
          }}
        >
          “{quote.text}”
        </Text>
      </Animated.View>
      <Animated.View
        entering={FadeIn.delay(IN_MS / 2 + QUOTE_AUTHOR_AT_MS).duration(1500)}
        style={{ alignItems: "center", gap: spacing(4) }}
      >
        <Text size="md" weight={500} color={rgba(palette.ink, 0.85)}>
          {quote.author}
        </Text>
        <Text
          size="sm"
          weight={400}
          color={palette.dim}
          style={{ textAlign: "center" }}
        >
          {quote.source}
        </Text>
      </Animated.View>
    </View>
  );
}

// --- The game's picture ---------------------------------------------------

/** The game's whole picture to look into, with its label and a nudge to zoom. */
function ArtworkMoment({
  path,
  onZoomChange,
}: {
  path: string;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const { t } = useTranslation("game");
  const { spacing, font } = useResponsiveMetrics();
  const palette = usePalette();
  const language = useDisplayLanguage();
  const game = GAMES_DATA[path];
  const [box, setBox] = useState({ width: 0, height: 0 });
  if (!game?.thumbnail) return null;
  const credit = game.thumbnailCredit;
  const aspect = GAME_THUMBNAIL_ASPECTS[game.thumbnail];
  const width = Math.min(box.width, box.height * aspect);
  return (
    <Animated.View
      entering={FadeIn.delay(IN_MS / 2).duration(1600)}
      style={{ flex: 1, width: "100%", gap: spacing(14) }}
    >
      {/* Above the label, which the picture grows over when zoomed. */}
      <View
        style={{
          flex: 1,
          zIndex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
        onLayout={(event) =>
          setBox({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
      >
        {width > 0 && (
          <ZoomableImage
            source={GAME_FULL_THUMBNAIL_ASSETS[game.thumbnail]}
            width={width}
            height={width / aspect}
            onZoomChange={onZoomChange}
          />
        )}
      </View>
      <View style={{ alignItems: "center", gap: spacing(2) }}>
        {credit && (
          <>
            <Text
              serif
              italic
              color={palette.ink}
              numberOfLines={2}
              style={{
                textAlign: "center",
                fontSize: font(20),
                lineHeight: font(27),
              }}
            >
              {credit.title || localizeGameTitle(game, path, language)}
            </Text>
            <Text
              serif
              color={palette.dim}
              style={{ textAlign: "center", fontSize: font(14) }}
            >
              {[credit.artistName, credit.date].filter(Boolean).join(", ")}
            </Text>
          </>
        )}
        <Animated.View entering={FadeIn.delay(IN_MS + 1800).duration(1200)}>
          <Text
            size="sm"
            weight={400}
            color={rgba(palette.dim, 0.7)}
            style={{ marginTop: spacing(10), textAlign: "center" }}
          >
            {t("moments.zoomHint")}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// --- Cards settling -------------------------------------------------------

const SETTLE_DECK: PlayingCard[] = Array.from(
  { length: SETTLE_CARDS },
  (_, i) => ({ id: `moment-${i}`, suit: "spades", rank: "A", faceUp: false }),
);

type SettleStart = {
  x: number;
  y: number;
  rotation: number;
  restX: number;
  restY: number;
  restRotation: number;
};

/** Scattered cards drift, one by one, into a neat pile, and rest there. */
function SettlingCards({ cardBackKey }: { cardBackKey?: string }) {
  const { width, height } = useWindowDimensions();
  const { spacing } = useResponsiveMetrics();
  const cardWidth = spacing(96);
  const [starts] = useState<SettleStart[]>(() =>
    SETTLE_DECK.map(() => ({
      // Anywhere on the screen, but whole cards: none hang off its edges.
      x: (Math.random() - 0.5) * (width - cardWidth * 1.6),
      y: (Math.random() - 0.5) * (height * 0.6 - cardWidth * 1.4),
      rotation: (Math.random() - 0.5) * 80,
      // Where it comes to rest: nearly, but not quite, square on the pile.
      restX: (Math.random() - 0.5) * 4,
      restY: (Math.random() - 0.5) * 4,
      restRotation: (Math.random() - 0.5) * 6,
    })),
  );
  return (
    <View style={{ width: cardWidth, height: cardWidth * 1.4 }}>
      {SETTLE_DECK.map((card, i) => (
        <SettlingCard
          key={card.id}
          card={card}
          index={i}
          start={starts[i]}
          cardWidth={cardWidth}
          cardBackKey={cardBackKey}
        />
      ))}
    </View>
  );
}

function SettlingCard({
  card,
  index,
  start,
  cardWidth,
  cardBackKey,
}: {
  card: PlayingCard;
  index: number;
  start: SettleStart;
  cardWidth: number;
  cardBackKey?: string;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      SETTLE_START_MS + index * SETTLE_STAGGER_MS,
      withTiming(1, {
        duration: SETTLE_MS,
        // Eases off the table as well as onto the pile: no jolt at either end.
        easing: Easing.bezier(0.45, 0, 0.2, 1),
      }),
    );
  }, [index, progress]);
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: start.x + (start.restX - start.x) * p },
        { translateY: start.y + (start.restY - start.y) * p },
        {
          rotate: `${start.rotation + (start.restRotation - start.rotation) * p}deg`,
        },
      ],
    };
  });
  return (
    <Animated.View
      entering={FadeIn.duration(IN_MS)}
      style={[
        { position: "absolute", top: 0, left: 0, width: cardWidth },
        style,
      ]}
    >
      <Card
        card={card}
        cardWidth={cardWidth}
        cardSize="small"
        cardBackPath={cardBackKey}
      />
    </Animated.View>
  );
}
