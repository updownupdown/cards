import { useEffect, useState } from "react";
import { useGameSettings } from "./useGameSettings";
import { usePathname } from "expo-router";
import { normalizeGamePath } from "@/data/game-menu";

export function useGameLoading() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Delay rendering heavy components so the UI can mount and fade in first.
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const [showIntro, setShowIntro] = useState<boolean | undefined>(undefined);

  const pathname = normalizeGamePath(usePathname());
  const { settings: gameSettings } = useGameSettings(pathname);

  useEffect(() => {
    if (gameSettings === undefined) {
    }
    if (gameSettings?.showIntro !== undefined) {
      setShowIntro(gameSettings?.showIntro);
    }
  }, [gameSettings]);

  return { isLoaded, showIntro, setShowIntro };
}
