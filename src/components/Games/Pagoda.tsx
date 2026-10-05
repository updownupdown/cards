import type { GameSettings } from "@/data/game-menu";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  redealWith,
  RANKS,
  shuffle,
  SUITS,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint } from "@/hints/hint";

// Tile-matching with cards (Tile Master, Zen Match): pick uncovered cards into
// the tray; three of a rank are offered at the shrine. One suit of each rank is
// left out, so the 39 cards make exactly 13 sets of three.
const SET_SIZE = 3;
type PagodaDifficulty = GameSettings["pagodaDifficulty"];
const TRAY_SIZES: Record<PagodaDifficulty, number> = {
  easy: 7,
  normal: 6,
  hard: 5,
};
// The tray and shrine sit above the board: nothing is tapped there, so they can
// be far from the thumb. The board clears the shrine's label.
const TRAY_ROW = 0;
const BOARD_ROW = TRAY_ROW + 1.45;
const TRAY_WIDTH = 4;
const GAP = 0.15;
// Higher layers sit a little up and to the left, so the stack reads as 3D.
const LAYER_LIFT = 0.05;
const CLEAR_DELAY = 280;

type Slot = { layer: number; x: number; y: number };

// A 5x5 floor, a 3x3 layer stacked on its middle, four cards straddling
// those, and one card on top: 25 + 9 + 4 + 1 = 39 cards. The outer ring of
// the floor starts uncovered, so there are plenty of choices from the start.
const SLOTS: Slot[] = [
  ...Array.from({ length: 25 }, (_, i) => ({
    layer: 0,
    x: i % 5,
    y: Math.floor(i / 5),
  })),
  ...Array.from({ length: 9 }, (_, i) => ({
    layer: 1,
    x: 1 + (i % 3),
    y: 1 + Math.floor(i / 3),
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    layer: 2,
    x: 1.5 + (i % 2),
    y: 1.5 + Math.floor(i / 2),
  })),
  { layer: 3, x: 2, y: 2 },
];

/** For each slot, the slots above it that overlap it. */
const COVERED_BY: number[][] = SLOTS.map((slot) =>
  SLOTS.flatMap((other, index) =>
    other.layer > slot.layer &&
    Math.abs(other.x - slot.x) < 1 &&
    Math.abs(other.y - slot.y) < 1
      ? [index]
      : [],
  ),
);

export type PagodaGameState = {
  board: (PlayingCard | null)[];
  tray: PlayingCard[];
  shrine: PlayingCard[];
  /** Fixed at the deal, so changing the difficulty waits for the next game. */
  traySize: number;
  /** Cards gathered up between deals. */
  deal: PlayingCard[];
};

// ========== Rules ========== //
function isFree(board: (PlayingCard | null)[], index: number) {
  return (
    board[index] !== null && COVERED_BY[index].every((i) => board[i] === null)
  );
}

/** Uncovered cards are face up; covered ones stay face down. */
function revealFree(board: (PlayingCard | null)[]) {
  board.forEach((card, index) => {
    if (card && !card.faceUp && isFree(board, index)) {
      board[index] = flipToFace(card);
    }
  });
}

/** Tray cards stay grouped by rank: a new card joins the others of its rank. */
function addToTray(tray: PlayingCard[], card: PlayingCard) {
  let insertAt = tray.length;
  for (let i = tray.length - 1; i >= 0; i--) {
    if (tray[i].rank === card.rank) {
      insertAt = i + 1;
      break;
    }
  }
  tray.splice(insertAt, 0, card);
}

function completedRank(tray: PlayingCard[]) {
  return tray.find(
    (card) =>
      tray.filter((other) => other.rank === card.rank).length >= SET_SIZE,
  )?.rank;
}

function takeCard(state: PagodaGameState, index: number) {
  const card = state.board[index];
  if (!card || !isFree(state.board, index) || isOver(state)) return false;
  state.board[index] = null;
  addToTray(state.tray, card);
  revealFree(state.board);
  return true;
}

function clearSet(state: PagodaGameState) {
  const rank = completedRank(state.tray);
  if (rank === undefined) return false;
  state.shrine.push(
    ...flipAllToBack(state.tray.filter((c) => c.rank === rank)),
  );
  state.tray = state.tray.filter((card) => card.rank !== rank);
  return true;
}

/** How far apart tray cards sit, so a full tray spans the tray bed. */
function trayOffset(traySize: number) {
  return (TRAY_WIDTH * (1 + GAP) - GAP - 1) / (traySize - 1);
}

function isWon(state: PagodaGameState) {
  return (
    state.deal.length === 0 &&
    state.tray.length === 0 &&
    state.board.every((card) => card === null)
  );
}

function isLost(state: PagodaGameState) {
  return (
    state.tray.length >= state.traySize &&
    completedRank(state.tray) === undefined
  );
}

function isOver(state: PagodaGameState) {
  return isWon(state) || isLost(state);
}

// ========== Deal ========== //
function createInitialState(traySize: number): PagodaGameState {
  // Leave out one random suit of each rank.
  const omitted = new Set(
    RANKS.map((rank) => `${rank}-${SUITS[Math.floor(Math.random() * 4)]}`),
  );
  const cards = shuffle(
    createDeck().filter((card) => !omitted.has(`${card.rank}-${card.suit}`)),
  );
  const board: (PlayingCard | null)[] = cards.slice(0, SLOTS.length);
  revealFree(board);
  return { board, tray: [], shrine: [], traySize, deal: [] };
}

