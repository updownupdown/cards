import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  redealWith,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";

// Maze: the two-way cousin of Gaps. The cells form one long line that wraps
// from the end of each row to the start of the next, and from the last cell
// back to the first. A card may fill a gap from either side: as the next card
// of the suit after the card before the gap, or the one before the card after
// it. The Kings are out of the game, so an Ace follows a Queen.
const ROWS = 6;
const COLS = 9;
const CELLS = ROWS * COLS;
/** The last cell of the first two rows is left empty by the deal. */
const EMPTY_AT_DEAL = [COLS - 1, 2 * COLS - 1];

type Grid = (PlayingCard | null)[];

export type MazeGameState = {
  grid: Grid;
  /** The Kings, out of the game until the next deal. */
  removed: PlayingCard[];
  /** Cards gathered up between deals. */
  deal: PlayingCard[];
};

// ========== Rules ========== //
function before(index: number) {
  return (index + CELLS - 1) % CELLS;
}

function after(index: number) {
  return (index + 1) % CELLS;
}

/** Whether `next` may follow `prior` in the line: same suit one higher, or an Ace after a Queen. */
function follows(prior: PlayingCard, next: PlayingCard) {
  if (prior.rank === "Q" && next.rank === "A") return true;
  return prior.suit === next.suit && rankValue(next) === rankValue(prior) + 1;
}

function canMove(grid: Grid, source: number, gap: number) {
  const card = grid[source];
  if (!card || grid[gap] !== null || source === gap) return false;
  // Only a card right next to the gap counts: a neighbouring gap gives no help.
  const prior = grid[before(gap)];
  const next = grid[after(gap)];
  return (!!prior && follows(prior, card)) || (!!next && follows(card, next));
}

function gapsOf(grid: Grid) {
  return grid.flatMap((card, index) => (card ? [] : [index]));
}

/** The cards that may fill the gap. */
function sourcesFor(grid: Grid, gap: number) {
  return grid.flatMap((card, source) =>
    card && canMove(grid, source, gap) ? [source] : [],
  );
}

function hasMove(grid: Grid) {
  const gaps = gapsOf(grid);
  return grid.some(
    (card, source) => !!card && gaps.some((gap) => canMove(grid, source, gap)),
  );
}

/** Won when every card follows the one before it along the whole wrapping line. */
function isWon(grid: Grid) {
  const line = grid.filter((card): card is PlayingCard => card !== null);
  return line.every((card, index) =>
    follows(line[(index + line.length - 1) % line.length], card),
  );
}

// ========== Deal ========== //
function createInitialState(): MazeGameState {
  const deck = shuffle(createDeck());
  const grid: Grid = Array(CELLS).fill(null);
  let dealt = 0;
  grid.forEach((_, index) => {
    if (!EMPTY_AT_DEAL.includes(index)) grid[index] = deck[dealt++];
  });
  return {
    grid: grid.map((card) =>
      !card || card?.rank === "K" ? null : flipToFace(card),
    ),
    removed: deck.filter((card) => card.rank === "K"),
    deal: [],
  };
}

function gatherState(state: MazeGameState): MazeGameState {
  return {
    grid: Array(CELLS).fill(null),
    removed: [],
    deal: shuffle(flipAllToBack(collectCards(state))),
  };
}

const gameStateInitial = createInitialState();

export const mazeRules = {
  follows,
  canMove,
  sourcesFor,
  hasMove,
  isWon,
  createInitialState,
};

// ========== Component ========== //
export default function Maze() {
  const [selected, setSelected] = useState<number | null>(null);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<MazeGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the deal pile, then deal them back out.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.deal));
    },
    resetNonGameStates: () => setSelected(null),
  });

  const won = isWon(game.grid);
  const lost = !won && game.deal.length === 0 && !hasMove(game.grid);
  const ended = won || lost;
  const busy = ended || isSettingUp;

  function moveCard(source: number, gap: number) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.grid[gap] = draft.grid[source];
      draft.grid[source] = null;
    });
    setSelected(null);
  }

  function onCardPress(index: number) {
    if (busy) return;
    setSelected(selected === index ? null : index);
  }

  function onGapPress(gap: number) {
    if (busy || game.grid[gap] !== null) return;
    if (selected !== null) {
      if (canMove(game.grid, selected, gap)) moveCard(selected, gap);
      return;
    }
    // With nothing picked, a gap takes the one card that fits it.
    const sources = sourcesFor(game.grid, gap);
    if (sources.length === 1) moveCard(sources[0], gap);
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: (COLS - 1) / 2,
        row: (ROWS - 1) / 2,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { hideBackground: true, hideShadow: true },
      },
      ...game.grid.map(
        (card, index): MapZone => ({
          id: `cell-${index}`,
          name: "cell",
          pileIndex: index,
          cards: card ? [card] : [],
          col: index % COLS,
          row: Math.floor(index / COLS),
          placeholder: {},
        }),
      ),
    ],
    [game.deal, game.grid],
  );

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName !== "cell" || card.pileIndex === undefined) return {};
    const index = card.pileIndex;
    return {
      onPress: () => onCardPress(index),
      isDisabled: busy,
      isSelected: selected === index,
      selectColor: "blue",
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "cell" || zone.pileIndex === undefined) return {};
    const gap = zone.pileIndex;
    const isTarget = selected !== null && canMove(game.grid, selected, gap);
    return {
      onPress: () => onGapPress(gap),
      isDisabled: busy || game.grid[gap] !== null,
      selectColor: isTarget ? "green" : "none",
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: COLS,
    fixedRows: 6.2,
    gap: 0.08,
    paddingTop: 0.1,
    paddingBottom: 0.1,
    paddingLeft: 0.1,
    paddingRight: 0.1,
  });

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      hideScore
      canUndo={canUndo}
      undo={() => {
        setSelected(null);
        undo();
      }}
      winLoseMessage={
        won ? i18n.t("games:maze.mazeIsInOrder") : i18n.t("cards:noMovesRemain")
      }
      showDeviceRotateHint="landscape"
    >
      {cardMap}
    </GameWrapper>
  );
}
