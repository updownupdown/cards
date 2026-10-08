import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipAllToFace,
  flipToFace,
  shuffle,
  zoneFanOffset,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Osmosis (Treasure Trove): four foundation rows, one a suit, that take
// their cards in any order; but a card can only join a row once its rank
// is already in the row above, as if it seeped through. The first card
// dealt sets the rank the other three rows must start with.

type GameState = {
  stock: PlayingCard[];
  waste: PlayingCard[];
  /** Four reserve piles of four, played from the top. */
  reserves: PlayingCard[][];
  /** Four rows, in the order they were started. */
  foundations: PlayingCard[][];
  /** Draws since a card was last played: a full pass with none is the end. */
  drawsSincePlay: number;
};

export type OsmosisGameState = GameState;

const RESERVES = 4;
const RESERVE_SIZE = 4;
const DRAW_COUNT = 1;
const BOARD_WIDTH = 7;

// —— Rules ———————————————————————————————————————————————————

/** The rank every foundation row starts with: the first row's first card. */
function baseRank(state: GameState): CardRank | null {
  return state.foundations[0]?.[0]?.rank ?? null;
}

/** The suits with a row, in order. */
function rowSuits(state: GameState) {
  return state.foundations.map((row) => row[0].suit);
}

/** Which row a card may go to, or -1. */
function targetRow(state: GameState, card: PlayingCard) {
  const suits = rowSuits(state);
  const row = suits.indexOf(card.suit);
  if (row === -1) {
    // A new row starts with the base rank, under the others.
    if (state.foundations.length === 0) return 0;
    if (state.foundations.length >= 4) return -1;
    return card.rank === baseRank(state) ? state.foundations.length : -1;
  }
  if (row === 0) return 0;
  const above = state.foundations[row - 1];
  return above.some((other) => other.rank === card.rank) ? row : -1;
}

function canPlay(state: GameState, card: PlayingCard) {
  return targetRow(state, card) !== -1;
}

/** The cards that may be played now: each reserve's top, and the waste's. */
function available(state: GameState) {
  const tops = state.reserves
    .map((pile) => pile[pile.length - 1])
    .filter((card): card is PlayingCard => !!card);
  const waste = state.waste[state.waste.length - 1];
  return waste ? [...tops, waste] : tops;
}

function playable(state: GameState) {
  return available(state).filter((card) => canPlay(state, card));
}

// —— Moves ————————————————————————————————————————————————————

function allCards(state: GameState) {
  return [
    ...state.stock,
    ...state.waste,
    ...state.reserves.flat(),
    ...state.foundations.flat(),
  ];
}

function gather(draft: GameState) {
  draft.stock = flipAllToBack(shuffle(allCards(draft)));
  draft.waste = [];
  draft.reserves = [];
  draft.foundations = [];
  draft.drawsSincePlay = 0;
}

/** Deals four reserves of four, face up, then the first foundation card. */
function deal(draft: GameState) {
  draft.reserves = Array.from({ length: RESERVES }, () =>
    flipAllToFace(draft.stock.splice(0, RESERVE_SIZE)),
  );
  draft.foundations = [[flipToFace(draft.stock.shift()!)]];
}

/** Moves a reserve top or the waste top to its row. */
function playCard(draft: GameState, cardId: string) {
  const card = available(draft).find((other) => other.id === cardId);
  if (!card) return false;
  const row = targetRow(draft, card);
  if (row === -1) return false;
  for (const pile of draft.reserves) {
    if (pile[pile.length - 1]?.id === card.id) pile.pop();
  }
  if (draft.waste[draft.waste.length - 1]?.id === card.id) draft.waste.pop();
  if (row === draft.foundations.length) draft.foundations.push([card]);
  else draft.foundations[row].push(card);
  draft.drawsSincePlay = 0;
  return true;
}

/** Turns three cards to the waste; an empty stock takes the waste back. */
function draw(draft: GameState) {
  if (draft.stock.length === 0) {
    if (draft.waste.length === 0) return;
    draft.stock = flipAllToBack([...draft.waste].reverse());
    draft.waste = [];
  }
  const count = Math.min(DRAW_COUNT, draft.stock.length);
  for (let index = 0; index < count; index += 1) {
    draft.waste.push(flipToFace(draft.stock.pop()!));
  }
  draft.drawsSincePlay += 1;
}

function isWon(state: GameState) {
  return state.foundations.reduce((sum, row) => sum + row.length, 0) === 52;
}

/**
 * Whether anything can still happen: a card to play, or a stock that will
 * show a card not yet seen since the last play.
 */
