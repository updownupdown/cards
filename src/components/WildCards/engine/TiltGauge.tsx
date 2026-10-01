import { View } from "react-native";
import type { Stage } from "./stage";
import type { Tilt } from "./tilt";

const SIZE = 44;
const BUBBLE = 12;
const INK = "#f3eee6";

/**
 * A little tilt gauge in the top right corner, for the games that read the
 * phone's accelerometer: its ball rolls towards the side tipped down, and its
 * ring glows when the phone is jolted. With no readings (no sensor, or not
 * allowed), the gauge is shown struck through. It reads the tilt while the
 * game loop redraws, so it needs no state of its own.
 */
export function TiltGauge({
  tilt,
  stage,
}: {
  tilt: { current: Tilt };
  stage: Stage;
}) {
  "use no memo";
  const { live, x, y, jolt } = tilt.current;
  const reach = (SIZE - BUBBLE) / 2 - 2;
  // A tilt of about 30 degrees (a sine of 0.5) takes the ball to the rim.
  const clampUnit = (value: number) => Math.max(-1, Math.min(1, value * 2));
  const bubbleX = clampUnit(x) * reach;
  const bubbleY = -clampUnit(y) * reach;
  const glow = Math.min(1, jolt);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        top: stage.offsetY + stage.topClear * stage.scale + 4,
        right: stage.offsetX + 12,
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
        borderWidth: 1.5,
        borderColor: `rgba(240, 180, 76, ${0.25 + glow * 0.75})`,
        opacity: live ? 1 : 0.5,
      }}
    >
      {/* The crosshair: level is dead centre. */}
      <View
        style={{
          position: "absolute",
          left: SIZE / 2 - 0.75 - 1.5,
          top: 4,
          bottom: 4,
          width: 1,
          backgroundColor: "rgba(255, 255, 255, 0.18)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: SIZE / 2 - 0.75 - 1.5,
          left: 4,
          right: 4,
          height: 1,
          backgroundColor: "rgba(255, 255, 255, 0.18)",
        }}
      />
      {live ? (
        <View
          style={{
            position: "absolute",
            left: SIZE / 2 - 1.5 - BUBBLE / 2,
            top: SIZE / 2 - 1.5 - BUBBLE / 2,
            width: BUBBLE,
            height: BUBBLE,
            borderRadius: BUBBLE / 2,
            backgroundColor: INK,
            transform: [{ translateX: bubbleX }, { translateY: bubbleY }],
          }}
        />
      ) : (
        <View
          style={{
            position: "absolute",
            left: 6,
            right: 6,
            top: SIZE / 2 - 1.5 - 1,
            height: 2,
            backgroundColor: INK,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      )}
    </View>
  );
}
