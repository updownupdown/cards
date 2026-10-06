import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  shuffle,
  sortCardsBySuit,
  SUITS,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { useToast } from "../common/Toast";

import { i18n } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, withNote, zoneTarget } from "@/hints/hint";

// Azul-style drafting: 3 kilns of 4 panes plus 1 on the workbench each round
// uses the 52-card deck in exactly four rounds.
const KILN_COUNT = 3;
const KILN_SIZE = 4;
const BENCH_SEED = 1;
const ROUNDS = 4;
const WINDOW_SIZE = 4;
const SHARD_PENALTIES = [1, 1, 2, 2, 2, 3, 3];
const ROW_BONUS = 3;
const COLUMN_BONUS = 6;
const WIN_SCORE = 40;

const TIERS = [
  { min: 70, key: "games:glazier.tierCathedral" },
  { min: 55, key: "games:glazier.tierMaster" },
  { min: WIN_SCORE, key: "games:glazier.tierJourneyman" },
] as const;

type Window = (PlayingCard | null)[][];

/** Where a group of panes is taken from: a kiln index, or the workbench. */
type Source = number | "bench";

type Selection = { source: Source; suit: CardSuit };

type GameState = {
  deck: PlayingCard[];
  kilns: PlayingCard[][];
  bench: PlayingCard[];
  frames: PlayingCard[][];
  window: Window;
  shards: PlayingCard[];
  discard: PlayingCard[];
  round: number;
  score: number;
  ended: boolean;
  won: boolean;
};

export type GlazierGameState = GameState;

function emptyWindow(): Window {
  return Array.from({ length: WINDOW_SIZE }, () =>
    Array.from({ length: WINDOW_SIZE }, () => null),
  );
}

const gameStateInitial: GameState = {
  deck: createDeck(),
  kilns: Array.from({ length: KILN_COUNT }, () => []),
  bench: [],
  frames: Array.from({ length: WINDOW_SIZE }, () => []),
  window: emptyWindow(),
  shards: [],
  discard: [],
  round: 0,
  score: 0,
  ended: false,
  won: false,
};

// ========== Rules ========== //
function rowHasSuit(window: Window, row: number, suit: CardSuit) {
  return window[row].some((pane) => pane?.suit === suit);
}

function columnHasSuit(window: Window, col: number, suit: CardSuit) {
  return window.some((row) => row[col]?.suit === suit);
}

/** Empty cells of a window row where a pane of this suit may be set. */
function legalCells(window: Window, row: number, suit: CardSuit) {
  if (rowHasSuit(window, row, suit)) return [];

  const cells: number[] = [];
  for (let col = 0; col < WINDOW_SIZE; col++) {
    if (!window[row][col] && !columnHasSuit(window, col, suit)) {
      cells.push(col);
    }
  }
  return cells;
}

function frameCapacity(row: number) {
  return row + 1;
}

function canFrameTake(state: GameState, row: number, suit: CardSuit) {
  const frame = state.frames[row];
  if (frame.length >= frameCapacity(row)) return false;
  if (frame.length > 0 && frame[0].suit !== suit) return false;
  return legalCells(state.window, row, suit).length > 0;
}

/** Points for a pane just set at (row, col), as in Azul. */
function paneScore(window: Window, row: number, col: number) {
  let across = 1;
  let down = 1;
  for (let c = col - 1; c >= 0 && window[row][c]; c--) across++;
  for (let c = col + 1; c < WINDOW_SIZE && window[row][c]; c++) across++;
  for (let r = row - 1; r >= 0 && window[r][col]; r--) down++;
  for (let r = row + 1; r < WINDOW_SIZE && window[r][col]; r++) down++;

  if (across === 1 && down === 1) return 1;
  return (across > 1 ? across : 0) + (down > 1 ? down : 0);
}

function shardPenalty(count: number) {
  return SHARD_PENALTIES.slice(0, count).reduce((sum, p) => sum + p, 0);
}

