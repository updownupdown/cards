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

export function RollingDice({ rollKey, rolling, size }: RollingDiceProps) {
  const { spacing } = useResponsiveMetrics();
  const dieSize = size ?? spacing(56);
  const stageWidth = Math.max(300, dieSize * 4.8);
  const [faces, setFaces] = useState<[number, number]>([2, 5]);
  const [rollConfig, setRollConfig] = useState([
    {
      turns: 1.25,
      spinDuration: 2400,
      settleDelay: 2400,
      shuffleInterval: 160,
    },
    {
      turns: 1.75,
      spinDuration: 2200,
      settleDelay: 2200,
      shuffleInterval: 160,
    },
  ]);

  useEffect(() => {
    if (!rolling) return;
    setFaces([
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
    ]);
    setRollConfig(
      [0, 1].map(() => {
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
        width: stageWidth,
        height: dieSize * 1.2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: dieSize * 0.63,
      }}
    >
      <Die
        faceValue={faces[0]}
        rolling={rolling}
        rollKey={rollKey}
        size={dieSize}
        {...rollConfig[0]}
      />
      <Die
        faceValue={faces[1]}
        rolling={rolling}
        rollKey={rollKey}
        size={dieSize}
        {...rollConfig[1]}
      />
    </View>
  );
}
