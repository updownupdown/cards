import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  redealWith,
  shuffle,
  SUITS,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";

// Ozanam's card puzzle (1725): lay the sixteen Aces and court cards in a 4x4
// square so that no row, column or long diagonal holds two cards of the same
// rank or the same suit. A few cards start in place; the deal always has
// exactly one solution.
const SIZE = 4;
const CELLS = SIZE * SIZE;
const PUZZLE_RANKS: CardRank[] = ["A", "K", "Q", "J"];
// Easy leaves this many cards in place; Difficult keeps only as many as the
// solution needs to be the only one.
const EASY_GIVENS = 7;
const TRAY_ROW = SIZE + 0.3;
const TRAY_OFFSET = 0.3;

export type Difficulty = "easy" | "difficult";

type GameState = {
  /** Cards gathered for the deal; empty during play. */
  deal: PlayingCard[];
  /** Row by row; null for an empty space. */
  grid: (PlayingCard | null)[];
  /** Cells whose card was dealt into place and can't be moved. */
  given: boolean[];
  /** The cards still to place, one pile per suit, Ace to Jack. */
  tray: PlayingCard[][];
  moves: number;
};

export type OzanamsSquareGameState = GameState;

type Source =
  | { zone: "tray"; suit: number; index: number }
  | { zone: "cell"; cell: number };
type Target = { zone: "cell"; cell: number } | { zone: "tray" };

// Rows, columns and the two long diagonals.
const LINES: number[][] = [
  ...Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => r * SIZE + c),
  ),
  ...Array.from({ length: SIZE }, (_, c) =>
    Array.from({ length: SIZE }, (_, r) => r * SIZE + c),
  ),
  Array.from({ length: SIZE }, (_, i) => i * SIZE + i),
  Array.from({ length: SIZE }, (_, i) => i * SIZE + (SIZE - 1 - i)),
];

const LINES_OF_CELL: number[][][] = Array.from({ length: CELLS }, (_, cell) =>
  LINES.filter((line) => line.includes(cell)),
);

type Key = { rank: CardRank; suit: PlayingCard["suit"] };

function clashes(a: Key, b: Key) {
  return a.rank === b.rank || a.suit === b.suit;
}

/** Whether `card` fits in `cell` beside the cards already in its lines. */
function fits(grid: (Key | null)[], cell: number, card: Key) {
  return LINES_OF_CELL[cell].every((line) =>
    line.every((other) => {
      const placed = other === cell ? null : grid[other];
      return !placed || !clashes(placed, card);
    }),
  );
}

function allKeys(): Key[] {
  return SUITS.flatMap((suit) => PUZZLE_RANKS.map((rank) => ({ rank, suit })));
}

/**
 * Fills the empty cells in every legal way, stopping once `limit` solutions
 * are found. Returns the solutions found, in the order `order` tries cards.
 */
function solve(
  grid: (Key | null)[],
  limit: number,
  order: Key[] = allKeys(),
): (Key | null)[][] {
  const work = [...grid];
  const used = new Set(
    work.flatMap((key) => (key ? [`${key.rank}-${key.suit}`] : [])),
  );
  const solutions: (Key | null)[][] = [];
  const fill = (cell: number) => {
    if (solutions.length >= limit) return;
    if (cell === CELLS) {
      solutions.push([...work]);
      return;
    }
    if (work[cell]) {
      fill(cell + 1);
      return;
    }
    for (const key of order) {
      const id = `${key.rank}-${key.suit}`;
      if (used.has(id) || !fits(work, cell, key)) continue;
      work[cell] = key;
      used.add(id);
      fill(cell + 1);
      used.delete(id);
      work[cell] = null;
      if (solutions.length >= limit) return;
    }
  };
  fill(0);
  return solutions;
}

function isUnique(grid: (Key | null)[]) {
  return solve(grid, 2).length === 1;
}

/** A random solved square, then as many cards taken out as the level allows. */
function createPuzzle(difficulty: Difficulty, random = Math.random) {
  const solution = solve(
    Array(CELLS).fill(null),
    1,
    shuffle(allKeys(), random),
  )[0];
  const puzzle: (Key | null)[] = [...solution];
  const minGivens = difficulty === "easy" ? EASY_GIVENS : 0;
  let givens = CELLS;
  for (const cell of shuffle(
    Array.from({ length: CELLS }, (_, i) => i),
    random,
  )) {
    if (givens <= minGivens) break;
    const kept = puzzle[cell];
    puzzle[cell] = null;
    if (isUnique(puzzle)) givens -= 1;
    else puzzle[cell] = kept;
  }
  return { solution, puzzle };
}

