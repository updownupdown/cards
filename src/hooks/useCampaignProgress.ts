import {
  DEFAULT_CAMPAIGN_PROGRESS,
  loadCampaignProgress,
  subscribeToCampaignProgress,
  type CampaignProgress,
} from "@/data/campaign-progress";
import { getUnlockedGameDotPaths } from "@/data/campaign-map";
import { useEffect, useMemo, useState } from "react";

export function useCampaignProgress() {
  const [progress, setProgress] = useState<CampaignProgress>(
    DEFAULT_CAMPAIGN_PROGRESS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToCampaignProgress(setProgress);
    loadCampaignProgress()
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

  const wonPaths = useMemo(
    () => new Set(Object.keys(progress.winsByPath)),
    [progress.winsByPath],
  );
  const unlockedPaths = useMemo(
    () => getUnlockedGameDotPaths(wonPaths, progress.unlockedPaths),
    [wonPaths, progress.unlockedPaths],
  );
  const collectedTaoIds = useMemo(
    () => new Set(progress.collectedTaoIds),
    [progress.collectedTaoIds],
  );
  const collectedQuoteIds = useMemo(
    () => new Set(progress.collectedQuoteIds),
    [progress.collectedQuoteIds],
  );

  return {
    progress,
    isLoading,
    wonPaths,
    unlockedPaths,
    collectedTaoIds,
    collectedQuoteIds,
  };
}