function endBonus(window: Window) {
  let bonus = 0;
  for (let i = 0; i < WINDOW_SIZE; i++) {
    if (window[i].every(Boolean)) bonus += ROW_BONUS;
    if (window.every((row) => row[i])) bonus += COLUMN_BONUS;
  }
  return bonus;
}

function getTier(score: number) {
  return TIERS.find((tier) => score >= tier.min);
}

function groupFrom(state: GameState, source: Source, suit: CardSuit) {
  const cards = source === "bench" ? state.bench : state.kilns[source];
  return cards.filter((card) => card.suit === suit);
}

function isDraftOver(state: GameState) {
  return (
    state.round > 0 &&
    state.bench.length === 0 &&
    state.kilns.every((kiln) => kiln.length === 0)
  );
}

/** The frame waiting to be set into the window, or -1. */
function pendingFrame(state: GameState) {
  if (state.ended || !isDraftOver(state)) return -1;
  return state.frames.findIndex(
    (frame, row) => frame.length === frameCapacity(row),
  );
}

function addShards(draft: GameState, cards: PlayingCard[]) {
  for (const card of cards) {
    if (draft.shards.length < SHARD_PENALTIES.length) {
      draft.shards.push(card);
    } else {
      draft.discard.push(...flipAllToBack([card]));
    }
  }
  draft.shards = sortCardsBySuit(draft.shards);
}

function takeGroup(
  draft: GameState,
  source: Source,
  suit: CardSuit,
  target: number | "shards",
) {
  const taken = groupFrom(draft, source, suit);
  if (taken.length === 0) return;

  if (source === "bench") {
    draft.bench = draft.bench.filter((card) => card.suit !== suit);
  } else {
    const rest = draft.kilns[source].filter((card) => card.suit !== suit);
    draft.kilns[source] = [];
    draft.bench = sortCardsBySuit([...draft.bench, ...rest]);
  }

  if (target === "shards") {
    addShards(draft, taken);
    return;
  }

  const room = frameCapacity(target) - draft.frames[target].length;
  draft.frames[target] = sortCardsBySuit([
    ...draft.frames[target],
    ...taken.slice(0, room),
  ]);
  addShards(draft, taken.slice(room));
}

/** Sets the full frame's last pane at (row, col); returns the points scored. */
function setPane(draft: GameState, row: number, col: number) {
  const frame = draft.frames[row];
  const pane = frame.pop();
  if (!pane) return 0;

  draft.window[row][col] = pane;
  draft.discard.push(...flipAllToBack(frame));
  draft.frames[row] = [];

  const points = paneScore(draft.window, row, col);
  draft.score += points;
  return points;
}

function shatterFrame(draft: GameState, row: number) {
  addShards(draft, draft.frames[row]);
  draft.frames[row] = [];
}

/** Partly filled frames whose suit can no longer be set in their row. */
function deadFrames(state: GameState) {
  return state.frames
    .map((frame, row) => ({ frame, row }))
    .filter(
      ({ frame, row }) =>
        frame.length > 0 &&
        legalCells(state.window, row, frame[0].suit).length === 0,
    )
    .map(({ row }) => row);
}

function dealRound(draft: GameState) {
  draft.round += 1;
  for (let k = 0; k < KILN_COUNT; k++) {
    draft.kilns[k] = sortCardsBySuit(
      draft.deck.splice(-KILN_SIZE).map(flipToFace),
    );
  }
  draft.bench = draft.deck.splice(-BENCH_SEED).map(flipToFace);
}

type AutoStep = {
  state: GameState;
  toast?: string;
  newRound?: boolean;
};

/**
 * The automatic steps after the draft: panes with one legal cell (or none)
 * are set (or shattered), then shards are scored and the next round is dealt
 * or the game ends. Stops early when the player must choose a cell.
 */
