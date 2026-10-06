import { useStateManager } from "@/hooks/useStateManager";
import { useMemo } from "react";
import {
  collectCards,
  flipAllToBack,
  PlayingCard,
  RANKS,
  shuffle,
  SUITS,
} from "../Cards/card-utils";
import { delay } from "@/utils/utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint } from "@/hints/hint";
const GRID_SIZE = 5;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

type GameState = {
  cards: PlayingCard[];
  moves: number;
  won: boolean;
  /** Every card, face down, while the grid is being gathered and dealt. */
  deal: PlayingCard[];
};

function affectedIndices(index: number) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return [
    index,
    ...(row > 0 ? [index - GRID_SIZE] : []),
    ...(row < GRID_SIZE - 1 ? [index + GRID_SIZE] : []),
    ...(col > 0 ? [index - 1] : []),
    ...(col < GRID_SIZE - 1 ? [index + 1] : []),
  ];
}

function toggleAt(cards: PlayingCard[], index: number) {
  const affected = new Set(affectedIndices(index));
  return cards.map((card, cardIndex) =>
    affected.has(cardIndex) ? { ...card, faceUp: !card.faceUp } : card,
  );
}

function createSolvedCards(): PlayingCard[] {
  return Array.from({ length: CELL_COUNT }, (_, index) => ({
    id: `lights-${index}`,
    suit: SUITS[index % SUITS.length],
    rank: RANKS[index % RANKS.length],
    faceUp: false,
  }));
}

function createInitialState(): GameState {
  let cards = createSolvedCards();
  const pressCount = 8 + Math.floor(Math.random() * 8);
  const presses = new Set<number>();

  while (presses.size < pressCount) {
    presses.add(Math.floor(Math.random() * CELL_COUNT));
  }
  presses.forEach((index) => {
    cards = toggleAt(cards, index);
  });

  return { cards, moves: 0, won: false, deal: [] };
}

/** The grid cleared, with every card gathered face down into the deal pile. */
function gatherState(state: GameState): GameState {
  return {
    cards: [],
    moves: 0,
    won: false,
    deal: shuffle(flipAllToBack(collectCards(state))),
  };
}

function isSolved(cards: PlayingCard[]) {
  return cards.every((card) => !card.faceUp);
}

/**
 * Solves the grid outright (linear algebra over on/off: each card's light is
 * the sum of the presses that touch it) and keeps to the fewest presses:
 * the hint is the first card of the shortest solution.
 */
function solveLightsOut(cards: PlayingCard[]): number[] | null {
  // One row per card: which presses toggle it, and whether it's lit.
  const rows = cards.map((card, index) => ({
    presses: affectedIndices(index).reduce((mask, at) => mask | (1 << at), 0),
    lit: card.faceUp ? 1 : 0,
  }));
  const pivots: number[] = [];
  let rank = 0;
  for (let column = 0; column < CELL_COUNT; column += 1) {
    const pivot = rows.findIndex(
      (row, index) => index >= rank && row.presses & (1 << column),
    );
    if (pivot < 0) continue;
    [rows[rank], rows[pivot]] = [rows[pivot], rows[rank]];
    rows.forEach((row, index) => {
      if (index !== rank && row.presses & (1 << column)) {
        row.presses ^= rows[rank].presses;
        row.lit ^= rows[rank].lit;
      }
    });
    pivots.push(column);
    rank += 1;
  }
  if (rows.slice(rank).some((row) => row.lit)) return null;

  const free = Array.from({ length: CELL_COUNT }, (_, column) => column).filter(
    (column) => !pivots.includes(column),
  );
  let best: number[] | null = null;
  for (let choice = 0; choice < 1 << free.length; choice += 1) {
    let presses = 0;
    free.forEach((column, bit) => {
      if (choice & (1 << bit)) presses |= 1 << column;
    });
    pivots.forEach((column, index) => {
      const row = rows[index];
      const others = row.presses & ~(1 << column) & presses;
      let parity = row.lit;
      for (let bits = others; bits; bits &= bits - 1) parity ^= 1;
      if (parity) presses |= 1 << column;
    });
    const solution = Array.from({ length: CELL_COUNT }, (_, at) => at).filter(
      (at) => presses & (1 << at),
    );
    if (!best || solution.length < best.length) best = solution;
  }
  return best;
}

function findLightsOutHint(state: GameState) {
  const solution = solveLightsOut(state.cards);
  return solution?.length
    ? makeHint("tapCard", cardTarget(state.cards[solution[0]]))
    : null;
}

export const lightsOutRules = {
  findHint: findLightsOutHint,
  affectedIndices,
  toggleAt,
  isSolved,
};

// Starts with every card in the deal pile, to be dealt out from there.
const gameStateInitial = gatherState(createInitialState());

export default function LightsOut() {
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the deal pile, then deal them back out.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame(() => createInitialState());
    },
  });

  useHint(() => findLightsOutHint(game), {
    game,
    enabled: !isSettingUp && !game.won && !game.deal?.length,
  });

  const zones = useMemo<MapZone[]>(
    () => [
      ...game.cards.map((card, index) => ({
        id: `cell-${index}`,
        name: "cell",
        pileIndex: index,
        cards: [card],
        col: index % GRID_SIZE,
        row: Math.floor(index / GRID_SIZE),
        baseZIndex: 5,
      })),
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: (GRID_SIZE - 1) / 2,
        row: (GRID_SIZE - 1) / 2,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
      },
    ],
    [game.cards, game.deal],
  );

  function pressCard(index: number) {
    if (game.won) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.cards = toggleAt(draft.cards, index);
      draft.moves += 1;
      draft.won = isSolved(draft.cards);
    });
  }

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping => ({
    onPress: () => pressCard(mappedCard.pileIndex ?? 0),
    isDisabled: game.won || mappedCard.zoneName === "deal",
  });

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0.16,
    fixedCols: GRID_SIZE,
    fixedRows: GRID_SIZE,
  });

  return (
    <GameWrapper
      outcome={game.won ? "won" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.moves}
      winLoseMessage={i18n.t("games:lightsOut.everyLightIsOut")}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
