import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { Icon } from "@/icons/Icon";
import { flexStyles } from "@/styles/flexStyles";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardColor,
  collectCards,
  createDeck,
  flipAllToBack,
  isFace,
  PlayingCard,
  rankValue,
  redealWith,
  shuffle,
} from "../Cards/card-utils";
import { delay } from "@/utils/utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { rgba } from "@/styles/styles";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import {
  cardTarget,
  makeHint,
  withNote,
  zoneTarget,
  type HintTarget,
} from "@/hints/hint";
const shieldColor = "#ffc671";

type RoyalSlot = { cards: PlayingCard[]; armour: number; dead: boolean };
type Mode = "place" | "extract" | "reassign-source" | "reassign-target";
type GameState = {
  stock: PlayingCard[];
  discard: PlayingCard[];
  grid: PlayingCard[][];
  royals: RoyalSlot[];
  aces: PlayingCard[];
  jokers: PlayingCard[];
  pending: PlayingCard | null;
  lastDrawWasSpecial: boolean;
  mode: Mode;
  selectedStack: number | null;
  ended: boolean;
  won: boolean;
};

const BORDER_TO_GRID = [0, 1, 2, 0, 2, 3, 5, 6, 8, 6, 7, 8];
const ATTACKS: Record<number, [number, number, number][]> = {
  0: [
    [4, 1, 2],
    [9, 3, 6],
  ],
  1: [[10, 4, 7]],
  2: [
    [3, 1, 0],
    [11, 5, 8],
  ],
  3: [[6, 4, 5]],
  5: [[5, 4, 3]],
  6: [
    [0, 3, 0],
    [8, 7, 8],
  ],
  7: [[1, 4, 1]],
  8: [
    [2, 5, 2],
    [7, 7, 6],
  ],
};

function topCard(stack: PlayingCard[]) {
  return stack.at(-1);
}

function hasAvailablePloy(pile: PlayingCard[]) {
  return topCard(pile)?.faceUp === true;
}

function similarity(card: PlayingCard, target: PlayingCard) {
  const relation =
    card.suit === target.suit
      ? 2
      : cardColor(card) === cardColor(target)
        ? 1
        : 0;
  return relation * 100 + rankValue(card);
}

function bestRoyalSlot(state: GameState, royal: PlayingCard) {
  const available = state.royals
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.cards.length === 0);
  return available.sort((first, second) => {
    const firstCard = topCard(state.grid[BORDER_TO_GRID[first.index]]);
    const secondCard = topCard(state.grid[BORDER_TO_GRID[second.index]]);
    return (
      (secondCard ? similarity(secondCard, royal) : -1) -
      (firstCard ? similarity(firstCard, royal) : -1)
    );
  })[0]?.index;
}

function bestArmourSlot(state: GameState, card: PlayingCard) {
  return state.royals
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.cards.length > 0 && !slot.dead)
    .sort((first, second) => {
      const firstRoyal = topCard(first.slot.cards)!;
      const secondRoyal = topCard(second.slot.cards)!;
      const firstRelation =
        firstRoyal.suit === card.suit
          ? 2
          : cardColor(firstRoyal) === cardColor(card)
            ? 1
            : 0;
      const secondRelation =
        secondRoyal.suit === card.suit
          ? 2
          : cardColor(secondRoyal) === cardColor(card)
            ? 1
            : 0;
      return (
        secondRelation * 100 -
        rankValue(secondRoyal) -
        (firstRelation * 100 - rankValue(firstRoyal))
      );
    })[0]?.index;
}

function placeRoyal(state: GameState, royal: PlayingCard) {
  const slotIndex = bestRoyalSlot(state, royal);
  if (slotIndex === undefined) return false;
  state.royals[slotIndex] = {
    cards: [{ ...royal, faceUp: true }],
    armour: 0,
    dead: false,
  };
  return true;
}

function attackValue(royal: PlayingCard, attackers: PlayingCard[]) {
  return attackers.reduce((total, card) => {
    if (royal.rank === "Q" && cardColor(card) !== cardColor(royal))
      return total;
    if (royal.rank === "K" && card.suit !== royal.suit) return total;
    return total + rankValue(card);
  }, 0);
}

