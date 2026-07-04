import { bufferedDefaultAnimDuration } from "@/components/Cards/AnimatedCard";
import { PixelRatio } from "react-native";

export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function roundToPixel(value: number) {
  return PixelRatio.roundToNearestPixel(value);
}

export function floorToPixel(value: number) {
  const ratio = PixelRatio.get();
  return Math.floor(value * ratio) / ratio;
}

export function ceilToPixel(value: number) {
  const ratio = PixelRatio.get();
  return Math.ceil(value * ratio) / ratio;
}

function toDevicePixels(value: number) {
  return Math.round(value * PixelRatio.get());
}

/**
 * Snap a child size so it keeps the same odd/even device-pixel parity as the container.
 * This prevents half-pixel centered offsets when using `(container - child) / 2`.
 */
export function snapCenteredSize(
  containerSize: number,
  desiredChildSize: number,
  minChildSize = 1,
) {
  const ratio = PixelRatio.get();
  const minPx = Math.max(1, Math.ceil(minChildSize * ratio));
  const containerPx = Math.max(0, toDevicePixels(containerSize));
  const rawChildPx = desiredChildSize * ratio;
  const childPx = Math.max(minPx, Math.round(rawChildPx));

  if ((containerPx & 1) === (childPx & 1)) {
    return childPx / ratio;
  }

  const downPx = childPx - 1;
  const upPx = childPx + 1;
  const validDown = downPx >= minPx;

  if (!validDown) {
    return upPx / ratio;
  }

  const downDelta = Math.abs(downPx - rawChildPx);
  const upDelta = Math.abs(upPx - rawChildPx);
  return (downDelta <= upDelta ? downPx : upPx) / ratio;
}

export function centeredOffset(containerSize: number, childSize: number) {
  const ratio = PixelRatio.get();
  const containerPx = toDevicePixels(containerSize);
  const childPx = toDevicePixels(childSize);
  return (containerPx - childPx) / (2 * ratio);
}

export const delay = (ms: number = bufferedDefaultAnimDuration) =>
  new Promise((resolve) => setTimeout(resolve, ms));