function buildAutoSteps(state: GameState): AutoStep[] {
  const steps: AutoStep[] = [];
  let current = state;

  if (current.ended || !isDraftOver(current)) return steps;

  for (;;) {
    const row = pendingFrame(current);
    if (row === -1) break;

    const suit = current.frames[row][0].suit;
    const cells = legalCells(current.window, row, suit);
    if (cells.length > 1) return steps;

    let points = 0;
    current = produce(current, (draft) => {
      if (cells.length === 1) {
        points = setPane(draft, row, cells[0]);
      } else {
        shatterFrame(draft, row);
      }
    });
    steps.push({
      state: current,
      toast:
        cells.length === 1
          ? i18n.t("games:glazier.paneSet", { count: points })
          : i18n.t("games:glazier.paneShattered"),
    });
  }

  const dead = deadFrames(current);
  if (dead.length > 0) {
    current = produce(current, (draft) => {
      dead.forEach((row) => shatterFrame(draft, row));
    });
    steps.push({
      state: current,
      toast: i18n.t("games:glazier.framesShattered"),
    });
  }

  if (current.shards.length > 0) {
    const penalty = shardPenalty(current.shards.length);
    current = produce(current, (draft) => {
      draft.score -= penalty;
      draft.discard.push(...flipAllToBack(draft.shards));
      draft.shards = [];
    });
    steps.push({
      state: current,
      toast: i18n.t("games:glazier.shardsPenalty", { count: penalty }),
    });
  }

  if (current.round >= ROUNDS) {
    const bonus = endBonus(current.window);
    current = produce(current, (draft) => {
      draft.score += bonus;
      draft.ended = true;
      draft.won = draft.score >= WIN_SCORE;
    });
    steps.push({
      state: current,
      toast:
        bonus > 0
          ? i18n.t("games:glazier.windowBonus", { count: bonus })
          : undefined,
    });
  } else {
    current = produce(current, dealRound);
    steps.push({ state: current, newRound: true });
  }

  return steps;
}

// —— Hints ——

/**
 * The draft as the hints see it: suits only, since a pane's rank never
 * counts. Every card of a round is on the table, so the draft can be
 * played out in full without peeking at the deck.
 */
type DraftPlan = {
  kilns: CardSuit[][];
  bench: CardSuit[];
  frames: { suit: CardSuit | null; count: number }[];
  shards: number;
};

type DraftMove = { source: Source; suit: CardSuit; target: number | "shards" };

function draftPlan(state: GameState): DraftPlan {
  return {
    kilns: state.kilns.map((kiln) => kiln.map((card) => card.suit)),
    bench: state.bench.map((card) => card.suit),
    frames: state.frames.map((frame) => ({
      suit: frame[0]?.suit ?? null,
      count: frame.length,
    })),
    shards: state.shards.length,
  };
}

function planMoves(
  plan: DraftPlan,
  canSet: (row: number, suit: CardSuit) => boolean,
): DraftMove[] {
  const sources: { source: Source; suits: CardSuit[] }[] = [
    ...plan.kilns.map((suits, k) => ({ source: k as Source, suits })),
    { source: "bench", suits: plan.bench },
  ];
  const moves: DraftMove[] = [];
  for (const { source, suits } of sources) {
    for (const suit of new Set(suits)) {
      plan.frames.forEach((frame, row) => {
        if (
          frame.count < frameCapacity(row) &&
          (frame.suit === null || frame.suit === suit) &&
          canSet(row, suit)
        ) {
          moves.push({ source, suit, target: row });
        }
      });
      moves.push({ source, suit, target: "shards" });
    }
  }
  return moves;
}

function applyPlanMove(plan: DraftPlan, move: DraftMove): DraftPlan {
  const from = move.source === "bench" ? plan.bench : plan.kilns[move.source];
  const taken = from.filter((suit) => suit === move.suit).length;
  const rest = from.filter((suit) => suit !== move.suit);
  const next: DraftPlan = {
    kilns:
      move.source === "bench"
        ? plan.kilns
        : plan.kilns.map((kiln, k) => (k === move.source ? [] : kiln)),
    bench: move.source === "bench" ? rest : [...plan.bench, ...rest],
    frames: plan.frames,
    shards: plan.shards,
  };
  if (move.target === "shards") {
    next.shards += taken;
    return next;
  }
  const row = move.target;
  const frame = plan.frames[row];
  const kept = Math.min(taken, frameCapacity(row) - frame.count);
  next.frames = plan.frames.map((other, index) =>
    index === row ? { suit: move.suit, count: frame.count + kept } : other,
  );
  next.shards += taken - kept;
  return next;
}

