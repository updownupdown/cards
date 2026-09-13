import { Platform } from "react-native";
import type { SvgProps } from "react-native-svg";

import { webDropShadow } from "@/styles/styles";
import { icons, type IconName } from "./generated";

export type IconProps = Omit<SvgProps, "width" | "height"> & {
  name: IconName;
  size?: number;
  color?: string;
  shadow?: boolean;
};

// Hoisted so every icon shares one style object rather than allocating a new
// one on each render. The colour transition is a CSS transition, so it only
// does anything on web.
const baseStyle = {
  ...(Platform.OS === "web"
    ? {
        transitionDuration: "0.3s",
        transitionProperty: "color",
        transitionTimingFunction: "ease",
      }
    : null),
  flexShrink: 0,
} as const;

const shadowStyle = {
  ...baseStyle,
  ...webDropShadow("1px 2px 4px rgba(0, 0, 0, 0.3)"),
} as const;

export function Icon({
  name,
  size = 24,
  color,
  shadow = false,
  ...svgProps
}: IconProps) {
  const SvgIcon = icons[name];
  return (
    <SvgIcon
      width={size}
      height={size}
      color={color}
      style={shadow ? shadowStyle : baseStyle}
      {...svgProps}
    />
  );
}
