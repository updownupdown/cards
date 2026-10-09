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
  getMomentSettings,
  isMomentIntroduced,
  saveMomentSettings,
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
import Svg, { Path } from "react-native-svg";
import { MomentFrequencyPicker } from "./MomentFrequencyPicker";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Black comes up slowly; leaving is quicker, but never a cut. */
const IN_MS = 1400;
const OUT_MS = 700;
const BLACK = "#000000";
const SKIP_BACKGROUND = "rgba(0, 0, 0, 0.6)";

/** The breath to follow: in, held, out, a rest; twice, then it moves on. */
const BREATH = { inMs: 4000, holdInMs: 3000, outMs: 6000, holdOutMs: 1000 };
const BREATH_MS =
  BREATH.inMs + BREATH.holdInMs + BREATH.outMs + BREATH.holdOutMs;
const BREATHS = 2;
const BREATH_SMALL = 0.55;
/** One slow turn of the shapes, and of the waves along their edges. */
const DRIFT_MS = 40000;

const SETTLE_CARDS = 26;
const CARD_ASPECT = 1.4;
const SETTLE_START_MS = 900;
const SETTLE_STAGGER_MS = 260;
const SETTLE_MS = 3400;

/** How long each moment stays before moving on by itself. */
const ARTWORK_MS = 10000;
const SETTLE_TOTAL_MS = 12500;
/** A quote stays long enough to be read slowly, and at least this long. */
const QUOTE_MIN_MS = 15000;
const QUOTE_MAX_MS = 27000;
const QUOTE_MS_PER_CHARACTER = 60;
const QUOTE_FADE_MS = 4000;
/** Who said it comes well after the words have settled. */
const QUOTE_AUTHOR_AT_MS = 6500;

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
        Math.max(QUOTE_MIN_MS, 9000 + length * QUOTE_MS_PER_CHARACTER),
      );
    }
  }
}

type Props = {
  moment: Moment;
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
      void saveMomentSettings(getMomentSettings());
    }
    cover.value = withTiming(0, {
      duration: OUT_MS,
      easing: Easing.inOut(Easing.quad),
    });
    exitTimer.current = setTimeout(() => onDoneRef.current(), OUT_MS);
  }, [cover, moment.kind, progress]);

  const disable = useCallback(() => {
    void saveMomentSettings({ ...getMomentSettings(), enabled: false });
    close();
  }, [close]);

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
        {moment.kind === "intro" && <IntroMoment onDisable={disable} />}
        {moment.kind === "breathe" && <Breath />}
        {moment.kind === "settle" && (
          <SettlingCards cardBackKey={cardBackKey} />
        )}
        {moment.kind === "quote" && <QuoteMoment quoteId={moment.quoteId} />}
        {moment.kind === "artwork" && (
          <ArtworkMoment path={moment.path} onZoomChange={setHeld} />
        )}
      </View>

      {/* Above the moment: scattered cards and a zoomed picture pass under. */}
      <View
        style={{
          zIndex: 2,
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
          look={moment.kind === "intro" ? "filled" : "quiet"}
          onPress={close}
        />
      </View>
    </Animated.View>
  );
}

type MomentButtonLook = "quiet" | "outline" | "filled";

/**
 * A pill: quiet at the foot, filling from the left as the moment runs; or,
 * for the first moment's two answers, in the accent, outlined or filled.
 */