function resolveAttacks(state: GameState, gridIndex: number) {
  for (const [slotIndex, firstIndex, secondIndex] of ATTACKS[gridIndex] ?? []) {
    const slot = state.royals[slotIndex];
    const royal = topCard(slot.cards);
    const attackers = [
      topCard(state.grid[firstIndex]),
      topCard(state.grid[secondIndex]),
    ];
    if (!royal || slot.dead || attackers.some((card) => !card)) continue;
    if (
      attackValue(royal, attackers as PlayingCard[]) >=
      rankValue(royal) + slot.armour
    ) {
      slot.dead = true;
      royal.faceUp = false;
      state.discard.push(...slot.cards.slice(0, -1));
      slot.cards = [royal];
      slot.armour = 0;
    }
  }
  state.won = state.royals.every((slot) => slot.dead);
  state.ended = state.won;
}

function canPlaceNumber(
  state: GameState,
  card: PlayingCard,
  gridIndex: number,
) {
  const destination = topCard(state.grid[gridIndex]);
  return !destination || rankValue(card) >= rankValue(destination);
}

function addArmour(state: GameState, card: PlayingCard) {
  const slotIndex = bestArmourSlot(state, card);
  if (slotIndex === undefined) {
    state.ended = true;
    return;
  }
  const slot = state.royals[slotIndex];
  const royal = topCard(slot.cards)!;
  slot.armour += rankValue(card);
  slot.cards.unshift({ ...card, faceUp: false });
  state.ended =
    rankValue(royal) + slot.armour >= (royal.rank === "K" ? 19 : 20);
}

function processDraw(state: GameState) {
  if (state.pending || state.ended || state.mode !== "place") return;
  const card = state.stock.pop();
  if (!card) {
    state.lastDrawWasSpecial = false;
    state.ended =
      !hasAvailablePloy(state.aces) && !hasAvailablePloy(state.jokers);
    return;
  }
  card.faceUp = true;
  state.lastDrawWasSpecial =
    card.rank === "A" || card.rank === "Joker" || isFace(card);
  if (card.rank === "A") state.aces.push(card);
  else if (card.rank === "Joker") state.jokers.push(card);
  else if (isFace(card)) placeRoyal(state, card);
  else {
    const hasPlacement = state.grid.some((_, index) =>
      canPlaceNumber(state, card, index),
    );
    if (
      hasPlacement ||
      hasAvailablePloy(state.aces) ||
      hasAvailablePloy(state.jokers)
    ) {
      state.pending = card;
    } else {
      addArmour(state, card);
    }
  }
}

function createInitialState(): GameState {
  const state: GameState = {
    stock: shuffle(createDeck({ includeJokers: true })),
    discard: [],
    grid: Array.from({ length: 9 }, () => []),
    royals: Array.from({ length: 12 }, () => ({
      cards: [],
      armour: 0,
      dead: false,
    })),
    aces: [],
    jokers: [],
    pending: null,
    lastDrawWasSpecial: false,
    mode: "place",
    selectedStack: null,
    ended: false,
    won: false,
  };
  let gridIndex = 0;
  const setAsideRoyals: PlayingCard[] = [];
  while (gridIndex < 9 && state.stock.length) {
    const card = state.stock.pop()!;
    if (card.rank === "A") state.aces.push({ ...card, faceUp: true });
    else if (card.rank === "Joker")
      state.jokers.push({ ...card, faceUp: true });
    else if (isFace(card)) setAsideRoyals.push(card);
    else state.grid[gridIndex++].push({ ...card, faceUp: true });
  }
  setAsideRoyals.forEach((card) => placeRoyal(state, card));
  return state;
}

// —— Hints ——

type DynastyMove =
  | { kind: "place"; cell: number }
  | { kind: "extract"; cell: number }
  | { kind: "reassign"; from: number; to: number };

function dynastyMoves(state: GameState): DynastyMove[] {
  const moves: DynastyMove[] = [];
  const cells = state.grid.map((_, cell) => cell);
  const pending = state.pending;
  if (pending) {
    cells.forEach((cell) => {
      if (canPlaceNumber(state, pending, cell))
        moves.push({ kind: "place", cell });
    });
  }
  if (hasAvailablePloy(state.jokers)) {
    cells.forEach((from) => {
      const card = topCard(state.grid[from]);
      if (!card) return;
      cells.forEach((to) => {
        if (to !== from && canPlaceNumber(state, card, to))
          moves.push({ kind: "reassign", from, to });
      });
    });
  }
  if (hasAvailablePloy(state.aces)) {
    cells.forEach((cell) => {
      if (state.grid[cell].length) moves.push({ kind: "extract", cell });
    });
  }
  return moves;
}

