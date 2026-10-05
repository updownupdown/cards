import type { ReactNode } from "react";
import { View } from "react-native";
import type { Stage } from "./stage";

/**
 * The game's world, drawn in world units and scaled to the screen as a
 * whole, so everything inside it is laid out in the units the physics uses.
 */
export function World({ stage, children }: { stage: Stage; children: ReactNode }) {
  return (
    <View
      style={{
        pointerEvents: "none",
        position: "absolute",
        left: stage.offsetX,
        top: stage.offsetY,
        width: stage.W,
        height: stage.H,
        transformOrigin: "top left",
        transform: [{ scale: stage.scale }],
      }}
    >
      {children}
    </View>
  );
}

/** A circle centred on (x, y). */
export function Dot({
  x,
  y,
  r,
  color,
  opacity = 1,
  borderColor,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
  opacity?: number;
  borderColor?: string;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: color,
        opacity,
        ...(borderColor ? { borderWidth: 1, borderColor } : null),
      }}
    />
  );
}

/** A straight line between two points. */
export function Line({
  x1,
  y1,
  x2,
  y2,
  width = 1,
  color,
  opacity = 1,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  color: string;
  opacity?: number;
}) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  return (
    <View
      style={{
        position: "absolute",
        left: (x1 + x2) / 2 - length / 2,
        top: (y1 + y2) / 2 - width / 2,
        width: length,
        height: width,
        borderRadius: width / 2,
        backgroundColor: color,
        opacity,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}
