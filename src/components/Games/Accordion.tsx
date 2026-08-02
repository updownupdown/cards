import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { flipToFace } from "../Cards/card-utils";
import { useMemo, useState } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

type GameState = {
  setupPile: PlayingCard[];
  line: (PlayingCard[] | null)[];
  ended: boolean;
  won: boolean;
};

export type AccordionGameState = GameState;

const gameStateInitial: GameState = {
  setupPile: shuffle(createDeck()),
  line: [],
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather all cards, face down, to setup pile
  setGame((draft) => {
    const lineCards = draft.line
      .flat()
      .filter((card): card is PlayingCard => card !== null);

    const allCards = [...draft.setupPile, ...lineCards].filter(
      (card): card is PlayingCard => card !== null,
    );

    draft.setupPile = shuffle(flipAllToBack(allCards));
    draft.line = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  // Distribute to line
  setGame((draft) => {
    draft.line = draft.setupPile.map((card) => [card]);
    draft.setupPile = [];
  });

  await delay();

  // Flip all cards to face, with 100ms delay between each
  for (let i = 0; i < 52; i += 1) {
    setGame((draft) => {
      if (draft.line[i]) {
        draft.line[i] = draft.line[i]!.map(flipToFace);
      }
    });
    await delay(10);
  }
}

function canMerge(source?: PlayingCard, target?: PlayingCard) {
  if (!source || !target) return false;
  return source.rank === target.rank || source.suit === target.suit;
}

function hasAnyMove(line: PlayingCard[][]) {
  for (let i = 0; i < line.length; i += 1) {
    const oneLeft = i - 1;
    const threeLeft = i - 3;
    if (oneLeft >= 0 && canMerge(top(line[i]), top(line[oneLeft]))) return true;
    if (threeLeft >= 0 && canMerge(top(line[i]), top(line[threeLeft])))
      return true;
  }
  return false;
}

export const accordionRules = {
  canMerge,
  hasAnyMove,
};

// ========== Game Component ========== //
export default function Accordion() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const {
    isLoaded,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
    isAnimatingRef,
    withAnimation,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
    resetNonGameStates: () => {
      setSelectedIndex(null);
    },
  });

  function onCardPress(index: number) {
    if (isAnimatingRef.current) return;
    if (game.ended) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }

    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }

    const source = selectedIndex;
    const target = index;
    const validDistance = source - target === 1 || source - target === 3;
    if (!validDistance) {
      setSelectedIndex(index);
      return;
    }

    const srcCard = top(game.line[source]);
    const targetCard = top(game.line[target]);
    if (!srcCard || !targetCard || !canMerge(srcCard, targetCard)) {
      setSelectedIndex(index);
      return;
    }

    void withAnimation(() => performMergeAnimation(source, target, srcCard));
  }

  async function performMergeAnimation(
    sourceIndex: number,
    targetIndex: number,
    srcCard: PlayingCard,
  ) {
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (draft.line[targetIndex]) {
        draft.line[targetIndex].push(srcCard);
      } else {
        draft.line[targetIndex] = [srcCard];
      }

      draft.line[sourceIndex] = null;
    });

    setSelectedIndex(null);

    // Move each card to fill the gap, one at a time, with a delay
    for (let i = sourceIndex + 1; i < game.line.length; i += 1) {
      if (game.line[i] !== null) {
        setGame((draft) => {
          draft.line[i - 1] = draft.line[i];
          draft.line[i] = null;
        });
        await delay(10);
      }
    }

    // Check win/lose conditions after the animation is complete
    setGame((draft) => {
      draft.won = draft.line.filter((pile) => pile !== null).length === 1;
      draft.ended =
        draft.won ||
        !hasAnyMove(
          draft.line.filter((pile) => pile !== null) as PlayingCard[][],
        );
    });
  }

  function selectColor(idx: number): string {
    if (selectedIndex === idx) {
      // Current card
      return "green";
    } else if (
      selectedIndex &&
      (idx === selectedIndex - 3 ||
        (selectedIndex && idx === selectedIndex - 1))
    ) {
      // Card 1 or 3 to the left
      return canMerge(top(game.line[idx]), top(game.line[selectedIndex]))
        ? "green"
        : "purple";
    } else {
      // Other cards
      return "none";
    }
  }

  // ========== Card Mapping ========== //
  const colNums = 7;
  const zones: MapZone[] = useMemo(() => {
    const setupPile: MapZone = {
      id: "setup",
      name: "setup",
      cards: game.setupPile,
      col: 3,
      row: 3,
      baseZIndex: 1,
      pileIndex: 1,
    };

    const gridZones: MapZone[] = getGridColRows({
      cols: colNums,
      rows: Math.ceil(game.line.length / colNums),
    }).map((pos, i) => ({
      id: `line-${i}`,
      name: "line",
      pileIndex: i,
      cards: game.line[i] ? game.line[i] : undefined,
      col: pos.c,
      row: pos.r,
      baseZIndex: i + 10,
    }));

    return [setupPile, ...gridZones];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;
    if (index === undefined) return;

    return {
      onPress: () => onCardPress(index),
      isSelected: selectedIndex === index,
      selectColor: selectColor(index),
      forceOverlayColor: true,
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0.12,
    fixedCols: 7,
    fixedRows: 8,
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "You compressed the deck to one card."
          : "No legal moves remain."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
