import {
  DEFAULT_NODES_PROGRESS,
  loadNodesProgress,
  subscribeToNodesProgress,
  type NodesProgress,
} from "@/data/nodes-progress";
import { getUnlockedNodePaths } from "@/data/nodes-map";
import { useEffect, useMemo, useState } from "react";

export function useNodesProgress() {
  const [progress, setProgress] = useState<NodesProgress>(
    DEFAULT_NODES_PROGRESS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToNodesProgress(setProgress);
    loadNodesProgress()
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
    () => getUnlockedNodePaths(wonPaths),
    [wonPaths],
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