function trayOrder(card: PlayingCard) {
  return PUZZLE_RANKS.indexOf(card.rank);
}

function sortTray(pile: PlayingCard[]) {
  pile.sort((a, b) => trayOrder(a) - trayOrder(b));
}

function createInitialState(difficulty: Difficulty): GameState {
  const { puzzle } = createPuzzle(difficulty);
  const cards = createDeck({ faceUp: true }).filter((card) =>
    PUZZLE_RANKS.includes(card.rank),
  );
  const cardFor = (key: Key) =>
    cards.find((card) => card.rank === key.rank && card.suit === key.suit)!;
  const grid = puzzle.map((key) => (key ? cardFor(key) : null));
  const placed = new Set(grid.flatMap((card) => (card ? [card.id] : [])));
  const tray = SUITS.map((suit) =>
    cards.filter((card) => card.suit === suit && !placed.has(card.id)),
  );
  tray.forEach(sortTray);
  return {
    deal: [],
    grid,
    given: grid.map(Boolean),
    tray,
    moves: 0,
  };
}

/** Cells whose card shares a rank or suit with another card in one of its lines. */
function conflictCells(grid: (PlayingCard | null)[]) {
  const result = new Set<number>();
  grid.forEach((card, cell) => {
    if (card && !fits(grid, cell, card)) result.add(cell);
  });
  return result;
}

function isSolved(grid: (PlayingCard | null)[]) {
  return grid.every(Boolean) && conflictCells(grid).size === 0;
}

function takeFromSource(state: GameState, source: Source) {
  if (source.zone === "tray") {
    return state.tray[source.suit].splice(source.index, 1)[0] ?? null;
  }
  if (state.given[source.cell]) return null;
  const card = state.grid[source.cell];
  state.grid[source.cell] = null;
  return card;
}

function returnToTray(state: GameState, card: PlayingCard) {
  const pile = state.tray[SUITS.indexOf(card.suit)];
  pile.push(card);
  sortTray(pile);
}

function sourceCard(state: GameState, source: Source) {
  return source.zone === "tray"
    ? state.tray[source.suit][source.index]
    : state.given[source.cell]
      ? undefined
      : (state.grid[source.cell] ?? undefined);
}

function canMove(state: GameState, source: Source, target: Target) {
  if (isSolved(state.grid)) return false;
  if (!sourceCard(state, source)) return false;
  if (target.zone === "tray") return source.zone === "cell";
  if (state.given[target.cell]) return false;
  return !(source.zone === "cell" && source.cell === target.cell);
}

/**
 * Moves a card onto a cell (a card already there goes back to the tray, or
 * swaps places with a card moved from another cell), or back to the tray.
 */
function moveCard(state: GameState, source: Source, target: Target) {
  if (!canMove(state, source, target)) return false;
  const card = takeFromSource(state, source);
  if (!card) return false;
  if (target.zone === "tray") {
    returnToTray(state, card);
  } else {
    const displaced = state.grid[target.cell];
    state.grid[target.cell] = card;
    if (displaced) {
      if (source.zone === "cell") state.grid[source.cell] = displaced;
      else returnToTray(state, displaced);
    }
  }
  state.moves += 1;
  return true;
}

function gatherState(state: GameState): GameState {
  return {
    deal: shuffle(flipAllToBack(collectCards(state))),
    grid: Array(CELLS).fill(null),
    given: Array(CELLS).fill(false),
    tray: SUITS.map(() => []),
    moves: 0,
  };
}

export const ozanamsSquareRules = {
  SIZE,
  CELLS,
  EASY_GIVENS,
  LINES,
  fits,
  solve,
  isUnique,
  createPuzzle,
  createInitialState,
  conflictCells,
  isSolved,
  canMove,
  moveCard,
};

const gameStateInitial = createInitialState("easy");

