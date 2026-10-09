import { useFade } from "@/hooks/useFade";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  type CardRank,
  flipAllToBack,
  flipToBack,
  flipToFace,
  type PlayingCard,
  rankValue,
  shuffle,
  sortCardsByRank,
  SUITS,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { infoSize } from "../Cards/CardMapBackgrounds";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { useHint } from "@/hints/hint-store";
import {
  cardTarget,
  makeHint,
  pressHint,
  withNote,
  zoneTarget,
} from "@/hints/hint";

import { i18n } from "@/i18n";
const handWidth = 6;
const WOLFS_GAMBIT_STARTING_HAND = 4;
const WOLFS_GAMBIT_WIN_TARGET = 100;

export type LycanMode = "hard" | "medium" | "easy";
export type LycanAction = "perfect" | "sum" | "split" | "over";

export type LycanGameState = {
  deck: PlayingCard[];
  player: PlayingCard[];
  wolf: PlayingCard[];
  discard: PlayingCard[];
  playerScore: number;
  wolfScore: number;
  round: number;
  roundOver: boolean;
  roundWon: boolean;
  roundPoints: number;
  ended: boolean;
  won: boolean;
  mode: LycanMode;
};

const actionColourMap: Record<LycanAction, string> = {
  perfect: "green",
  sum: "purple",
  split: "pink",
  over: "orange",
};

const gameStateInitial: LycanGameState = {
  deck: shuffle(buildLycanDeck("medium")).map(flipToBack),
  player: [],
  wolf: [],
  discard: [],
  playerScore: 0,
  wolfScore: 0,
  round: 1,
  roundOver: false,
  roundWon: false,
  roundPoints: 0,
  ended: false,
  won: false,
  mode: "medium",
};

function rankToCard(rank: number): CardRank {
  return rank === 1 ? "A" : (String(rank) as CardRank);
}

function buildLycanDeck(
  mode: LycanMode,
  random: () => number = Math.random,
): PlayingCard[] {
  const maxRank = mode === "easy" ? 8 : mode === "hard" ? 10 : 9;
  const cards: PlayingCard[] = [];

  for (let copy = 0; copy < 5; copy += 1) {
    for (let rank = 1; rank <= maxRank; rank += 1) {
      cards.push({
        id: `${copy}-${rank}-${random().toString(36).slice(2, 8)}`,
        suit: SUITS[copy % SUITS.length],
        rank: rankToCard(rank),
        faceUp: false,
      });
    }
  }

  return cards;
}

function sumLycanCards(cards: readonly PlayingCard[]) {
  return cards.reduce((sum, card) => sum + rankValue(card), 0);
}

function detectLycanAction(
  player: readonly PlayingCard[],
  wolf: readonly PlayingCard[],
): LycanAction | null {
  if (player.length === 0 || wolf.length === 0) return null;

  const playerTotal = sumLycanCards(player);
  const wolfTotal = sumLycanCards(wolf);

  if (player.length === 1 && wolf.length === 1) {
    if (playerTotal === wolfTotal) return "perfect";
    if (playerTotal > wolfTotal) return "over";
    return null;
  }

  if (player.length >= 2 && wolf.length === 1) {
    return playerTotal === wolfTotal ? "sum" : null;
  }

  if (player.length === 1 && wolf.length >= 2) {
    return wolfTotal === playerTotal ? "split" : null;
  }

  return null;
}

function getLycanCaptureEffect(
  player: readonly PlayingCard[],
  wolf: readonly PlayingCard[],
) {
  const action = detectLycanAction(player, wolf);
  if (action === null) return null;

  if (action === "perfect" || action === "sum") {
    return { action, drawFor: "player" as const, drawCount: 1 };
  }

  if (action === "split") {
    return { action, drawFor: "wolf" as const, drawCount: 1 };
  }

  return {
    action,
    drawFor: "wolf" as const,
    drawCount: rankValue(player[0]) - rankValue(wolf[0]),
  };
}

