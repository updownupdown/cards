import { normalizeGamePath } from "@/data/game-menu";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { usePathname } from "expo-router";

/** Collapsed height of the tutorial box (base units, pre-scale). */
export const TUTORIAL_BOX_HEIGHT = 62;
/** Gap between the header and the top of the tutorial box. */
export const TUTORIAL_BOX_TOP_MARGIN = 0;
/** Gap between the bottom of the tutorial box and the game board. */
export const TUTORIAL_BOX_BOTTOM_GAP = 10;

export type TutorialBoxLayout = {
  /** Whether the tutorial box is shown for the current game. */
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
 * Shared layout math for the floating tutorial box. Both `TutorialBox` (to
 * position/size itself) and `useCardMap` (to reserve space above the board)
 * read from this so the board is never covered by the box.
 */
export function useTutorialBoxLayout(): TutorialBoxLayout {
  const pathname = normalizeGamePath(usePathname());
  const { settings } = useGameSettings(pathname);
  const { spacing } = useResponsiveMetrics();

  // Default to active while settings load, since tutorial mode is on by default
  // for every game; this avoids the board shifting after the async load.
  const active = settings?.tutorialMode ?? true;

  const topMargin = spacing(TUTORIAL_BOX_TOP_MARGIN);
  const boxHeight = spacing(TUTORIAL_BOX_HEIGHT);
  const bottomGap = spacing(TUTORIAL_BOX_BOTTOM_GAP);

  return {
    active,
    topMargin,
    boxHeight,
    bottomGap,
    reservedHeight: active ? topMargin + boxHeight + bottomGap : 0,
  };
}