export default function OzanamsSquare() {
  const difficulty = useGameSettingValue("difficulty");
  const [selected, setSelected] = useState<Source | null>(null);
  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<Target>[]>([]);

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        clearDragGhost();
      },
      resetAndSetup: async () => {
        setGame((draft) => gatherState(draft));
        await delay();
        setGame((draft) =>
          redealWith(createInitialState(difficulty), draft.deal),
        );
      },
    });

  const solved = useMemo(() => isSolved(game.grid), [game.grid]);
  const conflicts = useMemo(() => conflictCells(game.grid), [game.grid]);

  function move(source: Source, target: Target) {
    if (!canMove(game, source, target)) return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      moveCard(draft, source, target);
    });
    setSelected(null);
    return true;
  }

  function onTrayPress(suit: number, index: number) {
    if (solved) return;
    const same =
      selected?.zone === "tray" &&
      selected.suit === suit &&
      selected.index === index;
    setSelected(same ? null : { zone: "tray", suit, index });
  }

  function onCellPress(cell: number) {
    if (solved || game.given[cell]) return;
    if (selected) {
      if (move(selected, { zone: "cell", cell })) return;
    }
    if (game.grid[cell]) {
      const same = selected?.zone === "cell" && selected.cell === cell;
      setSelected(same ? null : { zone: "cell", cell });
    }
  }

  function onTrayZonePress() {
    if (selected?.zone === "cell") move(selected, { zone: "tray" });
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
    canDropOnTarget: (source, target) => canMove(game, source, target),
    onSuccessfulDrop: (source, target) => {
      move(source, target);
    },
    getDroppedCardIds: (source) => {
      const card = sourceCard(game, source);
      return card ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler: (source) => () =>
      source.zone === "tray"
        ? onTrayPress(source.suit, source.index)
        : onCellPress(source.cell),
  });

  const zones: MapZone[] = useMemo(() => {
    const cellZones: MapZone[] = game.grid.map((card, cell) => ({
      id: `cell-${cell}`,
      name: "cell",
      pileIndex: cell,
      cards: card ? [card] : [],
      col: cell % SIZE,
      row: Math.floor(cell / SIZE),
      baseZIndex: 10,
      placeholder: { showCount: false },
    }));
    const trayZones: MapZone[] = game.tray.map((pile, suit) => ({
      id: `tray-${suit}`,
      name: "tray",
      pileIndex: suit,
      cards: pile,
      col: suit,
      row: TRAY_ROW,
      baseZIndex: 20,
      fan: { direction: "down", offset: TRAY_OFFSET },
      placeholder: { showCount: false, hideBackground: true, hideShadow: true },
    }));
    return [
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: (SIZE - 1) / 2,
        row: (SIZE - 1) / 2,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
      },
      ...cellZones,
      ...trayZones,
    ];
  }, [game]);

  function isSelectedSource(source: Source) {
    if (!selected || selected.zone !== source.zone) return false;
    return selected.zone === "tray" && source.zone === "tray"
      ? selected.suit === source.suit && selected.index === source.index
      : selected.zone === "cell" &&
          source.zone === "cell" &&
          selected.cell === source.cell;
  }

  // Whether dropping the dragged card on the hovered cell leaves it (and any
  // card it swaps places with) free of conflicts.
  const hoverFits = (() => {
    if (!dragGhost || hoverTarget?.zone !== "cell") return true;
    const source = dragGhost.source as Source;
    const card = sourceCard(game, source);
    if (!card) return true;
    const grid = [...game.grid];
    const displaced = grid[hoverTarget.cell];
    if (source.zone === "cell") grid[source.cell] = displaced;
    grid[hoverTarget.cell] = card;
    return (
      fits(grid, hoverTarget.cell, card) &&
      (source.zone !== "cell" ||
        !displaced ||
        fits(grid, source.cell, displaced))
    );
  })();

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(card.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(card.card.id)
      ? 0
      : undefined;
    if (card.zoneName === "cell" && card.pileIndex !== undefined) {
      const cell = card.pileIndex;
      const conflict = conflicts.has(cell) && !game.given[cell];
      const isHover =
        !!dragGhost &&
        hoverTarget?.zone === "cell" &&
        hoverTarget.cell === cell;
      return {
        isVisible: !isBeingDragged,
        animDuration,
        isDisabled: true,
        isSelected: isSelectedSource({ zone: "cell", cell }),
        selectColor: game.given[cell]
          ? "lightGrey"
          : isHover
            ? hoverFits
              ? "blue"
              : "red"
            : conflict
              ? "red"
              : "blue",
        // Overlay shows state (hover, conflict, given); only the selected
        // card gets the coloured border.
        forceOverlayColor: isHover || conflict || game.given[cell],
      };
    }
    if (card.zoneName === "tray") {
      return {
        isVisible: !isBeingDragged,
        animDuration,
        isDisabled: true,
        isSelected: isSelectedSource({
          zone: "tray",
          suit: card.pileIndex ?? 0,
          index: card.cardIndex,
        }),
        selectColor: "blue",
      };
    }
    return { isDisabled: true };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "cell" && zone.pileIndex !== undefined) {
      const cell = zone.pileIndex;
      const isHover =
        !!dragGhost &&
        hoverTarget?.zone === "cell" &&
        hoverTarget.cell === cell;
      return {
        onPress: () => onCellPress(cell),
        isDisabled: solved || !!dragGhost || !selected,
        isSelected: isHover,
        selectColor: hoverFits ? "green" : "red",
      };
    }
    if (zone.name === "tray") {
      return {
        onPress: onTrayZonePress,
        isDisabled: selected?.zone !== "cell",
      };
    }
    return {};
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "regular",
    fixedCols: SIZE,
    fixedRows: TRAY_ROW + 1 + TRAY_OFFSET * (PUZZLE_RANKS.length - 1),
    gap: 0.1,
  });

  function getSourceRect(source: Source) {
    if (source.zone === "cell") {
      const zone = zones.find((z) => z.id === `cell-${source.cell}`);
      if (!zone) return null;
      const base = getZoneBasePos(zone);
      return createRect(base.x, base.y, cardWidth, cardHeight);
    }
    const zone = zones.find((z) => z.id === `tray-${source.suit}`);
    if (!zone) return null;
    const base = getZoneBasePos(zone);
    return createRect(
      base.x,
      base.y + source.index * TRAY_OFFSET * cardHeight,
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<Source>[]>(() => {
    if (solved) return [];
    const areas: CardHitArea<Source>[] = [];
    game.tray.forEach((pile, suit) =>
      pile.forEach((_, index) => {
        const rect = getSourceRect({ zone: "tray", suit, index });
        if (!rect) return;
        // Covered cards only show their top strip.
        const last = index === pile.length - 1;
        areas.push({
          source: { zone: "tray", suit, index },
          rect: last ? rect : { ...rect, height: TRAY_OFFSET * cardHeight },
          priority: 20 + index,
        });
      }),
    );
    game.grid.forEach((card, cell) => {
      if (!card || game.given[cell]) return;
      const rect = getSourceRect({ zone: "cell", cell });
      if (rect)
        areas.push({ source: { zone: "cell", cell }, rect, priority: 10 });
    });
    return areas;
  }, [cardHeight, cardWidth, game, getZoneBasePos, zones, solved]);

  const dropHitAreas = useMemo<DropHitArea<Target>[]>(() => {
    const areas: DropHitArea<Target>[] = [];
    zones.forEach((zone) => {
      if (zone.name === "cell" && zone.pileIndex !== undefined) {
        const base = getZoneBasePos(zone);
        areas.push({
          target: { zone: "cell", cell: zone.pileIndex },
          rect: createRect(
            base.x + boardPageOffset.x,
            base.y + boardPageOffset.y,
            cardWidth,
            cardHeight,
          ),
          priority: 20,
        });
      }
      if (zone.name === "tray" && zone.pileIndex === 0) {
        const base = getZoneBasePos(zone);
        areas.push({
          target: { zone: "tray" },
          rect: createRect(
            base.x + boardPageOffset.x,
            base.y + boardPageOffset.y,
            cardWidth * SIZE * 1.1,
            cardHeight * (1 + TRAY_OFFSET * (PUZZLE_RANKS.length - 1)),
          ),
          priority: 10,
        });
      }
    });
    return areas;
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, cardWidth, cardHeight]);

  function startGhostDrag(source: Source) {
    const card = sourceCard(game, source);
    const rect = getSourceRect(source);
    if (!card || !rect || solved) return;
    setSelected(null);
    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={
            source.zone === "tray"
              ? `tray-${source.suit}-${source.index}`
              : `cell-${source.cell}`
          }
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

  return (
    <GameWrapper
      outcome={solved ? "won" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={i18n.t("games:ozanamsSquare.solved")}
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
            cardSize="regular"
            isValidDrop={hoverTarget !== null}
            validDropColor={hoverFits ? "green" : "red"}
          />
        )}
      </View>
    </GameWrapper>
  );
}
