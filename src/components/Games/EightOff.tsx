import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useStateManager } from "@/hooks/useStateManager";
import {
  applyAutoCompleteMoveWithCells,
  getAutoCompleteSourcesWithCells,
  useAutoComplete,
} from "@/hooks/useAutoComplete";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  collectCards,
  flipAllToBack,
  PlayingCard,
  RANK_VALUE,
  RANKS,
  redealWith,
  shuffle,
  SUITS,
  zoneFanOffset,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useHint } from "@/hints/hint-store";
import {
  findClassicHint,
  type ClassicBoard,
  type ClassicRules,
} from "@/hints/classic";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameState = {
  cascades: PlayingCard[][];
  freeCells: (PlayingCard | null)[];
  foundations: PlayingCard[][];
  /** Every card, face down, while the game is being gathered and dealt. */
  deal?: PlayingCard[];
};

export type EightOffGameState = GameState;
export type ReserveCellGameState = GameState;

type ReserveCellBoardProps = {
  columnCount: number;
  createState: () => GameState;
  canPlaceOnCascade?: (
    card: PlayingCard,
    destinationTop?: PlayingCard,
  ) => boolean;
  foundationStartColumn?: number;
  foundationRow?: number;
  freeCellRow?: number;
  freeCellStartColumn?: number;
  cascadeRow?: number;
  fixedRows?: number;
  /** Only one card moves at a time (no runs), as in King Albert. */
  singleCardMoves?: boolean;
  /** False for a reserve: its cards play out, but nothing goes back in. */
  cellsAcceptCards?: boolean;
};

type MoveSource =
  | { zone: "cascade"; pileIndex: number; startIndex: number }
  | { zone: "free"; slotIndex: number };

/** A card (or run) picked by tapping, to be tapped where it should go. */
type Selection = MoveSource | null;

type DropTarget =
  | { zone: "cascade"; pileIndex: number }
  | { zone: "free"; slotIndex: number }
  | { zone: "foundation"; pileIndex: number };

// ─── Pure game logic ──────────────────────────────────────────────────────────

function canPlaceOnCascade(
  card: PlayingCard,
  destinationTop?: PlayingCard,
): boolean {
  if (!destinationTop) return card.rank === "K"; // only Kings fill empty columns
  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destinationTop.rank]
  );
}

function canPlaceOnFoundation(
  card: PlayingCard,
  destinationTop?: PlayingCard,
): boolean {
  if (!destinationTop) return card.rank === "A";
  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[card.rank] === RANK_VALUE[destinationTop.rank] + 1
  );
}

function createEightOffState(): GameState {
  const deck = shuffle(
    SUITS.flatMap((suit) =>
      RANKS.map((rank) => ({
        id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
        suit,
        rank,
        faceUp: true,
      })),
    ),
  );

  const cascades: PlayingCard[][] = Array.from({ length: 8 }, () => []);
  // 48 cards into eight columns of six; the last four seed four free cells.
  for (let i = 0; i < 48; i += 1) cascades[i % 8].push(deck[i]);

  const freeCells: (PlayingCard | null)[] = Array.from(
    { length: 8 },
    () => null,
  );
  for (let i = 0; i < 4; i += 1) freeCells[i] = deck[48 + i];

  return {
    cascades,
    freeCells,
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
  };
}

/** The board with every card gathered face down into the deal pile. */
function gatherState(state: GameState): GameState {
  return {
    cascades: state.cascades.map(() => []),
    freeCells: state.freeCells.map(() => null),
    foundations: state.foundations.map(() => []),
    deal: shuffle(flipAllToBack(collectCards(state))),
  };
}

function isDescendingSameSuitStack(cards: PlayingCard[]): boolean {
  return cards.every((card, index) => {
    if (index === 0) return true;
    const previous = cards[index - 1];
    return (
      card.suit === previous.suit &&
      RANK_VALUE[card.rank] + 1 === RANK_VALUE[previous.rank]
    );
  });
}

function getAutoCompleteSources(state: GameState): PlayingCard[][] {
  return getAutoCompleteSourcesWithCells(state.cascades, state.freeCells);
}

