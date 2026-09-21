import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const DICE_ROLL_DURATION = 2800;
export const ROLLING_DICE_COUNT = 2;

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
  slotHeight: number;
  gap: number;
};

type DieProps = {
  faceValue: number;
  rolling: boolean;
  rollKey: number;
  size: number;
  turns: number;
  spinDuration: number;
  settleDelay: number;
  shuffleInterval: number;
};

function Die({
  faceValue,
  rolling,
  rollKey,
  size,
  turns,
  spinDuration,
  settleDelay,
  shuffleInterval,
}: DieProps) {
  const rotation = useSharedValue(0);
  const [displayedFace, setDisplayedFace] = useState(faceValue);

  useEffect(() => {
    if (!rolling) return;

    rotation.value = 0;
    rotation.value = withTiming(360 * turns, {
      duration: spinDuration,
      easing: Easing.out(Easing.cubic),
    });
    const shuffle = () => setDisplayedFace(1 + Math.floor(Math.random() * 6));
    shuffle();
    const faceInterval = setInterval(shuffle, shuffleInterval);
    const settleTimeout = setTimeout(() => {
      clearInterval(faceInterval);
      setDisplayedFace(faceValue);
    }, settleDelay);

    return () => {
      cancelAnimation(rotation);
      clearInterval(faceInterval);
      clearTimeout(settleTimeout);
    };
  }, [
    faceValue,
    rollKey,
    rolling,
    rotation,
    settleDelay,
    shuffleInterval,
    spinDuration,
    turns,
  ]);

  const dieStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pipSize = Math.round(size * 0.16);
  const pips = PIP_PATTERNS[displayedFace] ?? PIP_PATTERNS[1];

  return (
    <Animated.View
      style={[
        dieStyle,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.176),
          padding: Math.round(size * 0.14),
          backgroundColor: Colors.white,
          boxShadow: `0px ${Math.round(size * 0.15)}px ${Math.round(size * 0.22)}px ${rgba(Colors.K900, 0.42)}`,
          flexDirection: "row",
          flexWrap: "wrap",
        },
      ]}
    >
      {Array.from({ length: 9 }).map((_, slot) => (
        <View
          key={slot}
          style={{
            width: "33.333%",
            height: "33.333%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {pips.includes(slot) && (
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
      ))}
    </Animated.View>
  );
}

export function RollingDice({
  rollKey,
  rolling,
  size,
  slotHeight,
  gap,
}: RollingDiceProps) {
  const { spacing } = useResponsiveMetrics();
  const dieSize = size ?? spacing(56);
  const [faces, setFaces] = useState<number[]>(() =>
    Array.from({ length: ROLLING_DICE_COUNT }, (_, index) => index + 1),
  );
  const [rollConfig, setRollConfig] = useState(() =>
    Array.from({ length: ROLLING_DICE_COUNT }, (_, index) => ({
      turns: 1.25 + index * 0.25,
      spinDuration: 2400 - index * 100,
      settleDelay: 2400 - index * 100,
      shuffleInterval: 160,
    })),
  );

  useEffect(() => {
    if (!rolling) return;
    setFaces(
      Array.from(
        { length: ROLLING_DICE_COUNT },
        () => 1 + Math.floor(Math.random() * 6),
      ),
    );
    setRollConfig(
      Array.from({ length: ROLLING_DICE_COUNT }, () => {
        const settleDelay = 1850 + Math.round(Math.random() * 600);
        const fullTurns = 1 + Math.floor(Math.random() * 2);
        const quarterTurns = Math.floor(Math.random() * 4);
        return {
          turns: fullTurns + quarterTurns / 4,
          spinDuration: settleDelay,
          settleDelay,
          shuffleInterval: 110 + Math.round(Math.random() * 100),
        };
      }),
    );
  }, [rollKey, rolling]);

  return (
    <View
      style={{
        width: dieSize,
        height:
          slotHeight * ROLLING_DICE_COUNT + gap * (ROLLING_DICE_COUNT - 1),
        flexDirection: "column",
        alignItems: "center",
        gap,
      }}
    >
      {faces.map((faceValue, index) => (
        <View
          key={index}
          style={{
            width: "100%",
            height: slotHeight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Die
            faceValue={faceValue}
            rolling={rolling}
            rollKey={rollKey}
            size={dieSize}
            {...rollConfig[index]}
          />
        </View>
      ))}
    </View>
  );
}
