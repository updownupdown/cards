import { memo } from "react";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/**
 * A soft round blot of colour, clear at its edge: drawn once, then only moved,
 * scaled or faded. The gradient's id comes from its colour, since on web ids
 * are shared across the page and two colours under one id would clash.
 */
export const SoftBlob = memo(function SoftBlob({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: string;
}) {
  const id = `blob-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg width={width} height={height} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="1" />
          <Stop offset="45%" stopColor={color} stopOpacity="0.55" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="50" rx="50" ry="50" fill={`url(#${id})`} />
    </Svg>
  );
});