function applyAutoCompleteMove(
  state: GameState,
  move: Parameters<typeof applyAutoCompleteMoveWithCells>[3],
) {
  applyAutoCompleteMoveWithCells(
    state.cascades,
    state.freeCells,
    state.foundations,
    move,
  );
}

// ─── Hints ────────────────────────────────────────────────────────────────────

type ReserveCellHintOptions = {
  canPlaceOnCascade?: (
    card: PlayingCard,
    destinationTop?: PlayingCard,
  ) => boolean;
  singleCardMoves?: boolean;
  cellsAcceptCards?: boolean;
};

/**
 * Every card is on view, so the hint searches ahead for a winning line. A
 * reserve that takes no cards back (King Albert) plays like waste piles.
 */
function findReserveCellHint(
  state: GameState,
  {
    canPlaceOnCascade: canPlaceOnCascadeRule = canPlaceOnCascade,
    singleCardMoves = false,
    cellsAcceptCards = true,
  }: ReserveCellHintOptions = {},
) {
  const board: ClassicBoard = {
    tableau: state.cascades,
    foundations: state.foundations,
    ...(cellsAcceptCards
      ? { cells: state.freeCells }
      : { reserves: state.freeCells.map((card) => (card ? [card] : [])) }),
  };
  const maxRun = (current: ClassicBoard, target: number) =>
    singleCardMoves
      ? 1
      : ((current.cells ?? []).filter((card) => card === null).length + 1) *
        2 **
          current.tableau.filter(
            (pile, index) => pile.length === 0 && index !== target,
          ).length;
  const rules: ClassicRules = {
    toFoundation: (card, pile) =>
      canPlaceOnFoundation(card, pile[pile.length - 1]),
    toTableau: (cards, pile, pileIndex, current) =>
      cards.length <= maxRun(current, pileIndex) &&
      canPlaceOnCascadeRule(cards[0], pile[pile.length - 1]),
    canLift: (pile, index) => {
      const cards = pile.slice(index);
      return singleCardMoves
        ? cards.length === 1
        : cards.every(
            (card, cardIndex) =>
              cardIndex === 0 ||
              canPlaceOnCascadeRule(card, cards[cardIndex - 1]),
          );
    },
  };
  return findClassicHint(
    board,
    rules,
    {
      tableau: (pile) => `cascade-${pile}`,
      foundation: (pile) => `foundation-${pile}`,
      cell: (cell) => `free-${cell}`,
    },
    { search: "reserve-cell" },
  );
}

export const eightOffRules = {
  findHint: findReserveCellHint,
  applyAutoCompleteMove,
  canPlaceOnCascade,
  canPlaceOnFoundation,
  createInitialState: createEightOffState,
  getAutoCompleteSources,
  isDescendingSameSuitStack,
};

