import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  CardSuit,
  RANK_VALUE,
  SUITS,
  collectCards,
  createDeck,
  flipAllToBack,
  redealWith,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { delay } from "@/utils/utils";
import { GameWrapper } from "../common/GameWrapper";
import { useHint } from "@/hints/hint-store";
import { findClassicHint } from "@/hints/classic";

// ─── Constants ────────────────────────────────────────────────────────────────
const TABLEAU_FAN_OFFSET = 0.35;
const cardSize = "tableau";
const zoneBackgroundColor = "rgba(123, 140, 160, 0.4)";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameState = {
  foundations: Record<CardSuit, PlayingCard[]>;
  beakRank: PlayingCard["rank"];
  tableau: PlayingCard[][];
  reserves: (PlayingCard | null)[];
  ended: boolean;
  won: boolean;
  /** Every card, face down, while the game is being gathered and dealt. */
  deal: PlayingCard[];
};

export type PenguinGameState = GameState;

type Selection =
  | {
      zone: "tableau";
      pileIndex: number;
      cardIndex: number;
    }
  | {
      zone: "reserve";
      slotIndex: number;
    }
  | null;

type MoveSource = Exclude<Selection, null>;

type DropTarget =
  | { zone: "tableau"; pileIndex: number }
  | { zone: "reserve"; slotIndex: number }
  | { zone: "foundation"; suit: CardSuit };

// ─── Pure game logic ──────────────────────────────────────────────────────────

function rankVal(rank: PlayingCard["rank"]): number {
  return RANK_VALUE[rank as keyof typeof RANK_VALUE];
}

/** Rank one step lower with wrapping (A→K, 2→A, etc.) */
function prevRankVal(rank: PlayingCard["rank"]): number {
  const v = rankVal(rank);
  return v === 1 ? 13 : v - 1;
}

/** Rank one step higher with wrapping (K→A, Q→K, etc.) */
function nextRankVal(rank: PlayingCard["rank"]): number {
  const v = rankVal(rank);
  return v === 13 ? 1 : v + 1;
}

/**
 * A card can go on a foundation pile if it is the same suit and the next
 * rank above the top card (wrapping K→A).
 */
function canPlaceOnFoundation(card: PlayingCard, pile: PlayingCard[]): boolean {
  const top = pile[pile.length - 1] ?? null;
  if (!top) return false;
  return card.suit === top.suit && rankVal(card.rank) === nextRankVal(top.rank);
}

function canStartFoundation(
  card: PlayingCard,
  pile: PlayingCard[],
  beakRank: PlayingCard["rank"],
): boolean {
  if (pile.length > 0) {
    return canPlaceOnFoundation(card, pile);
  }
  return rankVal(card.rank) === rankVal(beakRank);
}

/**
 * A card (or run bottom) can land on a tableau column if:
 *  - Empty column: card rank must equal prevRankVal(beakRank)
 *  - Non-empty: same suit and one rank lower (wrapping).
 */
function canPlaceOnTableau(
  card: PlayingCard,
  targetTop: PlayingCard | null,
  beakRank: PlayingCard["rank"],
): boolean {
  if (!targetTop) {
    return rankVal(card.rank) === prevRankVal(beakRank);
  }
  return (
    card.suit === targetTop.suit &&
    rankVal(card.rank) === prevRankVal(targetTop.rank)
  );
}

/** Returns true iff cards form a valid same-suit descending (wrapping) run. */
function isValidRun(cards: PlayingCard[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i += 1) {
    const a = cards[i];
    const b = cards[i + 1];
    if (a.suit !== b.suit) return false;
    if (rankVal(a.rank) !== nextRankVal(b.rank)) return false;
  }
  return true;
}

