import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import {
  DEFAULT_WILD_CARDS_PROGRESS,
  SHOW_WILD_CARDS,
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

/** Wild Cards are hidden until SHOW_WILD_CARDS is turned on in the code. */
export function useWildCardsVisible() {
  return SHOW_WILD_CARDS;
}
