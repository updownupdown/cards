import { useMemo } from "react";
import { MaxContentWidth, TabletBreakpoint } from "@/styles/styles";
import { useViewportDimensions } from "./useViewportDimensions";

type ResponsiveScaleOptions = {
  tabletBreakpoint?: number;
  phoneScale?: number;
  tabletScale?: number;
};

const DEFAULT_PHONE_SCALE = 1;
const DEFAULT_TABLET_SCALE = 1.3;

export function getResponsiveScale(
  width: number,
  {
    tabletBreakpoint = TabletBreakpoint,
    phoneScale = DEFAULT_PHONE_SCALE,
    tabletScale = DEFAULT_TABLET_SCALE,
  }: ResponsiveScaleOptions = {},
) {
  return width > tabletBreakpoint ? tabletScale : phoneScale;
}

export function useResponsiveScale(
  widthOverride?: number,
  options: ResponsiveScaleOptions = {},
) {
  const { width } = useViewportDimensions();
  const resolvedWidth = widthOverride ?? width;

  return useMemo(
    () => getResponsiveScale(resolvedWidth, options),
    [
      options.phoneScale,
      options.tabletBreakpoint,
      options.tabletScale,
      resolvedWidth,
    ],
  );
}

export function useResponsiveScaleFromWidth(
  width: number,
  options: ResponsiveScaleOptions = {},
) {
  return useMemo(
    () => getResponsiveScale(width, options),
    [options.phoneScale, options.tabletBreakpoint, options.tabletScale, width],
  );
}

export function getConstrainedContentWidth(
  width: number,
  responsiveScale: number,
  maxWidth = MaxContentWidth,
) {
  return Math.min(width, maxWidth * responsiveScale);
}

export function useResponsiveValue<T>(
  phoneValue: T,
  tabletValue: T,
  widthOverride?: number,
  options: ResponsiveScaleOptions = {},
) {
  const scale = useResponsiveScale(widthOverride, options);
  return scale > (options.phoneScale ?? DEFAULT_PHONE_SCALE)
    ? tabletValue
    : phoneValue;
}