function hasAnyLegalMove(state: GameState): boolean {
  const hasEmptyReserve = state.reserves.some((slot) => slot === null);

  for (let i = 0; i < state.tableau.length; i += 1) {
    const col = state.tableau[i];
    if (col.length === 0) continue;

    for (let ci = 0; ci < col.length; ci += 1) {
      const run = col.slice(ci);
      if (!isValidRun(run)) continue;

      // Can the run move to another column?
      for (let j = 0; j < state.tableau.length; j += 1) {
        if (i === j) continue;
        const targetTop = state.tableau[j][state.tableau[j].length - 1] ?? null;
        if (canPlaceOnTableau(run[0], targetTop, state.beakRank)) return true;
      }

      // Can the bottom card go to foundation? (only single cards)
      if (run.length === 1) {
        if (
          canStartFoundation(
            run[0],
            state.foundations[run[0].suit],
            state.beakRank,
          )
        ) {
          return true;
        }
        if (hasEmptyReserve) {
          return true;
        }
      }
    }
  }

  for (let i = 0; i < state.reserves.length; i += 1) {
    const card = state.reserves[i];
    if (!card) continue;

    if (
      canStartFoundation(card, state.foundations[card.suit], state.beakRank)
    ) {
      return true;
    }

    for (let j = 0; j < state.tableau.length; j += 1) {
      const targetTop = state.tableau[j][state.tableau[j].length - 1] ?? null;
      if (canPlaceOnTableau(card, targetTop, state.beakRank)) {
        return true;
      }
    }

    if (hasEmptyReserve) {
      for (let j = 0; j < state.reserves.length; j += 1) {
        if (i !== j && state.reserves[j] === null) {
          return true;
        }
      }
    }
  }

  return false;
}

function countFoundations(
  foundations: Record<CardSuit, PlayingCard[]>,
): number {
  return SUITS.reduce((sum, s) => sum + foundations[s as CardSuit].length, 0);
}

function evaluate(state: GameState): GameState {
  if (countFoundations(state.foundations) === 52) {
    return { ...state, ended: true, won: true };
  }
  if (!hasAnyLegalMove(state)) {
    return { ...state, ended: true, won: false };
  }
  return state;
}

function createInitialState(): GameState {
  const cards = shuffle(createDeck({ faceUp: true }));
  const beak = cards[0];
  if (!beak) {
    return {
      foundations: { clubs: [], diamonds: [], hearts: [], spades: [] },
      beakRank: "A",
      tableau: Array.from({ length: 7 }, () => []),
      reserves: Array.from({ length: 7 }, () => null),
      ended: true,
      won: false,
      deal: [],
    };
  }

  const foundations: Record<CardSuit, PlayingCard[]> = {
    clubs: [],
    diamonds: [],
    hearts: [],
    spades: [],
  };
  const remaining: PlayingCard[] = [];
  let foundationsSeeded = 0;

  for (const card of cards) {
    if (
      card.rank === beak.rank &&
      foundations[card.suit].length === 0 &&
      foundationsSeeded < 3
    ) {
      foundations[card.suit].push(card);
      foundationsSeeded += 1;
    } else {
      remaining.push(card);
    }
  }

  const tableau: PlayingCard[][] = Array.from({ length: 7 }, () => []);
  remaining.forEach((card, i) => tableau[i % 7].push(card));

  return {
    foundations,
    beakRank: beak.rank,
    tableau,
    reserves: Array.from({ length: 7 }, () => null),
    ended: false,
    won: false,
    deal: [],
  };
}

/** The board with every card gathered face down into the deal pile. */
function gatherState(state: GameState): GameState {
  return {
    foundations: { clubs: [], diamonds: [], hearts: [], spades: [] },
    beakRank: state.beakRank,
    tableau: Array.from({ length: 7 }, () => []),
    reserves: Array.from({ length: 7 }, () => null),
    ended: false,
    won: false,
    deal: shuffle(flipAllToBack(collectCards(state))),
  };
}

/**
 * Every card is on view: the hint searches for a win. Runs of a suit move
 * together; the seven flipper cells hold one card each.
 */
