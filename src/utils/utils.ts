import { bufferedDefaultAnimDuration } from "@/constants/animation";
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

export function firstLetterUppercase(str?: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
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

const LOCAL_DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalDevEnvironment() {
  if (__DEV__) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();

  return (
    LOCAL_DEV_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost")
  );
}

export const DOUBLE_TAP_MS = 300;

export function lightenHexColor(hexColor: string, amount: number) {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hexColor;

  const next = (value: number) =>
    Math.round(value + (255 - value) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${next(r)}${next(g)}${next(b)}`;
}

export function darkenHexColor(hexColor: string, amount: number) {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hexColor;

  const next = (value: number) =>
    Math.round(value * (1 - amount))
      .toString(16)
      .padStart(2, "0");

  return `#${next(r)}${next(g)}${next(b)}`;
}

export function desaturateHexColor(hexColor: string, amount: number) {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hexColor;

  const avg = (r + g + b) / 3;
  const next = (value: number) =>
    Math.round(value + (avg - value) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${next(r)}${next(g)}${next(b)}`;
}
