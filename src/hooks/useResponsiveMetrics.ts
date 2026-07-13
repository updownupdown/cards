import { useMemo } from "react";
import { useResponsiveUiLayout } from "@/hooks/useResponsiveLayout";
import { roundToPixel } from "@/utils/utils";

export function useResponsiveMetrics() {
  const ui = useResponsiveUiLayout();

  return useMemo(
    () => ({
      ui,
      scale: ui.scale,
      textScale: ui.textScale,
      spacing: (value: number) => roundToPixel(value * ui.scale),
      font: (value: number) => value * ui.textScale,
    }),
    [ui],
  );
}
