import { Card } from "@/components/Cards/Card";
import type { PlayingCard } from "@/components/Cards/card-utils";
import { Text } from "@/components/common/Text";
import type { Moment } from "@/data/moments";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { rgba } from "@/styles/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The backdrop comes up slowly; leaving is quicker, but never a cut. */
const IN_MS = 1400;
const OUT_MS = 700;
/** Words fade in a little after the backdrop. */
const WORDS_AT_MS = 700;
const WORDS_FADE_MS = 2000;
const HINT_AT_MS = 2500;
const HINT_FADE_MS = 1200;
const OVERLAY_OPACITY = 0.88;

/** The breath to follow: in, held, out, held. */
const BREATH = { inMs: 4000, holdInMs: 1000, outMs: 6000, holdOutMs: 1000 };
const BREATH_SMALL = 0.55;

const SETTLE_CARDS = 9;
const SETTLE_START_MS = 900;
const SETTLE_STAGGER_MS = 650;
const SETTLE_MS = 2800;

const RIPPLE_COUNT = 3;
const RIPPLE_MS = 7500;

type Props = {
  moment: Moment;
  /** Drawn under the overlay colour: the game's scene, when there is one. */
  background?: ImageSourcePropType;
  /** The overlay's colour, opaque behind the scene so nothing shows through. */
  backgroundColor: string;
  /** Words and shapes. */
  color: string;
  /** For the settling cards' backs. */
  cardBackKey?: string;
  /** How long to wait, hidden and letting taps through, before coming up. */
  delayMs?: number;
  onDone: () => void;
};

/**
 * A quiet moment, over the whole screen: the game's scene under a deep veil,
 * and on it one line, a breath to follow, or a slow picture. A tap anywhere
 * (or Android's back button) puts it away at once; nothing in it waits.
 */
export function MomentOverlay({
  moment,
  background,
  backgroundColor,
  color,
  cardBackKey,
  delayMs = 0,
  onDone,
}: Props) {
  const { t } = useTranslation("game");
  const { spacing, font } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const cover = useSharedValue(0);
  const [shown, setShown] = useState(delayMs === 0);
  const [closing, setClosing] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (shown) return;
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, shown]);

  useEffect(() => {
    if (!shown) return;
    cover.value = withTiming(1, {
      duration: IN_MS,
      easing: Easing.inOut(Easing.quad),
    });
  }, [cover, shown]);

  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    [],
  );
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    cover.value = withTiming(0, {
      duration: OUT_MS,
      easing: Easing.inOut(Easing.quad),
    });
    exitTimer.current = setTimeout(() => onDoneRef.current(), OUT_MS);
  }, [closing, cover]);

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
        { zIndex: 1100, backgroundColor },
        coverStyle,
      ]}
    >
      {background && (
        <ImageBackground
          source={background}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: rgba(backgroundColor, OVERLAY_OPACITY) },
        ]}
      />

      <Pressable
        testID="moment-close"
        accessibilityRole="button"
        accessibilityLabel={t("moments.close")}
        onPress={close}
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "center",
            justifyContent: "center",
            paddingTop: insets.top + spacing(24),
            paddingBottom: insets.bottom + spacing(24),
            paddingHorizontal: spacing(36),
          },
        ]}
      >
        {moment.kind === "words" && (
          <Animated.View
            entering={FadeIn.delay(WORDS_AT_MS).duration(WORDS_FADE_MS)}
          >
            <Text
              serif
              color={color}
              style={{
                fontSize: font(22),
                lineHeight: font(34),
                textAlign: "center",
                maxWidth: spacing(460),
              }}
            >
              {t(`moments.lines.${moment.id}` as "moments.lines.dealt")}
            </Text>
          </Animated.View>
        )}
        {moment.kind === "breathe" && <Breath color={color} />}
        {moment.kind === "settle" && (
          <SettlingCards cardBackKey={cardBackKey} />
        )}
        {moment.kind === "ripples" && <Ripples color={color} />}

        <Animated.View
          entering={FadeIn.delay(HINT_AT_MS).duration(HINT_FADE_MS)}
          style={{
            position: "absolute",
            bottom: insets.bottom + spacing(32),
          }}
        >
          <Text size="sm" weight={400} color={rgba(color, 0.6)}>
            {t("moments.continue")}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * A circle to breathe with: it swells while you breathe in, rests, and
 * slowly shrinks while you breathe out, over and over, with the one word
 * for each half under it.
 */
function Breath({ color }: { color: string }) {
  const { t } = useTranslation("game");
  const { spacing } = useResponsiveMetrics();
  const scale = useSharedValue(BREATH_SMALL);
  const [inhaling, setInhaling] = useState(true);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const phase = (inhale: boolean) => {
      if (!alive) return;
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
    // Begins after the backdrop has come up.
    timer = setTimeout(() => phase(true), IN_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [scale]);

  const size = spacing(220);
  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(IN_MS)}
      style={{ alignItems: "center", gap: spacing(36) }}
    >
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 1.5,
              borderColor: rgba(color, 0.55),
              backgroundColor: rgba(color, 0.1),
            },
            circleStyle,
          ]}
        />
      </View>
      {/* The two words take turns in the same place. */}
      <View style={{ width: spacing(160), height: spacing(28) }}>
        <Animated.View
          key={inhaling ? "in" : "out"}
          entering={FadeIn.duration(900)}
          exiting={FadeOut.duration(600)}
          style={[StyleSheet.absoluteFill, { alignItems: "center" }]}
        >
          <Text serif color={rgba(color, 0.8)} size="lg">
            {inhaling ? t("moments.breatheIn") : t("moments.breatheOut")}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const SETTLE_DECK: PlayingCard[] = Array.from(
  { length: SETTLE_CARDS },
  (_, i) => ({ id: `moment-${i}`, suit: "spades", rank: "A", faceUp: false }),
);

/** Scattered cards drift, one by one, into a neat pile, and rest there. */
function SettlingCards({ cardBackKey }: { cardBackKey?: string }) {
  const { width, height } = useWindowDimensions();
  const { spacing } = useResponsiveMetrics();
  const cardWidth = spacing(96);
  const [starts] = useState(() =>
    SETTLE_DECK.map(() => ({
      x: (Math.random() - 0.5) * width * 0.75,
      y: (Math.random() - 0.5) * height * 0.55,
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
  start: {
    x: number;
    y: number;
    rotation: number;
    restX: number;
    restY: number;
    restRotation: number;
  };
  cardWidth: number;
  cardBackKey?: string;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      SETTLE_START_MS + index * SETTLE_STAGGER_MS,
      withTiming(1, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) }),
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

/** Rings spreading slowly from the middle, like still water after a pebble. */
function Ripples({ color }: { color: string }) {
  const { spacing } = useResponsiveMetrics();
  const size = spacing(260);
  return (
    <Animated.View
      entering={FadeIn.duration(IN_MS)}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: RIPPLE_COUNT }, (_, i) => (
        <Ripple key={i} index={i} size={size} color={color} />
      ))}
      <View
        style={{
          width: spacing(6),
          height: spacing(6),
          borderRadius: spacing(3),
          backgroundColor: rgba(color, 0.7),
        }}
      />
    </Animated.View>
  );
}

function Ripple({
  index,
  size,
  color,
}: {
  index: number;
  size: number;
  color: string;
}) {
  const progress: SharedValue<number> = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      (index * RIPPLE_MS) / RIPPLE_COUNT,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: RIPPLE_MS,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );
  }, [index, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - progress.value),
    transform: [{ scale: 0.08 + progress.value * 0.92 }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}
