import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { type SceneProps, seeded, useLoop } from "./BackgroundAnimations";
import { SoftBlob } from "./SoftBlob";

const BANK_COUNT = 5;
const MIST = "#e8eef2";

/**
 * One bank of mist, far wider than the screen. Nearer banks (higher index)
 * are a little thicker and drift faster; all of them drift the same way, and
 * slowly thin and thicken as they go.
 */
function Bank({ index, width, height }: SceneProps & { index: number }) {
  const depth = (index + 1) / BANK_COUNT;
  const bankWidth = width * (1.75 + seeded(index, 81) * 1.5);
  const bankHeight = 138 + seeded(index, 82) * 212;
  const top = (0.05 + seeded(index, 83) * 0.85) * height - bankHeight / 2;
  const peak = 0.115 + depth * 0.138;
  const start = seeded(index, 84);
  const drift = useLoop(150000 - depth * 70000 + seeded(index, 85) * 30000, 0);
  const breathe = useLoop(9000 + seeded(index, 86) * 9000, 0);

  const style = useAnimatedStyle(() => {
    const along = (start + drift.value) % 1;
    return {
      opacity: peak * (0.7 + 0.3 * Math.sin(breathe.value * Math.PI * 2)),
      transform: [
        { translateX: -bankWidth + along * (width + bankWidth) },
        { translateY: top },
      ],
    };
  });

  return (
    <Animated.View style={[styles.bank, style]}>
      <SoftBlob width={bankWidth} height={bankHeight} color={MIST} />
    </Animated.View>
  );
}

/**
 * Mist: a few wide, soft banks at different depths, drifting slowly across
 * and breathing thinner and thicker. Two UI-thread loops a bank.
 */
export function Mist(props: SceneProps) {
  return (
    <>
      {Array.from({ length: BANK_COUNT }, (_, index) => (
        <Bank key={index} index={index} {...props} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bank: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
