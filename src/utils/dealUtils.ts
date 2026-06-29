import { flipToBack, PlayingCard } from "@/components/Cards/card-utils";
import { delay } from "@/utils/utils";

type StandardGatherConfig<T> = {
  mainDeck: keyof T;
  grids?: (keyof T)[]; // Arrays where cards are replaced with `null`
  piles?: (keyof T)[]; // Arrays where cards are completely removed via pop()
};

export function createStandardGatherLogic<T extends Record<string, any>>({
  mainDeck,
  grids = [],
  piles = [],
}: StandardGatherConfig<T>) {
  return {
    getGatherableCount: (draft: T): number => {
      let count = 0;

      // Count cards in grid zones (ignoring nulls)
      for (const key of grids) {
        const arr = draft[key];
        if (Array.isArray(arr)) {
          count += arr.filter(
            (card: PlayingCard | null) => card !== null,
          ).length;
        }
      }

      // Count cards in pile zones
      for (const key of piles) {
        const arr = draft[key];
        if (Array.isArray(arr)) {
          count += arr.length;
        }
      }

      return count;
    },

    gatherOneCard: (draft: T): void => {
      const deck = draft[mainDeck] as PlayingCard[];

      // 1. Gather from grids first (sweeping bottom-right to top-left looks best)
      for (const key of grids) {
        const arr = draft[key];
        if (Array.isArray(arr)) {
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i] !== null) {
              const card = arr[i] as PlayingCard;
              arr[i] = null;
              deck.push(flipToBack(card));
              return; // Exit after moving exactly ONE card
            }
          }
        }
      }

      // 2. Gather from piles
      for (const key of piles) {
        const arr = draft[key] as PlayingCard[];
        if (Array.isArray(arr) && arr.length > 0) {
          const card = arr.pop();
          if (card) {
            deck.push(flipToBack(card));
            return; // Exit after moving exactly ONE card
          }
        }
      }
    },
  };
}

type StandardDealConfig<T> = {
  mainDeck: keyof T;
  grids?: (keyof T)[];
  piles?: (keyof T)[];
};

export function createStandardDealLogic<T extends Record<string, any>>(
  targetState: T,
  config: StandardDealConfig<T>,
) {
  // 1. Create a clean starting state by deeply cloning the target state
  const initialState = structuredClone(targetState);
  const deck = initialState[config.mainDeck] as PlayingCard[];

  // Track exactly where each card needs to go
  type DealStep = {
    zone: keyof T;
    index?: number;
    targetFaceUp: boolean;
  };

  const steps: DealStep[] = [];
  const extractedCards: PlayingCard[] = [];

  // 2. Extract cards from grids (retaining their index)
  for (const key of config.grids || []) {
    const arr = initialState[key];
    if (Array.isArray(arr)) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== null) {
          const card = arr[i] as PlayingCard;
          steps.push({
            zone: key,
            index: i,
            targetFaceUp: card.faceUp ?? false,
          });
          extractedCards.push(card);
          arr[i] = null; // Clear the slot
        }
      }
    }
  }

  // 3. Extract cards from piles
  for (const key of config.piles || []) {
    const arr = initialState[key];
    if (Array.isArray(arr)) {
      for (let i = 0; i < arr.length; i++) {
        const card = arr[i] as PlayingCard;
        steps.push({ zone: key, targetFaceUp: card.faceUp ?? false });
        extractedCards.push(card);
      }
      initialState[key] = [] as any; // Clear the pile
    }
  }

  // 4. Put extracted cards back onto the main deck.
  // We push them in REVERSE order so that when we .pop() them later,
  // they come out in the exact sequence they were found.
  for (let i = extractedCards.length - 1; i >= 0; i--) {
    const card = extractedCards[i];
    card.faceUp = false; // Cards in the draw deck are always face down
    deck.push(card);
  }

  // 5. The generated deal sequence helper
  const dealSequence = async (
    setGame: (updater: (draft: T) => void | T) => void,
    checkAbort: () => void,
    delayMs: number = 100,
  ) => {
    for (const step of steps) {
      checkAbort();
      setGame((draft) => {
        const main = draft[config.mainDeck] as PlayingCard[];
        const dealtCard = main.pop();
        if (!dealtCard) return;

        dealtCard.faceUp = step.targetFaceUp;

        if (step.index !== undefined) {
          (draft[step.zone] as any)[step.index] = dealtCard;
        } else {
          (draft[step.zone] as any).push(dealtCard);
        }
      });
      await delay(delayMs);
    }
  };

  return { initialState, dealSequence };
}
