import { TabletBreakpoint } from "@/styles/styles";
import { useWindowDimensions } from "react-native";

export function useResponsiveScale() {
  const { width } = useWindowDimensions();

  return width > TabletBreakpoint ? 1.3 : 1;
}