function gatherState(state: PagodaGameState): PagodaGameState {
  return {
    board: SLOTS.map(() => null),
    tray: [],
    shrine: [],
    traySize: state.traySize,
    deal: shuffle(flipAllToBack(collectCards(state))),
  };
}

const gameStateInitial = createInitialState(TRAY_SIZES.normal);

/**
 * Finish a set already in the tray; else take a card whose set can be
 * finished from the cards on view, while the tray has room for it; else
 * the card that uncovers the most. Hidden cards stay hidden.
 */
function findPagodaHint(state: PagodaGameState) {
  const free = state.board.flatMap((card, index) =>
    card?.faceUp && isFree(state.board, index) ? [index] : [],
  );
  const room = state.traySize - state.tray.length;
  let best: { index: number; worth: number } | null = null;
  for (const index of free) {
    const card = state.board[index]!;
    const inTray = state.tray.filter(
      (other) => other.rank === card.rank,
    ).length;
    const onView = free.filter(
      (other) => other !== index && state.board[other]!.rank === card.rank,
    ).length;
    const needed = SET_SIZE - inTray;
    const after = state.board.map((cell, at) => (at === index ? null : cell));
    const uncovers = state.board.filter(
      (cell, at) => cell && !cell.faceUp && isFree(after, at),
    ).length;
    let worth: number;
    if (needed === 1) worth = 1000;
    else if (onView + 1 >= needed && needed <= room) worth = 500 + inTray * 100;
    else if (room > needed) worth = inTray * 100 + uncovers * 30 + 10;
    else worth = uncovers * 5 - 100;
    if (!best || worth > best.worth) best = { index, worth };
  }
  return best
    ? makeHint("tapCard", cardTarget(state.board[best.index]!))
    : null;
}

export const pagodaRules = {
  findHint: findPagodaHint,
  TRAY_SIZES,
  SLOTS,
  COVERED_BY,
  isFree,
  revealFree,
  addToTray,
  completedRank,
  takeCard,
  clearSet,
  trayOffset,
  isWon,
  isLost,
  createInitialState,
};

// ========== Component ========== //
export default function Pagoda() {
  const difficulty = useGameSettingValue("pagodaDifficulty");
  const [busy, setBusy] = useState(false);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<PagodaGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the shrine, then deal them back out.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) =>
        redealWith(createInitialState(TRAY_SIZES[difficulty]), draft.deal),
      );
    },
    resetNonGameStates: () => setBusy(false),
  });

  const won = isWon(game);
  const lost = isLost(game);
  const ended = won || lost;

  useHint(() => findPagodaHint(game), {
    game,
    enabled: !isSettingUp && !ended && !busy && !game.deal?.length,
  });

  async function onCardPress(index: number) {
    if (busy || ended || !isFree(game.board, index)) return;
    saveUndoState(structuredClone(game));
    const card = game.board[index]!;
    const makesSet =
      game.tray.filter((other) => other.rank === card.rank).length ===
      SET_SIZE - 1;

    setGame((draft) => {
      takeCard(draft, index);
    });

    if (!makesSet) return;
    // Let the third card land in the tray before the set flies off.
    setBusy(true);
    await delay(CLEAR_DELAY);
    setGame((draft) => {
      clearSet(draft);
    });
    setBusy(false);
  }

  const zones: MapZone[] = useMemo(() => {
    const slotZones: MapZone[] = SLOTS.map((slot, index) => {
      const card = game.board[index];
      return {
        id: `slot-${index}`,
        name: "slot",
        pileIndex: index,
        cards: card ? [card] : [],
        col: slot.x - slot.layer * LAYER_LIFT,
        row: BOARD_ROW + slot.y - slot.layer * LAYER_LIFT,
        baseZIndex: 10 + slot.layer * 10,
      };
    });

    return [
      ...slotZones,
      {
        id: "trayBed",
        col: 0,
        row: TRAY_ROW,
        width: TRAY_WIDTH,
        baseZIndex: 5,
        placeholder: { showCount: false },
      },
      {
        id: "tray",
        name: "tray",
        cards: game.tray,
        col: 0,
        row: TRAY_ROW,
        width: TRAY_WIDTH,
        baseZIndex: 60,
        fan: {
          direction: "right",
          offset: trayOffset(game.traySize),
          center: false,
        },
      },
      {
        id: "shrine",
        name: "shrine",
        cards: game.shrine,
        col: TRAY_WIDTH,
        row: TRAY_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:pagoda.shrine"),
          infoPos: "below",
          showCount: false,
        },
      },
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: TRAY_WIDTH,
        row: TRAY_ROW,
        baseZIndex: 100,
        fan: { maxVisible: 3 },
        placeholder: { hideBackground: true, hideShadow: true },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;
    if (mappedCard.zoneName !== "slot" || index === undefined) {
      return { isDisabled: true };
    }
    return {
      onPress: () => void onCardPress(index),
      isDisabled: ended || !isFree(game.board, index),
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.id !== "trayBed") return;
    const nearlyFull = game.tray.length >= game.traySize - 2;
    return {
      isDisabled: true,
      selectColor: nearlyFull && !ended ? "red" : "none",
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: GAP,
  });

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo && !busy}
      undo={undo}
      winLoseMessage={i18n.t(
        won ? "games:pagoda.shrineComplete" : "games:pagoda.trayFull",
      )}
    >
      {cardMap}
    </GameWrapper>
  );
}
