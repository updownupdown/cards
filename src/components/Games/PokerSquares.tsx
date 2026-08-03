import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToFace,
  rankValue,
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

const GRID_SIZE = 5;
const TARGET_SCORE = 200;

const AMERICAN_POINTS = [0, 2, 5, 10, 15, 20, 25, 50, 75, 100];

type GameState = {
  deck: PlayingCard[];
  grid: (PlayingCard | null)[];
  score: number;
  ended: boolean;
  won: boolean;
};

export type PokerSquaresGameState = GameState;

const gameStateInitial: GameState = {
  deck: [],
  grid: Array.from({ length: GRID_SIZE * GRID_SIZE }, () => null),
  score: 0,
  ended: false,
  won: false,
};

function cardValue(card: PlayingCard) {
  return rankValue(card, 14);
}

function handCategory(hand: PlayingCard[]) {
  if (hand.length !== GRID_SIZE) return 0;

  const values = hand.map(cardValue).sort((a, b) => b - a);
  const uniqueValues = [...new Set(values)];
  const isFlush = hand.every((card) => card.suit === hand[0].suit);
  const isWheel =
    uniqueValues.length === 5 &&
    uniqueValues[0] === 14 &&
    uniqueValues[1] === 5 &&
    uniqueValues[2] === 4 &&
    uniqueValues[3] === 3 &&
    uniqueValues[4] === 2;
  const isStraight =
    uniqueValues.length === 5 && (values[0] - values[4] === 4 || isWheel);
  const counts = Object.values(
    values.reduce<Record<number, number>>((result, value) => {
      result[value] = (result[value] ?? 0) + 1;
      return result;
    }, {}),
  ).sort((a, b) => b - a);

  if (isFlush && isStraight) {
    return values[0] === 14 && !isWheel ? 9 : 8;
  }
  if (counts[0] === 4) return 7;
  if (counts[0] === 3 && counts[1] === 2) return 6;
  if (isFlush) return 5;
  if (isStraight) return 4;
  if (counts[0] === 3) return 3;
  if (counts[0] === 2 && counts[1] === 2) return 2;
  if (counts[0] === 2) return 1;
  return 0;
}

function scoreGrid(grid: (PlayingCard | null)[]) {
  const lines: PlayingCard[][] = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const hand = grid.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE);
    lines.push(hand.filter((card): card is PlayingCard => card !== null));
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const hand: PlayingCard[] = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const card = grid[row * GRID_SIZE + col];
      if (card) hand.push(card);
    }
    lines.push(hand);
  }

  return lines.reduce((total, hand) => {
    return total + AMERICAN_POINTS[handCategory(hand)];
  }, 0);
}

function revealDeckTop(deck: PlayingCard[]) {
  const topIndex = deck.length - 1;
  const card = deck[topIndex];
  if (card) deck[topIndex] = flipToFace(card);
}

function placeCardOnGrid(state: GameState, index: number) {
  if (state.ended || state.grid[index] || !top(state.deck)) return false;

  const card = state.deck.pop();
  if (!card || state.grid[index]) return false;

  state.grid[index] = flipToFace(card);
  revealDeckTop(state.deck);
  if (state.grid.every((cell) => cell !== null)) {
    state.score = scoreGrid(state.grid);
    state.ended = true;
    state.won = state.score >= TARGET_SCORE;
  }
  return true;
}

export const pokerSquaresRules = {
  cardValue,
  handCategory,
  scoreGrid,
  revealDeckTop,
  placeCard: placeCardOnGrid,
  gridSize: GRID_SIZE,
  targetScore: TARGET_SCORE,
  americanPoints: AMERICAN_POINTS,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.deck = shuffle(createDeck());
    revealDeckTop(draft.deck);
    draft.grid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => null);
    draft.score = 0;
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

export default function PokerSquares() {
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  function placeCard(index: number) {
    if (game.ended || game.grid[index] || !top(game.deck)) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      placeCardOnGrid(draft, index);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const gridZones = getGridColRows({
      cols: GRID_SIZE,
      rows: GRID_SIZE,
      rowOffset: 1.3,
    }).map((position, index) => ({
      id: `grid-${index}`,
      name: "grid",
      pileIndex: index,
      cards: game.grid[index] ? [game.grid[index]!] : undefined,
      col: position.c,
      row: position.r,
      baseZIndex: 10,
      placeholder: {},
    }));

    return [
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 2,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Deal", infoPos: "right" },
      },
      ...gridZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "grid") {
      return {
        isDisabled: game.ended,
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "grid" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      const isEmpty = game.grid[index] === null;
      return {
        onPress: () => placeCard(index),
        isDisabled: game.ended || !isEmpty || !top(game.deck),
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "small",
    gap: 0.1,
    fixedCols: GRID_SIZE,
    fixedRows: 6.3,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? `Great hand! You scored ${game.score}.`
          : `You scored ${game.score}. Try for ${TARGET_SCORE} next time.`
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
