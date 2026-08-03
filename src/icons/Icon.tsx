import type { SvgProps } from "react-native-svg";

import { icons, type IconName } from "./generated";

export type IconProps = Omit<SvgProps, "width" | "height"> & {
  name: IconName;
  size?: number;
  color?: string;
  shadow?: boolean;
};

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
      style={{
        transitionDuration: "0.3s",
        transitionProperty: "color",
        transitionTimingFunction: "ease",
        flexShrink: 0,
        ...(shadow
          ? { filter: `drop-shadow(1px 2px 4px rgba(0, 0, 0, 0.4))` }
          : {}),
      }}
      {...svgProps}
    />
  );
}