function scoreLycanRound(
  state: Readonly<LycanGameState>,
  roundWon: boolean,
): LycanGameState {
  const roundPoints = sumLycanCards(roundWon ? state.player : state.wolf);
  const playerScore = state.playerScore + (roundWon ? roundPoints : 0);
  const wolfScore = state.wolfScore + (roundWon ? 0 : roundPoints);
  const ended =
    playerScore >= WOLFS_GAMBIT_WIN_TARGET ||
    wolfScore >= WOLFS_GAMBIT_WIN_TARGET;

  return {
    ...state,
    playerScore,
    wolfScore,
    roundPoints,
    roundWon,
    roundOver: true,
    ended,
    won: ended ? playerScore >= WOLFS_GAMBIT_WIN_TARGET : state.won,
  };
}

function assertLycanInvariants(state: Readonly<LycanGameState>) {
  const cards = [
    ...state.deck,
    ...state.player,
    ...state.wolf,
    ...state.discard,
  ];
  const uniqueIds = new Set(cards.map((card) => card.id));

  if (uniqueIds.size !== cards.length) {
    throw new Error("A Lycan card exists in more than one zone");
  }
  if (state.playerScore < 0 || state.wolfScore < 0 || state.roundPoints < 0) {
    throw new Error("Lycan scores cannot be negative");
  }
  if (
    state.ended &&
    state.playerScore < WOLFS_GAMBIT_WIN_TARGET &&
    state.wolfScore < WOLFS_GAMBIT_WIN_TARGET
  ) {
    throw new Error("An ended Lycan game must have a score at the win target");
  }
}

function keepTopFaceUp(draft: LycanGameState) {
  if (draft.deck.length > 0) {
    draft.deck[draft.deck.length - 1] = flipToFace(
      draft.deck[draft.deck.length - 1],
    );
  }
}

function drawTo(draft: LycanGameState, who: "player" | "wolf", count: number) {
  for (let i = 0; i < count; i += 1) {
    if (draft.deck.length === 0) break;
    const card = draft.deck.pop();
    if (card) draft[who].push(flipToFace(card));
  }
  keepTopFaceUp(draft);
}

function resetDeck(
  draft: LycanGameState,
  mode: LycanMode,
  random: () => number = Math.random,
) {
  const allCards = flipAllToBack([
    ...draft.deck,
    ...draft.player,
    ...draft.wolf,
    ...draft.discard,
  ]);

  // Reset cards if the mode has changed
  if (draft.mode !== mode) {
    draft.mode = mode;
    draft.deck = shuffle(buildLycanDeck(mode, random), random);
  } else {
    draft.deck = shuffle(allCards, random);
  }

  draft.player = [];
  draft.wolf = [];
  draft.discard = [];
}

function dealRound(draft: LycanGameState) {
  for (let i = 0; i < WOLFS_GAMBIT_STARTING_HAND; i += 1) {
    const c = draft.deck.pop();
    if (c) draft.wolf.push(flipToFace(c));
  }
  for (let i = 0; i < WOLFS_GAMBIT_STARTING_HAND; i += 1) {
    const c = draft.deck.pop();
    if (c) draft.player.push(flipToFace(c));
  }

  draft.player = sortCardsByRank(draft.player);
  draft.wolf = sortCardsByRank(draft.wolf);

  keepTopFaceUp(draft);
  draft.roundOver = false;
}

function finishRound(draft: LycanGameState, won: boolean) {
  Object.assign(draft, scoreLycanRound(draft, won));
}

function foldLycanRoundAction(draft: LycanGameState) {
  if (draft.ended || draft.roundOver) return false;
  finishRound(draft, false);
  return true;
}

function startNextLycanRoundAction(
  draft: LycanGameState,
  mode: LycanMode,
  random: () => number = Math.random,
) {
  if (!draft.roundOver) return false;
  resetDeck(draft, mode, random);
  if (draft.ended) return true;
  draft.round += 1;
  dealRound(draft);
  return true;
}

