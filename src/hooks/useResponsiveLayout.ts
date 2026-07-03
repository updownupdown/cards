import { TabletBreakpoint } from "@/styles/styles";
import { useViewportDimensions } from "./useViewportDimensions";

export function useResponsiveScale() {
  const { width } = useViewportDimensions();

  return width > TabletBreakpoint ? 1.3 : 1;
}