/** A copy to try moves on (cheaper than structuredClone, run many times). */
function cloneState(state: GameState): GameState {
  return {
    ...state,
    stock: [...state.stock],
    discard: [...state.discard],
    grid: state.grid.map((pile) => [...pile]),
    royals: state.royals.map((slot) => ({
      ...slot,
      cards: slot.cards.map((card) => ({ ...card })),
    })),
    aces: [...state.aces],
    jokers: [...state.jokers],
  };
}

function applyDynastyMove(state: GameState, move: DynastyMove) {
  const next = cloneState(state);
  if (move.kind === "place") {
    next.grid[move.cell].push(next.pending!);
    next.pending = null;
    resolveAttacks(next, move.cell);
  } else if (move.kind === "extract") {
    next.stock.unshift(...next.grid[move.cell]);
    next.grid[move.cell] = [];
    next.aces.unshift({ ...next.aces.pop()!, faceUp: false });
  } else {
    next.grid[move.to].push(next.grid[move.from].pop()!);
    next.jokers.unshift({ ...next.jokers.pop()!, faceUp: false });
    resolveAttacks(next, move.to);
  }
  return next;
}

/**
 * How good a position is to play on from: royals down above all, then the
 * ploys still in hand (they're the score), royals one card from falling, and
 * piles the cards still in the deck (seen only as a set) can go on.
 */
function dynastyScore(state: GameState) {
  const ploys =
    state.aces.filter((card) => card.faceUp).length +
    state.jokers.filter((card) => card.faceUp).length;
  let score =
    state.royals.filter((slot) => slot.dead).length * 1000 + ploys * 120;
  const numbers = state.stock.filter(
    (card) => !isFace(card) && card.rank !== "A" && card.rank !== "Joker",
  );
  const fits = (cell: number) => {
    const top = topCard(state.grid[cell]);
    if (!top || numbers.length === 0) return 1;
    return (
      numbers.filter((card) => rankValue(card) >= rankValue(top)).length /
      numbers.length
    );
  };
  state.grid.forEach((_, cell) => {
    score += 60 * fits(cell);
  });
  // Lines aimed at a royal: one ready to fire when its trigger pile takes a
  // card, or how close it comes.
  Object.entries(ATTACKS).forEach(([trigger, lines]) => {
    for (const [slotIndex, first, second] of lines) {
      const slot = state.royals[slotIndex];
      const royal = topCard(slot.cards);
      if (!royal || slot.dead) continue;
      const attackers = [
        topCard(state.grid[first]),
        topCard(state.grid[second]),
      ].filter((card): card is PlayingCard => !!card);
      const need = rankValue(royal) + slot.armour;
      const attack = attackValue(royal, attackers);
      score +=
        attackers.length === 2 && attack >= need
          ? 150 * fits(Number(trigger))
          : (20 * Math.min(attack, need)) / need;
    }
  });
  // A card with nowhere to go becomes armour.
  if (
    state.pending &&
    !dynastyMoves(state).some((move) => move.kind === "place") &&
    ploys === 0
  ) {
    score -= 300;
  }
  return score;
}