function findPenguinHint(state: GameState) {
  const suits = SUITS as readonly CardSuit[];
  return findClassicHint(
    {
      tableau: state.tableau,
      foundations: suits.map((suit) => state.foundations[suit]),
      cells: state.reserves,
    },
    {
      toFoundation: (card, pile, index) =>
        card.suit === suits[index] &&
        canStartFoundation(card, pile, state.beakRank),
      toTableau: (cards, pile) =>
        canPlaceOnTableau(cards[0], pile.at(-1) ?? null, state.beakRank),
      canLift: (pile, index) => isValidRun(pile.slice(index)),
      buildQuality: (card, base) =>
        canPlaceOnTableau(card, base, state.beakRank) ? 2 : 0,
      pilesDiffer: false,
    },
    {
      tableau: (pile) => `tableau-${pile}`,
      foundation: (pile) => `foundation-${suits[pile]}`,
      cell: (cell) => `reserve-${cell}`,
    },
    { search: "penguin" },
  );
}

export const penguinRules = {
  findHint: findPenguinHint,
  prevRankVal,
  nextRankVal,
  canPlaceOnFoundation,
  canStartFoundation,
  canPlaceOnTableau,
  isValidRun,
  hasAnyLegalMove,
  countFoundations,
  evaluate,
  createInitialState,
};

// Starts with every card in the deal pile, to be dealt out from there.
const gameStateInitial = gatherState(createInitialState());

// ─── Component ────────────────────────────────────────────────────────────────

