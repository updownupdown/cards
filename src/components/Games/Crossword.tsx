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
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";

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

// —— Hints ——

// What a space holds, as the rules see it: a number's parity is all that
// counts for the runs.
const EMPTY = 0;
const ODD = 1;
const EVEN = 2;
const COURT = 3;
type Kind = typeof ODD | typeof EVEN | typeof COURT;
const KINDS: Kind[] = [ODD, EVEN, COURT];

// Each space's neighbours, worked out once: hints look at them often.
const SIDE_NEIGHBOURS = Array.from({ length: CELLS }, (_, cell) =>
  neighbours(cell, false),
);
const ALL_NEIGHBOURS = Array.from({ length: CELLS }, (_, cell) =>
  neighbours(cell, true),
);

function kindOf(card: PlayingCard): Kind {
  if (isFace(card)) return COURT;
  return rankValue(card) % 2 ? ODD : EVEN;
}

/**
 * The kinds of card a space could still take without ever making an odd run
 * (a bit per kind): a number must even up a run it completes, and a court
 * may not touch another or cut off an odd run on either side.
 */
function spaceOptions(kinds: Uint8Array, cell: number) {
  let courtOk = !SIDE_NEIGHBOURS[cell].some((n) => kinds[n] === COURT);
  let numbersOk = true;
  let numberParity = -1;
  // Along the row, then down the column.
  for (const stride of [1, SIZE]) {
    const index = stride === 1 ? colOf(cell) : rowOf(cell);
    let completes = true;
    let sum = 0;
    for (const direction of [-1, 1]) {
      let partSum = 0;
      let open = false;
      for (
        let i = index + direction, at = cell + direction * stride;
        i >= 0 && i < SIZE;
        i += direction, at += direction * stride
      ) {
        if (kinds[at] === COURT) break;
        if (kinds[at] === EMPTY) open = true;
        else if (kinds[at] === ODD) partSum += 1;
      }
      // A court here would close off this side's run.
      if (!open && partSum % 2) courtOk = false;
      if (open) completes = false;
      sum += partSum;
    }
    if (completes) {
      // This space completes the run: its parity is set.
      const parity = sum % 2;
      if (numberParity >= 0 && numberParity !== parity) numbersOk = false;
      numberParity = parity;
    }
  }
  let options = courtOk ? 1 << COURT : 0;
  if (numbersOk && numberParity !== 0) options |= 1 << ODD;
  if (numbersOk && numberParity !== 1) options |= 1 << EVEN;
  return options;
}

type Supply = Record<Kind, number>;

function supplyOf(cards: PlayingCard[]): Supply {
  const supply: Supply = { [ODD]: 0, [EVEN]: 0, [COURT]: 0 };
  cards.forEach((card) => (supply[kindOf(card)] += 1));
  return supply;
}

/**
 * How well the grid can still be filled with the cards to come: a space no
 * card can take is a lost game, as are more spaces needing one kind than
 * there are cards of it, or more courts than places for them. Spaces open
 * to every kind are worth keeping.
 */
function crosswordScore(kinds: Uint8Array, supply: Supply) {
  let score = 0;
  const forced: Supply = { [ODD]: 0, [EVEN]: 0, [COURT]: 0 };
  const courtSpaces: number[] = [];
  const optionsAt = new Uint8Array(CELLS);
  for (let cell = 0; cell < CELLS; cell++) {
    if (kinds[cell] !== EMPTY) continue;
    const options = spaceOptions(kinds, cell);
    optionsAt[cell] = options;
    if (options === 0) {
      score -= 10000;
      continue;
    }
    const open = KINDS.filter((kind) => options & (1 << kind));
    score += open.length;
    if (open.length === 1) forced[open[0]] += 1;
    if (options & (1 << COURT)) courtSpaces.push(cell);
  }
  score -= 10000 * deadPairs(kinds, optionsAt);
  KINDS.forEach((kind) => {
    const short = forced[kind] - supply[kind];
    if (short > 0) score -= 3000 * short;
    score -= (10 * forced[kind]) / (supply[kind] + 1);
  });
  // Courts can't sit side by side: count the places they can share.
  const taken = new Set<number>();
  for (const cell of courtSpaces) {
    if (SIDE_NEIGHBOURS[cell].some((n) => taken.has(n))) continue;
    taken.add(cell);
  }
  const room = taken.size - supply[COURT];
  score += room < 0 ? 2000 * room : -20 / (room + 1);
  return score;
}

/**
 * Runs left with two spaces, both for numbers only, whose parities (set by
 * their other runs) can't add up to an even run: one of them is lost.
 */
function deadPairs(kinds: Uint8Array, optionsAt: Uint8Array) {
  let dead = 0;
  for (const stride of [1, SIZE]) {
    for (let line = 0; line < SIZE; line++) {
      const start = stride === 1 ? line * SIZE : line;
      let empty: number[] = [];
      let odd = 0;
      for (let i = 0; i <= SIZE; i++) {
        const cell = start + i * stride;
        const kind = i < SIZE ? kinds[cell] : COURT;
        if (kind !== COURT) {
          if (kind === EMPTY) empty.push(cell);
          else if (kind === ODD) odd += 1;
          continue;
        }
        const courtFree = empty.every(
          (space) => !(optionsAt[space] & (1 << COURT)),
        );
        if (empty.length === 2 && courtFree) {
          const fits = [ODD, EVEN].some(
            (first) =>
              optionsAt[empty[0]] & (1 << first) &&
              [ODD, EVEN].some(
                (second) =>
                  optionsAt[empty[1]] & (1 << second) &&
                  (odd + (first === ODD ? 1 : 0) + (second === ODD ? 1 : 0)) %
                    2 ===
                    0,
              ),
          );
          if (!fits) dead += 1;
        }
        empty = [];
        odd = 0;
      }
    }
  }
  return dead;
}