function hasMoves(state: GameState) {
  if (playable(state).length > 0) return true;
  if (state.stock.length + state.waste.length === 0) return false;
  // Each draw shows new waste cards until a full pass brings the same
  // cards round again; after that, nothing changes.
  const pass =
    Math.ceil((state.stock.length + state.waste.length) / DRAW_COUNT) + 1;
  return state.drawsSincePlay < pass;
}

function isLost(state: GameState) {
  return !isWon(state) && !hasMoves(state);
}

// —— Hints ————————————————————————————————————————————————————

/**
 * Prefers a card that opens a new row, then one from the reserve (it frees
 * the card under it), then the waste's.
 */
function bestCard(state: GameState) {
  const options = playable(state);
  if (options.length === 0) return null;
  const starter = options.find((card) => !rowSuits(state).includes(card.suit));
  if (starter) return starter;
  const waste = state.waste[state.waste.length - 1];
  return options.find((card) => card.id !== waste?.id) ?? options[0];
}

function findOsmosisHint(state: GameState) {
  const card = bestCard(state);
  if (card) return makeHint("toFoundation", cardTarget(card));
  if (state.stock.length + state.waste.length > 0) {
    return makeHint("draw", zoneTarget("stock"));
  }
  return null;
}

export const osmosisRules = {
  DRAW_COUNT,
  baseRank,
  targetRow,
  canPlay,
  available,
  playable,
  gather,
  deal,
  playCard,
  draw,
  isWon,
  hasMoves,
  isLost,
  bestCard,
  findHint: findOsmosisHint,
};

// —— Component ————————————————————————————————————————————————

const gameStateInitial: GameState = {
  stock: createDeck(),
  waste: [],
  reserves: [],
  foundations: [],
  drawsSincePlay: 0,
};

export default function Osmosis() {
  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      setGame(gather);
      await delay();
      setGame(deal);
    },
  });

  const won = !isSettingUp && isWon(game);
  const lost = !isSettingUp && !won && isLost(game);
  const ended = won || lost;
  const canPlayNow = useMemo(
    () => new Set(playable(game).map((card) => card.id)),
    [game],
  );

  useHint(() => findOsmosisHint(game), {
    game,
    enabled: !isSettingUp && !ended,
  });

  function onCardPress(cardId: string) {
    if (ended || !canPlayNow.has(cardId)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      playCard(draft, cardId);
    });
  }

  function onStockPress() {
    if (ended || game.stock.length + game.waste.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame(draw);
  }

  const zones: MapZone[] = useMemo(() => {
    const reserveZones: MapZone[] = game.reserves.map((pile, index) => ({
      id: `reserve-${index}`,
      name: "reserve",
      pileIndex: index,
      cards: pile,
      col: 0,
      row: index * 1.15,
      baseZIndex: 10,
      fan: { direction: "right", offset: 0.3, center: false },
      placeholder: { showCount: false },
    }));
    const foundationZones: MapZone[] = Array.from({ length: 4 }, (_, index) => {
      const row = game.foundations[index] ?? [];
      return {
        id: `foundation-${index}`,
        name: "foundation",
        pileIndex: index,
        cards: row,
        col: 2.15,
        row: index * 1.15,
        width: BOARD_WIDTH - 2.15,
        baseZIndex: 20,
        fan: {
          direction: "right",
          offset: zoneFanOffset(13, BOARD_WIDTH - 2.15, 0.2, 0.42),
          center: false,
        },
        placeholder: { showCount: false },
      };
    });
    return [
      ...reserveZones,
      ...foundationZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 4.75,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 2.15,
        row: 4.75,
        baseZIndex: 30,
        fan: {
          direction: "right",
          offset: cardDims.tableauOffsetHorizontalSuitMin,
          maxVisible: 3,
          shadowVisibleCount: 6,
        },
        placeholder: {
          text: i18n.t("cards:waste"),
          infoPos: "right",
          showCount: false,
        },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const id = mappedCard.card.id;
    if (mappedCard.zoneName === "stock") {
      return {
        onPress: onStockPress,
        clickThroughCards: true,
        isDisabled: ended,
      };
    }
    if (mappedCard.zoneName === "reserve" || mappedCard.zoneName === "waste") {
      if (!mappedCard.topOfZone) return { isDisabled: true };
      return {
        onPress: () => onCardPress(id),
        isDisabled: !canPlayNow.has(id),
      };
    }
    return { isDisabled: true };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "stock") return;
    return {
      onPress: onStockPress,
      isDisabled: ended || game.stock.length + game.waste.length === 0,
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: 0.05,
  });

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      winLoseMessage={lost ? i18n.t("cards:noMovesRemain") : undefined}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
