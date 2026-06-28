import { TabletBreakpoint } from "@/styles/styles";
import { useWindowDimensions } from "react-native";

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  return width > TabletBreakpoint ? 1.3 : 1;
}
