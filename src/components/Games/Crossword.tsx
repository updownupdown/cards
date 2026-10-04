import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  isFace,
  rankValue,
  redealWith,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";

// Crossword: fill a 7x7 grid one card at a time, each beside one already
// down. Court cards are the black squares: no two may touch side by side, and
// every run of number cards between black squares or the edge must add up to
// an even number once it is filled. The last space takes any of the last four.
const SIZE = 7;
const CELLS = SIZE * SIZE;
const CENTRE = Math.floor(CELLS / 2);
const FINAL_CHOICES = 4;
const HAND_ROW = 0;
const CONTROLS_GAP = 0.15;
const GRID_ROW_START = 1 + CONTROLS_GAP;

type GameState = {
  stock: PlayingCard[];
  /** The card to place, or the last four to choose from for the last space. */
  hand: PlayingCard[];
  /** Row by row; null for an empty space. */
  grid: (PlayingCard | null)[];
  ended: boolean;
  won: boolean;
  lossReason: "oddRun" | null;
};

export type CrosswordGameState = GameState;

type Source = { hand: number };
type Target = { cell: number };

function rowOf(cell: number) {
  return Math.floor(cell / SIZE);
}

function colOf(cell: number) {
  return cell % SIZE;
}

function neighbours(cell: number, diagonal: boolean) {
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (!diagonal && dr !== 0 && dc !== 0) continue;
      const r = rowOf(cell) + dr;
      const c = colOf(cell) + dc;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) result.push(r * SIZE + c);
    }
  }
  return result;
}

/** The row's or column's cells, in order. */
function lineCells(cell: number, direction: "row" | "col") {
  return Array.from({ length: SIZE }, (_, i) =>
    direction === "row" ? rowOf(cell) * SIZE + i : i * SIZE + colOf(cell),
  );
}

function numberRunAt(
  grid: (PlayingCard | null)[],
  cell: number,
  direction: "row" | "col",
) {
  const cells = lineCells(cell, direction);
  const index = cells.indexOf(cell);
  const card = grid[cell];
  if (!card || isFace(card)) return null;

  let sum = 0;
  let canExtend = false;
  for (let i = index; i >= 0; i--) {
    const neighbour = grid[cells[i]];
    if (!neighbour) {
      canExtend = true;
      break;
    }
    if (isFace(neighbour)) break;
    sum += rankValue(neighbour);
  }
  for (let i = index + 1; i < cells.length; i++) {
    const neighbour = grid[cells[i]];
    if (!neighbour) {
      canExtend = true;
      break;
    }
    if (isFace(neighbour)) break;
    sum += rankValue(neighbour);
  }
  return { isEven: sum % 2 === 0, canExtend };
}

function numberRunIsEvenAt(
  grid: (PlayingCard | null)[],
  cell: number,
  direction: "row" | "col",
) {
  return numberRunAt(grid, cell, direction)?.isEven ?? null;
}

function numberCellParityColor(grid: (PlayingCard | null)[], cell: number) {
  const rowRun = numberRunAt(grid, cell, "row");
  const colRun = numberRunAt(grid, cell, "col");
  if (!rowRun || !colRun) return undefined;
  if (!rowRun.isEven && !colRun.isEven) return "red";
  if (!rowRun.isEven || !colRun.isEven) return "orange";
  if (!rowRun.canExtend && !colRun.canExtend) return "green";
  return undefined;
}

/**
 * Whether every run of number cards between court cards (or the edge) in
 * this line adds up to an even number, counting only runs with no gaps left.
 */
function lineIsEven(grid: (PlayingCard | null)[], cells: number[]) {
  let sum = 0;
  let complete = true;
  for (const cell of [...cells, -1]) {
    const card = cell >= 0 ? grid[cell] : null;
    if (cell < 0 || (card && isFace(card))) {
      if (complete && sum % 2 !== 0) return false;
      sum = 0;
      complete = true;
    } else if (!card) {
      complete = false;
    } else {
      sum += rankValue(card);
    }
  }
  return true;
}

function canPlace(
  grid: (PlayingCard | null)[],
  cell: number,
  card: PlayingCard,
) {
  if (grid[cell]) return false;
  if (!neighbours(cell, true).some((n) => grid[n])) return false;
  if (isFace(card)) {
    const touchesCourt = neighbours(cell, false).some((n) => {
      const other = grid[n];
      return !!other && isFace(other);
    });
    if (touchesCourt) return false;
  }
  return true;
}

