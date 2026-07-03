import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

type WindowDimensions = {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
};

function readWebDimensions(): WindowDimensions {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, scale: 1, fontScale: 1 };
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

function useWebViewportDimensions(): WindowDimensions {
  const [webDimensions, setWebDimensions] = useState(readWebDimensions);
  const timeoutRef = useRef<number | null>(null);

  const commitDimensions = () => {
    const next = readWebDimensions();
    setWebDimensions((prev) => (areDimensionsEqual(prev, next) ? prev : next));
  };

  useEffect(() => {
    const clearPendingUpdate = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const scheduleDebouncedUpdate = (delayMs = 90) => {
      clearPendingUpdate();
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        commitDimensions();
      }, delayMs);
    };

    const onResize = () => {
      scheduleDebouncedUpdate();
    };

    const refreshAfterResume = () => {
      scheduleDebouncedUpdate(0);
    };

    commitDimensions();

    window.addEventListener("resize", onResize, {
      passive: true,
    });
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
  }, []);

  return webDimensions;
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
