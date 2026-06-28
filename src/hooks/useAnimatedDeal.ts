import { useCallback, useRef, useState } from "react";
import { delay } from "@/utils/utils";

export function useAnimatedDeal<GameState>() {
  const [isAnimating, setIsAnimating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runAnimatedSequence = useCallback(
    async ({
      setGame,
      getGatherableCount,
      gatherOneCard,
      onGatherComplete,
      dealSequence,
      delayMs = 100,
    }: {
      setGame: (updater: (draft: GameState) => void | GameState) => void;
      getGatherableCount: (draft: GameState) => number;
      gatherOneCard: (draft: GameState) => void;
      onGatherComplete: (draft: GameState) => void;
      dealSequence: (checkAbort: () => void) => Promise<void>;
      delayMs?: number;
    }) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsAnimating(true);
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const checkAbort = () => {
        if (signal.aborted) throw new Error("Animation aborted");
      };

      try {
        // 1. Safely calculate exactly how many cards need gathering.
        // Resolving this inside setGame ensures all previously queued
        // state updates (from an aborted sequence) are fully applied first.
        const cardsToGather = await new Promise<number>((resolve) => {
          setGame((draft) => {
            resolve(getGatherableCount(draft));
          });
        });

        checkAbort();

        // 2. Gather cards one by one with delays
        for (let i = 0; i < cardsToGather; i++) {
          checkAbort();
          setGame((draft) => {
            gatherOneCard(draft);
          });
          await delay(delayMs);
        }

        checkAbort();

        // 3. Prepare the deck (e.g., shuffle, reset win/loss flags)
        setGame((draft) => {
          onGatherComplete(draft);
        });

        // Small pause before dealing
        await delay(delayMs);
        checkAbort();

        // 4. Deal the cards out
        await dealSequence(checkAbort);
      } catch (e) {
        if (e instanceof Error && e.message === "Animation aborted") {
          console.log("Card animation sequence interrupted.");
        } else {
          console.error(e);
        }
      } finally {
        if (!signal.aborted) {
          setIsAnimating(false);
        }
      }
    },
    [],
  );

  return { runAnimatedSequence, isAnimating };
}
