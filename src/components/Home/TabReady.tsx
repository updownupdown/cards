import { createContext, useContext, useLayoutEffect, useRef } from "react";

/**
 * What a Home tab is still waiting on before it is shown: images not yet on
 * screen, a map not yet centred. Home keeps a tab it is switching to hidden
 * until none remain, so it appears complete, in one frame.
 */
export type TabReadyGate = {
  /** Holds the tab back; call the returned function to let go. */
  hold: () => () => void;
  pending: () => number;
  /** Sets what to call whenever the last hold is let go. */
  setOnSettled: (onSettled: (() => void) | null) => void;
};

export function createTabReadyGate(): TabReadyGate {
  let pending = 0;
  let onSettled: (() => void) | null = null;
  return {
    hold: () => {
      pending += 1;
      let held = true;
      return () => {
        if (!held) return;
        held = false;
        pending -= 1;
        if (pending === 0) onSettled?.();
      };
    },
    pending: () => pending,
    setOnSettled: (callback) => {
      onSettled = callback;
    },
  };
}

export const TabReadyContext = createContext<TabReadyGate | null>(null);

/** Keeps the tab hidden while `holding` is true. */
export function useTabReadyHold(holding: boolean) {
  const gate = useContext(TabReadyContext);
  useLayoutEffect(() => {
    if (!gate || !holding) return;
    return gate.hold();
  }, [gate, holding]);
}

/**
 * Keeps the tab hidden until an image has been drawn. Spread the result
 * into the expo-image; `source` null means there is nothing to wait for.
 */
export function useTabReadyImage(source: unknown) {
  const gate = useContext(TabReadyContext);
  const release = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    if (!gate || source == null) return;
    const letGo = gate.hold();
    release.current = letGo;
    return () => {
      release.current = null;
      letGo();
    };
  }, [gate, source]);
  const onDone = () => {
    release.current?.();
    release.current = null;
  };
  return { onDisplay: onDone, onError: onDone };
}
