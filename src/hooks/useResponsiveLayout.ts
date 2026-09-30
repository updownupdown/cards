import { useMemo } from "react";
import { useViewportDimensions } from "./useViewportDimensions";
import { layoutDims } from "@/styles/styles";

const MAX_CONTENT_WIDTH = 420;
export const TABLET_BREAKPOINT = 768;
const TABLET_SCALE = 1.25;

export type ResponsiveUiLayout = {
  isTablet: boolean;
  scale: number;
  textScale: number;
  /** Shared max content width (grows with tablet scale). */
  contentMaxWidth: number;
  /** Game header height; kept as a token so CardMap and GameWrapper stay in sync. */
  gameHeaderHeight: number;
};

export function getResponsiveUiLayout(
  width: number,
  height: number,
): ResponsiveUiLayout {
  const maxDim = Math.min(width, height);
  const isTablet = maxDim > TABLET_BREAKPOINT;
  const scale = isTablet ? TABLET_SCALE : 1;
  // Keep text growth gentler than spacing/card surfaces for readability.
  const textScale = 1 + (scale - 1) * 0.75;

  return {
    isTablet,
    scale,
    textScale,
    contentMaxWidth: Math.round(
      MAX_CONTENT_WIDTH * scale * (isTablet ? 1.4 : 1),
    ),
    gameHeaderHeight: Math.round(layoutDims.menuBarHeight * scale),
  };
}

export function useResponsiveUiLayout() {
  const { width, height } = useViewportDimensions();
  return useMemo(() => getResponsiveUiLayout(width, height), [width, height]);
}

/** Reuses dimensions a caller already subscribes to, avoiding a second viewport listener. */
export function useResponsiveUiLayoutFromWidth(width: number, height: number) {
  return useMemo(() => getResponsiveUiLayout(width, height), [width, height]);
}

/**
 * UI width caps chrome/content (modals, intro, previews) at a fixed max so
 * text-heavy surfaces stay readable rather than stretching on wide screens.
 */
export function getConstrainedUiWidth(
  width: number,
  maxWidth = MAX_CONTENT_WIDTH,
) {
  return Math.min(width, maxWidth);
}
