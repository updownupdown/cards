import { useMemo } from "react";
import {
  HeaderHeight,
  MaxContentWidth,
  TabletBreakpoint,
} from "@/styles/styles";
import { useViewportDimensions } from "./useViewportDimensions";

const TABLET_SCALE = 1.25;

export type ResponsiveTier = "phone" | "tablet";

export type ResponsiveUiLayout = {
  tier: ResponsiveTier;
  isTablet: boolean;
  scale: number;
  textScale: number;
  /** Shared max content width (grows with tablet scale). */
  contentMaxWidth: number;
  /** Game header height; kept as a token so CardMap and GameWrapper stay in sync. */
  gameHeaderHeight: number;
};

function getResponsiveTier(width: number): ResponsiveTier {
  return width > TabletBreakpoint ? "tablet" : "phone";
}

export function getResponsiveUiLayout(width: number): ResponsiveUiLayout {
  const tier = getResponsiveTier(width);
  const isTablet = tier === "tablet";
  // On phone the scale is 1; on tablet everything grows by TABLET_SCALE.
  const scale = isTablet ? TABLET_SCALE : 1;
  // Keep text growth gentler than spacing/card surfaces for readability.
  const textScale = 1 + (scale - 1) * 0.75;

  return {
    tier,
    isTablet,
    scale,
    textScale,
    contentMaxWidth: Math.round(MaxContentWidth * scale * (isTablet ? 1.4 : 1)),
    gameHeaderHeight: Math.round(HeaderHeight * scale),
  };
}

export function useResponsiveUiLayout(widthOverride?: number) {
  const { width } = useViewportDimensions();
  const resolvedWidth = widthOverride ?? width;

  return useMemo(() => getResponsiveUiLayout(resolvedWidth), [resolvedWidth]);
}

export function useResponsiveUiLayoutFromWidth(width: number) {
  return useMemo(() => getResponsiveUiLayout(width), [width]);
}

/**
 * UI width caps chrome/content (modals, intro, previews) at a fixed max so
 * text-heavy surfaces stay readable rather than stretching on wide screens.
 */
export function getConstrainedUiWidth(
  width: number,
  maxWidth = MaxContentWidth,
) {
  return Math.min(width, maxWidth);
}
