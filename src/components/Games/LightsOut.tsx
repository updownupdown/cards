import { useStateManager } from "@/hooks/useStateManager";
import { useMemo } from "react";
import { PlayingCard, RANKS, SUITS } from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
const GRID_SIZE = 5;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

type GameState = {
  cards: PlayingCard[];
  moves: number;
  won: boolean;
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

  return { cards, moves: 0, won: false };
}

function isSolved(cards: PlayingCard[]) {
  return cards.every((card) => !card.faceUp);
}

export const lightsOutRules = { affectedIndices, toggleAt, isSolved };

const gameStateInitial = createInitialState();

export default function LightsOut() {
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        const next = createInitialState();
        setGame((draft) => {
          Object.assign(draft, next);
        });
      },
    });

  const zones = useMemo<MapZone[]>(
    () =>
      game.cards.map((card, index) => ({
        id: `cell-${index}`,
        name: "cell",
        pileIndex: index,
        cards: [card],
        col: index % GRID_SIZE,
        row: Math.floor(index / GRID_SIZE),
        baseZIndex: 5,
      })),
    [game.cards],
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
    isDisabled: game.won,
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
