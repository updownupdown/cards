import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import {
  DEFAULT_WILD_CARDS_PROGRESS,
  WILD_CARDS_LOCKED,
  WILD_GAMES,
  getWildCardsStatus,
  loadWildCardsProgress,
  subscribeToWildCardsProgress,
  type WildCardsProgress,
} from "@/data/wild-cards";
import { useEffect, useState } from "react";

/** The Wild Cards unlocked, and what the player's campaign wins still buy. */
export function useWildCards() {
  const { wonPaths, isLoading: campaignLoading } = useCampaignProgress();
  const [progress, setProgress] = useState<WildCardsProgress>(
    DEFAULT_WILD_CARDS_PROGRESS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToWildCardsProgress(setProgress);
    loadWildCardsProgress()
      .then((loaded) => {
        if (active) setProgress(loaded);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // While the games are being finished, all of them are open.
  const shown = WILD_CARDS_LOCKED
    ? progress
    : { ...progress, unlockedIds: WILD_GAMES.map((game) => game.id) };

  return {
    progress: shown,
    isLoading: isLoading || campaignLoading,
    status: getWildCardsStatus(wonPaths.size, shown.unlockedIds.length),
  };
}

/**
 * Whether Wild Cards show at all: the Home tab's section and their screens.
 * Never, at present: the games are being removed. Players' Wild Cards
 * progress is kept either way.
 */
export function useWildCardsVisible() {
  return false;
}