function MomentButton({
  label,
  progress,
  onPress,
  look = "quiet",
  testID = "moment-skip",
}: {
  label: string;
  progress?: SharedValue<number>;
  onPress: () => void;
  look?: MomentButtonLook;
  testID?: string;
}) {
  const { spacing } = useResponsiveMetrics();
  const palette = usePalette();
  const fillStyle = useAnimatedStyle(() => ({
    width: `${(progress?.value ?? 0) * 100}%`,
  }));
  const ink =
    look === "filled"
      ? palette.accentInk
      : look === "outline"
        ? palette.accent
        : rgba(palette.ink, 0.75);
  return (
    <Animated.View entering={FadeIn.delay(IN_MS).duration(900)}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          minWidth: spacing(230),
          height: spacing(44),
          paddingHorizontal: spacing(22),
          borderRadius: spacing(22),
          borderWidth: 1,
          borderColor:
            look === "quiet" ? rgba(palette.ink, 0.22) : palette.accent,
          // Quiet, it is dark enough to read over the picture, zoomed in
          // under it.
          backgroundColor: look === "filled" ? palette.accent : SKIP_BACKGROUND,
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
        <Text size="sm" weight={look === "quiet" ? 400 : 500} color={ink}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * The first moment: what these are, and how often they should come.
 * "Continue", at the foot, keeps them; "No thank you!" turns them off.
 */
function IntroMoment({ onDisable }: { onDisable: () => void }) {
  const { t } = useTranslation("game");
  const { t: tSettings } = useTranslation("settings");
  const { spacing, font } = useResponsiveMetrics();
  const palette = usePalette();
  return (
    <Animated.View
      entering={FadeIn.delay(IN_MS / 2).duration(1200)}
      style={{
        width: "100%",
        maxWidth: spacing(476),
        // With the screen's own, twice the usual room at the sides.
        paddingHorizontal: spacing(28),
        alignItems: "center",
        gap: spacing(28),
      }}
    >
      <View style={{ alignItems: "center", gap: spacing(14) }}>
        <Text serif color={palette.ink} style={{ fontSize: font(28) }}>
          {tSettings("moments.label")}
        </Text>
        <Text
          size="lg"
          weight={400}
          color={palette.dim}
          style={{ textAlign: "center" }}
        >
          {tSettings("moments.description")} {tSettings("moments.notInOdyssey")}
        </Text>
        <Text
          size="sm"
          weight={400}
          color={rgba(palette.dim, 0.75)}
          style={{ textAlign: "center" }}
        >
          {t("moments.introLater")}
        </Text>
      </View>
      <MomentFrequencyPicker />
      <MomentButton
        testID="moment-disable"
        look="outline"
        label={t("moments.noThanks")}
        onPress={onDisable}
      />
    </Animated.View>
  );
}

// --- The breath -----------------------------------------------------------

/**
 * Each shape: its soft, flat colour (mostly blues, with a green and a
 * purple), its size, how much its edge wobbles, which way it turns, and how
 * far its centre wanders, so they overlap unevenly, never nested.
 */
const BLOBS = [
  {
    colour: "#7FA9DD",
    radius: 72,
    wobble: 0.11,
    seed: 0.4,
    turn: 1,
    orbit: 10,
  },
  {
    colour: "#A79BDB",
    radius: 68,
    wobble: 0.13,
    seed: 2.1,
    turn: -1,
    orbit: 12,
  },
  { colour: "#86C8B4", radius: 64, wobble: 0.1, seed: 4.3, turn: 1, orbit: 9 },
  {
    colour: "#8FC3E8",
    radius: 60,
    wobble: 0.12,
    seed: 5.6,
    turn: -1,
    orbit: 13,
  },
];
const BLOB_OPACITY = 0.55;
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
  const { colour, radius, wobble, seed, turn, orbit } = BLOBS[index];
  const animatedProps = useAnimatedProps(() => ({
    d: blobPath(drift.value, radius, wobble, seed, turn, orbit),
  }));
  return (
    <AnimatedPath
      d={blobPath(0, radius, wobble, seed, turn, orbit)}
      fill={colour}
      opacity={BLOB_OPACITY}
      animatedProps={animatedProps}
    />
  );
}

type BreathPhase = "in" | "hold" | "out";

/** Each part of a breath: its words, how long, and where the shapes go. */
const BREATH_PHASES: { phase: BreathPhase; ms: number; scale?: number }[] = [
  { phase: "in", ms: BREATH.inMs, scale: 1 },
  { phase: "hold", ms: BREATH.holdInMs },
  { phase: "out", ms: BREATH.outMs, scale: BREATH_SMALL },
];
const BREATH_WORDS = {
  in: "moments.breatheIn",
  hold: "moments.breatheHold",
  out: "moments.breatheOut",
} as const;

/**
 * Soft, flat shapes to breathe with, slowly turning and changing shape:
 * together they swell while you breathe in, stay while you hold, and slowly
 * shrink while you breathe out, twice, with the words for each part under
 * them.
 */
function Breath() {
  const { t } = useTranslation("game");
  const { spacing, font } = useResponsiveMetrics();
  const palette = usePalette();
  const scale = useSharedValue(BREATH_SMALL);
  const drift = useSharedValue(0);
  const [phase, setPhase] = useState<BreathPhase | null>(null);

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
    const step = (index: number) => {
      if (!alive || index >= BREATHS * BREATH_PHASES.length) return;
      const part = BREATH_PHASES[index % BREATH_PHASES.length];
      setPhase(part.phase);
      if (part.scale !== undefined) {
        scale.value = withTiming(part.scale, {
          duration: part.ms,
          easing: Easing.inOut(Easing.sin),
        });
      }
      // After breathing out, a short rest before the next breath in.
      const rest = part.phase === "out" ? BREATH.holdOutMs : 0;
      timer = setTimeout(() => step(index + 1), part.ms + rest);
    };
    // Begins once the black has come up.
    timer = setTimeout(() => step(0), IN_MS);
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
          {BLOBS.map((_, index) => (
            <Blob key={index} drift={drift} index={index} />
          ))}
        </Svg>
      </Animated.View>
      {/* The words take turns in the same place. */}
      <View style={{ width: spacing(300), height: font(40) }}>
        {phase !== null && (
          <Animated.View
            key={phase}
            entering={FadeIn.duration(900)}
            exiting={FadeOut.duration(600)}
            style={[StyleSheet.absoluteFill, { alignItems: "center" }]}
          >
            <Text
              serif
              color={rgba(palette.ink, 0.8)}
              style={{ fontSize: font(28), lineHeight: font(38) }}
            >
              {t(BREATH_WORDS[phase])}
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
  // Large, but a long quote still has to fit a phone's screen.
  const size =
    quote.text.length <= 120 ? 32 : quote.text.length <= 220 ? 28 : 25;
  return (
    <View
      style={{
        alignItems: "center",
        gap: spacing(26),
        maxWidth: spacing(560),
      }}
    >
      <Animated.View entering={FadeIn.delay(IN_MS / 2).duration(QUOTE_FADE_MS)}>
        <Text
          serif
          italic
          color={palette.ink}
          style={{
            fontSize: font(size),
            lineHeight: font(size * 1.38),
            textAlign: "center",
          }}
        >
          “{quote.text}”
        </Text>
      </Animated.View>
      <Animated.View
        entering={FadeIn.delay(IN_MS / 2 + QUOTE_AUTHOR_AT_MS).duration(2000)}
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

type SettleStart = { x: number; y: number; rotation: number };

/** How far past the edges a card may start, in cards. */
const SETTLE_OVERHANG = 0.35;
/** How much of a card may start over where the pile will be, each way. */
const SETTLE_PILE_OVERLAP = 0.25;

/**
 * Where each card starts, from the pile's centre: thrown anywhere, at any
 * angle, some hanging off the edges and some just touching where the pile
 * will be, but none covering it.
 */
function settleStarts(
  count: number,
  box: { width: number; height: number },
  cardWidth: number,
): SettleStart[] {
  const cardHeight = cardWidth * CARD_ASPECT;
  const maxX = box.width / 2 + cardWidth * SETTLE_OVERHANG;
  const maxY = box.height / 2 + cardHeight * SETTLE_OVERHANG;
  const clearX = cardWidth * (1 - SETTLE_PILE_OVERLAP);
  const clearY = cardHeight * (1 - SETTLE_PILE_OVERLAP);
  return Array.from({ length: count }, () => {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      x = (Math.random() * 2 - 1) * maxX;
      y = (Math.random() * 2 - 1) * maxY;
      if (Math.abs(x) >= clearX || Math.abs(y) >= clearY) break;
    }
    // A space too small to miss the pile in: out to an edge instead.
    if (Math.abs(x) < clearX && Math.abs(y) < clearY) {
      if (maxX >= maxY) x = Math.random() < 0.5 ? -maxX : maxX;
      else y = Math.random() < 0.5 ? -maxY : maxY;
    }
    return { x, y, rotation: (Math.random() * 2 - 1) * 180 };
  });
}

/**
 * Cards thrown about the screen drift, one by one, into a pile, and rest
 * there, exactly square. None starts on top of where the pile will be, so
 * it can be seen growing.
 */
function SettlingCards({ cardBackKey }: { cardBackKey?: string }) {
  const { spacing } = useResponsiveMetrics();
  const cardWidth = spacing(84);
  const [starts, setStarts] = useState<SettleStart[] | null>(null);
  return (
    <View
      style={{
        flex: 1,
        alignSelf: "stretch",
        alignItems: "center",
        justifyContent: "center",
      }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        // Once: turning the screen mid-way doesn't scatter them again.
        setStarts(
          (current) =>
            current ?? settleStarts(SETTLE_CARDS, { width, height }, cardWidth),
        );
      }}
    >
      {starts && (
        <View style={{ width: cardWidth, height: cardWidth * CARD_ASPECT }}>
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
      )}
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
        // All end at the same place, square: nothing left over.
        { translateX: start.x * (1 - p) },
        { translateY: start.y * (1 - p) },
        { rotate: `${start.rotation * (1 - p)}deg` },
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