function legalCells(grid: (PlayingCard | null)[], card: PlayingCard) {
  return grid.flatMap((_, cell) => (canPlace(grid, cell, card) ? [cell] : []));
}

function placedCount(grid: (PlayingCard | null)[]) {
  return grid.filter(Boolean).length;
}

/** Whether any card in hand has somewhere to go. */
function hasMove(state: GameState) {
  return state.hand.some((card) => legalCells(state.grid, card).length > 0);
}

/** Place a hand card; draws the next one, or the last four for the last space. */
function placeCard(state: GameState, handIndex: number, cell: number) {
  const card = state.hand[handIndex];
  if (!card || state.ended || !canPlace(state.grid, cell, card)) return false;
  state.grid[cell] = card;
  state.hand.splice(handIndex, 1);
  if (
    !lineIsEven(state.grid, lineCells(cell, "row")) ||
    !lineIsEven(state.grid, lineCells(cell, "col"))
  ) {
    state.ended = true;
    state.lossReason = "oddRun";
    return true;
  }
  const placed = placedCount(state.grid);
  if (placed === CELLS) {
    state.ended = true;
    state.won = true;
    return true;
  }
  if (placed === CELLS - 1) {
    state.hand = [...state.hand, ...state.stock.map(flipToFace)];
    state.stock = [];
  } else {
    const next = state.stock.pop();
    if (next) state.hand = [flipToFace(next)];
  }
  if (!hasMove(state)) state.ended = true;
  return true;
}

function createInitialState(): GameState {
  const deck = shuffle(createDeck());
  const grid: (PlayingCard | null)[] = Array(CELLS).fill(null);
  grid[CENTRE] = flipToFace(deck.pop()!);
  const hand = [flipToFace(deck.pop()!)];
  return {
    stock: deck,
    hand,
    grid,
    ended: false,
    won: false,
    lossReason: null,
  };
}

function gatherState(state: GameState): GameState {
  return {
    stock: shuffle(flipAllToBack(collectCards(state))),
    hand: [],
    grid: Array(CELLS).fill(null),
    ended: false,
    won: false,
    lossReason: null,
  };
}

export const crosswordRules = {
  SIZE,
  CELLS,
  CENTRE,
  FINAL_CHOICES,
  canPlace,
  legalCells,
  lineIsEven,
  lineCells,
  placeCard,
  placedCount,
  hasMove,
  numberRunIsEvenAt,
  numberCellParityColor,
  createInitialState,
};

const gameStateInitial = createInitialState();

