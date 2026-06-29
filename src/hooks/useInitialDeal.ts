import { useEffect, useRef } from "react";

export function useInitialDeal(showIntro: boolean, startDeal: () => void) {
  const hasDealtRef = useRef(false);

  useEffect(() => {
    if (showIntro || hasDealtRef.current) return;

    hasDealtRef.current = true;
    startDeal();
  }, [showIntro, startDeal]);
}
