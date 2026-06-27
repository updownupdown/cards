import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { produce } from "immer";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToFace,
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

type GameState = {
  grid: (PlayingCard | null)[];
  stock: PlayingCard[];
  removed: number;
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: GameState;
};

function setup(): GameState {
  const deck = shuffle(createDeck());
  const grid = flipAllToFace(deck.splice(-25));

  return {
    grid,
    stock: deck,
    removed: 0,
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
  const cardsInPlay = countCards(state.grid) + state.stock.length;
  if (cardsInPlay === 0) return { ended: true, won: true };
  if (hasPair(state.grid)) return { ended: false, won: false };
  if (state.stock.length > 0) return { ended: false, won: false };
  return { ended: true, won: false };
}

export default function MonteCarlo() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const [game, setGame] = useState<GameState>(setup);
  const [selected, setSelected] = useState<number[] | null>(null);

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      clearHistory();
      setGame(previousState.game);
    }
  };

  function reset() {
    clearHistory();
    setGame(setup());
    setSelected(null);
  }

  function selectCell(index: number) {
    setGame((prev) => {
      if (prev.ended) return prev;

      const card = prev.grid[index];
      if (!card) {
        setSelected(null);
        return prev;
      } else if (!selected) {
        setSelected([index]);
        return prev;
      } else if (selected[0] === index) {
        setSelected(null);
        return prev;
      }

      const other = prev.grid[selected[0]];

      if (!other) {
        setSelected(null);
        return prev;
      } else if (!isAdjacent(selected[0], index) || other.rank !== card.rank) {
        setSelected([index]);
        return prev;
      }

      setSelected((s) => {
        const selectedPair = [index];
        const prevCardIndex = s?.[0];

        if (prevCardIndex !== undefined) {
          selectedPair.push(prevCardIndex);
        }

        return selectedPair;
      });

      return prev;
    });
  }

  async function flipCards() {
    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      if (!selected) return prev;

      const card1 = prev.grid[selected[0]];
      const card2 = prev.grid[selected[1]];

      if (!selected || !card1 || !card2) return prev;

      const grid = [...prev.grid];
      grid[selected[0]] = { ...card1, faceUp: false };
      grid[selected[1]] = { ...card2, faceUp: false };

      const next = { ...prev, grid };
      const end = evaluateEnd(next);

      setSelected(null);

      return { ...next, ...end };
    });
  }

  async function consolidateAndDeal() {
    if (game.ended) return;

    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      return produce(prev, (draft) => {
        const removedCards = countFaceDownCardsInGrid(game.grid);

        let scanIndex = 0;

        for (let i = 0; i < 25; i++) {
          const card = game.grid[i];
          if (card && card.faceUp) {
            draft.grid[scanIndex] = card;
            scanIndex++;
          }
        }

        for (let i = scanIndex; i < 25; i++) {
          if (draft.stock.length > 0) {
            draft.grid[i] = flipToFace(draft.stock.pop()!);
          }
        }

        draft.removed += removedCards;

        const { ended, won } = evaluateEnd(draft);
        draft.ended = ended;
        draft.won = won;
      });
    });

    setSelected(null);
  }

  const hasFaceDownCard = useMemo(() => {
    return hasFaceDownCards(game.grid);
  }, [game.grid]);

  useEffect(() => {
    if (selected?.length === 2) {
      flipCards();
    }
  }, [selected]);

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const gridZones: MapZone[] = getGridColRows({
      cols: 5,
      rows: 5,
      rowOffset: 1,
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

        cards: game.stock,
        col: 2,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Draw", infoPos: "left" },
      },
      ...gridZones,
      {
        id: "button",

        col: 0,
        row: 6,
        width: "full",
        height: 0.6,
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
    };
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
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
        game.won
          ? "You cleared all cards!"
          : "No adjacent pairs, and stock is empty."
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
          size="large"
          style={[flexStyles.flex1, { height: "100%" }]}
        />
      </View>
    </GameWrapper>
  );
}
