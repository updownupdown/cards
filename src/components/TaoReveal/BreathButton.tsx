import { useTranslation } from "@/i18n";
import { useEffect, useId } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/**
 * The Tao reveal's button. While the chapter is being written it is a guide
 * for breathing: a soft, slowly turning glow that swells as you breathe in
 * and settles as you breathe out, with no words on it. Pressed, "Breathe"
 * shows on it for a moment. Once the chapter can be closed it calms into a
 * plain, quiet button that says Continue.
 */
export type BreathStage = "hidden" | "breathing" | "continue" | "closing";

const TEXT_COLOR = "#e8f1ff";
const GLOW_COLOR = "#9cc9ff";
const FONT_FAMILY = "Outfit_300Light";

/** The breathing glow's size at rest, and the button it becomes. */
const ORB = 84;
const PILL_WIDTH = 184;
const PILL_HEIGHT = 50;
/** The faint light round the glow, as a share of its size. */
const HALO = 2;

/** One breath: in, then a longer breath out. */
const BREATHE_IN_MS = 4500;
const BREATHE_OUT_MS = 5500;
/** How far the glow swells and settles with each breath. */
const ORB_SMALL = 0.8;
const ORB_LARGE = 1.12;
/** As Continue, it still breathes, but barely. */
const PILL_SWELL = 0.012;
/** One slow turn of the glow's shapes. */
const TURN_MS = 26000;
const SHOW_MS = 1600;
const SETTLE_MS = 1400;
const HIDE_MS = 700;
/** "Breathe" shows for this long in all when the glow is pressed. */
const WORD_IN_MS = 450;
const WORD_HOLD_MS = 1100;
const WORD_OUT_MS = 450;

/**
 * The glow's layers: soft ovals of light, each a little lopsided, turning
 * at their own pace and direction. Together their outline keeps changing,
 * the way a living thing's would. No edges: each fades out to nothing.
 */
const LAYERS = [
  {
    size: 1.25,
    squash: 0.86,
    turns: 1,
    offset: 0,
    wobble: 0.05,
    color: "#aacdff",
    alpha: 0.22,
  },
  {
    size: 1.12,
    squash: 0.8,
    turns: -1.4,
    offset: 0.3,
    wobble: 0.06,
    color: "#c4deff",
    alpha: 0.2,
  },
  {
    size: 1,
    squash: 0.9,
    turns: 2,
    offset: 0.65,
    wobble: 0.07,
    color: "#96b9ff",
    alpha: 0.2,
  },
] as const;

/** An oval of light, brightest a little in from its rim, fading out. */
function SoftOval({
  width,
  height,
  color,
  alpha,
  rim = 0.72,
  center = 0.45,
}: {
  width: number;
  height: number;
  color: string;
  alpha: number;
  /** Where it is brightest, as a share of its radius. */
  rim?: number;
  /** How bright its middle is, as a share of its brightest. */
  center?: number;
}) {
  // Each its own gradient: on the web, every SVG shares one page of ids.
  const id = `breath${useId().replace(/:/g, "")}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id={id}>
          <Stop offset="0" stopColor={color} stopOpacity={alpha * center} />
          <Stop offset={rim} stopColor={color} stopOpacity={alpha} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width / 2}
        ry={height / 2}
        fill={`url(#${id})`}
      />
    </Svg>
  );
}

