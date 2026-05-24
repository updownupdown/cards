import { useEffect, useState } from "react";

export function useGameLoading() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Delay rendering heavy components so the UI can mount and fade in first.
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return isLoaded;
}
