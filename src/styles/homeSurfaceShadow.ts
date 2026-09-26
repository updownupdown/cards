import { Colors, rgba } from "@/styles/styles";
import { Platform, type ViewStyle } from "react-native";

type Spacing = (value: number) => number;

/**
 * `translucent` is for surfaces whose background isn't opaque: Android draws
 * an elevation shadow under the whole view, where it shows through the
 * background as a faint inner shadow. A box shadow is drawn only outside it.
 */
export function homeSurfaceShadow(
  spacing: Spacing,
  { translucent = false }: { translucent?: boolean } = {},
): ViewStyle {
  if (Platform.OS === "android" && !translucent) {
    return { elevation: spacing(6) };
  }

  return {
    boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(8)}px ${rgba(Colors.K950, 0.65)}, ${spacing(3)}px ${spacing(6)}px ${spacing(18)}px ${rgba(Colors.K950, 0.65)}`,
  };
}
