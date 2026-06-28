import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { produce } from "immer";
import { useCallback, useEffect, useMemo } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToFace,
  flipToBack,
  flipToFace,
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
import { useImmer } from "use-immer";
import { delay } from "@/utils/utils";
import { useAnimatedDeal } from "@/hooks/useAnimatedDeal";

type GameState = {
  grid: (PlayingCard | null)[];
  draw: PlayingCard[];
  trash: PlayingCard[];
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: GameState;
};

function getInitialState(): GameState {
  return {
    grid: Array(25).fill(null),
    draw: createDeck(),
    trash: [],
    ended: false,
    won: false,
  };
}

function isAdjacent(indexA: number, indexB: number) {
  const rowA = Math.floor(indexA / 5);
  const colA = indexA % 5;
  const rowB = Math.floor(indexB / 5);
  const colB = indexB % 5;
  const rowDelta = Math.abs(rowA - rowB);
  const colDelta = Math.abs(colA - colB);
  if (rowDelta === 0 && colDelta === 0) return false;
  return rowDelta <= 1 && colDelta <= 1;
}

function countCards(grid: (PlayingCard | null)[]) {
  let total = 0;
  for (const cell of grid) {
    if (cell?.faceUp) total += 1;
  }
  return total;
}

function countFaceDownCardsInGrid(grid: (PlayingCard | null)[]) {
  let total = 0;
  for (const cell of grid) {
    if (cell && !cell.faceUp) total++;
  }
  return total;
}

function hasFaceDownCards(grid: (PlayingCard | null)[]) {
  return countFaceDownCardsInGrid(grid) !== 0;
}

function hasPair(grid: (PlayingCard | null)[]) {
  for (let i = 0; i < 25; i += 1) {
    const base = grid[i];
    if (!base) continue;

    for (let j = 0; j < 25; j += 1) {
      if (i === j) continue;
      const other = grid[j];
      if (other && other.rank === base.rank && isAdjacent(i, j)) {
        return true;
      }
    }
  }

  return false;
}

function evaluateEnd(state: GameState) {
  const cardsInPlay = countCards(state.grid) + state.draw.length;
  if (cardsInPlay === 0) return { ended: true, won: true };
  if (!hasPair(state.grid)) return { ended: true, won: false };
  return { ended: false, won: false };
}

