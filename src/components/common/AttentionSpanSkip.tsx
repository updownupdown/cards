import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { usePalette } from "@/styles/palette";
import { rgba } from "@/styles/styles";
import { haptics } from "@/utils/haptics";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

/*
 * The price of skipping a reveal: a black box asks the player to destroy
 * their attention span, a small square they drag into a bin. Dropped in,
 * the square falls away and the reveal closes; let go anywhere else, it
 * springs back. The box is its own island: the sky around it still scrolls
 * and still sends shooting stars.
 */

/** The square falls into the bin over this, then the reveal closes. */
export const DROP_MS = 520;
const SQUARE = 96;
const BIN_WIDTH = 64;
const LID_HEIGHT = 16;
const BODY_HEIGHT = 66;
/** The square counts as over the bin a little above its rim, too. */
const BIN_REACH = 24;

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  /** The screen's width; the box is as wide as fits, up to a limit. */
  width: number;
  onSkip: () => void;
  onDismiss: () => void;
  /** The box's own layout, for whoever has to know where it is. */
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function AttentionSpanSkip({ width, onSkip, onDismiss, onLayout }: Props) {
  const { t } = useTranslation("campaign");
  const palette = usePalette();
  const { spacing } = useResponsiveMetrics();
  const ink = palette.ink;

  // Where the square starts and the bin sits, in the row's coordinates.
  const squareCenter = useSharedValue({ x: 0, y: 0 });
  const bin = useSharedValue<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const over = useSharedValue(0);
  const falling = useSharedValue(0);
  const entrance = useSharedValue(0);
  const dropped = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    entrance.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [entrance]);

  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  // The square falls in: it shrinks into the bin's mouth, the lid drops
  // behind it, and then the reveal goes.
  const drop = useCallback(() => {
    if (dropped.current) return;
    dropped.current = true;
    haptics.drop();
    const target = bin.value;
    tx.value = withTiming(
      target.x + target.width / 2 - squareCenter.value.x,
      { duration: DROP_MS * 0.7, easing: Easing.in(Easing.quad) },
    );
    ty.value = withTiming(
      target.y + target.height * 0.55 - squareCenter.value.y,
      { duration: DROP_MS * 0.7, easing: Easing.in(Easing.quad) },
    );
    falling.value = withTiming(1, {
      duration: DROP_MS * 0.7,
      easing: Easing.in(Easing.quad),
    });
    timers.current.push(
      setTimeout(() => {
        over.value = withTiming(0, { duration: 180 });
      }, DROP_MS * 0.6),
      setTimeout(() => onSkipRef.current(), DROP_MS),
    );
  }, [bin, falling, over, squareCenter, tx, ty]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId("attention-span-drag")
        .onUpdate((event) => {
          "worklet";
          if (falling.value > 0) return;
          tx.value = event.translationX;
          ty.value = event.translationY;
          const x = squareCenter.value.x + event.translationX;
          const y = squareCenter.value.y + event.translationY;
          const b = bin.value;
          const inside =
            b.width > 0 &&
            x >= b.x &&
            x <= b.x + b.width &&
            y >= b.y - BIN_REACH &&
            y <= b.y + b.height;
          const wanted = inside ? 1 : 0;
          if (over.value !== wanted) {
            over.value = withTiming(wanted, { duration: 160 });
          }
        })
        .onEnd(() => {
          "worklet";
          if (falling.value > 0) return;
          if (over.value > 0) {
            scheduleOnRN(drop);
            return;
          }
          tx.value = withSpring(0, { damping: 14, stiffness: 180 });
          ty.value = withSpring(0, { damping: 14, stiffness: 180 });
        })
        .onFinalize((_event, success) => {
          "worklet";
          if (success || falling.value > 0) return;
          over.value = withTiming(0, { duration: 160 });
          tx.value = withSpring(0, { damping: 14, stiffness: 180 });
          ty.value = withSpring(0, { damping: 14, stiffness: 180 });
        }),
    [bin, drop, falling, over, squareCenter, tx, ty],
  );

  const boxStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: 0.94 + 0.06 * entrance.value }],
  }));
  const squareStyle = useAnimatedStyle(() => {
    const f = falling.value;
    return {
      opacity: 1 - f * f,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { rotate: `${tx.value / 24}deg` },
        { scale: 1 - 0.75 * f },
      ],
    };
  });
  // The lid swings up on its hinge at the back as the square comes over.
  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -over.value * 3 },
      { rotate: `${-over.value * 32}deg` },
    ],
  }));
  const binStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.06 * over.value }],
  }));

  const boxWidth = Math.min(width - 2 * spacing(20), 360);
  const stroke = ink;

  return (
    <Animated.View
      testID="attention-span-skip"
      onLayout={onLayout}
      style={[
        {
          width: boxWidth,
          backgroundColor: "#000000",
          borderWidth: 1,
          borderColor: rgba(ink, 0.35),
          borderRadius: 14,
          paddingTop: spacing(18),
          paddingBottom: spacing(20),
          paddingHorizontal: spacing(18),
        },
        boxStyle,
      ]}
    >
      <Text
        size="sm"
        weight={500}
        color={ink}
        style={{ textAlign: "center", paddingHorizontal: spacing(24) }}
      >
        {t("reveal.destroyToSkip")}
      </Text>

      {/* Keep watching: a small cross in the corner. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("reveal.keepWatching")}
        onPress={onDismiss}
        hitSlop={8}
        style={({ pressed }) => ({
          position: "absolute",
          top: spacing(8),
          right: spacing(8),
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.5 : 0.7,
        })}
      >
        <View
          style={{
            position: "absolute",
            width: 14,
            height: 1.5,
            backgroundColor: ink,
            transform: [{ rotate: "45deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 14,
            height: 1.5,
            backgroundColor: ink,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      </Pressable>

      <View
        style={{
          marginTop: spacing(18),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing(12),
        }}
      >
        {/* Measured on a plain view: on the web the detector's own wrapper
            has no size, and a layout read through it is in page
            coordinates. */}
        <View
          testID="attention-span-square-seat"
          onLayout={(event) => {
            const { x, y, width: w, height: h } = event.nativeEvent.layout;
            squareCenter.value = { x: x + w / 2, y: y + h / 2 };
          }}
          style={{ width: SQUARE, height: SQUARE, zIndex: 1 }}
        >
          <GestureDetector gesture={pan} touchAction="none">
            <Animated.View
              testID="attention-span-square"
              accessibilityLabel={t("reveal.attentionSpan")}
              style={[
                {
                  width: SQUARE,
                  height: SQUARE,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: rgba(ink, 0.6),
                  backgroundColor: rgba(ink, 0.07),
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 8,
                },
                squareStyle,
              ]}
            >
              <Hourglass color={stroke} />
              <Text
                size="xxs"
                weight={400}
                color={ink}
                numberOfLines={2}
                style={{ textAlign: "center", marginTop: 6 }}
              >
                {t("reveal.attentionSpan")}
              </Text>
            </Animated.View>
          </GestureDetector>
        </View>

        <Animated.View
          testID="attention-span-bin"
          onLayout={(event) => {
            bin.value = { ...event.nativeEvent.layout };
          }}
          style={[
            { width: BIN_WIDTH, height: LID_HEIGHT + BODY_HEIGHT + 4 },
            binStyle,
          ]}
        >
          <Animated.View
            style={[
              {
                width: BIN_WIDTH,
                height: LID_HEIGHT,
                transformOrigin: "6% 100%",
              },
              lidStyle,
            ]}
          >
            <Lid color={stroke} />
          </Animated.View>
          <View style={{ marginTop: 4 }}>
            <BinBody color={stroke} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// --- The drawings ------------------------------------------------------------

const STROKE = 1.7;

/** A thin hourglass, most of its sand run through. */
function Hourglass({ color }: { color: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30">
      <Path
        d="M8 4h14M8 26h14M10 4v3.5c0 3.2 2.6 5.1 4.2 6.6.5.5.8.9.8.9s.3-.4.8-.9C17.4 12.6 20 10.7 20 7.5V4M10 26v-3.5c0-3.2 2.6-5.1 4.2-6.6.5-.5.8-.9.8-.9s.3.4.8.9c1.6 1.5 4.2 3.4 4.2 6.6V26"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* What sand is left: a thread, and a small heap. */}
      <Path
        d="M15 15.5v4.5M12.6 23.2c.8-1.2 1.6-1.8 2.4-1.8s1.6.6 2.4 1.8"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** The bin's lid: a bar with a handle, hinged at its left end. */
function Lid({ color }: { color: string }) {
  return (
    <Svg
      width={BIN_WIDTH}
      height={LID_HEIGHT}
      viewBox={`0 0 ${BIN_WIDTH} ${LID_HEIGHT}`}
    >
      <Path
        d="M5 14h54M26 14V9c0-2 1.5-3.5 3.5-3.5h5c2 0 3.5 1.5 3.5 3.5v5"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** The bin's body: a tapering can with three ribs. */
function BinBody({ color }: { color: string }) {
  return (
    <Svg
      width={BIN_WIDTH}
      height={BODY_HEIGHT}
      viewBox={`0 0 ${BIN_WIDTH} ${BODY_HEIGHT}`}
    >
      <Path
        d="M11 2h42l-3.6 56.2c-.2 2.7-2.4 4.8-5.1 4.8H19.7c-2.7 0-4.9-2.1-5.1-4.8L11 2zM24 14v38M32 14v38M40 14v38"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