/** The move that leaves the best position (see dynastyScore), or null. */
function bestDynastyMove(state: GameState) {
  if (state.ended) return null;
  // Between draws the next card is on its way, unless the deck is empty
  // and only a ploy can go on.
  if (!state.pending && state.stock.length > 0) return null;
  const ranked = dynastyMoves(state)
    .map((move) => {
      const next = applyDynastyMove(state, move);
      return { move, next, score: dynastyScore(next) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, LOOKAHEAD_MOVES);
  let best = null as { move: DynastyMove; score: number } | null;
  for (const { move, next } of ranked) {
    const score = nextDrawScore(next);
    if (!best || score > best.score) best = { move, score };
  }
  return best?.move ?? null;
}

// The best moves by dynastyScore, looked at again over the next draw.
const LOOKAHEAD_MOVES = 12;

/**
 * A position's worth once the next card is drawn and placed as well as it
 * can be, averaged over the cards still in the deck (seen as a set: any of
 * them may come next).
 */
function nextDrawScore(state: GameState) {
  if (state.ended || state.pending || state.stock.length === 0) {
    return dynastyScore(state);
  }
  let total = 0;
  state.stock.forEach((card, index) => {
    const next = cloneState(state);
    next.stock.splice(index, 1);
    next.stock.push({ ...card });
    processDraw(next);
    if (!next.pending) {
      total += dynastyScore(next);
      return;
    }
    let best = -Infinity;
    next.grid.forEach((_, cell) => {
      if (!canPlaceNumber(next, next.pending!, cell)) return;
      best = Math.max(
        best,
        dynastyScore(applyDynastyMove(next, { kind: "place", cell })),
      );
    });
    if (best === -Infinity) {
      // Nowhere to go: a ploy, or armour.
      best = dynastyScore(next);
    }
    total += best;
  });
  return total / state.stock.length;
}

function findDynastyHint(state: GameState) {
  const move = bestDynastyMove(state);
  if (!move) return null;
  const kills =
    applyDynastyMove(state, move).royals.filter((slot) => slot.dead).length >
    state.royals.filter((slot) => slot.dead).length;

  const ace = state.aces.at(-1);
  const joker = state.jokers.at(-1);
  const steps: HintTarget[][] = [];
  const cellTarget = (cell: number) => {
    const top = topCard(state.grid[cell]);
    return top ? cardTarget(top) : zoneTarget(`grid-${cell}`);
  };
  // Put down a ploy picked up that isn't the one to use.
  if (state.mode === "extract" && move.kind !== "extract")
    steps.push([cardTarget(ace!)]);
  if (state.mode.startsWith("reassign") && move.kind !== "reassign")
    steps.push([cardTarget(joker!)]);

  let hint;
  if (move.kind === "place") {
    hint = makeHint(
      "moveCard",
      ...steps,
      cardTarget(state.pending!),
      zoneTarget(`grid-${move.cell}`),
    );
  } else if (move.kind === "extract") {
    if (state.mode !== "extract") steps.push([cardTarget(ace!)]);
    hint = withNote(
      makeHint("tapCard", ...steps, cellTarget(move.cell)),
      i18n.t("games:dynasty.hint.extract"),
    );
  } else {
    const picked =
      state.mode === "reassign-target" ? state.selectedStack : null;
    if (picked !== null && picked !== move.from) {
      // Put the picked card back first.
      steps.push([cellTarget(picked)]);
    }
    if (!state.mode.startsWith("reassign")) steps.push([cardTarget(joker!)]);
    if (picked !== move.from) steps.push([cellTarget(move.from)]);
    hint = withNote(
      makeHint("moveCard", ...steps, zoneTarget(`grid-${move.to}`)),
      i18n.t("games:dynasty.hint.reassign"),
    );
  }
  return kills ? withNote(hint, i18n.t("games:dynasty.hint.kill")) : hint;
}

export const dynastyRules = {
  findHint: findDynastyHint,
  bestMove: bestDynastyMove,
  applyMove: applyDynastyMove,
  createInitialState,
  processDraw,
  addArmour,
  attackValue,
  canPlaceNumber,
  resolveAttacks,
  similarity,
};

/** The board with every card gathered face down into the deck. */
function gatherState(state: GameState): GameState {
  return {
    stock: shuffle(flipAllToBack(collectCards(state))),
    discard: [],
    grid: Array.from({ length: 9 }, () => []),
    royals: Array.from({ length: 12 }, () => ({
      cards: [],
      armour: 0,
      dead: false,
    })),
    aces: [],
    jokers: [],
    pending: null,
    lastDrawWasSpecial: false,
    mode: "place",
    selectedStack: null,
    ended: false,
    won: false,
  };
}

// Starts with every card in the deck, to be dealt out from there.
const gameStateInitial = gatherState(createInitialState());

export default function Dynasty() {
  const { colorDark } = useGameColors();
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        // Gather every card into the deck, then deal them back out.
        setGame((draft) => gatherState(draft));
        await delay();
        setGame((draft) => redealWith(createInitialState(), draft.stock));
      },
    });

  useHint(() => findDynastyHint(game), { game });

  function mutate(action: (draft: GameState) => void) {
    saveUndoState(structuredClone(game));
    setGame(action);
  }

  function selectGrid(index: number) {
    if (game.ended) return;
    mutate((draft) => {
      if (draft.mode === "extract") {
        const cards = draft.grid[index].map((card) => ({
          ...card,
          faceUp: false,
        }));
        if (!cards.length) return;
        draft.grid[index] = [];
        draft.stock.unshift(...cards);
        const ace = draft.aces.pop();
        if (ace) draft.aces.unshift({ ...ace, faceUp: false });
        draft.mode = "place";
        return;
      }
      if (draft.mode === "reassign-source") {
        if (!topCard(draft.grid[index])) return;
        draft.selectedStack = index;
        draft.mode = "reassign-target";
        return;
      }
      if (draft.mode === "reassign-target") {
        const source = draft.selectedStack;
        if (source === index) {
          draft.selectedStack = null;
          draft.mode = "reassign-source";
          return;
        }
        const card = source === null ? undefined : topCard(draft.grid[source]);
        if (source === null || !card || !canPlaceNumber(draft, card, index))
          return;
        draft.grid[source].pop();
        draft.grid[index].push(card);
        const joker = draft.jokers.pop();
        if (joker) draft.jokers.unshift({ ...joker, faceUp: false });
        draft.mode = "place";
        draft.selectedStack = null;
        resolveAttacks(draft, index);
        return;
      }
      const card = draft.pending;
      if (!card || !canPlaceNumber(draft, card, index)) return;
      draft.grid[index].push(card);
      draft.pending = null;
      resolveAttacks(draft, index);
    });
  }

  function selectPloy(type: "ace" | "joker") {
    if (game.ended) return;
    mutate((draft) => {
      if (type === "ace" && hasAvailablePloy(draft.aces))
        draft.mode = draft.mode === "extract" ? "place" : "extract";
      if (type === "joker" && hasAvailablePloy(draft.jokers)) {
        draft.mode = draft.mode.startsWith("reassign")
          ? "place"
          : "reassign-source";
        draft.selectedStack = null;
      }
    });
  }

  useEffect(() => {
    if (game.pending || game.ended || game.mode !== "place") return;
    if (!game.lastDrawWasSpecial) {
      setGame(processDraw);
      return;
    }
    const timeout = setTimeout(() => setGame(processDraw), 1000);
    return () => clearTimeout(timeout);
  }, [
    game.stock,
    game.ended,
    game.lastDrawWasSpecial,
    game.mode,
    game.pending,
    setGame,
  ]);

  useEffect(() => {
    if (
      !game.pending ||
      game.ended ||
      game.mode !== "place" ||
      hasAvailablePloy(game.aces) ||
      hasAvailablePloy(game.jokers) ||
      game.grid.some((_, index) => canPlaceNumber(game, game.pending!, index))
    ) {
      return;
    }
    setGame((draft) => {
      const pending = draft.pending;
      if (!pending) return;
      draft.pending = null;
      addArmour(draft, pending);
    });
  }, [game, setGame]);

  const positions = [
    [1, 0],
    [2, 0],
    [3, 0],
    [0, 1],
    [4, 1],
    [0, 2],
    [4, 2],
    [0, 3],
    [4, 3],
    [1, 4],
    [2, 4],
    [3, 4],
  ];
  const zones = useMemo<MapZone[]>(
    () => [
      ...game.royals.map((slot, index) => ({
        id: `royal-${index}`,
        name: "royal",
        pileIndex: index,
        cards: slot.cards,
        col: positions[index][0],
        row: positions[index][1],
        baseZIndex: 10,
        placeholder: { showCount: false },
      })),
      ...game.grid.map((cards, index) => ({
        id: `grid-${index}`,
        name: "grid",
        pileIndex: index,
        cards,
        col: 1 + (index % 3),
        row: 1 + Math.floor(index / 3),
        baseZIndex: 20,
        fan: { maxVisible: 3 },
        placeholder: { showCount: cards.length > 1 },
      })),
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 4,
        row: 5.5,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "above" },
      },
      {
        id: "pending",
        name: "pending",
        cards: game.pending ? [game.pending] : [],
        col: 3,
        row: 5.5,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: {},
      },
      {
        id: "aces",
        name: "aces",
        cards: game.aces,
        col: 0,
        row: 5.5,
        baseZIndex: 30,
        fan: { direction: "down", offset: 0.1 },
        placeholder: {
          text: i18n.t("games:dynasty.extract"),
          showCount: false,
          infoPos: "above",
        },
      },
      {
        id: "jokers",
        name: "jokers",
        cards: game.jokers,
        col: 1,
        row: 5.5,
        baseZIndex: 30,
        fan: { direction: "down", offset: 0.1 },
        placeholder: {
          text: i18n.t("games:dynasty.reassign"),
          showCount: false,
          infoPos: "above",
        },
      },
    ],
    [game],
  );

  const cardMapper = (mapped: MappedCard): AnimatedCardMapping => {
    if (mapped.zoneName === "pending") {
      const canPlacePending =
        !!game.pending &&
        game.grid.some((_, index) =>
          canPlaceNumber(game, game.pending!, index),
        );
      return {
        isSelected: game.mode === "place",
        selectColor: canPlacePending ? "green" : "red",
      };
    }
    if (mapped.zoneName === "grid") {
      const index = mapped.pileIndex ?? -1;
      const isAceSelected = game.mode === "extract";
      const isJokerSelected = game.mode.startsWith("reassign");
      const isTopCard = mapped.topOfZone;
      const valid =
        isAceSelected ||
        (game.mode === "reassign-source" && isTopCard) ||
        (game.mode === "reassign-target" &&
          (game.selectedStack === index ||
            (isTopCard &&
              !!topCard(game.grid[game.selectedStack ?? -1] ?? []) &&
              canPlaceNumber(
                game,
                topCard(game.grid[game.selectedStack ?? -1])!,
                index,
              )))) ||
        (!!game.pending && canPlaceNumber(game, game.pending, index));
      const isSelectedForReassignment =
        game.mode === "reassign-target" && game.selectedStack === index;

      return {
        onPress: () => selectGrid(index),
        isDisabled: !valid,
        forceOverlayColor: valid,
        isSelected: isSelectedForReassignment && mapped.topOfZone,
        selectColor:
          !valid && !isSelectedForReassignment
            ? "none"
            : isAceSelected
              ? "purple"
              : isJokerSelected || isSelectedForReassignment
                ? "orange"
                : "green",
      };
    }
    if (mapped.zoneName === "aces") {
      const selectable = mapped.topOfZone && mapped.card.faceUp;
      return {
        onPress: () => selectPloy("ace"),
        isDisabled: game.ended || !selectable,
        isSelected: selectable && game.mode === "extract",
        selectColor: "purple",
      };
    }
    if (mapped.zoneName === "jokers") {
      const selectable = mapped.topOfZone && mapped.card.faceUp;
      return {
        onPress: () => selectPloy("joker"),
        isDisabled: game.ended || !selectable,
        isSelected: selectable && game.mode.startsWith("reassign"),
        selectColor: "orange",
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping => {
    if (zone.name === "grid" && zone.pileIndex !== undefined) {
      return { onPress: () => selectGrid(zone.pileIndex!) };
    }
    return {};
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    paddingBottom: 0.6,
    gap: 0.2,
  });
  const score =
    game.aces.filter((card) => card.faceUp).length +
    game.jokers.filter((card) => card.faceUp).length;

  return (
    <GameWrapper
      outcome={game.ended ? (game.won ? "won" : "lost") : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score}
      winLoseMessage={
        game.won
          ? i18n.t("games:dynasty.allTwelveRoyalsAreDown")
          : i18n.t("games:dynasty.youRanOutOfCards")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
      {game.royals.map((slot, index) => {
        if (slot.armour === 0) return null;
        return (
          <View
            key={`armour-${index}`}
            style={[
              getZoneStylesById(`royal-${index}`),
              {
                zIndex: 100,
                pointerEvents: "none",
              },
            ]}
          >
            <View
              style={[
                flexStyles.colCentered,
                {
                  position: "absolute",
                  bottom: cardWidth * 0.04,
                  right: cardWidth * 0.04,
                  borderRadius: cardWidth * 0.1,
                  padding: cardWidth * 0.1,
                  backgroundColor: colorDark,
                  boxShadow: `${cardWidth * 0.02}px ${cardWidth * 0.04}px ${cardWidth * 0.1}px ${rgba(colorDark, 0.4)}`,
                },
              ]}
            >
              <Icon name="shield" size={cardWidth * 0.32} color={shieldColor} />
              <Text size="md" weight={500} color={shieldColor}>
                +{slot.armour}
              </Text>
            </View>
          </View>
        );
      })}
    </GameWrapper>
  );
}