export default function MonteCarlo() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const [game, setGame] = useImmer<GameState>(getInitialState);
  const [selected, setSelected] = useImmer<number[] | null>(null);

  const { runAnimatedSequence, isAnimating } = useAnimatedDeal<GameState>();

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    if (isAnimating) return;
    const previousState = undo();
    if (previousState) {
      clearHistory();
      setGame(previousState.game);
    }
  };

  // 3. Define the Dealing Sequence Callback
  const startDeal = useCallback(() => {
    runAnimatedSequence({
      setGame,
      // Safely returns the count of cards currently on the board/trash
      getGatherableCount: (draft) => {
        const gridCards = draft.grid.filter((c) => c !== null).length;
        const trashCards = draft.trash.length;
        return gridCards + trashCards;
      },
      // Instructions on how to move exactly ONE card to the main deck
      gatherOneCard: (draft) => {
        // Gather from grid first (sweeping bottom-right to top-left looks visually cleaner)
        for (let i = draft.grid.length - 1; i >= 0; i--) {
          if (draft.grid[i] !== null) {
            const card = draft.grid[i]!;
            draft.grid[i] = null;
            draft.draw.push(flipToBack(card));
            return;
          }
        }
        // Then gather from trash
        if (draft.trash.length > 0) {
          const card = draft.trash.pop()!;
          draft.draw.push(flipToBack(card));
          return;
        }
      },
      // Prep the deck after gathering is completely done
      onGatherComplete: (draft) => {
        draft.draw = shuffle(draft.draw);
        draft.ended = false;
        draft.won = false;
      },
      // The game-specific deal pattern
      dealSequence: async (checkAbort) => {
        for (let i = 0; i < 25; i++) {
          checkAbort();
          setGame((draft) => {
            const card = draft.draw.pop();
            if (card) {
              draft.grid[i] = flipToFace(card);
            }
          });
          await delay(100);
        }
      },
    });
  }, [runAnimatedSequence, setGame]);

  // 4. Trigger deal on initial mount
  useEffect(() => {
    startDeal();
  }, []);

  function reset() {
    clearHistory();
    setSelected(null);
    startDeal();
  }

  function selectCell(index: number) {
    if (game.ended) return;

    const clickedCard = game.grid[index];

    if (!clickedCard) {
      return;
    } else if (!selected) {
      setSelected([index]);
      return;
    } else if (selected[0] === index) {
      setSelected(null);
      return;
    }

    const other = game.grid[selected[0]];

    if (!other) {
      return;
    } else if (
      !isAdjacent(selected[0], index) ||
      other.rank !== clickedCard.rank
    ) {
      setSelected([index]);
      return;
    }

    setSelected((draft) => {
      if (draft === null) {
        return [index];
      } else {
        draft.push(index);
      }
    });

    return;
  }

  async function flipCards() {
    if (selected === null) return;

    saveUndoState(structuredClone({ game }));

    setGame((draft) => {
      const card1 = draft.grid[selected[0]];
      const card2 = draft.grid[selected[1]];

      if (!card1 || !card2) return;

      draft.grid[selected[0]] = flipToBack(card1);
      draft.grid[selected[1]] = flipToBack(card2);
    });

    setSelected(null);
  }

  async function consolidateAndDeal() {
    if (game.ended) return;

    saveUndoState(structuredClone({ game }));

    setSelected(null);

    let gameState = game;

    // Remove face down cards
    while (hasFaceDownCards(gameState.grid)) {
      gameState = produce(gameState, (draft) => {
        const faceDownCardIndex = draft.grid.findIndex(
          (card) => card && !card.faceUp,
        );
        if (faceDownCardIndex === -1) return;

        const faceDownCard = draft.grid[faceDownCardIndex];
        if (!faceDownCard) return;

        draft.grid[faceDownCardIndex] = null;
        draft.trash.push(faceDownCard);
      });

      await delay(100);

      setGame(gameState);
    }

    // Move remaining cards to the left one at a time with a delay
    for (let i = 0; i < 25; i++) {
      if (gameState.grid[i] === null) {
        // Find the next non-null card to the right
        const nextNonNullIndex = gameState.grid.findIndex(
          (card, index) => index > i && card !== null,
        );
        if (nextNonNullIndex !== -1) {
          gameState = produce(gameState, (draft) => {
            draft.grid[i] = draft.grid[nextNonNullIndex];
            draft.grid[nextNonNullIndex] = null;
          });

          setGame(gameState);

          await delay(100);
        }
      }
    }

    // Deal new cards from stock to fill empty spaces
    while (
      gameState.draw.length > 0 &&
      gameState.grid.some((card) => card === null)
    ) {
      gameState = produce(gameState, (draft) => {
        const emptyIndex = draft.grid.findIndex((card) => card === null);
        if (emptyIndex === -1) return;

        const newCard = draft.draw.pop();
        if (!newCard) return;

        draft.grid[emptyIndex] = flipToFace(newCard);
      });

      setGame(gameState);

      await delay(100);
    }

    // Check win condition after dealing all cards possible
    const { ended, won } = evaluateEnd(gameState);

    setGame((draft) => {
      draft.ended = ended;
      draft.won = won;
    });
  }

  const hasFaceDownCard = useMemo(() => {
    return hasFaceDownCards(game.grid);
  }, [game.grid]);

  useEffect(() => {
    if (selected?.length === 2) {
      flipCards();
    }
  }, [selected]);

  console.log(game);

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const gridZones: MapZone[] = getGridColRows({
      cols: 5,
      rows: 5,
      rowOffset: 1.25,
    }).map((pos, i) => ({
      id: `grid-${i}`,
      pileIndex: i,
      cards: game.grid[i] ? [game.grid[i]] : undefined,
      name: "playmate",
      col: pos.c,
      row: pos.r,
      baseZIndex: 5,
      fan: { maxVisible: 3 },
    }));

    return [
      {
        id: "stock",
        name: "stock",

        cards: game.draw,
        col: 1,
        row: 0,
        fan: { maxVisible: 50 },
        baseZIndex: 50,
        // placeholder: { text: "Draw", infoPos: "left" },
      },
      {
        id: "trash",
        name: "trash",
        cards: game.trash,
        col: 3,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Trash", infoPos: "right" },
      },
      ...gridZones,
      {
        id: "button",

        col: 0,
        row: 6.5,
        width: "full",
        height: 0.7,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;

    if (index === undefined) return {};

    const isSelected = !!selected?.includes(index);

    return {
      onPress: () => selectCell(index),
      isSelected,
      selectColor: isSelected ? "green" : "none",
      isDisabled: !mappedCard.card.faceUp || game.ended,
      zIndexOffset: mappedCard.card.faceUp ? 0 : 50,
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game: game,
    zones,
    cardMapper,
    cardSize: "small",
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
        game.won ? "You cleared all cards!" : "No adjacent pairs left."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      {cardMap}

      <View style={[getZoneStylesById("button")]}>
        <Button
          onPress={consolidateAndDeal}
          disabled={game.ended || !hasFaceDownCard}
          text="Consolidate"
          fullWidth
          size="medium-large"
          style={[flexStyles.flex1, { height: "100%" }]}
        />
      </View>
    </GameWrapper>
  );
}
