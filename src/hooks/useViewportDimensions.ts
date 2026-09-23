import { useMemo, useSyncExternalStore } from "react";
import { Platform, useWindowDimensions } from "react-native";

type WindowDimensions = {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
};

const INITIAL_WEB_DIMENSIONS: WindowDimensions = {
  width: 0,
  height: 0,
  scale: 1,
  fontScale: 1,
};

let currentWebDimensions = INITIAL_WEB_DIMENSIONS;
const dimensionListeners = new Set<() => void>();
let teardownWindowListeners: (() => void) | null = null;
let pendingUpdate: number | null = null;

function readWebDimensions(): WindowDimensions {
  if (typeof window === "undefined") {
    return INITIAL_WEB_DIMENSIONS;
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scale: window.devicePixelRatio || 1,
    fontScale: 1,
  };
}

function areDimensionsEqual(a: WindowDimensions, b: WindowDimensions) {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.scale === b.scale &&
    a.fontScale === b.fontScale
  );
}

/** Reads the viewport and wakes every subscriber if it actually moved. */
function commitDimensions() {
  const next = readWebDimensions();
  if (areDimensionsEqual(currentWebDimensions, next)) return;

  currentWebDimensions = next;
  dimensionListeners.forEach((listener) => listener());
}

function clearPendingUpdate() {
  if (pendingUpdate === null) return;
  window.clearTimeout(pendingUpdate);
  pendingUpdate = null;
}

function scheduleDebouncedUpdate(delayMs = 90) {
  clearPendingUpdate();
  pendingUpdate = window.setTimeout(() => {
    pendingUpdate = null;
    commitDimensions();
  }, delayMs);
}

// One set of window listeners for every subscriber, attached with the first
// and removed with the last.
function startWindowListeners() {
  const onResize = () => scheduleDebouncedUpdate();
  const refreshAfterResume = () => scheduleDebouncedUpdate(0);

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("focus", refreshAfterResume);
  window.addEventListener("pageshow", refreshAfterResume);
  document.addEventListener("visibilitychange", refreshAfterResume);

  return () => {
    clearPendingUpdate();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("focus", refreshAfterResume);
    window.removeEventListener("pageshow", refreshAfterResume);
    document.removeEventListener("visibilitychange", refreshAfterResume);
  };
}

function subscribeToWebDimensions(listener: () => void) {
  dimensionListeners.add(listener);
  if (dimensionListeners.size === 1) {
    teardownWindowListeners = startWindowListeners();
  }
  // The first subscriber runs after mount, which is where the real viewport
  // replaces the zero-sized snapshot hydration rendered against.
  commitDimensions();

  return () => {
    dimensionListeners.delete(listener);
    if (dimensionListeners.size === 0) {
      teardownWindowListeners?.();
      teardownWindowListeners = null;
    }
  };
}

const getWebDimensions = () => currentWebDimensions;
const getServerWebDimensions = () => INITIAL_WEB_DIMENSIONS;

function useWebViewportDimensions(): WindowDimensions {
  // useSyncExternalStore, not useState, because the home screen sits behind a
  // Suspense boundary and hydrates after the rest of the tree. By then an
  // earlier subscriber has already stored the real viewport, so seeding state
  // from it rendered 1280x800 against server HTML built at zero width - React
  // error #418. The server snapshot is what React uses while hydrating, no
  // matter when a boundary gets to it, and the real value lands immediately
  // afterwards. Components mounting later still read the live value, so they
  // don't flash through a zero-width layout.
  return useSyncExternalStore(
    subscribeToWebDimensions,
    getWebDimensions,
    getServerWebDimensions,
  );
}

function useNativeViewportDimensions(): WindowDimensions {
  const nativeDimensions = useWindowDimensions();
  return useMemo(
    () => ({
      width: nativeDimensions.width,
      height: nativeDimensions.height,
      scale: nativeDimensions.scale,
      fontScale: nativeDimensions.fontScale,
    }),
    [
      nativeDimensions.width,
      nativeDimensions.height,
      nativeDimensions.scale,
      nativeDimensions.fontScale,
    ],
  );
}

export const useViewportDimensions =
  Platform.OS === "web"
    ? useWebViewportDimensions
    : useNativeViewportDimensions;
