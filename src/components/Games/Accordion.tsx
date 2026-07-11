import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  shuffle,
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
  line: PlayingCard[];
  ended: boolean;
  won: boolean;
};

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
    const allCards = [...draft.setupPile, ...draft.line].filter(
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
    draft.line = flipAllToFace(draft.setupPile);
    draft.setupPile = [];
  });
}

function canMerge(source: PlayingCard, target: PlayingCard) {
  return source.rank === target.rank || source.suit === target.suit;
}

function hasAnyMove(line: PlayingCard[]) {
  for (let i = 0; i < line.length; i += 1) {
    const oneLeft = i - 1;
    const threeLeft = i - 3;
    if (oneLeft >= 0 && canMerge(line[i], line[oneLeft])) return true;
    if (threeLeft >= 0 && canMerge(line[i], line[threeLeft])) return true;
  }
  return false;
}

// ========== Game Component ========== //
export default function Accordion() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const {
    isLoaded,
    showIntro,
    setShowIntro,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
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

    const srcCard = game.line[source];
    const targetCard = game.line[target];
    if (!srcCard || !targetCard || !canMerge(srcCard, targetCard)) {
      setSelectedIndex(index);
      return;
    }

    performMergeAnimation(source, target, srcCard);
  }

  async function performMergeAnimation(
    source: number,
    target: number,
    srcCard: PlayingCard,
  ) {
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.line[target] = srcCard;
      draft.line.splice(source, 1);

      draft.won = draft.line.length === 1;
      draft.ended = draft.won || !hasAnyMove(draft.line);
    });

    setSelectedIndex(null);
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
      return canMerge(game.line[idx], game.line[selectedIndex])
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
      cards: game.line[i] ? [game.line[i]] : undefined,
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
    gap: 0.14,
    fixedCols: 7,
    fixedRows: 8,
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
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