export type LycanCapturePlan = {
  playerIds: string[];
  wolfIds: string[];
  effect: NonNullable<ReturnType<typeof getLycanCaptureEffect>>;
  roundWillEnd: boolean;
};

function createLycanCapturePlan(
  state: Readonly<LycanGameState>,
  playerIds: readonly string[],
  wolfIds: readonly string[],
): LycanCapturePlan | null {
  if (state.ended || state.roundOver) return null;

  const uniquePlayerIds = [...new Set(playerIds)];
  const uniqueWolfIds = [...new Set(wolfIds)];
  const selectedPlayer = state.player.filter((card) =>
    uniquePlayerIds.includes(card.id),
  );
  const selectedWolf = state.wolf.filter((card) =>
    uniqueWolfIds.includes(card.id),
  );
  if (
    selectedPlayer.length !== uniquePlayerIds.length ||
    selectedWolf.length !== uniqueWolfIds.length
  ) {
    return null;
  }

  const effect = getLycanCaptureEffect(selectedPlayer, selectedWolf);
  if (!effect) return null;

  return {
    playerIds: uniquePlayerIds,
    wolfIds: uniqueWolfIds,
    effect,
    // The Wolf draws after a split or an overpower, unless the deck is out.
    roundWillEnd:
      selectedWolf.length === state.wolf.length &&
      (effect.drawFor === "player" || state.deck.length === 0),
  };
}

function removeLycanCaptureAction(
  draft: LycanGameState,
  plan: LycanCapturePlan,
) {
  const playerIds = new Set(plan.playerIds);
  const wolfIds = new Set(plan.wolfIds);
  const selectedPlayer = draft.player.filter((card) => playerIds.has(card.id));
  const selectedWolf = draft.wolf.filter((card) => wolfIds.has(card.id));
  if (
    selectedPlayer.length !== playerIds.size ||
    selectedWolf.length !== wolfIds.size
  ) {
    return false;
  }

  draft.player = draft.player.filter((card) => !playerIds.has(card.id));
  draft.wolf = draft.wolf.filter((card) => !wolfIds.has(card.id));
  draft.discard.push(
    ...flipAllToBack(selectedPlayer),
    ...flipAllToBack(selectedWolf),
  );
  return true;
}

function completeLycanCaptureAction(
  draft: LycanGameState,
  plan: LycanCapturePlan,
) {
  drawTo(draft, plan.effect.drawFor, plan.effect.drawCount);
  draft.player = sortCardsByRank(draft.player);
  draft.wolf = sortCardsByRank(draft.wolf);
  if (draft.wolf.length === 0) finishRound(draft, true);
}

function executeLycanCaptureAction(
  draft: LycanGameState,
  playerIds: readonly string[],
  wolfIds: readonly string[],
) {
  const plan = createLycanCapturePlan(draft, playerIds, wolfIds);
  if (!plan || !removeLycanCaptureAction(draft, plan)) return null;
  completeLycanCaptureAction(draft, plan);
  return plan;
}

// ── Hints ────────────────────────────────────────────────────────────────────

/** The capture button's label, named after the capture, as the rules name it. */
function lycanActionLabel(action: LycanAction) {
  switch (action) {
    case "perfect":
      return i18n.t("games:lycan.action.perfect");
    case "sum":
      return i18n.t("games:lycan.action.sum");
    case "split":
      return i18n.t("games:lycan.action.split");
    case "over":
      return i18n.t("games:lycan.action.over");
  }
}

/**
 * A round as the player knows it: card values in sorted hands, the deck's
 * face-up top (0 when the deck is out), and how many of each value are
 * still unseen (the rest of the deck, face down).
 */
type LycanView = {
  player: number[];
  wolf: number[];
  top: number;
  unseen: number[];
};