/** Spaces a card of this kind can go now and keep every run even. */
function safeCells(kinds: Uint8Array, kind: Kind) {
  const cells: number[] = [];
  for (let cell = 0; cell < CELLS; cell++) {
    if (kinds[cell] !== EMPTY) continue;
    if (!ALL_NEIGHBOURS[cell].some((n) => kinds[n] !== EMPTY)) continue;
    if (spaceOptions(kinds, cell) & (1 << kind)) cells.push(cell);
  }
  return cells;
}

// From this few empty spaces on, every way the last cards may come is
// weighed (see fillChance).
const ENDGAME_SPACES = 6;

/**
 * The chance to fill the grid from here, the cards to come known only as a
 * set (any of them may come next), each placed where it keeps the best
 * chance. The last space takes any of the cards left.
 */
function fillChance(
  kinds: Uint8Array,
  supply: Supply,
  memo = new Map<string, number>(),
): number {
  const empty = kinds.reduce(
    (cells: number[], kind, cell) =>
      kind === EMPTY ? [...cells, cell] : cells,
    [],
  );
  if (empty.length === 0) return 1;
  if (empty.length === 1) {
    const options = spaceOptions(kinds, empty[0]);
    return KINDS.some((kind) => supply[kind] > 0 && options & (1 << kind))
      ? 1
      : 0;
  }
  const key = `${kinds.join("")}:${supply[ODD]},${supply[EVEN]},${supply[COURT]}`;
  const known = memo.get(key);
  if (known !== undefined) return known;
  const total = supply[ODD] + supply[EVEN] + supply[COURT];
  let chance = 0;
  for (const kind of KINDS) {
    if (!supply[kind]) continue;
    const rest = { ...supply, [kind]: supply[kind] - 1 };
    let best = 0;
    for (const cell of safeCells(kinds, kind)) {
      const next = kinds.slice();
      next[cell] = kind;
      best = Math.max(best, fillChance(next, rest, memo));
      if (best === 1) break;
    }
    chance += (best * supply[kind]) / total;
  }
  memo.set(key, chance);
  return chance;
}

// Placements looked at again over the next card.
const LOOKAHEAD_PLACEMENTS = 10;

/**
 * Where to put a hand card: the placement that leaves the grid best (see
 * crosswordScore) once the next card is placed well too, averaged over the
 * cards not yet seen; near the end, the one most likely to fill the grid.
 */
function bestCrosswordMove(state: GameState) {
  if (state.ended) return null;
  const kinds = new Uint8Array(
    state.grid.map((card) => (card ? kindOf(card) : EMPTY)),
  );
  const supply = supplyOf(state.stock);
  const total = state.stock.length;
  const candidates: {
    hand: number;
    cell: number;
    kinds: Uint8Array;
    score: number;
  }[] = [];
  state.hand.forEach((card, hand) => {
    const kind = kindOf(card);
    for (const cell of safeCells(kinds, kind)) {
      const next = kinds.slice();
      next[cell] = kind;
      candidates.push({
        hand,
        cell,
        kinds: next,
        score: crosswordScore(next, supply),
      });
    }
  });
  if (candidates.length === 0) {
    // Every move loses: still show one.
    const hand = state.hand.findIndex(
      (card) => legalCells(state.grid, card).length > 0,
    );
    return hand < 0
      ? null
      : { hand, cell: legalCells(state.grid, state.hand[hand])[0] };
  }
  candidates.sort((a, b) => b.score - a.score);
  const empty = CELLS - placedCount(state.grid) - 1;
  const endgame = state.hand.length === 1 && empty <= ENDGAME_SPACES;
  const memo = new Map<string, number>();
  let best = null as { hand: number; cell: number; value: number } | null;
  for (const candidate of endgame
    ? candidates
    : candidates.slice(0, LOOKAHEAD_PLACEMENTS)) {
    let value = candidate.score;
    if (endgame) {
      value += 1e6 * fillChance(candidate.kinds, supply, memo);
    } else if (state.hand.length === 1 && total > 0) {
      value = 0;
      for (const kind of KINDS) {
        if (!supply[kind]) continue;
        const rest = { ...supply, [kind]: supply[kind] - 1 };
        let reply = -20000;
        for (const cell of safeCells(candidate.kinds, kind)) {
          const next = candidate.kinds.slice();
          next[cell] = kind;
          reply = Math.max(reply, crosswordScore(next, rest));
        }
        value += (reply * supply[kind]) / total;
      }
    }
    if (!best || value > best.value) {
      best = { hand: candidate.hand, cell: candidate.cell, value };
    }
  }
  return best && { hand: best.hand, cell: best.cell };
}

function findCrosswordHint(state: GameState) {
  const move = bestCrosswordMove(state);
  if (!move) return null;
  return makeHint(
    "moveCard",
    cardTarget(state.hand[move.hand]),
    zoneTarget(`cell-${move.cell}`),
  );
}

export const crosswordRules = {
  findHint: findCrosswordHint,
  bestMove: bestCrosswordMove,
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

  useHint(() => findCrosswordHint(game), { game });

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