/**
 * How promising a window is beyond the points already scored: rows and
 * columns on their way to a bonus, and cells no suit can fill any more
 * (they spoil a row and a column for good). On the last round, the bonus.
 */
function windowOutlook(window: Window, lastRound: boolean) {
  if (lastRound) return endBonus(window);
  // The suits in each row and column, as bits.
  const rowSuits = Array<number>(WINDOW_SIZE).fill(0);
  const columnSuits = Array<number>(WINDOW_SIZE).fill(0);
  const rowPanes = Array<number>(WINDOW_SIZE).fill(0);
  const columnPanes = Array<number>(WINDOW_SIZE).fill(0);
  window.forEach((cells, row) =>
    cells.forEach((pane, col) => {
      if (!pane) return;
      const bit = 1 << SUITS.indexOf(pane.suit);
      rowSuits[row] |= bit;
      columnSuits[col] |= bit;
      rowPanes[row] += 1;
      columnPanes[col] += 1;
    }),
  );
  const allSuits = (1 << SUITS.length) - 1;
  let outlook = 0;
  for (let i = 0; i < WINDOW_SIZE; i++) {
    outlook += ROW_BONUS * (rowPanes[i] / WINDOW_SIZE) ** 2;
    outlook += COLUMN_BONUS * (columnPanes[i] / WINDOW_SIZE) ** 2;
    for (let col = 0; col < WINDOW_SIZE; col++) {
      const blocked = (rowSuits[i] | columnSuits[col]) === allSuits;
      if (!window[i][col] && blocked) outlook -= 2;
    }
  }
  return outlook;
}

/** A window with a pane (only its suit matters here) set at (row, col). */
function withPane(window: Window, row: number, col: number, suit: CardSuit) {
  return window.map((cells, r) =>
    r === row
      ? cells.map((pane, c) =>
          c === col
            ? ({ suit, rank: "A", id: "", faceUp: true } as const)
            : pane,
        )
      : cells,
  );
}

/** The best cell for a pane of this suit in a row: points and outlook. */
function bestCell(
  window: Window,
  row: number,
  suit: CardSuit,
  lastRound: boolean,
) {
  let best: { col: number; points: number; value: number } | null = null;
  for (const col of legalCells(window, row, suit)) {
    const next = withPane(window, row, col, suit);
    const points = paneScore(next, row, col);
    const value = points + windowOutlook(next, lastRound);
    if (!best || value > best.value) best = { col, points, value };
  }
  return best;
}

/** What the frames are worth, and the panes they will lose as shards. */
type FramesWorth = { value: number; lost: number };

/**
 * What the frames are worth once the round is over: the panes the full
 * ones set (in row order, as the game sets them) and the window they leave,
 * and the frames still filling, which pay in a later round.
 */
function framesWorth(frames: DraftPlan["frames"], state: GameState) {
  const lastRound = state.round >= ROUNDS;
  let window = state.window;
  let value = 0;
  let lost = 0;
  frames.forEach((frame, row) => {
    if (!frame.suit) return;
    const cell = bestCell(window, row, frame.suit, lastRound);
    if (!cell) {
      lost += frame.count;
      return;
    }
    if (frame.count === frameCapacity(row)) {
      window = withPane(window, row, cell.col, frame.suit);
      value += cell.points;
    } else if (!lastRound) {
      value += (2 * frame.count) / frameCapacity(row);
    }
  });
  return { value: value + windowOutlook(window, lastRound), lost };
}

/**
 * The draft move to make: each move is played out to the end of the round,
 * every later pick the one that leaves the best position (its frames, less
 * its shards).
 */
