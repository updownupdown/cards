import { useEffect, useState } from "react";
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

export function useViewportDimensions(): WindowDimensions {
  const nativeDimensions = useWindowDimensions();
  const [webDimensions, setWebDimensions] = useState(readWebDimensions);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const updateDimensions = () => {
      setWebDimensions(readWebDimensions());
    };

    const refreshAfterResume = () => {
      window.setTimeout(updateDimensions, 0);
    };

    updateDimensions();

    window.addEventListener("resize", updateDimensions);
    window.addEventListener("focus", refreshAfterResume);
    window.addEventListener("pageshow", refreshAfterResume);
    document.addEventListener("visibilitychange", refreshAfterResume);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("focus", refreshAfterResume);
      window.removeEventListener("pageshow", refreshAfterResume);
      document.removeEventListener("visibilitychange", refreshAfterResume);
    };
  }, []);

  return Platform.OS === "web" ? webDimensions : nativeDimensions;
}
