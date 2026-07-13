import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export const DICE_ROLL_DURATION = 2000;

// 3x3 grid slot indices used by each face value.
//   0 1 2
//   3 4 5
//   6 7 8
const PIP_PATTERNS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

type RollingDiceProps = {
  /** Increment/change this to trigger a new roll. */
  rollKey: number;
  /** Whether a roll is currently in progress. */
  rolling: boolean;
  size?: number;
};

export function RollingDice({ rollKey, rolling, size }: RollingDiceProps) {
  const { spacing } = useResponsiveMetrics();
  const dieSize = size ?? spacing(56);
  const pipSize = Math.round(dieSize * 0.16);

  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const [faceValue, setFaceValue] = useState(6);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!rolling) return;

    // Spin with a decelerating rotation and a small bounce.
    const spins = 2;
    rotation.value = 0;
    rotation.value = withTiming(360 * spins, {
      duration: DICE_ROLL_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withSequence(
      withTiming(1.2, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(1, {
        duration: DICE_ROLL_DURATION - 180,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Flash through random faces while spinning.
    intervalRef.current = setInterval(() => {
      setFaceValue(() => 1 + Math.floor(Math.random() * 6));
    }, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [rollKey, rolling]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  const pips = PIP_PATTERNS[faceValue] ?? PIP_PATTERNS[1];

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: dieSize,
          height: dieSize,
          borderRadius: Math.round(dieSize * 0.22),
          padding: Math.round(dieSize * 0.14),
          backgroundColor: Colors.white,
          boxShadow: `0px ${spacing(6)}px ${spacing(16)}px ${rgba(Colors.K900, 0.45)}`,
          flexDirection: "row",
          flexWrap: "wrap",
        },
      ]}
    >
      {Array.from({ length: 9 }).map((_, slot) => {
        const showPip = pips.includes(slot);
        return (
          <View
            key={slot}
            style={{
              width: "33.333%",
              height: "33.333%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {showPip && (
              <View
                style={{
                  width: pipSize,
                  height: pipSize,
                  borderRadius: pipSize / 2,
                  backgroundColor: Colors.K900,
                }}
              />
            )}
          </View>
        );
      })}
    </Animated.View>
  );
}