function bestDraftMove(state: GameState) {
  // Many draft positions share their frames: work each out once, and
  // where each suit may still be set, once.
  const fits = new Map<string, boolean>();
  const canSet = (row: number, suit: CardSuit) => {
    const key = `${row}-${suit}`;
    let fit = fits.get(key);
    if (fit === undefined) {
      fit = legalCells(state.window, row, suit).length > 0;
      fits.set(key, fit);
    }
    return fit;
  };
  const worths = new Map<string, FramesWorth>();
  const planValue = (plan: DraftPlan) => {
    const key = plan.frames
      .map((frame) => `${frame.suit}${frame.count}`)
      .join();
    let worth = worths.get(key);
    if (!worth) {
      worth = framesWorth(plan.frames, state);
      worths.set(key, worth);
    }
    const shards = Math.min(plan.shards + worth.lost, SHARD_PENALTIES.length);
    return worth.value - shardPenalty(shards);
  };
  const root = draftPlan(state);
  // Lines of play meet again: each position is played out once.
  const ends = new Map<string, number>();
  const rollout = (plan: DraftPlan): number => {
    const key = [
      ...plan.kilns.map((kiln) => kiln.join()),
      [...plan.bench].sort().join(),
      ...plan.frames.map((frame) => `${frame.suit}${frame.count}`),
      plan.shards,
    ].join("/");
    const known = ends.get(key);
    if (known !== undefined) return known;
    let best: { plan: DraftPlan; value: number } | null = null;
    for (const move of planMoves(plan, canSet)) {
      const next = applyPlanMove(plan, move);
      const value = planValue(next);
      if (!best || value > best.value) best = { plan: next, value };
    }
    const end = best ? rollout(best.plan) : planValue(plan);
    ends.set(key, end);
    return end;
  };
  let best: { move: DraftMove; value: number } | null = null;
  for (const move of planMoves(root, canSet)) {
    const value = rollout(applyPlanMove(root, move));
    if (!best || value > best.value + 1e-9) best = { move, value };
  }
  return best?.move ?? null;
}

function findGlazierHint(state: GameState, selection: Selection | null) {
  if (state.ended || state.round === 0) return null;

  const row = pendingFrame(state);
  if (row !== -1) {
    const frame = state.frames[row];
    const cell = bestCell(
      state.window,
      row,
      frame[0].suit,
      state.round >= ROUNDS,
    );
    if (!cell) return null;
    return withNote(
      makeHint(
        "moveCard",
        cardTarget(frame[frame.length - 1]),
        zoneTarget(`cell-${row}-${cell.col}`),
      ),
      i18n.t("games:glazier.hint.cell", { count: cell.points }),
    );
  }
  if (isDraftOver(state)) return null;

  const move = bestDraftMove(state);
  if (!move) return null;
  const group = groupFrom(state, move.source, move.suit);
  const chosen =
    selection?.source === move.source && selection.suit === move.suit;
  const hint = makeHint(
    group.length > 1 ? "moveCards" : "moveCard",
    chosen ? [] : cardTarget(group[0]),
    zoneTarget(
      move.target === "shards" ? "shards" : `frameSlot-${move.target}`,
    ),
  );
  return move.target === "shards"
    ? withNote(hint, i18n.t("games:glazier.hint.shards"))
    : hint;
}

export const glazierRules = {
  findHint: findGlazierHint,
  emptyWindow,
  legalCells,
  canFrameTake,
  paneScore,
  shardPenalty,
  endBonus,
  getTier,
  groupFrom,
  isDraftOver,
  pendingFrame,
  takeGroup,
  setPane,
  deadFrames,
  dealRound,
  buildAutoSteps,
  winScore: WIN_SCORE,
  rounds: ROUNDS,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.deck,
      ...draft.kilns.flat(),
      ...draft.bench,
      ...draft.frames.flat(),
      ...draft.window.flat().filter((card): card is PlayingCard => !!card),
      ...draft.shards,
      ...draft.discard,
    ];

    draft.deck = shuffle(flipAllToBack(allCards));
    draft.kilns = Array.from({ length: KILN_COUNT }, () => []);
    draft.bench = [];
    draft.frames = Array.from({ length: WINDOW_SIZE }, () => []);
    draft.window = emptyWindow();
    draft.shards = [];
    draft.discard = [];
    draft.round = 0;
    draft.score = 0;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame(dealRound);
}

