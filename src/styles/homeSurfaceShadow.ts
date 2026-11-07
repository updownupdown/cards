import { Colors, rgba } from "@/styles/styles";
import { type ViewStyle } from "react-native";

type Spacing = (value: number) => number;

/** The shadow under a Home surface (a panel, a box). */
export function homeSurfaceShadow(spacing: Spacing): ViewStyle {
  return {
    boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(8)}px ${rgba(Colors.K950, 0.65)}, ${spacing(3)}px ${spacing(6)}px ${spacing(18)}px ${rgba(Colors.K950, 0.65)}`,
  };
}