export default function Crossword() {
  const [selected, setSelected] = useState(0);
  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<Target>[]>([]);

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(0);
        clearDragGhost();
      },
      resetAndSetup: async () => {
        setGame((draft) => gatherState(draft));
        await delay();
        setGame((draft) => redealWith(createInitialState(), draft.stock));
      },
    });

  const handCard = game.hand[selected] ?? game.hand[0];
  const handIndex = game.hand[selected] ? selected : 0;
  const legal = useMemo(
    () =>
      new Set(handCard && !game.ended ? legalCells(game.grid, handCard) : []),
    [game.grid, game.ended, handCard],
  );

  function place(hand: number, cell: number) {
    const card = game.hand[hand];
    if (!card || game.ended || !canPlace(game.grid, cell, card)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      placeCard(draft, hand, cell);
    });
    setSelected(0);
  }

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
  } = useDragDrop<Source, Target>({
    canDropOnTarget: (source, target) => {
      const card = game.hand[source.hand];
      return !!card && !game.ended && canPlace(game.grid, target.cell, card);
    },
    onSuccessfulDrop: (source, target) => place(source.hand, target.cell),
    getDroppedCardIds: (source) => {
      const card = game.hand[source.hand];
      return card ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler: (source) => () => setSelected(source.hand),
  });

  const zones: MapZone[] = useMemo(() => {
    const cellZones: MapZone[] = game.grid.map((card, cell) => ({
      id: `cell-${cell}`,
      name: "cell",
      pileIndex: cell,
      cards: card ? [card] : [],
      col: colOf(cell),
      row: rowOf(cell) + GRID_ROW_START,
      baseZIndex: 10,
      placeholder: { showCount: false },
    }));
    const handZones: MapZone[] = game.hand.map((card, i) => ({
      id: `hand-${i}`,
      name: "hand",
      pileIndex: i,
      cards: [card],
      col: 2 + i,
      row: HAND_ROW,
      baseZIndex: 30,
    }));
    return [
      ...cellZones,
      {
        id: "stock",
        name: "stock",

        cards: game.stock,
        col: 0,
        row: HAND_ROW,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          showCount: true,
          infoPos: "right",
        },
      },
      ...handZones,
    ];
  }, [game]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(card.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(card.card.id)
      ? 0
      : undefined;
    if (card.zoneName === "cell" && card.pileIndex !== undefined) {
      const isCourt = isFace(card.card);
      const selectColor = isCourt
        ? "grey"
        : numberCellParityColor(game.grid, card.pileIndex);
      return {
        isVisible: !isBeingDragged,
        animDuration,
        isDisabled: true,
        selectColor,
        forceOverlayColor: isCourt || selectColor !== undefined,
      };
    }
    if (card.zoneName === "hand") {
      const choosing = game.hand.length > 1;
      const isCourt = isFace(card.card);
      return {
        isVisible: !isBeingDragged,
        animDuration,
        isDisabled: game.ended,
        isSelected: choosing && card.pileIndex === handIndex,
        selectColor: isCourt ? "grey" : "blue",
        forceOverlayColor: isCourt,
      };
    }
    return { isVisible: !isBeingDragged, animDuration, isDisabled: true };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "cell" || zone.pileIndex === undefined) return {};
    const cell = zone.pileIndex;
    const isLegal = legal.has(cell);
    const isHover = !!dragGhost && hoverTarget?.cell === cell;
    return {
      onPress: () => isLegal && place(handIndex, cell),
      isDisabled: !isLegal || !!dragGhost,
      isSelected: isLegal,
      selectColor: "green",
      forceSelectColor: isHover,
    };
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: SIZE,
    fixedRows: SIZE + GRID_ROW_START,
    gap: 0.08,
  });

  function getSourceRect(source: Source) {
    const zone = zones.find(
      (entry) => entry.name === "hand" && entry.pileIndex === source.hand,
    );
    if (!zone) return null;
    const base = getZoneBasePos(zone);
    return createRect(base.x, base.y, cardWidth, cardHeight);
  }

  const cardHitAreas = useMemo<CardHitArea<Source>[]>(
    () =>
      game.ended
        ? []
        : game.hand.flatMap((_, hand) => {
            const rect = getSourceRect({ hand });
            return rect ? [{ source: { hand }, rect, priority: 10 }] : [];
          }),
    [cardHeight, cardWidth, game, getZoneBasePos, zones],
  );

  const dropHitAreas = useMemo<DropHitArea<Target>[]>(
    () =>
      zones.flatMap((zone) => {
        if (zone.name !== "cell" || zone.pileIndex === undefined) return [];
        const base = getZoneBasePos(zone);
        return [
          {
            target: { cell: zone.pileIndex },
            rect: createRect(
              base.x + boardPageOffset.x,
              base.y + boardPageOffset.y,
              cardWidth,
              cardHeight,
            ),
            priority: 10,
          },
        ];
      }),
    [
      boardPageOffset.x,
      boardPageOffset.y,
      cardHeight,
      cardWidth,
      getZoneBasePos,
      zones,
    ],
  );

  dropHitAreasRef.current = dropHitAreas;

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, cardWidth, cardHeight]);

  function startGhostDrag(source: Source) {
    const card = game.hand[source.hand];
    const rect = getSourceRect(source);
    if (!card || !rect || game.ended) return;
    setSelected(source.hand);
    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={`hand-${source.hand}`}
          collapsable={false}
          style={{
            position: "absolute",
            backgroundColor: "transparent",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
          gesture={makeDragHandlers(source, startGhostDrag)}
        />
      )),
    [cardHitAreas],
  );

  const placed = placedCount(game.grid);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      score={placed}
      winLoseMessage={
        game.won
          ? i18n.t("games:crossword.completed")
          : game.lossReason === "oddRun"
            ? i18n.t("games:crossword.oddRunLost")
            : i18n.t("games:crossword.stuck", { placed, total: CELLS })
      }
    >
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
            cardSize="small"
            isValidDrop={hoverTarget !== null}
          />
        )}
      </View>
    </GameWrapper>
  );
}