export default function Penguin() {
  const [selected, setSelected] = useState<Selection>(null);

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
    resetNonGameStates: () => {
      setSelected(null);
      clearDragGhost();
    },
    resetAndSetup: async () => {
      // Gather every card into the deal pile, then deal them back out.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.deal));
    },
  });

  useHint(() => findPenguinHint(game), {
    game,
    enabled: !isSettingUp && !game.ended && !game.deal?.length,
  });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);
  const {
    hoverTarget,
    dragGhost,
    draggedCardIds,
    justDroppedCardIds,
    dragTranslate,
    boardRef,
    boardPageOffset,
    clearDragGhost,
    startDrag,
    updateBoardOffset,
    makeDragHandlers,
  } = useDragDrop<MoveSource, DropTarget>({
    canDropOnTarget,
    onSuccessfulDrop: (source, target) => {
      applyMove(source, target);
    },
    getDroppedCardIds: (source) =>
      getRunFromSource(source, game).map((card) => card.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler,
  });

  // ── CardMap zones ───────────────────────────────────────────────────────────

  const zones: MapZone[] = useMemo(() => {
    const reserveZones: MapZone[] = game.reserves.map((card, i) => ({
      id: `reserve-${i}`,
      name: "reserve",
      pileIndex: i,
      cards: card ? [card] : [],
      col: i,
      row: 1.2,
      baseZIndex: 50,
      placeholder: {
        iconName: "free-cell",
        backgroundColor: zoneBackgroundColor,
      },
    }));

    const foundationZones: MapZone[] = (SUITS as readonly CardSuit[]).map(
      (suit, i) => ({
        id: `foundation-${suit}`,
        name: "foundation",
        pileIndex: i,
        cards: game.foundations[suit],
        col: i,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 1 },
        placeholder: { backgroundColor: zoneBackgroundColor },
      }),
    );

    const tableauZones: MapZone[] = game.tableau.map((pile, i) => ({
      id: `tableau-${i}`,
      name: "tableau",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 2.4,
      baseZIndex: 10 + i,
      fan: {
        direction: "down" as const,
        offset: TABLEAU_FAN_OFFSET,
        center: false,
      },
      placeholder: {
        showCount: false,
        backgroundColor: zoneBackgroundColor,
      },
    }));

    return [
      ...reserveZones,
      ...foundationZones,
      ...tableauZones,
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: 3,
        row: 2.4,
        baseZIndex: 60,
        fan: { maxVisible: 3 },
      },
    ];
  }, [game]);

  // ── CardMap callbacks ───────────────────────────────────────────────────────

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    if (
      mappedCard.zoneName === "reserve" &&
      mappedCard.pileIndex !== undefined
    ) {
      const slotIndex = mappedCard.pileIndex;
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "reserve" &&
        hoverTarget.slotIndex === slotIndex;

      return {
        selectColor: isHoverTargetTop
          ? "green"
          : selected?.zone === "reserve" && selected.slotIndex === slotIndex
            ? "blue"
            : "none",
        isSelected:
          (selected?.zone === "reserve" && selected.slotIndex === slotIndex) ||
          isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      const suit = SUITS[mappedCard.pileIndex] as CardSuit;
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.suit === suit;

      return {
        selectColor: "green",
        isSelected: isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
        clickThroughCards: true,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const pileIndex = mappedCard.pileIndex;
      const cardIndex = mappedCard.cardIndex;
      const isInSelectedRun =
        selected?.zone === "tableau" &&
        selected.pileIndex === pileIndex &&
        cardIndex >= selected.cardIndex;
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === pileIndex;

      return {
        selectColor: isHoverTargetTop
          ? "green"
          : isInSelectedRun
            ? "blue"
            : "none",
        isSelected: isInSelectedRun || isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "reserve" && zone.pileIndex !== undefined) {
      const slotIndex = zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "reserve" &&
        hoverTarget.slotIndex === slotIndex;

      return {
        onPress: () => onReserveTap(slotIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected:
          (selected?.zone === "reserve" && selected.slotIndex === slotIndex) ||
          (isHoverDropTarget && game.reserves[slotIndex] === null),
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      const suit = SUITS[zone.pileIndex] as CardSuit;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.suit === suit;
      return {
        onPress: () => onFoundationTap(suit),
        isDisabled: !!dragGhost || !selected,
        isSelected: isHoverDropTarget,
        selectColor: "green",
      };
    }

    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === pileIndex;
      return {
        onPress: () => onEmptyTableauTap(pileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected:
          (selected?.zone === "tableau" &&
            selected.pileIndex === pileIndex &&
            selected.cardIndex === 0 &&
            game.tableau[pileIndex].length === 0) ||
          (isHoverDropTarget && game.tableau[pileIndex].length === 0),
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    return undefined;
  };

  // ── useCardMap ──────────────────────────────────────────────────────────────

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize,
    fixedRows: 7,
  });

  // ── Hit areas ───────────────────────────────────────────────────────────────

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      if (zone.name === "reserve" && zone.pileIndex !== undefined) {
        const card = game.reserves[zone.pileIndex];
        if (!card) return;
        const zoneRect = getZoneBasePos(zone);
        areas.push({
          source: { zone: "reserve", slotIndex: zone.pileIndex },
          rect: createRect(zoneRect.x, zoneRect.y, cardWidth, cardHeight),
          priority: 95,
        });
        return;
      }

      if (zone.name !== "tableau" || zone.pileIndex === undefined) return;

      const pile = game.tableau[zone.pileIndex];
      const zoneRect = getZoneBasePos(zone);

      pile.forEach((_, cardIndex) => {
        const run = pile.slice(cardIndex);
        if (!isValidRun(run)) return;
        areas.push({
          source: { zone: "tableau", pileIndex: zone.pileIndex!, cardIndex },
          rect: createRect(
            zoneRect.x,
            zoneRect.y + cardIndex * TABLEAU_FAN_OFFSET * cardHeight,
            cardWidth,
            cardHeight,
          ),
          priority: 10 + cardIndex,
        });
      });
    });

    return areas;
  }, [cardHeight, cardWidth, game, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateBoardOffset();
    });
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);
      const bx = zoneRect.x + boardPageOffset.x;
      const by = zoneRect.y + boardPageOffset.y;

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        const suit = SUITS[zone.pileIndex] as CardSuit;
        areas.push({
          target: { zone: "foundation", suit },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 90,
        });
      }

      if (zone.name === "reserve" && zone.pileIndex !== undefined) {
        areas.push({
          target: { zone: "reserve", slotIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 85,
        });
      }

      if (zone.name === "tableau" && zone.pileIndex !== undefined) {
        const pile = game.tableau[zone.pileIndex];
        const pileHeight =
          cardHeight +
          Math.max(0, pile.length - 1) * TABLEAU_FAN_OFFSET * cardHeight;
        areas.push({
          target: { zone: "tableau", pileIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, pileHeight),
          priority: 50 + pile.length,
        });
      }
    });

    return areas;
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    game,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  // ── Game logic ──────────────────────────────────────────────────────────────

  function getRunFromSource(source: MoveSource, snapshot: GameState) {
    if (source.zone === "tableau") {
      return snapshot.tableau[source.pileIndex].slice(source.cardIndex);
    }
    const reserveCard = snapshot.reserves[source.slotIndex];
    return reserveCard ? [reserveCard] : [];
  }

  function canDropOnTarget(source: MoveSource, target: DropTarget): boolean {
    const run = getRunFromSource(source, game);
    if (run.length === 0) return false;

    if (target.zone === "reserve") {
      if (run.length !== 1) return false;
      if (source.zone === "reserve" && source.slotIndex === target.slotIndex) {
        return false;
      }
      return game.reserves[target.slotIndex] === null;
    }

    if (target.zone === "foundation") {
      if (run.length !== 1) return false;
      return (
        canStartFoundation(
          run[0],
          game.foundations[run[0].suit],
          game.beakRank,
        ) && run[0].suit === target.suit
      );
    }

    if (source.zone === "tableau" && source.pileIndex === target.pileIndex)
      return false;

    const pile = game.tableau[target.pileIndex];
    const targetTop = pile[pile.length - 1] ?? null;
    return canPlaceOnTableau(run[0], targetTop, game.beakRank);
  }

  function applyMove(source: MoveSource, target: DropTarget) {
    saveUndoState(structuredClone(game));

    setGame((prev) => {
      const run = getRunFromSource(source, prev);
      if (run.length === 0) return prev;

      const tableau = prev.tableau.map((c) => [...c]);
      const reserves = [...prev.reserves];
      const foundations: Record<CardSuit, PlayingCard[]> = {
        clubs: [...prev.foundations.clubs],
        diamonds: [...prev.foundations.diamonds],
        hearts: [...prev.foundations.hearts],
        spades: [...prev.foundations.spades],
      };

      if (source.zone === "tableau") {
        tableau[source.pileIndex] = tableau[source.pileIndex].slice(
          0,
          source.cardIndex,
        );
      } else {
        reserves[source.slotIndex] = null;
      }

      if (target.zone === "foundation") {
        foundations[target.suit] = [...foundations[target.suit], run[0]];
      } else if (target.zone === "reserve") {
        reserves[target.slotIndex] = run[0];
      } else {
        tableau[target.pileIndex] = [...tableau[target.pileIndex], ...run];
      }

      return evaluate({ ...prev, foundations, tableau, reserves });
    });
    setSelected(null);
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  function startGhostDrag(source: MoveSource) {
    const run = getRunFromSource(source, game);
    if (run.length === 0) return;

    const zone = zones.find((z) => {
      if (source.zone === "tableau") {
        return z.name === "tableau" && z.pileIndex === source.pileIndex;
      }
      return z.name === "reserve" && z.pileIndex === source.slotIndex;
    });
    if (!zone) return;

    const base = getZoneBasePos(zone);
    const dragYOffset =
      source.zone === "tableau"
        ? source.cardIndex * TABLEAU_FAN_OFFSET * cardHeight
        : 0;
    startDrag(source, run, {
      x: base.x,
      y: base.y + dragYOffset,
    });
  }

  function getSourceRect(source: MoveSource) {
    const zone = zones.find((z) => {
      if (source.zone === "tableau") {
        return z.name === "tableau" && z.pileIndex === source.pileIndex;
      }
      return z.name === "reserve" && z.pileIndex === source.slotIndex;
    });
    if (!zone) return null;

    const base = getZoneBasePos(zone);
    const dragYOffset =
      source.zone === "tableau"
        ? source.cardIndex * TABLEAU_FAN_OFFSET * cardHeight
        : 0;
    return createRect(base.x, base.y + dragYOffset, cardWidth, cardHeight);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  // ── Tap handlers ─────────────────────────────────────────────────────────────

  function onTableauCardTap(pileIndex: number, cardIndex: number) {
    if (dragGhost) return;

    // If tapping the active selection, deselect
    if (
      selected?.zone === "tableau" &&
      selected.pileIndex === pileIndex &&
      selected.cardIndex === cardIndex
    ) {
      setSelected(null);
      return;
    }

    if (!selected) {
      const run = game.tableau[pileIndex].slice(cardIndex);
      if (isValidRun(run)) {
        setSelected({ zone: "tableau", pileIndex, cardIndex });
      }
      return;
    }

    // Try moving selected run to this column
    const target: DropTarget = { zone: "tableau", pileIndex };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
      return;
    }

    // Re-select from the tapped card
    const run = game.tableau[pileIndex].slice(cardIndex);
    if (isValidRun(run)) {
      setSelected({ zone: "tableau", pileIndex, cardIndex });
    } else {
      setSelected(null);
    }
  }

  function onReserveTap(slotIndex: number) {
    if (dragGhost) return;

    if (selected?.zone === "reserve" && selected.slotIndex === slotIndex) {
      setSelected(null);
      return;
    }

    const card = game.reserves[slotIndex];

    if (!selected) {
      if (card) {
        setSelected({ zone: "reserve", slotIndex });
      }
      return;
    }

    const target: DropTarget = { zone: "reserve", slotIndex };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
      return;
    }

    if (card) {
      setSelected({ zone: "reserve", slotIndex });
    } else {
      setSelected(null);
    }
  }

  function onEmptyTableauTap(pileIndex: number) {
    if (!selected || dragGhost) return;
    const target: DropTarget = { zone: "tableau", pileIndex };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
    } else {
      setSelected(null);
    }
  }

  function onFoundationTap(suit: CardSuit) {
    if (!selected || dragGhost) return;
    const target: DropTarget = { zone: "foundation", suit };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
    } else {
      setSelected(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function getTapHandler(source: MoveSource) {
    return () =>
      source.zone === "tableau"
        ? onTableauCardTap(source.pileIndex, source.cardIndex)
        : onReserveTap(source.slotIndex);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const { source, rect } = hit;

        return (
          <DragHandle
            key={
              source.zone === "tableau"
                ? `t-${source.pileIndex}-${source.cardIndex}`
                : `r-${source.slotIndex}`
            }
            collapsable={false}
            style={[
              {
                position: "absolute",
                backgroundColor: "transparent",
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              },
            ]}
            gesture={makeHandlers(source)}
          />
        );
      }),
    [cardHitAreas],
  );

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <View style={{ flex: 1, width: "100%" }}>
        <View
          ref={boardRef}
          style={{
            flex: 1,
            width: "100%",
            position: "relative",
            touchAction: "none",
            overscrollBehaviorX: "contain",
          }}
        >
          {cardMap}

          <View
            style={[
              pointerEventsStyles.boxNone,
              {
                ...StyleSheet.absoluteFillObject,
                zIndex: 3000,
                touchAction: "none",
                overscrollBehaviorX: "contain",
              },
            ]}
          >
            {interactionTargets}
          </View>

          {dragGhost && (
            <DragGhostCards
              ghost={dragGhost}
              translate={dragTranslate}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              cardSize={cardSize}
              fanOffset={TABLEAU_FAN_OFFSET}
              isValidDrop={hoverTarget !== null}
            />
          )}
        </View>
      </View>
    </GameWrapper>
  );
}
