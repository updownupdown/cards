import { normalizeGamePath } from "@/data/game-menu";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { floatingBarDims } from "@/styles/menuStyles";
import { usePathname } from "expo-router";

/** Gap between the header and the top of the tips box. */
export const TIPS_BOX_TOP_MARGIN = 10;
/** Gap between the bottom of the tips box and the game board. */
export const TIPS_BOX_BOTTOM_GAP = 0;

export type TipsBoxLayout = {
  /** Whether the tips box is shown for the current game. */
  active: boolean;
  /** Gap below the header before the box (px). */
  topMargin: number;
  /** Collapsed box height (px). */
  boxHeight: number;
  /** Gap between box and board (px). */
  bottomGap: number;
  /** Total vertical space to reserve above the board (px). */
  reservedHeight: number;
};

/**
 * Shared layout math for the floating tips box. Both `TipsBox` (to
 * position/size itself) and `useCardMap` (to reserve space above the board)
 * read from this so the board is never covered by the tips box.
 */
export function useTipsBoxLayout(): TipsBoxLayout {
  const pathname = normalizeGamePath(usePathname());
  const { settings } = useGameSettings(pathname);
  const { spacing } = useResponsiveMetrics();

  // Default to active while settings load, since tips mode is on by default
  // for every game; this avoids the board shifting after the async load.
  const active = settings?.tipsMode ?? true;

  const topMargin = spacing(TIPS_BOX_TOP_MARGIN);
  const boxHeight = spacing(floatingBarDims.height);
  const bottomGap = spacing(TIPS_BOX_BOTTOM_GAP);

  // floatingBarDims.height

  return {
    active,
    topMargin,
    boxHeight,
    bottomGap,
    reservedHeight: active ? topMargin + boxHeight + bottomGap : 0,
  };
}
