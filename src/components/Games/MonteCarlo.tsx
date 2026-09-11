import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { useImmer } from "use-immer";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
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

type GameState = {
  grid: (PlayingCard | null)[];
  draw: PlayingCard[];
  trash: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type MonteCarloGameState = GameState;

const gameStateInitial: GameState = {
  grid: Array(25).fill(null),
  draw: createDeck(),
  trash: [],
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [...draft.draw, ...draft.grid, ...draft.trash].filter(
      (card): card is PlayingCard => card !== null,
    );

    draft.grid = Array(25).fill(null);
    draft.draw = flipAllToBack(allCards);
    draft.trash = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const dealt = createGame(draft.draw);
    draft.grid = dealt.grid;
    draft.draw = dealt.draw;
    draft.ended = dealt.ended;
    draft.won = dealt.won;
  });

  await delay();
}

// ========== Helper Functions ========== //
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
    if (!base?.faceUp) continue;

    for (let j = 0; j < 25; j += 1) {
      if (i === j) continue;
      const other = grid[j];
      if (other?.faceUp && other.rank === base.rank && isAdjacent(i, j)) {
        return true;
      }
    }
  }

  return false;
}

function evaluateEnd(state: GameState) {
  const cardsInPlay = countCards(state.grid) + state.draw.length;
  if (cardsInPlay === 0) return { ended: true, won: true };

  if (!hasPair(state.grid) && state.draw.length === 0) {
    return { ended: true, won: false };
  }

  return { ended: false, won: false };
}

function createGame(
  cards: PlayingCard[] = createDeck({ faceUp: false }),
  random: () => number = Math.random,
): GameState {
  const draw = shuffle(flipAllToBack(cards), random);
  const grid = [
    ...flipAllToFace(draw.splice(-25)),
    ...Array<null>(Math.max(0, 25 - cards.length)).fill(null),
  ];
  const state: GameState = {
    grid,
    draw,
    trash: [],
    ended: false,
    won: false,
  };
  return { ...state, ...evaluateEnd(state) };
}

function getPairActions(grid: (PlayingCard | null)[]) {
  const pairs: [number, number][] = [];
  for (let first = 0; first < grid.length; first += 1) {
    const firstCard = grid[first];
    if (!firstCard?.faceUp) continue;

    for (let second = first + 1; second < grid.length; second += 1) {
      const secondCard = grid[second];
      if (
        secondCard?.faceUp &&
        firstCard.rank === secondCard.rank &&
        isAdjacent(first, second)
      ) {
        pairs.push([first, second]);
      }
    }
  }
  return pairs;
}

function flipPairAction(draft: GameState, first: number, second: number) {
  const firstCard = draft.grid[first];
  const secondCard = draft.grid[second];
  if (
    draft.ended ||
    !firstCard?.faceUp ||
    !secondCard?.faceUp ||
    firstCard.rank !== secondCard.rank ||
    !isAdjacent(first, second)
  ) {
    return false;
  }

  draft.grid[first] = flipToBack(firstCard);
  draft.grid[second] = flipToBack(secondCard);
  return true;
}

function consolidateAndDealAction(draft: GameState) {
  if (draft.ended || !hasFaceDownCards(draft.grid)) return false;

  const remaining: PlayingCard[] = [];
  for (const card of draft.grid) {
    if (!card) continue;
    if (card.faceUp) remaining.push(card);
    else draft.trash.push(card);
  }

  while (remaining.length < 25) {
    const next = draft.draw.pop();
    if (!next) break;
    remaining.push(flipToFace(next));
  }

  draft.grid = [
    ...remaining,
    ...Array<null>(Math.max(0, 25 - remaining.length)).fill(null),
  ];
  Object.assign(draft, evaluateEnd(draft));
  return true;
}

export const monteCarloRules = {
  isAdjacent,
  countCards,
  countFaceDownCardsInGrid,
  hasFaceDownCards,
  hasPair,
  evaluateEnd,
  createGame,
  getPairActions,
  flipPairAction,
  consolidateAndDealAction,
};

// ========== Main Component ========== //
export default function MonteCarlo() {
  const [selected, setSelected] = useImmer<number[] | null>(null);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
      },
    });

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

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      flipPairAction(draft, selected[0], selected[1]);
    });

    setSelected(null);
  }

  async function consolidateAndDeal() {
    if (game.ended) return;

    saveUndoState(structuredClone(game));

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

    setGame((draft) => {
      Object.assign(draft, evaluateEnd(draft));
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
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Stock", infoPos: "left" },
      },
      {
        id: "trash",
        name: "trash",
        cards: game.trash,
        col: 3,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Dscrd", infoPos: "right" },
      },
      ...gridZones,
      {
        id: "button",
        col: 0,
        row: 6.45,
        width: "full",
        height: 0.72,
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
    gap: 0.14,
    paddingTop: 0.3,
    paddingBottom: 0.6,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won ? "You cleared all cards!" : "No adjacent pairs left."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("button"), flexStyles.colCentered]}>
        <Button
          onPress={consolidateAndDeal}
          disabled={game.ended || !hasFaceDownCard}
          text="Consolidate"
          fullWidth
          size="lg"
          halfTaller
        />
      </View>
    </GameWrapper>
  );
}
