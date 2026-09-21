import { Colors, rgba } from "@/styles/styles";
import { Platform, type ViewStyle } from "react-native";

type Spacing = (value: number) => number;

export function homeSurfaceShadow(spacing: Spacing): ViewStyle {
  if (Platform.OS === "android") {
    return { elevation: spacing(6) };
  }

  return {
    boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(8)}px ${rgba(Colors.K950, 0.5)}, ${spacing(2)}px ${spacing(4)}px ${spacing(18)}px ${rgba(Colors.K950, 0.5)}`,
  };
}
