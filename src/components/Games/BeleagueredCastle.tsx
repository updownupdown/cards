import { useStateManager } from "@/hooks/useStateManager";
import { useAutoComplete } from "@/hooks/useAutoComplete";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { findClassicHint } from "@/hints/classic";
import { countEmptyPiles, maxSupermove } from "../Cards/supermove";
type GameState = {
  columns: PlayingCard[][];
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type BeleagueredCastleGameState = GameState;

export type CastleGameState = GameState;

type CastleBoardProps = {
  columnCount: number;
  createState: () => GameState;
  deal: (state: GameState) => void;
  canStack: (card: PlayingCard, destTop: PlayingCard | undefined) => boolean;
  winMessage: string;
};

const gameStateInitial: GameState = {
  columns: [],
  foundations: Array.from({ length: 4 }, () => []),
  ended: false,
  won: false,
};

function canStackDown(card: PlayingCard, destTop: PlayingCard | undefined) {
  if (!destTop) return true; // empty column takes anything
  return rankValue(card) === rankValue(destTop) - 1;
}

function canPlaceFoundation(
  card: PlayingCard,
  foundationTop: PlayingCard | undefined,
) {
  if (!foundationTop) return card.rank === "A";
  return (
    card.suit === foundationTop.suit &&
    rankValue(card) === rankValue(foundationTop) + 1
  );
}

function createBeleagueredCastleState(): GameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const foundations: PlayingCard[][] = SUITS.map((suit) => {
    const index = deck.findIndex(
      (card) => card.rank === "A" && card.suit === suit,
    );
    const [ace] = deck.splice(index, 1);
    return ace ? [flipToFace(ace)] : [];
  });
  const columns: PlayingCard[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((card, index) => columns[index % 8].push(flipToFace(card)));
  return { columns, foundations, ended: false, won: false };
}

function dealBeleagueredCastle(state: GameState) {
  const cards = state.foundations[0].splice(0);
  state.columns = Array.from({ length: 8 }, () => []);
  state.foundations = Array.from({ length: 4 }, () => []);

  const tableauCards = cards.filter((card) => card.rank !== "A");
  cards.forEach((card) => {
    if (card.rank === "A") {
      state.foundations[SUITS.indexOf(card.suit)].push(flipToFace(card));
    }
  });
  tableauCards.forEach((card, index) => {
    state.columns[index % 8].push(flipToFace(card));
  });
}

function anyLegalMove(state: GameState, canStack = canStackDown) {
  for (let c = 0; c < state.columns.length; c += 1) {
    const card = top(state.columns[c]);
    if (!card) continue;

    if (state.foundations.some((f) => canPlaceFoundation(card, top(f)))) {
      return true;
    }
    for (let d = 0; d < state.columns.length; d += 1) {
      if (d === c) continue;
      const destTop = top(state.columns[d]);
      // Ignore empty-to-empty shuffling as a "move" to avoid false positives.
      if (state.columns[d].length === 0) {
        if (state.columns[c].length > 1) return true;
        continue;
      }
      if (canStack(card, destTop)) return true;
    }
  }
  return false;
}

/**
 * Whether a position offers a move that leaves another move: a deal that
 * doesn't is as good as lost.
 */
function hasTwoMoves(state: GameState, canStack = canStackDown) {
  const after = (
    from: number,
    to: { column?: number; foundation?: number },
  ) => {
    const next: GameState = structuredClone(state);
    const card = next.columns[from].pop()!;
    if (to.column !== undefined) next.columns[to.column].push(card);
    else next.foundations[to.foundation!].push(card);
    return anyLegalMove(next, canStack);
  };
  for (let c = 0; c < state.columns.length; c += 1) {
    const card = top(state.columns[c]);
    if (!card) continue;
    for (let f = 0; f < state.foundations.length; f += 1) {
      if (canPlaceFoundation(card, top(state.foundations[f]))) {
        if (after(c, { foundation: f })) return true;
      }
    }
    for (let d = 0; d < state.columns.length; d += 1) {
      if (d === c) continue;
      const destTop = top(state.columns[d]);
      const legal = destTop
        ? canStack(card, destTop)
        : state.columns[c].length > 1;
      if (legal && after(c, { column: d })) return true;
    }
  }
  return false;
}

/** Deals attempted before settling for one with a single move. */
const MAX_DEAL_ATTEMPTS = 500;

function evaluateEnd(
  state: GameState,
  isSettingUp = false,
  canStack = canStackDown,
) {
  if (isSettingUp) return { ended: false, won: false };

  if (state.foundations.every((f) => f.length === 13)) {
    return { ended: true, won: true };
  }
  if (!anyLegalMove(state, canStack)) return { ended: true, won: false };
  return { ended: false, won: false };
}

type CanStack = (
  card: PlayingCard,
  destTop: PlayingCard | undefined,
) => boolean;

/** Whether each card in `cards` could sit on the one before it. */
function isCastleRun(cards: PlayingCard[], canStack: CanStack) {
  return (
    cards.length > 0 &&
    cards.every(
      (card, index) => index === 0 || canStack(card, cards[index - 1]),
    )
  );
}

/**
 * Cards move one at a time, but a run moves together when the empty rows
 * (other than the destination) could carry it there card by card.
 */
function canMoveRun(
  columns: PlayingCard[][],
  from: number,
  start: number,
  to: number,
  canStack: CanStack,
) {
  if (from === to) return false;
  const cards = columns[from].slice(start);
  return (
    isCastleRun(cards, canStack) &&
    cards.length <=
      maxSupermove({
        freeCells: 0,
        emptyColumns: countEmptyPiles(columns, to),
      }) &&
    canStack(cards[0], top(columns[to]))
  );
}

/** Every card is on view: the hint searches for a win. */
function findCastleHint(
  state: GameState,
  canStack: (card: PlayingCard, destTop: PlayingCard | undefined) => boolean,
) {
  return findClassicHint(
    { tableau: state.columns, foundations: state.foundations },
    {
      toFoundation: (card, pile) => canPlaceFoundation(card, top(pile)),
      toTableau: (cards, pile, pileIndex, board) =>
        isCastleRun(cards, canStack) &&
        cards.length <=
          maxSupermove({
            freeCells: 0,
            emptyColumns: countEmptyPiles(board.tableau, pileIndex),
          }) &&
        canStack(cards[0], top(pile)),
      canLift: (pile, index) => isCastleRun(pile.slice(index), canStack),
      buildQuality: (card, base) => (canStack(card, base) ? 2 : 0),
    },
    {
      tableau: (pile) => `col-${pile}`,
      foundation: (pile) => `foundation-${pile}`,
    },
    { search: `castle:${canStack.name}` },
  );
}

export const beleagueredCastleRules = {
  findHint: findCastleHint,
  canStackDown,
  canPlaceFoundation,
  canMoveRun,
  anyLegalMove,
  hasTwoMoves,
  evaluateEnd,
  createBeleagueredCastleState,
  dealBeleagueredCastle,
};

// ========== Main Component ========== //
export function CastleBoard({
  columnCount,
  createState,
  deal,
  canStack,
  winMessage,
}: CastleBoardProps) {
  // The selected card and every card on it in its row.
  const [selected, setSelected] = useState<
    { col: number; card: number } | undefined
  >(undefined);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager({
    resetAndSetup: async () => {
      const currentCards = [...game.columns.flat(), ...game.foundations.flat()];
      const isInitialDeal = currentCards.length === 0;
      const initialState = isInitialDeal ? createState() : undefined;
      let cards = isInitialDeal
        ? [...initialState!.columns.flat(), ...initialState!.foundations.flat()]
        : shuffle(currentCards);
      // Never a deal that is already lost: shuffle again until the dealt
      // position offers two moves in a row.
      for (let attempt = 0; attempt < MAX_DEAL_ATTEMPTS; attempt += 1) {
        const trial: GameState = {
          columns: Array.from({ length: columnCount }, () => []),
          foundations: [
            [...cards],
            ...Array.from({ length: 3 }, () => [] as PlayingCard[]),
          ],
          ended: false,
          won: false,
        };
        deal(trial);
        if (hasTwoMoves(trial, canStack)) break;
        cards = shuffle(cards);
      }

      setGame((draft) => {
        draft.columns = Array.from({ length: columnCount }, () => []);
        draft.foundations = [
          flipAllToBack(cards),
          ...Array.from({ length: 3 }, () => [] as PlayingCard[]),
        ];
        draft.ended = false;
        draft.won = false;
      });
      await delay();
      setGame((draft) => deal(draft));
    },
    gameStateInitial,
    resetNonGameStates: () => setSelected(undefined),
  });

  const { isAutoCompleting } = useAutoComplete({
    game,
    setGame,
    isSettingUp,
    won: game.won,
    isBlocked: game.ended,
    getSources: (state) => state.columns,
    getFoundations: (state) => state.foundations,
    canPlaceOnFoundation: canPlaceFoundation,
    onStart: () => setSelected(undefined),
  });

  useHint(() => findCastleHint(game, canStack), {
    game,
    enabled: !isSettingUp && !game.ended && !isAutoCompleting,
  });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, isSettingUp, canStack);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [canStack, game, isSettingUp, setGame]);

  function moveToColumn(from: number, start: number, to: number) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.columns[to].push(...draft.columns[from].splice(start));
    });
    setSelected(undefined);
  }

  function moveToFoundation(from: number, f: number) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.columns[from].pop();
      if (card) draft.foundations[f].push(card);
    });
    setSelected(undefined);
  }

  /** Selects from a card, if it heads a run that could move; else the top card. */
  function selectFrom(col: number, card: number) {
    const pile = game.columns[col];
    if (pile.length === 0) return setSelected(undefined);
    setSelected({
      col,
      card: isCastleRun(pile.slice(card), canStack) ? card : pile.length - 1,
    });
  }

  function onColumnPress(index: number, cardIndex?: number) {
    if (game.ended) return;
    const pile = game.columns[index];
    const card = cardIndex ?? pile.length - 1;

    const now = Date.now();
    const tapKey = `col-${index}-${card}`;
    if (
      card === pile.length - 1 &&
      lastTap?.key === tapKey &&
      now - lastTap.at < DOUBLE_TAP_MS
    ) {
      setLastTap(null);
      const topCard = top(pile);
      const foundationIndex = game.foundations.findIndex((foundation) =>
        topCard ? canPlaceFoundation(topCard, top(foundation)) : false,
      );
      if (foundationIndex >= 0) moveToFoundation(index, foundationIndex);
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (selected === undefined) return selectFrom(index, card);
    if (selected.col === index) {
      if (selected.card === card) setSelected(undefined);
      else selectFrom(index, card);
      return;
    }

    if (
      canMoveRun(game.columns, selected.col, selected.card, index, canStack)
    ) {
      moveToColumn(selected.col, selected.card, index);
    } else {
      selectFrom(index, card);
    }
  }

  function onFoundationPress(f: number) {
    if (game.ended || !selectedCard) return;
    if (canPlaceFoundation(selectedCard, top(game.foundations[f]))) {
      moveToFoundation(selected!.col, f);
    }
  }

  // Only a single card goes to a foundation.
  const selectedCard =
    selected && selected.card === game.columns[selected.col].length - 1
      ? top(game.columns[selected.col])
      : undefined;

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: 3,
      row: i,
      baseZIndex: 40,
      fan: { maxVisible: 3 },
      placeholder: { iconName: "ace" },
    }));

    const colWidth = 3;

    const columnZones: MapZone[] = game.columns.map((pile, i) => ({
      id: `col-${i}`,
      name: "col",
      pileIndex: i,
      cards: pile,
      col: i < columnCount / 2 ? 0 : 4,
      row: i % (columnCount / 2),
      width: colWidth,
      baseZIndex: 10 + i,
      fan: {
        direction: "right",
        offset:
          pile.length > 1
            ? Math.min(
                cardDims.tableauOffsetHorizontal,
                (colWidth - 1) / (pile.length - 2),
              )
            : 0,
        center: false,
      },
      placeholder: {},
    }));

    return [...foundationZones, ...columnZones];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone && mappedCard.zoneName !== "col") return {};

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      const canDrop =
        !!selectedCard &&
        canPlaceFoundation(
          selectedCard,
          top(game.foundations[mappedCard.pileIndex]),
        );
      return {
        isDisabled: game.ended || selected === undefined,
        selectColor: canDrop ? "green" : "none",
        onPress: () => onFoundationPress(mappedCard.pileIndex!),
      };
    }

    if (mappedCard.zoneName === "col" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      const isSelected =
        selected?.col === index && mappedCard.cardIndex >= selected.card;
      const canDrop =
        mappedCard.topOfZone &&
        !!selected &&
        canMoveRun(game.columns, selected.col, selected.card, index, canStack);
      return {
        isSelected,
        selectColor: canDrop ? "green" : "blue",
        isDisabled: game.ended,
        onPress: () => onColumnPress(index, mappedCard.cardIndex),
      };
    }

    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "col" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      const isEmpty = game.columns[index].length === 0;
      return {
        onPress: () => onColumnPress(index),
        isDisabled: game.ended || selected === undefined || !isEmpty,
        // selectColor: "green",
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    gap: 0.14,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.won ? winMessage : i18n.t("cards:noMovesRemain")}
      canUndo={canUndo}
      undo={undo}
      autoCompleting={isAutoCompleting}
    >
      {cardMap}
    </GameWrapper>
  );
}

export default function BeleagueredCastle() {
  return (
    <CastleBoard
      columnCount={8}
      createState={createBeleagueredCastleState}
      deal={dealBeleagueredCastle}
      canStack={canStackDown}
      winMessage={i18n.t("games:beleagueredCastle.theCastleFalls")}
    />
  );
}