/** A capture, as indexes into the player's and the Wolf's hands. */
type LycanMove = { player: number[]; wolf: number[] };

/** Positions the hint may weigh before it settles for a shallower look. */
const HINT_BUDGET = 3000;
/** Captures the hint looks ahead. */
const HINT_MAX_DEPTH = 3;
/** Past the first capture, how many of the likeliest captures it follows. */
const HINT_WIDTH = 4;

class OutOfBudget extends Error {}

type LycanSearch = { memo: Map<string, number>; left: number };

function sumValues(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

/**
 * Each set of two or more cards (by value: equal cards are one choice) whose
 * values add up to `target`. `values` is sorted.
 */
function subsetsSumming(values: readonly number[], target: number) {
  const found: number[][] = [];
  const picked: number[] = [];
  const visit = (start: number, left: number) => {
    if (left === 0) {
      if (picked.length >= 2) found.push([...picked]);
      return;
    }
    for (let index = start; index < values.length; index += 1) {
      if (values[index] > left) break;
      if (index > start && values[index] === values[index - 1]) continue;
      picked.push(index);
      visit(index + 1, left - values[index]);
      picked.pop();
    }
  };
  visit(0, target);
  return found;
}

/** Every capture on offer, one per choice of values. */
function lycanMoves(player: readonly number[], wolf: readonly number[]) {
  const moves: LycanMove[] = [];
  player.forEach((value, index) => {
    if (index > 0 && value === player[index - 1]) return;
    wolf.forEach((wolfValue, wolfIndex) => {
      if (wolfIndex > 0 && wolfValue === wolf[wolfIndex - 1]) return;
      // Perfect, or an overpower.
      if (value >= wolfValue) {
        moves.push({ player: [index], wolf: [wolfIndex] });
      }
    });
    for (const split of subsetsSumming(wolf, value)) {
      moves.push({ player: [index], wolf: split });
    }
  });
  wolf.forEach((value, index) => {
    if (index > 0 && value === wolf[index - 1]) return;
    for (const sum of subsetsSumming(player, value)) {
      moves.push({ player: sum, wolf: [index] });
    }
  });
  return moves;
}

/**
 * What the round is worth from here, `depth` captures ahead: the player's
 * hand once the Wolf's is cleared, else at worst minus the Wolf's hand (a
 * fold, always on offer).
 */
function lycanDecide(view: LycanView, depth: number, search: LycanSearch) {
  if (view.wolf.length === 0) return sumValues(view.player);
  const fold = -sumValues(view.wolf);
  if (depth === 0) return fold;
  const key = `${view.player.join(",")}/${view.wolf.join(",")}/${view.top}/${view.unseen.join(",")}/${depth}`;
  const known = search.memo.get(key);
  if (known !== undefined) return known;
  search.left -= 1;
  if (search.left < 0) throw new OutOfBudget();
  let moves = lycanMoves(view.player, view.wolf);
  if (depth > 1 && moves.length > HINT_WIDTH) {
    // Deeper down, only the captures that look best a capture ahead.
    const shallow = moves.map((move) => lycanMoveValue(view, move, 1, search));
    moves = moves
      .map((move, index) => ({ move, value: shallow[index] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, HINT_WIDTH)
      .map(({ move }) => move);
  }
  let best = fold;
  for (const move of moves) {
    best = Math.max(best, lycanMoveValue(view, move, depth, search));
  }
  search.memo.set(key, best);
  return best;
}

function lycanMoveValue(
  view: LycanView,
  move: LycanMove,
  depth: number,
  search: LycanSearch,
) {
  const playerValue = view.player[move.player[0]];
  const wolfValue = view.wolf[move.wolf[0]];
  const single = move.player.length === 1 && move.wolf.length === 1;
  // Perfect and sum draw the player a card; split and overpower, the Wolf.
  const toPlayer =
    (single && playerValue === wolfValue) || move.player.length >= 2;
  return lycanDraw(
    {
      ...view,
      player: view.player.filter((_, index) => !move.player.includes(index)),
      wolf: view.wolf.filter((_, index) => !move.wolf.includes(index)),
    },
    toPlayer,
    single && !toPlayer ? playerValue - wolfValue : 1,
    depth,
    search,
  );
}

/**
 * Draws `count` cards into a hand, then decides. Each draw takes the
 * face-up top and turns the next card up: that one could be any unseen
 * value, so the last draw is weighed over each. (Cards drawn before it, in
 * an overpower, take the likeliest value, to keep the look ahead quick.)
 */
function lycanDraw(
  view: LycanView,
  toPlayer: boolean,
  count: number,
  depth: number,
  search: LycanSearch,
): number {
  if (count === 0 || view.top === 0) {
    return lycanDecide(view, depth - 1, search);
  }
  const hand = [...(toPlayer ? view.player : view.wolf), view.top].sort(
    (a, b) => a - b,
  );
  const drawn = {
    player: toPlayer ? hand : view.player,
    wolf: toPlayer ? view.wolf : hand,
  };
  const turnUp = (value: number) => {
    const unseen = [...view.unseen];
    unseen[value] -= 1;
    return lycanDraw(
      { ...drawn, top: value, unseen },
      toPlayer,
      count - 1,
      depth,
      search,
    );
  };
  const total = sumValues(view.unseen);
  // The card turned up last only matters to captures still to come.
  if (total === 0 || (count === 1 && depth === 1)) {
    return lycanDraw(
      { ...drawn, top: 0, unseen: view.unseen },
      toPlayer,
      count - 1,
      depth,
      search,
    );
  }
  if (count > 1) {
    return turnUp(
      view.unseen.reduce(
        (best, left, value) => (left >= view.unseen[best] ? value : best),
        0,
      ),
    );
  }
  return view.unseen.reduce(
    (expected, left, value) =>
      left === 0 ? expected : expected + (left / total) * turnUp(value),
    0,
  );
}

/**
 * The capture (or the fold) worth the most from this round. Only the deck's
 * top card shows, so the cards it turns up next are weighed over the values
 * not yet seen. The look ahead goes as many captures deep as the budget
 * allows a full look at every capture.
 */
function bestLycanMove(state: Readonly<LycanGameState>) {
  const view: LycanView = {
    player: state.player.map((card) => rankValue(card)),
    wolf: state.wolf.map((card) => rankValue(card)),
    top: 0,
    unseen: Array.from({ length: 11 }, () => 0),
  };
  state.deck.forEach((card, index) => {
    if (index === state.deck.length - 1 && card.faceUp) {
      view.top = rankValue(card);
    } else {
      view.unseen[rankValue(card)] += 1;
    }
  });

  const moves = lycanMoves(view.player, view.wolf);
  let values: number[] = [];
  const search: LycanSearch = { memo: new Map(), left: HINT_BUDGET };
  for (let depth = 1; depth <= HINT_MAX_DEPTH; depth += 1) {
    try {
      values = moves.map((move) => lycanMoveValue(view, move, depth, search));
    } catch (error) {
      if (!(error instanceof OutOfBudget)) throw error;
      break;
    }
  }
  // A capture must beat folding now to be worth it.
  let best: { move: LycanMove | null; value: number } = {
    move: null,
    value: -sumValues(view.wolf),
  };
  moves.forEach((move, index) => {
    if (values[index] > best.value) best = { move, value: values[index] };
  });
  return { move: best.move, anyCapture: moves.length > 0 };
}

function findLycanHint(
  state: Readonly<LycanGameState>,
  selectedPlayer: readonly string[] = [],
  selectedWolf: readonly string[] = [],
) {
  if (state.ended || state.roundOver || state.wolf.length === 0) return null;
  const { move, anyCapture } = bestLycanMove(state);
  if (!move) {
    return withNote(
      pressHint("buttons", i18n.t("cards:fold")),
      i18n.t(
        anyCapture ? "games:lycan.hint.fold" : "games:lycan.hint.noCapture",
      ),
    );
  }
  const playerIds = move.player.map((index) => state.player[index].id);
  const wolfIds = move.wolf.map((index) => state.wolf[index].id);
  const plan = createLycanCapturePlan(state, playerIds, wolfIds);
  if (!plan) return null;
  const hint = makeHint(
    { key: "press", values: { label: lycanActionLabel(plan.effect.action) } },
    // Picks to undo first, then the cards to take.
    [
      ...selectedPlayer.filter((id) => !playerIds.includes(id)),
      ...selectedWolf.filter((id) => !wolfIds.includes(id)),
    ].map((id) => cardTarget(id)),
    playerIds
      .filter((id) => !selectedPlayer.includes(id))
      .map((id) => cardTarget(id)),
    wolfIds
      .filter((id) => !selectedWolf.includes(id))
      .map((id) => cardTarget(id)),
    zoneTarget("buttons"),
  );
  if (plan.roundWillEnd) {
    return withNote(hint, i18n.t("games:lycan.hint.finish"));
  }
  if (plan.effect.action === "over") {
    return withNote(
      hint,
      i18n.t("games:lycan.hint.over", { count: plan.effect.drawCount }),
    );
  }
  return hint;
}

export const lycanRules = {
  findHint: findLycanHint,
  buildDeck: buildLycanDeck,
  detectAction: detectLycanAction,
  getCaptureEffect: getLycanCaptureEffect,
  scoreRound: scoreLycanRound,
  sumCards: sumLycanCards,
  assertInvariants: assertLycanInvariants,
  createCapturePlan: createLycanCapturePlan,
  removeCaptureAction: removeLycanCaptureAction,
  completeCaptureAction: completeLycanCaptureAction,
  executeCaptureAction: executeLycanCaptureAction,
  foldRoundAction: foldLycanRoundAction,
  resetDeckAction: resetDeck,
  dealRoundAction: dealRound,
  startNextRoundAction: startNextLycanRoundAction,
};

// ── Component ────────────────────────────────────────────────────────────────
export default function Lycan() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const mode = useGameSettingValue("lycanMode") as LycanMode;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [selectedPlayer, setSelectedPlayer] = useState<string[]>([]);
  const [selectedWolf, setSelectedWolf] = useState<string[]>([]);

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
    gameStateInitial,
    resetAndSetup: async () => {
      setGame((draft) => {
        resetDeck(draft, modeRef.current);
      });

      // Reset game state and deal a new round
      setGame((draft) => {
        draft.playerScore = 0;
        draft.wolfScore = 0;
        draft.round = 1;
        draft.ended = false;
        draft.won = false;
      });

      await delay(600);

      setGame((draft) => {
        dealRound(draft);
      });
    },
    resetNonGameStates: () => {
      setSelectedPlayer([]);
      setSelectedWolf([]);
    },
  });

  const selPlayerCards = useMemo(
    () => game.player.filter((c) => selectedPlayer.includes(c.id)),
    [game.player, selectedPlayer],
  );
  const selWolfCards = useMemo(
    () => game.wolf.filter((c) => selectedWolf.includes(c.id)),
    [game.wolf, selectedWolf],
  );
  const action = detectLycanAction(selPlayerCards, selWolfCards);

  useHint(() => findLycanHint(game, selectedPlayer, selectedWolf), {
    game,
    enabled: !isSettingUp,
  });

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function onPlayerPress(id: string) {
    if (game.ended || game.roundOver) return;
    setSelectedPlayer((prev) => toggle(prev, id));
  }
  function onWolfPress(id: string) {
    if (game.ended || game.roundOver) return;
    setSelectedWolf((prev) => toggle(prev, id));
  }

  async function executeCapture() {
    if (game.ended || game.roundOver || !action) return;
    const capturePlan = createLycanCapturePlan(
      game,
      selectedPlayer,
      selectedWolf,
    );
    if (!capturePlan) return;
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      removeLycanCaptureAction(draft, capturePlan);
    });

    await delay(600);

    setGame((draft) => {
      completeLycanCaptureAction(draft, capturePlan);
    });

    setSelectedPlayer([]);
    setSelectedWolf([]);

    if (capturePlan.roundWillEnd) {
      nextRound();
    }
  }

  function fold() {
    if (game.ended || game.roundOver) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      foldLycanRoundAction(draft);
    });

    setSelectedPlayer([]);
    setSelectedWolf([]);

    nextRound();
  }

  async function nextRound() {
    await delay(1000);

    setGame((draft) => {
      resetDeck(draft, modeRef.current);
    });

    await delay(1000);

    setGame((draft) => {
      if (draft.ended) return;
      draft.round += 1;
      dealRound(draft);
    });

    setSelectedPlayer([]);
    setSelectedWolf([]);
  }

  const { isRendered: buttonsRendered, opacity: buttonsOpacity } = useFade(
    !game.roundOver && !game.ended,
    500,
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  const zones: MapZone[] = useMemo(() => {
    const playerOffset = Math.min(1.2, 5 / game.player.length);
    const wolfOffset = Math.min(1.2, 5 / game.wolf.length);

    const result: MapZone[] = [
      {
        id: "hud",
        col: 1.3,
        row: 0,
        width: 3.4,
        height: 1 + infoSize.aboveBelow,
      },
      {
        id: "wolf",
        name: "wolf",
        cards: game.wolf,
        col: 0,
        row: 1.5,
        width: handWidth,
        height: 1.2,
        fan: { direction: "right", offset: wolfOffset },
        baseZIndex: 5,
        placeholder: {},
      },
      { id: "status", col: 0, row: 2.8, width: "full", height: 0.8 },
      {
        id: "player",
        name: "player",
        cards: game.player,
        col: 0,
        row: 3.7,
        width: handWidth,
        height: 1.2,
        fan: { direction: "right", offset: playerOffset },
        baseZIndex: 5,
        placeholder: {},
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "below",
          showCount: true,
        },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: handWidth - 1,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: { text: i18n.t("cards:discard"), infoPos: "below" },
      },

      { id: "buttons", col: 0, row: 5.1, width: "full", height: 0.9 },
    ];

    return result;
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "wolf") {
      const id = mappedCard.card.id;
      return {
        isSelected: selectedWolf.includes(id),
        selectColor: action ? actionColourMap[action] : "blue",
        isDisabled: game.ended || game.roundOver,
        onPress: () => onWolfPress(id),
      };
    } else if (mappedCard.zoneName === "player") {
      const id = mappedCard.card.id;
      return {
        isSelected: selectedPlayer.includes(id),
        selectColor: action ? actionColourMap[action] : "blue",
        isDisabled: game.ended || game.roundOver,
        onPress: () => onPlayerPress(id),
      };
    }
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0,
    cardSize: "small",
  });

  const actionLabel = action ? lycanActionLabel(action) : undefined;

  const countTextColor = (wolf: boolean) => {
    let baseColor = colorPale;

    const hasCardsSelected = wolf
      ? sumLycanCards(selWolfCards) > 0
      : sumLycanCards(selPlayerCards) > 0;

    if (hasCardsSelected) baseColor = Colors.cardSelectBlue;

    if (action === "perfect") baseColor = Colors.cardSelectGreen;
    if (action === "sum") baseColor = Colors.cardSelectPurple;
    if (action === "split") baseColor = Colors.cardSelectPink;
    if (action === "over") baseColor = Colors.cardSelectOrange;

    const opacity = hasCardsSelected ? 1 : 0.4;

    return rgba(baseColor, opacity);
  };

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.playerScore}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:lycan.youBeatTheWolf", {
              playerScore: game.playerScore,
              wolfScore: game.wolfScore,
            })
          : i18n.t("games:lycan.theWolfBeatYou", {
              wolfScore: game.wolfScore,
              playerScore: game.playerScore,
            })
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
          flexStyles.spaceAround,
        ]}
      >
        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={colorPale}>
            {i18n.t("games:lycan.wolf")}
          </Text>
          <Text size="xl" weight={600} color={colorPale}>
            {game.wolfScore}
          </Text>
        </View>

        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={Colors.white}>
            {i18n.t("games:lycan.round")}
          </Text>
          <Text size="xl" weight={600} color={Colors.white}>
            {game.round}
          </Text>
        </View>

        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={colorPale}>
            {i18n.t("cards:player")}
          </Text>
          <Text size="xl" weight={600} color={colorPale}>
            {game.playerScore}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          getZoneStylesById("status"),
          flexStyles.rowCentered,
          {
            opacity: buttonsOpacity,
          },
        ]}
      >
        <Text
          size="xxxl"
          weight={600}
          color={countTextColor(true)}
          style={{ width: spacing(30), textAlign: "center" }}
          lineHeight={1}
        >
          {sumLycanCards(selWolfCards)}
        </Text>

        <Text
          size="xxxl"
          weight={300}
          color={rgba(colorPale, 0.6)}
          style={{ width: spacing(20), textAlign: "center" }}
        >
          :
        </Text>

        <Text
          size="xxxl"
          weight={600}
          color={countTextColor(false)}
          style={{ width: spacing(30), textAlign: "center" }}
          lineHeight={1}
        >
          {sumLycanCards(selPlayerCards)}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          getZoneStylesById("status"),
          flexStyles.rowCentered,
          {
            opacity: buttonsOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.flex1,
            {
              width: "70%",
              gap: spacing(6),
              marginVertical: spacing(10),
              marginHorizontal: "15%",
              backgroundColor: rgba(
                game.roundWon ? Colors.buttonGreen : Colors.buttonRed,
                0.3,
              ),
              padding: spacing(10),
              borderRadius: spacing(8),
              borderWidth: spacing(1),
              borderColor: rgba(
                game.roundWon ? Colors.buttonGreen : Colors.buttonRed,
                0.6,
              ),
              boxShadow: `0 0 ${spacing(10)}px ${rgba(Colors.black, 0.4)}`,
            },
          ]}
        >
          <Text size="md" weight={400} color={Colors.white}>
            {game.roundWon
              ? i18n.t("cards:player")
              : i18n.t("games:lycan.wolf")}
          </Text>
          <Text size="md" weight={600} color={Colors.white}>
            +{game.roundPoints}
          </Text>
        </View>
      </Animated.View>

      <View style={[getZoneStylesById("buttons")]}>
        {buttonsRendered && (
          <Animated.View
            style={[
              flexStyles.fullWidth,
              flexStyles.fullHeight,
              {
                opacity: buttonsOpacity,
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
              },
            ]}
          >
            <Button
              text={i18n.t("cards:fold")}
              size="md"
              onPress={fold}
              taller
              disabled={game.ended || game.roundOver}
              theme="red"
              style={{ flex: 1 }}
            />

            <View style={[flexStyles.colCentered, { flex: 2 }]}>
              {actionLabel ? (
                <Button
                  text={actionLabel}
                  size="md"
                  onPress={executeCapture}
                  taller
                  disabled={game.ended || game.roundOver || !action}
                  theme={action ? actionColourMap[action] : "none"}
                  style={{ width: "100%", opacity: action ? 1 : 0 }}
                />
              ) : (
                <Text size="sm" weight={300} color={rgba(colorPale, 0.6)}>
                  {i18n.t("games:lycan.selectCardsToCapture")}
                </Text>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </GameWrapper>
  );
}