function GlowLayer({
  layer,
  turn,
  settle,
}: {
  layer: (typeof LAYERS)[number];
  turn: SharedValue<number>;
  settle: SharedValue<number>;
}) {
  const width = ORB * layer.size;
  const height = width * layer.squash;
  const style = useAnimatedStyle(() => {
    const angle = (turn.value * layer.turns + layer.offset) * Math.PI * 2;
    return {
      opacity: 1 - settle.value,
      transform: [
        { rotate: `${angle}rad` },
        { scaleX: 1 + layer.wobble * Math.sin(angle * 2 + layer.offset * 5) },
        { scaleY: 1 + layer.wobble * Math.cos(angle * 3 + layer.offset * 3) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", width, height }, style]}>
      <SoftOval
        width={width}
        height={height}
        color={layer.color}
        alpha={layer.alpha}
      />
    </Animated.View>
  );
}

export function BreathButton({
  stage,
  onContinue,
}: {
  stage: BreathStage;
  onContinue: () => void;
}) {
  const { t } = useTranslation("campaign");
  const shown = useSharedValue(0);
  const breath = useSharedValue(0);
  const turn = useSharedValue(0);
  const settle = useSharedValue(0);
  const word = useSharedValue(0);

  // Breathing and turning, from the start; it's hidden until it's needed.
  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: BREATHE_IN_MS,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: BREATHE_OUT_MS,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
    );
    turn.value = withRepeat(
      withTiming(1, { duration: TURN_MS, easing: Easing.linear }),
      -1,
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(turn);
    };
  }, [breath, turn]);

  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    if (stage === "breathing" || stage === "continue") {
      shown.value = withTiming(1, { duration: SHOW_MS, easing: ease });
    }
    if (stage === "continue") {
      settle.value = withTiming(1, { duration: SETTLE_MS, easing: ease });
      word.value = withTiming(0, { duration: WORD_OUT_MS });
    }
    if (stage === "closing") {
      shown.value = withTiming(0, { duration: HIDE_MS, easing: ease });
    }
  }, [settle, shown, stage, word]);

  const onPress = () => {
    if (stage === "continue") {
      onContinue();
      return;
    }
    if (stage !== "breathing") return;
    // A word to breathe by, for a moment, then gone again.
    word.value = withSequence(
      withTiming(1, { duration: WORD_IN_MS, easing: Easing.out(Easing.quad) }),
      withDelay(
        WORD_HOLD_MS,
        withTiming(0, {
          duration: WORD_OUT_MS,
          easing: Easing.in(Easing.quad),
        }),
      ),
    );
  };

  const boxStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    width: interpolate(settle.value, [0, 1], [ORB, PILL_WIDTH]),
    height: interpolate(settle.value, [0, 1], [ORB, PILL_HEIGHT]),
  }));

  // The whole glow swells and settles with the breath; as Continue, barely.
  const breathingStyle = useAnimatedStyle(() => {
    const orb = ORB_SMALL + (ORB_LARGE - ORB_SMALL) * breath.value;
    const pill = 1 + PILL_SWELL * (breath.value * 2 - 1);
    return {
      transform: [{ scale: orb + (pill - orb) * settle.value }],
    };
  });

  // A wide, faint light round it, brighter as you breathe in; the button
  // keeps only a little of it.
  const haloStyle = useAnimatedStyle(() => {
    const orb = 0.35 + 0.65 * breath.value;
    const pill = 0.25 + 0.1 * breath.value;
    return { opacity: orb + (pill - orb) * settle.value };
  });

  const coreStyle = useAnimatedStyle(() => ({
    opacity: (0.35 + 0.65 * breath.value) * (1 - settle.value),
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: settle.value,
    borderRadius: interpolate(settle.value, [0, 1], [ORB, PILL_HEIGHT]) / 2,
  }));

  const breatheStyle = useAnimatedStyle(() => ({
    opacity: word.value * (1 - settle.value),
  }));
  const continueStyle = useAnimatedStyle(() => ({
    opacity: settle.value,
  }));

  if (stage === "hidden") return null;

  const label = stage === "breathing" ? t("tao.breathe") : t("tao.continue");
  return (
    <Pressable
      testID="tao-breath-button"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={stage === "closing"}
      hitSlop={16}
      style={{ outline: "none" }}
    >
      <Animated.View style={[styles.box, boxStyle]}>
        <Animated.View style={[styles.fill, breathingStyle]}>
          <Animated.View style={[styles.halo, haloStyle]}>
            <SoftOval
              width={ORB * HALO}
              height={ORB * HALO}
              color={GLOW_COLOR}
              alpha={0.3}
              rim={0.35}
              center={1}
            />
          </Animated.View>
          {LAYERS.map((layer, index) => (
            <GlowLayer key={index} layer={layer} turn={turn} settle={settle} />
          ))}
          <Animated.View style={[styles.core, coreStyle]}>
            <SoftOval
              width={ORB * 0.5}
              height={ORB * 0.5}
              color={TEXT_COLOR}
              alpha={0.22}
              rim={0.2}
              center={1}
            />
          </Animated.View>
          <Animated.View style={[styles.pill, pillStyle]} />
        </Animated.View>
        <Animated.Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.label, styles.breathe, breatheStyle]}
        >
          {t("tao.breathe")}
        </Animated.Text>
        <Animated.Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.label, continueStyle]}
        >
          {t("tao.continue")}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: ORB * HALO,
    height: ORB * HALO,
  },
  core: {
    position: "absolute",
    width: ORB * 0.5,
    height: ORB * 0.5,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(200, 225, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(214, 232, 255, 0.36)",
  },
  label: {
    position: "absolute",
    color: TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    letterSpacing: 1.6,
    textAlign: "center",
    width: PILL_WIDTH,
  },
  breathe: {
    // A soft shadow of night round it, so it reads on the glow without a box.
    color: "#ffffff",
    textShadowColor: "rgba(8, 14, 30, 0.85)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
