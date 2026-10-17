import { createContext, useContext, useLayoutEffect, useRef } from "react";
import { Platform, type LayoutChangeEvent } from "react-native";

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

/**
 * Whether the tab is on stage, shown or being readied to show, rather than
 * put away out of sight. Endless animations rest while it is away: nobody
 * can see them, and they would still cost something on every frame.
 */
export const TabOnStageContext = createContext(true);
export const useTabOnStage = () => useContext(TabOnStageContext);

/**
 * An image's source while its tab is on stage, and null while it is away.
 * Android uploads every picture in the view tree to the GPU on each frame,
 * tabs moved out of sight included, and keeps only about twelve screens'
 * worth: past that it throws them out and uploads them all again, every
 * frame. The kept Collect tab's artworks alone did that, and every tab
 * scrolled at 8 fps on a Pixel 7. So a tab put away lets go of its pictures,
 * and takes them back (from memory) while it is readied to show again.
 */
export function useStagedSource<T>(source: T): T | null {
  const onStage = useTabOnStage();
  return Platform.OS === "android" && !onStage ? null : source;
}

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
 *
 * On the web the image loads lazily, only once it nears the screen, so the
 * tab waits only for those that start on screen: one laid out off screen
 * lets go straight away (it would never be drawn while the tab waits).
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
  if (Platform.OS !== "web") return { onDisplay: onDone, onError: onDone };
  return {
    loading: "lazy" as const,
    onDisplay: onDone,
    onError: onDone,
    onLayout: (event: LayoutChangeEvent) => {
      if (!release.current) return;
      const node = (event.nativeEvent as { target?: unknown }).target;
      if (!(node instanceof Element)) return;
      const box = node.getBoundingClientRect();
      const onScreen =
        box.right > 0 &&
        box.bottom > 0 &&
        box.left < window.innerWidth &&
        box.top < window.innerHeight;
      if (!onScreen) onDone();
    },
  };
}