const KING_PROBE: PlayingCard = {
  id: "probe-king",
  suit: "spades",
  rank: "K",
  faceUp: true,
};
const QUEEN_PROBE: PlayingCard = {
  ...KING_PROBE,
  id: "probe-queen",
  rank: "Q",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReserveCellBoard({
  columnCount,
  createState,
  canPlaceOnCascade: canPlaceOnCascadeRule = canPlaceOnCascade,
  foundationStartColumn = (columnCount - 4) / 2,
  foundationRow = 0,
  freeCellRow = 1.2,
  freeCellStartColumn = 0,
  cascadeRow = 2.4,
  fixedRows = 7,
  singleCardMoves = false,
  cellsAcceptCards = true,
}: ReserveCellBoardProps) {
  const [selected, setSelected] = useState<Selection>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );
  const clearDragGhostRef = useRef<(() => void) | null>(null);
  // Starts with every card in the deal pile, to be dealt out from there.
  const gameStateInitial = useMemo(
    () => gatherState(createState()),
    [createState],
  );

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
      setLastTap(null);
      clearDragGhostRef.current?.();
    },
    resetAndSetup: async () => {
      // Gather every card into the deal pile, then deal them back out.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => ({
        ...redealWith(createState(), draft.deal ?? []),
        deal: [],
      }));
    },
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
    getDroppedCardIds: (source) => {
      return getDraggedCards(source, game).map((card) => card.id);
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler,
  });

  clearDragGhostRef.current = clearDragGhost;

  const { isAutoCompleting } = useAutoComplete({
    game,
    setGame,
    isSettingUp,
    won: game.foundations.every((pile) => pile.length === 13),
    isBlocked: !!dragGhost,
    getSources: getAutoCompleteSources,
    getFoundations: (state) => state.foundations,
    canPlaceOnFoundation,
    applyMove: applyAutoCompleteMove,
    onStart: () => setSelected(null),
  });

  // ── Derived ─────────────────────────────────────────────────────────────────

  const won = useMemo(
    () => game.foundations.every((pile) => pile.length === 13),
    [game.foundations],
  );

  useHint(
    () =>
      findReserveCellHint(game, {
        canPlaceOnCascade: canPlaceOnCascadeRule,
        singleCardMoves,
        cellsAcceptCards,
      }),
    { game, enabled: !isSettingUp && !won && !game.deal?.length },
  );
  const cascadeHeight = fixedRows - cascadeRow;
  // Empty columns show a King when nothing else may start one.
  const kingsOnlyInEmptyColumns =
    canPlaceOnCascadeRule(KING_PROBE) && !canPlaceOnCascadeRule(QUEEN_PROBE);

  // ── CardMap zones ───────────────────────────────────────────────────────────

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: foundationStartColumn + i,
      row: foundationRow,
      baseZIndex: 100,
      fan: { maxVisible: 1 },
      placeholder: {
        iconName: "ace",
      },
    }));

    const freeCellZones: MapZone[] = game.freeCells.map((card, i) => ({
      id: `free-${i}`,
      name: "free",
      pileIndex: i,
      cards: card ? [card] : [],
      col: freeCellStartColumn + i,
      row: freeCellRow,
      baseZIndex: 50,
      placeholder: cellsAcceptCards ? { iconName: "free-cell" } : {},
    }));

    const cascadeZones: MapZone[] = game.cascades.map((pile, i) => ({
      id: `cascade-${i}`,
      name: "cascade",
      pileIndex: i,
      cards: pile,
      col: i,
      row: cascadeRow,
      baseZIndex: 10 + i,
      fan: {
        direction: "down" as const,
        offset: zoneFanOffset(
          pile.length,
          cascadeHeight,
          0.1,
          cardDims.tableauOffset,
        ),
        center: false,
      },
      placeholder: kingsOnlyInEmptyColumns ? { iconName: "king" } : {},
    }));

    return [
      ...freeCellZones,
      ...foundationZones,
      ...cascadeZones,
      {
        id: "deal",
        name: "deal",
        cards: game.deal ?? [],
        col: (columnCount - 1) / 2,
        row: cascadeRow,
        baseZIndex: 60,
        fan: { maxVisible: 3 },
      },
    ];
  }, [
    cascadeHeight,
    cascadeRow,
    cellsAcceptCards,
    foundationRow,
    foundationStartColumn,
    freeCellRow,
    freeCellStartColumn,
    game,
    kingsOnlyInEmptyColumns,
  ]);

  // ── CardMap callbacks ───────────────────────────────────────────────────────

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    if (mappedCard.zoneName === "free" && mappedCard.pileIndex !== undefined) {
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "free" &&
        hoverTarget.slotIndex === mappedCard.pileIndex;

      return {
        selectColor: isHoverTargetTop ? "green" : "blue",
        isSelected:
          (selected?.zone === "free" &&
            selected.slotIndex === mappedCard.pileIndex) ||
          isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === mappedCard.pileIndex;

      return {
        selectColor: "green",
        isSelected: isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
        // Foundation cards are locked: taps go through to the zone, which
        // places the selected card.
        clickThroughCards: true,
      };
    }

    if (
      mappedCard.zoneName === "cascade" &&
      mappedCard.pileIndex !== undefined
    ) {
      const pileIndex = mappedCard.pileIndex;
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "cascade" &&
        hoverTarget.pileIndex === pileIndex;
      const isSelected =
        selected?.zone === "cascade" &&
        selected.pileIndex === pileIndex &&
        mappedCard.cardIndex >= selected.startIndex;
      return {
        selectColor: isHoverTargetTop ? "green" : isSelected ? "blue" : "none",
        isSelected: isSelected || isHoverTargetTop,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "free" && zone.pileIndex !== undefined) {
      const slotIndex = zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "free" &&
        hoverTarget.slotIndex === slotIndex;
      return {
        onPress: () => onFreeCellPress(slotIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected:
          (selected?.zone === "free" && selected.slotIndex === slotIndex) ||
          (isHoverDropTarget && zone.cards?.length === 0),
        selectColor: isHoverDropTarget ? "green" : "blue",
      };
    }

    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      const foundationPileIndex = zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pileIndex === foundationPileIndex;
      return {
        onPress: () => onFoundationPress(foundationPileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected: isHoverDropTarget,
        selectColor: "green",
      };
    }

    if (zone.name === "cascade" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "cascade" &&
        hoverTarget.pileIndex === pileIndex;
      return {
        onPress: () => onCascadePress(pileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected: isHoverDropTarget && zone.cards?.length === 0,
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
    cardSize: "tableau",
    fixedCols: columnCount,
    fixedRows,
    gap: 0.12,
  });

  // ── Hit areas ───────────────────────────────────────────────────────────────

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      const zoneRect = getZoneBasePos(zone);

      if (zone.name === "free" && zone.pileIndex !== undefined) {
        const card = game.freeCells[zone.pileIndex];
        if (!card) return;
        areas.push({
          source: { zone: "free", slotIndex: zone.pileIndex },
          rect: createRect(zoneRect.x, zoneRect.y, cardWidth, cardHeight),
          priority: 90,
        });
      }

      if (zone.name === "cascade" && zone.pileIndex !== undefined) {
        const pile = game.cascades[zone.pileIndex];
        const maxStackSize = getMaxMovableStackSize(game);
        for (let startIndex = 0; startIndex < pile.length; startIndex++) {
          const cards = pile.slice(startIndex);
          if (cards.length > maxStackSize || !isValidCascadeStack(cards)) {
            continue;
          }

          const isTopCard = startIndex === pile.length - 1;
          const hitHeight = isTopCard
            ? cardHeight
            : cardDims.tableauOffset * cardHeight;
          areas.push({
            source: {
              zone: "cascade",
              pileIndex: zone.pileIndex,
              startIndex,
            },
            rect: createRect(
              zoneRect.x,
              zoneRect.y + startIndex * cardDims.tableauOffset * cardHeight,
              cardWidth,
              hitHeight,
            ),
            priority: 10 + startIndex,
          });
        }
      }
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

      if (zone.name === "free" && zone.pileIndex !== undefined) {
        areas.push({
          target: { zone: "free", slotIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 90,
        });
      }

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        areas.push({
          target: { zone: "foundation", pileIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 80,
        });
      }

      if (zone.name === "cascade" && zone.pileIndex !== undefined) {
        const pile = game.cascades[zone.pileIndex];
        const pileHeight =
          cardHeight +
          Math.max(0, pile.length - 1) * cardDims.tableauOffset * cardHeight;
        areas.push({
          target: { zone: "cascade", pileIndex: zone.pileIndex },
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

  // Keep ref in sync so the hook's findDropTarget always sees fresh areas.
  dropHitAreasRef.current = dropHitAreas;

  // ── Game logic ──────────────────────────────────────────────────────────────

  function getTopCard(
    source: MoveSource,
    snapshot: GameState,
  ): PlayingCard | null {
    if (source.zone === "cascade") {
      const pile = snapshot.cascades[source.pileIndex];
      return pile[pile.length - 1] ?? null;
    }
    return snapshot.freeCells[source.slotIndex];
  }

  function getDraggedCards(
    source: MoveSource,
    snapshot: GameState,
  ): PlayingCard[] {
    if (source.zone === "cascade") {
      const pile = snapshot.cascades[source.pileIndex];
      return pile.slice(source.startIndex);
    }
    const card = snapshot.freeCells[source.slotIndex];
    return card ? [card] : [];
  }

  /**
   * The longest run that could be moved one card at a time: each free cell
   * doubles as a stop, and each empty column (other than the destination)
   * doubles the whole count.
   */
  function getMaxMovableStackSize(
    snapshot: GameState,
    targetPileIndex?: number,
  ): number {
    if (singleCardMoves) return 1;
    const freeCells = cellsAcceptCards
      ? snapshot.freeCells.filter((card) => card === null).length
      : 0;
    const emptyColumns = snapshot.cascades.filter(
      (pile, index) => pile.length === 0 && index !== targetPileIndex,
    ).length;
    return (freeCells + 1) * 2 ** emptyColumns;
  }

  function isValidCascadeStack(cards: PlayingCard[]): boolean {
    return cards.every(
      (card, index) =>
        index === 0 || canPlaceOnCascadeRule(card, cards[index - 1]),
    );
  }

  function canDropOnTarget(source: MoveSource, target: DropTarget): boolean {
    const cards = getDraggedCards(source, game);
    const card = cards[0];
    const targetPileIndex =
      target.zone === "cascade" ? target.pileIndex : undefined;
    if (!card || cards.length > getMaxMovableStackSize(game, targetPileIndex))
      return false;

    if (target.zone === "free") {
      return (
        cellsAcceptCards &&
        cards.length === 1 &&
        game.freeCells[target.slotIndex] === null
      );
    }

    if (target.zone === "foundation") {
      if (cards.length !== 1) return false;
      const targetPile = game.foundations[target.pileIndex];
      const top = targetPile[targetPile.length - 1];
      return canPlaceOnFoundation(card, top);
    }

    // cascade — prevent dropping on self
    if (source.zone === "cascade" && source.pileIndex === target.pileIndex) {
      return false;
    }
    const top =
      game.cascades[target.pileIndex][
        game.cascades[target.pileIndex].length - 1
      ];
    return isValidCascadeStack(cards) && canPlaceOnCascadeRule(card, top);
  }

  function applyMove(source: MoveSource, target: DropTarget) {
    if (!canDropOnTarget(source, target)) {
      setSelected(null);
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const snapshot = draft as GameState;
      const cards = getDraggedCards(source, snapshot);
      if (cards.length === 0) return;

      if (source.zone === "cascade") {
        draft.cascades[source.pileIndex].splice(source.startIndex);
      } else {
        draft.freeCells[source.slotIndex] = null;
      }

      if (target.zone === "cascade") {
        draft.cascades[target.pileIndex].push(...cards);
      } else if (target.zone === "free") {
        if (draft.freeCells[target.slotIndex] !== null) return;
        draft.freeCells[target.slotIndex] = cards[0];
      } else {
        draft.foundations[target.pileIndex].push(cards[0]);
      }
    });

    setLastTap(null);
    setSelected(null);
  }

  function getAutoFoundationTarget(
    source: MoveSource,
    snapshot: GameState = game,
  ): DropTarget | null {
    const card = getTopCard(source, snapshot);
    if (!card) return null;

    for (
      let pileIndex = 0;
      pileIndex < snapshot.foundations.length;
      pileIndex++
    ) {
      const pile = snapshot.foundations[pileIndex];
      const top = pile[pile.length - 1];
      if (!top) continue;
      if (top.suit !== card.suit) continue;
      if (!canPlaceOnFoundation(card, top)) continue;

      return { zone: "foundation", pileIndex };
    }

    for (
      let pileIndex = 0;
      pileIndex < snapshot.foundations.length;
      pileIndex++
    ) {
      const pile = snapshot.foundations[pileIndex];
      if (pile.length > 0) continue;
      if (!canPlaceOnFoundation(card, undefined)) continue;

      return { zone: "foundation", pileIndex };
    }

    return null;
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  function getSourceOrigin(
    source: MoveSource,
  ): { x: number; y: number } | null {
    const zone = zones.find((z) => {
      if (source.zone === "cascade")
        return z.name === "cascade" && z.pileIndex === source.pileIndex;
      return z.name === "free" && z.pileIndex === source.slotIndex;
    });
    if (!zone) return null;

    const base = getZoneBasePos(zone);
    if (source.zone === "cascade") {
      return {
        x: base.x,
        y: base.y + source.startIndex * cardDims.tableauOffset * cardHeight,
      };
    }
    return { x: base.x, y: base.y };
  }

  function getSourceRect(source: MoveSource) {
    const origin = getSourceOrigin(source);
    if (!origin) return null;
    return createRect(origin.x, origin.y, cardWidth, cardHeight);
  }

  /** Can these cards be picked up together (dragged, or selected by a tap)? */
  function canLift(source: MoveSource) {
    const cards = getDraggedCards(source, game);
    return (
      cards.length > 0 &&
      cards.length <= getMaxMovableStackSize(game) &&
      (source.zone !== "cascade" || isValidCascadeStack(cards))
    );
  }

  function startGhostDrag(source: MoveSource) {
    if (!canLift(source)) return;
    setSelected(null);
    const cards = getDraggedCards(source, game);
    const origin = getSourceOrigin(source);
    if (!origin) return;
    startDrag(source, cards, origin);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  // ── Tap handlers ─────────────────────────────────────────────────────────────

  /**
   * A tap on a cascade: on one of its cards (`source`, the run from that card
   * down) or on the pile itself. With nothing selected it selects the run;
   * with a selection it moves it here (or deselects, if it can't go here).
   * A double tap on a top card sends it to a foundation.
   */
  function onCascadePress(
    pileIndex: number,
    source?: Extract<MoveSource, { zone: "cascade" }>,
  ) {
    if (dragGhost) {
      setSelected(null);
      return;
    }
    const now = Date.now();
    const tapKey = source
      ? `cascade-${pileIndex}-${source.startIndex}`
      : `cascade-${pileIndex}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (
        source?.zone === "cascade" &&
        source.startIndex === game.cascades[pileIndex].length - 1
      ) {
        const foundationTarget = getAutoFoundationTarget(source);
        if (foundationTarget && canDropOnTarget(source, foundationTarget)) {
          applyMove(source, foundationTarget);
        }
      }
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (!selected) {
      if (source && canLift(source)) setSelected(source);
      return;
    }

    if (!canDropOnTarget(selected, { zone: "cascade", pileIndex })) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "cascade", pileIndex });
  }

  function onFreeCellPress(slotIndex: number) {
    if (dragGhost) {
      setSelected(null);
      return;
    }
    const now = Date.now();
    const tapKey = `free-${slotIndex}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      const source: MoveSource = { zone: "free", slotIndex };
      const foundationTarget = getAutoFoundationTarget(source);
      if (foundationTarget && canDropOnTarget(source, foundationTarget)) {
        applyMove(source, foundationTarget);
      }
      return;
    }

    setLastTap({ key: tapKey, at: now });

    const slotCard = game.freeCells[slotIndex];

    if (!selected) {
      if (slotCard) setSelected({ zone: "free", slotIndex });
      return;
    }

    if (!canDropOnTarget(selected, { zone: "free", slotIndex })) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "free", slotIndex });
  }

  function onFoundationPress(pileIndex: number) {
    if (!selected || dragGhost) {
      setSelected(null);
      return;
    }

    if (!canDropOnTarget(selected, { zone: "foundation", pileIndex })) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "foundation", pileIndex });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function getTapHandler(source: MoveSource) {
    if (source.zone === "cascade") {
      return () => onCascadePress(source.pileIndex, source);
    }

    return () => onFreeCellPress(source.slotIndex);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const { source, rect } = hit;
        const key =
          source.zone === "cascade"
            ? `cascade-${source.pileIndex}-${source.startIndex}`
            : `free-${source.slotIndex}`;

        return (
          <DragHandle
            key={key}
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
      outcome={won ? "won" : "playing"}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      autoCompleting={isAutoCompleting}
    >
      <View style={{ flex: 1, width: "100%", gap: 12 }}>
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
                ...StyleSheet.absoluteFill,
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
              cardSize="tableau"
              isValidDrop={hoverTarget !== null}
            />
          )}
        </View>
      </View>
    </GameWrapper>
  );
}

export default function EightOff() {
  return <ReserveCellBoard columnCount={8} createState={createEightOffState} />;
}
