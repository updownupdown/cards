import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { usePalette } from "@/styles/palette";
import { rgba } from "@/styles/styles";
import { useRef, useState } from "react";
import { View } from "react-native";

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
  /** What the value means, for a screen reader ("Every ~3 games"). */
  accessibilityValueText?: string;
};

/**
 * A track with a thumb to drag, or to tap anywhere along, between `min` and
 * `max` in whole steps. Disabled, it greys out and stays where it is.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
  accessibilityLabel,
  accessibilityValueText,
}: SliderProps) {
  const { spacing } = useResponsiveMetrics();
  const palette = usePalette();
  const trackRef = useRef<View>(null);
  // Where the track is in the window, measured as a touch begins.
  const measured = useRef({ x: 0, width: 0 });
  const [width, setWidth] = useState(0);
  const thumb = spacing(26);
  const ratio = max > min ? (value - min) / (max - min) : 0;
  const travel = Math.max(0, width - thumb);

  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const moveTo = (pageX: number) => {
    const { x, width: full } = measured.current;
    if (full <= thumb) return;
    const at = Math.min(
      1,
      Math.max(0, (pageX - x - thumb / 2) / (full - thumb)),
    );
    const next = clamp(min + Math.round((at * (max - min)) / step) * step);
    if (next !== value) onChange(next);
  };

  return (
    <View
      ref={trackRef}
      testID="slider"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      accessibilityValue={{
        min,
        max,
        now: value,
        text: accessibilityValueText,
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        const by = event.nativeEvent.actionName === "increment" ? step : -step;
        const next = clamp(value + by);
        if (next !== value) onChange(next);
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      // Kept through the drag: a list it sits in doesn't scroll away with it.
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        const { pageX } = event.nativeEvent;
        trackRef.current?.measureInWindow((x, _y, full) => {
          measured.current = { x, width: full };
          moveTo(pageX);
        });
      }}
      onResponderMove={(event) => moveTo(event.nativeEvent.pageX)}
      style={{
        width: "100%",
        height: spacing(44),
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "auto" : "pointer",
      }}
    >
      <View
        style={{
          height: spacing(6),
          borderRadius: spacing(3),
          backgroundColor: rgba(palette.ink, 0.14),
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <View
          style={{
            width: ratio * travel + thumb / 2,
            height: "100%",
            backgroundColor: disabled ? palette.dim : palette.accent,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: ratio * travel,
          width: thumb,
          height: thumb,
          borderRadius: thumb / 2,
          backgroundColor: disabled ? palette.dim : palette.accent,
          pointerEvents: "none",
        }}
      />
    </View>
  );
}