// ========== Layout ========== //
// Zone columns and widths include the grid gap between cards, but fan offsets
// are in plain card widths: fans are stretched by (1 + GAP) so they end exactly
// at their zone's edge.
const GAP = 0.1;
const FAN_SCALE = 1 + GAP;
const HUD_BARS_ROW = 0;
const KILN_ROW = 0.6;
const KILN_OFFSET = 0.4;
const KILN_WIDTH = 1 + (KILN_SIZE - 1) * KILN_OFFSET;
const KILN_GAP = 0.15;
const GRID_RIGHT = KILN_COUNT * KILN_WIDTH + (KILN_COUNT - 1) * KILN_GAP;
const BENCH_ROW = KILN_ROW + 1.2;
const BENCH_COL = 1.15;
const BENCH_WIDTH = GRID_RIGHT - BENCH_COL;
const BENCH_SUIT_GAP = 0.6;
const WINDOW_ROW = BENCH_ROW + 1.25;
const WINDOW_COL = GRID_RIGHT - WINDOW_SIZE;
const FRAME_OFFSET = 0.4;
const FRAME_RIGHT = WINDOW_COL - 0.15;
const SHARD_ROW = WINDOW_ROW + WINDOW_SIZE + 0.15;
const SHARD_OFFSET = 0.75;

function benchFanOffsets(bench: PlayingCard[]) {
  const suitBreaks = bench.filter(
    (card, i) => i > 0 && card.suit !== bench[i - 1].suit,
  ).length;
  const room = BENCH_WIDTH - 1 - suitBreaks * BENCH_SUIT_GAP;
  const base = Math.min(0.55, room / Math.max(1, bench.length - 1));

  return bench
    .slice(1)
    .map(
      (card, i) =>
        (base + (card.suit !== bench[i].suit ? BENCH_SUIT_GAP : 0)) * FAN_SCALE,
    );
}

