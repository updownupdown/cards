import type { HomeCardSize } from "./HomeCardSizeControl";
import { useCallback, useEffect, useRef } from "react";
import { Animated, type View } from "react-native";

const FADE_MS = 100;
/** Time for the list to lay out at its new card size before it is re-anchored. */
const SETTLE_MS = 60;

export type WindowBox = { top: number; height: number };

export function measureInWindow(
  view: View | null | undefined,
): Promise<WindowBox | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((_x, top, _width, height) =>
      resolve(Number.isFinite(top) ? { top, height } : null),
    );
  });
}

/**
 * Finds the entry whose centre is closest to the vertical centre of the
 * container. `offset` is how far below the container's centre it sits.
 */
export async function findCentreEntry(
  container: View | null | undefined,
  entries: Iterable<[string, View]>,
): Promise<{ key: string; offset: number } | null> {
  const box = await measureInWindow(container);
  if (!box) return null;
  const centre = box.top + box.height / 2;
  const boxes = await Promise.all(
    [...entries].map(async ([key, view]) => ({
      key,
      box: await measureInWindow(view),
    })),
  );
  let best: { key: string; offset: number } | null = null;
  for (const { key, box: item } of boxes) {
    if (!item || item.height === 0) continue;
    const offset = item.top + item.height / 2 - centre;
    if (!best || Math.abs(offset) < Math.abs(best.offset)) {
      best = { key, offset };
    }
  }
  return best;
}

type Options<Anchor> = {
  cardSize: HomeCardSize;
  onCardSizeChange: (size: HomeCardSize) => void;
  /** Reads which card is mid-screen before the size changes. */
  captureAnchor: () => Promise<Anchor | null>;
  /** Scrolls so the anchor is mid-screen again once the new size has laid out. */
  restoreAnchor: (anchor: Anchor) => Promise<void> | void;
};

/**
 * Changes the card size behind a quick fade, keeping the card that was in the
 * middle of the screen in the middle afterwards.
 */
export function useCardSizeTransition<Anchor>({
  cardSize,
  onCardSizeChange,
  captureAnchor,
  restoreAnchor,
}: Options<Anchor>) {
  const opacity = useRef(new Animated.Value(1)).current;
  const pendingAnchor = useRef<Anchor | null>(null);
  const isBusy = useRef(false);
  const latest = useRef({ cardSize, captureAnchor, restoreAnchor });
  latest.current = { cardSize, captureAnchor, restoreAnchor };

  const fadeTo = useCallback(
    (toValue: number) =>
      new Promise<void>((resolve) =>
        Animated.timing(opacity, {
          toValue,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start(() => resolve()),
      ),
    [opacity],
  );

  const changeCardSize = useCallback(
    async (size: HomeCardSize) => {
      if (isBusy.current || size === latest.current.cardSize) return;
      isBusy.current = true;
      const anchor = await latest.current.captureAnchor();
      if (anchor === null) {
        isBusy.current = false;
        onCardSizeChange(size);
        return;
      }
      await fadeTo(0);
      pendingAnchor.current = anchor;
      onCardSizeChange(size);
    },
    [fadeTo, onCardSizeChange],
  );

  useEffect(() => {
    const anchor = pendingAnchor.current;
    if (anchor === null) return;
    pendingAnchor.current = null;
    const timer = setTimeout(async () => {
      try {
        await latest.current.restoreAnchor(anchor);
      } finally {
        await fadeTo(1);
        isBusy.current = false;
      }
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [cardSize, fadeTo]);

  return { opacity, changeCardSize };
}
