import type { SvgProps } from "react-native-svg";

import { icons, type IconName } from "./generated";

export type IconProps = Omit<SvgProps, "width" | "height"> & {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color, ...svgProps }: IconProps) {
  const SvgIcon = icons[name];
  return <SvgIcon width={size} height={size} color={color} {...svgProps} />;
}