// ========== Component ========== //
export default function Glazier() {
  const { colorPale, colorDark } = useGameColors();
  const showToast = useToast();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const runningRef = useRef(false);

  const {
    isLoaded,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    clearUndoHistory,
    reset,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
    resetNonGameStates: () => {
      setSelection(null);
    },
  });

  const tilingRow = pendingFrame(game);
  const tilingSuit = tilingRow === -1 ? null : game.frames[tilingRow][0].suit;
  const tilingCells = useMemo(
    () =>
      tilingSuit === null ? [] : legalCells(game.window, tilingRow, tilingSuit),
    [game.window, tilingRow, tilingSuit],
  );

  const selectedGroup = useMemo(
    () => (selection ? groupFrom(game, selection.source, selection.suit) : []),
    [game, selection],
  );
  const activeSelection = selectedGroup.length > 0 ? selection : null;

  const validFrames = useMemo(
    () =>
      activeSelection
        ? game.frames
            .map((_, row) => row)
            .filter((row) => canFrameTake(game, row, activeSelection.suit))
        : [],
    [activeSelection, game],
  );

  const inputLocked = busy || game.ended || game.round === 0;

  useHint(() => findGlazierHint(game, activeSelection), {
    game,
    enabled: !busy,
  });

  // Round end: run whatever needs no decision (also resumes a saved game
  // that was closed part-way through).
  useEffect(() => {
    if (runningRef.current || game.ended || !isDraftOver(game)) return;

    const steps = buildAutoSteps(game);
    if (steps.length === 0) return;

    runningRef.current = true;
    setBusy(true);

    (async () => {
      try {
        await delay();
        for (const step of steps) {
          setGame(step.state);
          if (step.toast) showToast(step.toast);
          await delay();
        }
        if (steps.some((step) => step.newRound)) {
          // The next deal is now on the table: undoing into the last round
          // would let a player replan it with that knowledge.
          clearUndoHistory();
          const round = steps[steps.length - 1].state.round;
          showToast(
            i18n.t("games:glazier.roundStart", { round, total: ROUNDS }),
          );
        }
      } finally {
        runningRef.current = false;
        setBusy(false);
      }
    })();
  }, [game, busy, setGame, showToast, clearUndoHistory]);

  function selectGroup(source: Source, suit: CardSuit) {
    if (inputLocked || tilingRow !== -1) return;

    setSelection((prev) =>
      prev && prev.source === source && prev.suit === suit
        ? null
        : { source, suit },
    );
  }

  function placeSelection(target: number | "shards") {
    if (inputLocked || !activeSelection) return;
    if (target !== "shards" && !validFrames.includes(target)) return;

    saveUndoState(structuredClone(game));
    setSelection(null);
    setGame(
      produce(game, (draft) => {
        takeGroup(draft, activeSelection.source, activeSelection.suit, target);
      }),
    );
  }

  function chooseCell(col: number) {
    if (busy || tilingRow === -1 || !tilingCells.includes(col)) return;

    saveUndoState(structuredClone(game));
    let points = 0;
    setGame(
      produce(game, (draft) => {
        points = setPane(draft, tilingRow, col);
      }),
    );
    showToast(i18n.t("games:glazier.paneSet", { count: points }));
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const kilnZones: MapZone[] = game.kilns.map((kiln, k) => ({
      id: `kiln-${k}`,
      name: "kiln",
      pileIndex: k,
      cards: kiln,
      col: k * (KILN_WIDTH + KILN_GAP),
      row: KILN_ROW,
      width: KILN_WIDTH,
      baseZIndex: 10,
      fan: { direction: "right", offset: KILN_OFFSET * FAN_SCALE },
      placeholder: { showCount: false },
    }));

    // Frames fill from the window side, as in Azul.
    const frameZones: MapZone[] = game.frames.flatMap((frame, row) => {
      const slotWidth = 1 + row * FRAME_OFFSET;
      const cardsWidth = 1 + Math.max(0, frame.length - 1) * FRAME_OFFSET;
      return [
        {
          id: `frameSlot-${row}`,
          name: "frameSlot",
          pileIndex: row,
          col: FRAME_RIGHT - slotWidth,
          row: WINDOW_ROW + row,
          width: slotWidth,
          baseZIndex: 5,
          placeholder: { showCount: false },
        },
        {
          id: `frame-${row}`,
          name: "frame",
          pileIndex: row,
          cards: frame,
          col: FRAME_RIGHT - cardsWidth,
          row: WINDOW_ROW + row,
          width: cardsWidth,
          baseZIndex: 10,
          fan: {
            direction: "right",
            offset: FRAME_OFFSET * FAN_SCALE,
            center: false,
          },
        },
      ];
    });

    const cellZones: MapZone[] = game.window.flatMap((cells, row) =>
      cells.map((pane, col) => ({
        id: `cell-${row}-${col}`,
        name: "cell",
        pileIndex: row,
        refIndex: col,
        cards: pane ? [pane] : [],
        col: WINDOW_COL + col,
        row: WINDOW_ROW + row,
        baseZIndex: 10,
        placeholder: { showCount: false },
      })),
    );

    const shardLabelZones: MapZone[] = SHARD_PENALTIES.map((_, i) => ({
      id: `shardLabel-${i}`,
      col: i * SHARD_OFFSET,
      row: SHARD_ROW + 1.1,
      width: i === SHARD_PENALTIES.length - 1 ? 1 : SHARD_OFFSET,
      height: 0.25,
    }));

    return [
      ...kilnZones,
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: BENCH_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {},
      },
      {
        id: "bench",
        name: "bench",
        cards: game.bench,
        col: BENCH_COL,
        row: BENCH_ROW,
        width: BENCH_WIDTH,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offsets: benchFanOffsets(game.bench),
          center: false,
        },
        placeholder: { showCount: false },
      },
      ...frameZones,
      ...cellZones,
      {
        id: "shards",
        name: "shard",
        cards: game.shards,
        col: 0,
        row: SHARD_ROW,
        width: 1 + (SHARD_PENALTIES.length - 1) * SHARD_OFFSET,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: SHARD_OFFSET * FAN_SCALE,
          center: false,
        },
        placeholder: { showCount: false },
      },
      ...shardLabelZones,
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: GRID_RIGHT - 1,
        row: SHARD_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {},
      },
      {
        id: "hudBars",
        col: 0,
        row: HUD_BARS_ROW,
        width: "full",
        height: 0.45,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const { card, zoneName, pileIndex } = mappedCard;

    if (zoneName === "kiln" || zoneName === "bench") {
      const source: Source = zoneName === "bench" ? "bench" : pileIndex!;
      const isSelected =
        !!activeSelection &&
        activeSelection.source === source &&
        activeSelection.suit === card.suit;

      return {
        onPress: () => selectGroup(source, card.suit),
        isDisabled: inputLocked || tilingRow !== -1,
        isSelected,
        selectColor: isSelected ? "blue" : "none",
        forceSelectColor: isSelected,
      };
    }

    if (zoneName === "frame" && pileIndex !== undefined) {
      const isValid = validFrames.includes(pileIndex);
      const isTiling = tilingRow === pileIndex;

      return {
        onPress: () => placeSelection(pileIndex),
        isDisabled: !isValid,
        selectColor: isTiling ? "purple" : isValid ? "green" : "none",
        forceOverlayColor: isValid || isTiling,
      };
    }

    if (zoneName === "shard") {
      return {
        onPress: () => placeSelection("shards"),
        isDisabled: inputLocked || !activeSelection,
        selectColor: activeSelection ? "orange" : "none",
        forceOverlayColor: !!activeSelection,
      };
    }

    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "frameSlot" && zone.pileIndex !== undefined) {
      const row = zone.pileIndex;
      const isValid = validFrames.includes(row);
      return {
        onPress: () => placeSelection(row),
        isDisabled: !isValid,
        selectColor: tilingRow === row ? "purple" : isValid ? "green" : "none",
      };
    }

    if (zone.name === "cell" && zone.refIndex !== undefined) {
      const col = zone.refIndex;
      const isLegal =
        !busy && tilingRow === zone.pileIndex && tilingCells.includes(col);
      return {
        onPress: () => chooseCell(col),
        isDisabled: !isLegal,
        selectColor: isLegal ? "green" : "none",
      };
    }

    if (zone.name === "shard") {
      return {
        onPress: () => placeSelection("shards"),
        isDisabled: inputLocked || !activeSelection,
        selectColor: activeSelection ? "orange" : "none",
      };
    }

    return;
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: GAP,
    cardSize: "small",
    cardMapper,
    zoneMapper,
  });

  const tier = getTier(game.score);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={game.score}
      hideScore
      winLoseMessage={
        game.won && tier
          ? i18n.t("games:glazier.wonWithTier", {
              score: game.score,
              tier: i18n.t(tier.key),
            })
          : i18n.t("games:glazier.lostShortOfTarget", {
              score: game.score,
              target: WIN_SCORE,
            })
      }
      canUndo={canUndo && !busy}
      undo={() => {
        setSelection(null);
        undo();
      }}
    >
      {cardMap}

      {SHARD_PENALTIES.map((penalty, i) => (
        <View
          key={`shard-label-${i}`}
          style={[
            pointerEventsStyles.none,
            getZoneStylesById(`shardLabel-${i}`),
            flexStyles.colCentered,
          ]}
        >
          <Text size="sm" weight={500} color={colorPale}>
            {`−${penalty}`}
          </Text>
        </View>
      ))}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("hudBars"),
          flexStyles.rowCentered,
          { gap: cardHeight * 0.15 },
        ]}
      >
        <ProgressBar
          progressValue={game.round}
          totalValue={ROUNDS}
          color="blue"
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:glazier.round")}
          tallyText={`${Math.max(1, game.round)} / ${ROUNDS}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 1 }}
        />
        <ProgressBar
          progressValue={Math.max(0, game.score)}
          totalValue={WIN_SCORE}
          color={
            game.score >= WIN_SCORE
              ? "green"
              : game.score < 0
                ? "red"
                : "orange"
          }
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:glazier.score")}
          tallyText={`${game.score} / ${WIN_SCORE}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 2 }}
        />
      </View>
    </GameWrapper>
  );
}
