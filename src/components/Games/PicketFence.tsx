import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  redealWith,
  shuffle,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Icon } from "@/icons";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";

// A flip-and-write in cards (Welcome To...): each turn one card is built as a
// house, whose number must rise along its street, and another card's suit
// gives an effect. Two cards a turn use the deck in 26 turns.
//
// Each effect scores its own way, so the effect card is a real choice: a
// fence adds an estate (worth its bonus once both sides are finished), and a
// street takes parks or pools, not both, so each street is a commitment.
const STREET_LENGTHS = [6, 7, 8];
const HAND_SIZE = 3;
const PICKET_FENCE_COLORS = {
  park: "#2E8B57",
  pool: "#1E88E5",
  fence: "#808080",
  house: "#8B5A2B",
  score: "#9E9E9E",
} as const;
const SUIT_EFFECT_COLORS = {
  hearts: PICKET_FENCE_COLORS.park,
  diamonds: PICKET_FENCE_COLORS.pool,
  spades: PICKET_FENCE_COLORS.fence,
  clubs: PICKET_FENCE_COLORS.house,
} satisfies Record<CardSuit, string>;
const POOL_LOTS = [
  [1, 4],
  [2, 5],
  [1, 4, 6],
];
// Only a finished estate scores its houses: a point each, and a bonus for
// the estate, so every fence is worth the bonus once both sides are built.
// Parks and pools score wherever they are.
const HOUSE_POINTS = 1;
const ESTATE_BONUS = 2;
const PARK_POINTS = 3;
const POOL_POINTS = 4;
const WIN_SCORE = 70;

const TIERS = [
  { min: 85, key: "games:picketFence.tierPicturePerfect" },
  { min: 78, key: "games:picketFence.tierModelSuburb" },
  { min: WIN_SCORE, key: "games:picketFence.tierGoodNeighbours" },
  { min: 55, key: "games:picketFence.tierQuietStreet" },
  { min: -Infinity, key: "games:picketFence.tierVacantLots" },
] as const;

type Street = {
  houses: (PlayingCard | null)[];
  /** The effect card tucked under each house: a park or a pool. */
  tucked: (PlayingCard | null)[];
  /** fences[g] stands between lot g and lot g + 1. */
  fences: boolean[];
};

type Lot = { street: number; lot: number };
/** A street takes parks (hearts) or pools (diamonds): its first one decides. */
type StreetKind = "hearts" | "diamonds" | null;
type FenceSpot = { street: number; gap: number };

export type PicketFenceGameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  streets: Street[];
  discard: PlayingCard[];
  /** The house built or renovated this turn, waiting for its effect card. */
  pending: Lot | null;
  /** This turn's house card was discarded instead; the effect card is next. */
  skippedBuild?: boolean;
};

function emptyStreets(): Street[] {
  return STREET_LENGTHS.map((length) => ({
    houses: Array.from({ length }, () => null),
    tucked: Array.from({ length }, () => null),
    fences: Array.from({ length: length - 1 }, () => false),
  }));
}

// ========== Rules ========== //
function houseNumber(card: PlayingCard) {
  return rankValue(card);
}

/** The built numbers either side of a lot, or 0 and 14 at the street ends. */
function neighbours(houses: (PlayingCard | null)[], lot: number) {
  let low = 0;
  let high = 14;
  for (let i = lot - 1; i >= 0; i--) {
    const house = houses[i];
    if (house) {
      low = houseNumber(house);
      break;
    }
  }
  for (let i = lot + 1; i < houses.length; i++) {
    const house = houses[i];
    if (house) {
      high = houseNumber(house);
      break;
    }
  }
  return { low, high };
}

/** Whether a number keeps the street rising at a lot, built on or not. */
function fits(street: Street, lot: number, value: number) {
  const { low, high } = neighbours(street.houses, lot);
  return value > low && value < high;
}

function canBuild(street: Street, lot: number, value: number) {
  return !street.houses[lot] && fits(street, lot, value);
}

/** Renovating: a card may replace a house if the street still rises. */
function canRenovate(street: Street, lot: number, value: number) {
  return !!street.houses[lot] && fits(street, lot, value);
}

function lotsWhere(
  streets: Street[],
  test: (street: Street, lot: number) => boolean,
): Lot[] {
  return streets.flatMap((street, s) =>
    street.houses.flatMap((_, lot) =>
      test(street, lot) ? [{ street: s, lot }] : [],
    ),
  );
}

/** The empty lots a number can be built on. */
function legalLots(streets: Street[], value: number): Lot[] {
  return lotsWhere(streets, (street, lot) => canBuild(street, lot, value));
}

/** The houses a number can replace. */
function renovationLots(streets: Street[], value: number): Lot[] {
  return lotsWhere(streets, (street, lot) => canRenovate(street, lot, value));
}

/** Everywhere a card can go as a house: empty lots, then houses to replace. */
function houseLots(streets: Street[], value: number): Lot[] {
  return [...legalLots(streets, value), ...renovationLots(streets, value)];
}

/**
 * An empty lot no number can fill as things stand: its neighbours are
 * consecutive. Renovating one of them can open it again.
 */
function isDeadLot(street: Street, lot: number) {
  if (street.houses[lot]) return false;
  const { low, high } = neighbours(street.houses, lot);
  return high - low <= 1;
}

function streetKind(street: Street): StreetKind {
  const first = street.tucked.find(Boolean);
  return first ? (first.suit as StreetKind) : null;
}

function isPoolLot({ street, lot }: Lot) {
  return POOL_LOTS[street].includes(lot);
}

/**
 * Whether a heart or diamond can be tucked under the house at a lot: it has
 * nothing under it yet, its street doesn't hold the other kind, and a pool
 * needs a pool lot.
 */
function canTuck(streets: Street[], at: Lot, suit: CardSuit) {
  const street = streets[at.street];
  if (!street.houses[at.lot] || street.tucked[at.lot]) return false;
  const kind = streetKind(street);
  if (suit === "hearts") return kind !== "diamonds";
  if (suit === "diamonds") return kind !== "hearts" && isPoolLot(at);
  return false;
}

function openFences(streets: Street[]): FenceSpot[] {
  return streets.flatMap((street, s) =>
    street.fences.flatMap((fence, gap) => (fence ? [] : [{ street: s, gap }])),
  );
}

/** The estates of a street as [first lot, last lot], split by its fences. */
function estates(street: Street): [number, number][] {
  const result: [number, number][] = [];
  let start = 0;
  for (let lot = 0; lot < street.houses.length; lot++) {
    if (lot === street.houses.length - 1 || street.fences[lot]) {
      result.push([start, lot]);
      start = lot + 1;
    }
  }
  return result;
}

/**
 * Whether an estate is built, can still be built, or can't as it stands: a
 * gap in it has more empty lots than numbers left to fill them (and needs a
 * neighbour renovated, or a fence to cut it off).
 */
function estateStatus(street: Street, [first, last]: [number, number]) {
  const houses = street.houses;
  if (houses.slice(first, last + 1).every(Boolean)) return "complete";

  let lot = first;
  while (lot <= last) {
    if (houses[lot]) {
      lot++;
      continue;
    }
    let end = lot;
    while (end + 1 <= last && !houses[end + 1]) end++;
    // Empty lots just outside the estate don't need filling, but the numbers
    // either side of the gap still bound it.
    const { low, high } = neighbours(houses, lot);
    if (high - low - 1 < end - lot + 1) return "blocked";
    lot = end + 1;
  }
  return "open";
}

function tuckedCount(street: Street, suit: CardSuit) {
  return street.tucked.filter((card) => card?.suit === suit).length;
}

/** What an estate scores once finished: a point a house, and its bonus. */
function estateValue([first, last]: [number, number]) {
  return (last - first + 1) * HOUSE_POINTS + ESTATE_BONUS;
}

function scoreOf(streets: Street[]) {
  const score = { parks: 0, pools: 0, estates: 0, total: 0 };
  for (const street of streets) {
    for (const estate of estates(street)) {
      if (estateStatus(street, estate) === "complete") {
        score.estates += estateValue(estate);
      }
    }
    score.parks += tuckedCount(street, "hearts") * PARK_POINTS;
    score.pools += tuckedCount(street, "diamonds") * POOL_POINTS;
  }
  score.total = score.estates + score.parks + score.pools;
  return score;
}

function isFull(streets: Street[]) {
  return streets.every((street) => street.houses.every(Boolean));
}

/** Whether this turn's house is settled and its effect card is due. */
function awaitingEffect(state: PicketFenceGameState) {
  return !!state.pending || !!state.skippedBuild;
}

/** The game runs until the deck is used up and the last cards are played. */
function isOver(state: PicketFenceGameState) {
  return !awaitingEffect(state) && state.hand.length === 0;
}

function getTier(score: number) {
  return TIERS.find((tier) => score >= tier.min)!;
}

function drawHand(state: PicketFenceGameState) {
  while (state.hand.length < HAND_SIZE && state.deck.length > 0) {
    state.hand.push(flipToFace(state.deck.pop()!));
  }
}

function finishTurn(state: PicketFenceGameState) {
  state.pending = null;
  state.skippedBuild = false;
  drawHand(state);
}

/** Puts a card on a lot as its house; a house it replaces is discarded. */
function placeHouse(state: PicketFenceGameState, card: PlayingCard, at: Lot) {
  const street = state.streets[at.street];
  const replaced = street.houses[at.lot];
  if (replaced) state.discard.push(replaced);
  street.houses[at.lot] = card;
}

/** Builds a hand card on an empty lot, or renovates a house with it. */
function buildHouse(state: PicketFenceGameState, handIndex: number, at: Lot) {
  const card = state.hand[handIndex];
  const street = state.streets[at.street];
  if (
    !card ||
    awaitingEffect(state) ||
    !fits(street, at.lot, houseNumber(card))
  ) {
    return false;
  }
  state.hand.splice(handIndex, 1);
  placeHouse(state, card, at);
  state.pending = at;
  // The deck's last card is built without an effect.
  if (state.hand.length === 0) finishTurn(state);
  return true;
}

/** Discards a hand card instead of building this turn. */
function skipBuild(state: PicketFenceGameState, handIndex: number) {
  const card = state.hand[handIndex];
  if (!card || awaitingEffect(state)) return false;
  state.hand.splice(handIndex, 1);
  state.discard.push(card);
  state.skippedBuild = true;
  if (state.hand.length === 0) finishTurn(state);
  return true;
}

type EffectResult = "park" | "pool" | "fence" | "house" | "wasted";

/**
 * What a hand card would do as this turn's effect, if anything: hearts and
 * diamonds go under this turn's house, and spades and clubs need somewhere
 * to go.
 */
function effectUse(state: PicketFenceGameState, card: PlayingCard) {
  if (card.suit === "spades" || card.suit === "clubs") {
    return effectTargets(state, card).length > 0;
  }
  return !!state.pending && canTuck(state.streets, state.pending, card.suit);
}

/** Why a card would do nothing as this turn's effect, or null if it would. */
function wastedReason(state: PicketFenceGameState, card: PlayingCard) {
  if (effectUse(state, card)) return null;
  const pending = state.pending;
  if (
    (card.suit === "hearts" || card.suit === "diamonds") &&
    pending &&
    !state.streets[pending.street].tucked[pending.lot]
  ) {
    const kind = streetKind(state.streets[pending.street]);
    if (card.suit === "hearts") {
      return "games:picketFence.effectParkOnPoolStreet" as const;
    }
    return kind === "hearts"
      ? ("games:picketFence.effectPoolOnParkStreet" as const)
      : ("games:picketFence.effectNotPoolLot" as const);
  }
  return "games:picketFence.effectWasted" as const;
}

/**
 * Uses a hand card's suit: hearts make a park and diamonds a pool (on a pool
 * lot) under this turn's house, if it has neither yet and its street holds
 * no tucks of the other kind; spades put a fence at `target`; and clubs are
 * built as a second house at `target`. Without a usable target the card is
 * discarded.
 */
function applyEffect(
  state: PicketFenceGameState,
  handIndex: number,
  target?: Lot | FenceSpot,
): EffectResult | null {
  const pending = state.pending;
  const card = state.hand[handIndex];
  if (!awaitingEffect(state) || !card) return null;

  let result: EffectResult = "wasted";

  if (card.suit === "hearts" || card.suit === "diamonds") {
    if (pending && canTuck(state.streets, pending, card.suit)) {
      result = card.suit === "hearts" ? "park" : "pool";
    }
  } else if (card.suit === "spades") {
    if (target && "gap" in target) {
      const fences = state.streets[target.street].fences;
      if (fences[target.gap]) return null;
      fences[target.gap] = true;
      result = "fence";
    }
  } else if (target && "lot" in target) {
    const other = state.streets[target.street];
    if (!fits(other, target.lot, houseNumber(card))) return null;
    result = "house";
  }

  state.hand.splice(handIndex, 1);
  if (result === "park" || result === "pool") {
    state.streets[pending!.street].tucked[pending!.lot] = card;
  } else if (result === "house" && target && "lot" in target) {
    placeHouse(state, card, target);
  } else {
    state.discard.push(card);
  }
  finishTurn(state);
  return result;
}

/** Where a spade or club effect card could go this turn. */
function effectTargets(
  state: PicketFenceGameState,
  card: PlayingCard,
): (Lot | FenceSpot)[] {
  if (card.suit === "spades") return openFences(state.streets);
  if (card.suit === "clubs") {
    return houseLots(state.streets, houseNumber(card));
  }
  return [];
}

function createInitialState(): PicketFenceGameState {
  const state: PicketFenceGameState = {
    deck: shuffle(createDeck()),
    hand: [],
    streets: emptyStreets(),
    discard: [],
    pending: null,
    skippedBuild: false,
  };
  drawHand(state);
  return state;
}

function gatherState(state: PicketFenceGameState): PicketFenceGameState {
  return {
    deck: shuffle(flipAllToBack(collectCards(state))),
    hand: [],
    streets: emptyStreets(),
    discard: [],
    pending: null,
    skippedBuild: false,
  };
}

const gameStateInitial = createInitialState();

// ========== Hints ========== //

function cloneState(state: PicketFenceGameState): PicketFenceGameState {
  return {
    ...state,
    // Copied too: finishing a turn draws from it.
    deck: [...state.deck],
    hand: [...state.hand],
    discard: [...state.discard],
    streets: state.streets.map((street) => ({
      houses: [...street.houses],
      tucked: [...street.tucked],
      fences: [...street.fences],
    })),
  };
}

/** How likely each missing house of an unfinished estate is to get built. */
const FILL_CHANCE = 0.6;

/**
 * What the streets look worth with `turnsLeft` to go: parks, pools and
 * finished estates in full, unfinished estates by how likely they are to be
 * finished, and lots nothing fits count against.
 */
function outlook(streets: Street[], turnsLeft: number) {
  let worth = 0;
  for (const street of streets) {
    for (const estate of estates(street)) {
      const size = estate[1] - estate[0] + 1;
      const built = street.houses
        .slice(estate[0], estate[1] + 1)
        .filter(Boolean).length;
      const status = estateStatus(street, estate);
      if (status === "complete") {
        worth += estateValue(estate);
      } else if (status === "open") {
        const missing = size - built;
        worth +=
          FILL_CHANCE ** missing *
          Math.min(1, turnsLeft / (missing * 1.5)) *
          estateValue(estate);
      }
    }
    worth += tuckedCount(street, "hearts") * PARK_POINTS;
    worth += tuckedCount(street, "diamonds") * POOL_POINTS;
    street.houses.forEach((_, lot) => {
      if (isDeadLot(street, lot)) worth -= 1.5;
    });
  }
  return worth;
}

type EffectPlay = {
  index: number;
  target?: Lot | FenceSpot;
  /** A spade or club thrown away rather than used. */
  discard?: boolean;
  worth: number;
};

/** The effect card (and its target) that leaves the streets worth most. */
function bestEffect(state: PicketFenceGameState): EffectPlay | null {
  const turnsLeft = Math.ceil((state.deck.length + state.hand.length - 1) / 2);
  let best: EffectPlay | null = null;
  const consider = (play: Omit<EffectPlay, "worth">) => {
    const after = cloneState(state);
    if (applyEffect(after, play.index, play.target) === null) return;
    const worth = outlook(after.streets, turnsLeft);
    if (!best || worth > best.worth) best = { ...play, worth };
  };
  state.hand.forEach((card, index) => {
    const targets = effectTargets(state, card);
    if (targets.length === 0) return consider({ index });
    targets.forEach((target) => consider({ index, target }));
    consider({ index, discard: true });
  });
  return best;
}

type HousePlay = { index: number; at: Lot | null; worth: number };

/**
 * The house to build (or renovate, or the card to discard instead), counting
 * the best effect the other cards could then give.
 */
function bestHouse(state: PicketFenceGameState): HousePlay | null {
  const turnsLeft = Math.ceil((state.deck.length + state.hand.length) / 2);
  let best: HousePlay | null = null;
  const consider = (index: number, at: Lot | null) => {
    const after = cloneState(state);
    if (at ? !buildHouse(after, index, at) : !skipBuild(after, index)) return;
    const effect = awaitingEffect(after) ? bestEffect(after) : null;
    const worth = effect
      ? effect.worth
      : outlook(after.streets, Math.max(0, turnsLeft - 1));
    if (!best || worth > best.worth) best = { index, at, worth };
  };
  state.hand.forEach((card, index) => {
    houseLots(state.streets, houseNumber(card)).forEach((at) =>
      consider(index, at),
    );
    consider(index, null);
  });
  return best;
}

function targetZone(target: Lot | FenceSpot) {
  // A fence's post shows once the spade is picked: the glow appears then.
  return "gap" in target
    ? `post-${target.street}-${target.gap}`
    : `lot-${target.street}-${target.lot}`;
}

function findPicketFenceHint(state: PicketFenceGameState) {
  if (awaitingEffect(state)) {
    const play = bestEffect(state);
    if (!play) return null;
    const card = cardTarget(state.hand[play.index]);
    if (play.target) {
      return makeHint("moveCard", card, zoneTarget(targetZone(play.target)));
    }
    return play.discard
      ? makeHint("moveCard", card, zoneTarget("discard"))
      : makeHint("tapCard", card);
  }

  const play = bestHouse(state);
  if (!play) return null;
  return makeHint(
    "moveCard",
    cardTarget(state.hand[play.index]),
    zoneTarget(play.at ? targetZone(play.at) : "discard"),
  );
}

export const picketFenceRules = {
  findHint: findPicketFenceHint,
  STREET_LENGTHS,
  POOL_LOTS,
  WIN_SCORE,
  HOUSE_POINTS,
  ESTATE_BONUS,
  PARK_POINTS,
  POOL_POINTS,
  emptyStreets,
  canBuild,
  canRenovate,
  legalLots,
  renovationLots,
  isDeadLot,
  streetKind,
  canTuck,
  estates,
  estateStatus,
  estateValue,
  scoreOf,
  isFull,
  isOver,
  getTier,
  buildHouse,
  skipBuild,
  applyEffect,
  effectTargets,
  createInitialState,
};

// ========== Layout ========== //
const GAP = 0.15;
const COLS = Math.max(...STREET_LENGTHS);
const HUD_ROW = 0;
const STREETS_ROW = 0.6;
const STREET_SPACING = 1.95;
const LABEL_HEIGHT = 0.36;
// The effect card tucked under a house shows above it.
const TUCK_PEEK = 0.2;
const STATUS_ROW = STREETS_ROW + STREET_SPACING * STREET_LENGTHS.length;
const LEGEND_ROW = STATUS_ROW + 0.42;
const HAND_ROW = LEGEND_ROW + 0.5;
const HAND_COL = (COLS - HAND_SIZE) / 2;
const POST_WIDTH = 0.45;
const POST_HEIGHT = 0.6;
const FENCE_WIDTH = 0.2;
const FENCE_OVERHANG = 0.05;

function streetCol(s: number) {
  return (COLS - STREET_LENGTHS[s]) / 2;
}

function estateLabelRow(s: number) {
  return STREETS_ROW + s * STREET_SPACING;
}

function lotRow(s: number) {
  return estateLabelRow(s) + LABEL_HEIGHT + 0.02 + TUCK_PEEK;
}

// Zone widths include the gaps they span, so a zone of width w centred on
// the gap after lot g starts at col g + 1 - w / 2.
function gapCol(s: number, gap: number, width: number) {
  return streetCol(s) + gap + 1 - width / 2;
}

const LEGEND = [
  {
    suit: "hearts",
    color: PICKET_FENCE_COLORS.park,
    label: "games:picketFence.legendPark",
    points: PARK_POINTS,
  },
  {
    suit: "diamonds",
    color: PICKET_FENCE_COLORS.pool,
    label: "games:picketFence.legendPool",
    points: POOL_POINTS,
  },
  {
    suit: "spades",
    color: PICKET_FENCE_COLORS.fence,
    label: "games:picketFence.legendFence",
    points: ESTATE_BONUS,
  },
  {
    suit: "clubs",
    color: PICKET_FENCE_COLORS.house,
    label: "games:picketFence.legendHouse",
    points: 0,
  },
] as const;

type Phase =
  | { kind: "house" }
  | { kind: "effect" }
  | { kind: "fence"; card: number }
  | { kind: "secondHouse"; card: number };

// ========== Component ========== //
export default function PicketFence() {
  const { colorPale, colorDark } = useGameColors();
  const showToast = useToast();
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<number | null>(null);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<PicketFenceGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the deck, then deal a fresh hand.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.deck));
    },
    resetNonGameStates: () => {
      setSelectedHouse(null);
      setSelectedEffect(null);
    },
  });

  const ended = isOver(game);
  const awaiting = awaitingEffect(game);
  const score = useMemo(() => scoreOf(game.streets), [game.streets]);
  const won = ended && score.total >= WIN_SCORE;

  useHint(() => findPicketFenceHint(game), {
    game,
    enabled: !isSettingUp && !ended,
  });

  const effectCard =
    selectedEffect !== null ? game.hand[selectedEffect] : undefined;
  const phase: Phase = !awaiting
    ? { kind: "house" }
    : effectCard?.suit === "spades"
      ? { kind: "fence", card: selectedEffect! }
      : effectCard?.suit === "clubs"
        ? { kind: "secondHouse", card: selectedEffect! }
        : { kind: "effect" };

  const houseCard =
    phase.kind === "house" && selectedHouse !== null
      ? game.hand[selectedHouse]
      : undefined;

  // Where the selected card can go as a house: empty lots, and houses it
  // can replace.
  const targetLots = useMemo(() => {
    const card =
      houseCard ?? (phase.kind === "secondHouse" ? effectCard : null);
    return card ? houseLots(game.streets, houseNumber(card)) : [];
  }, [houseCard, effectCard, phase.kind, game.streets]);

  // A selected card can go to the discard instead: skipping this turn's
  // house, or throwing away a spade or club rather than using it.
  const canDiscardSelected =
    !ended &&
    (houseCard !== undefined ||
      phase.kind === "fence" ||
      phase.kind === "secondHouse");

  const isTargetLot = (s: number, lot: number) =>
    targetLots.some((target) => target.street === s && target.lot === lot);

  function commit(update: (draft: PicketFenceGameState) => void) {
    saveUndoState(structuredClone(game));
    setSelectedHouse(null);
    setSelectedEffect(null);
    setGame(produce(game, update));
  }

  function playEffectCard(
    handIndex: number,
    target?: Lot | FenceSpot,
    discarding = false,
  ) {
    const reason = discarding ? null : wastedReason(game, game.hand[handIndex]);
    let result: EffectResult | null = null;
    commit((draft) => {
      result = applyEffect(draft, handIndex, target);
    });
    if (result === "wasted" && reason) showToast(i18n.t(reason));
  }

  function onDiscardPress() {
    if (!canDiscardSelected) return;
    if (phase.kind === "house") {
      const handIndex = selectedHouse!;
      commit((draft) => {
        skipBuild(draft, handIndex);
      });
    } else if (phase.kind === "fence" || phase.kind === "secondHouse") {
      playEffectCard(phase.card, undefined, true);
    }
  }

  function onHandPress(handIndex: number) {
    if (ended) return;
    const card = game.hand[handIndex];
    if (!card) return;

    if (phase.kind === "house") {
      if (selectedHouse === handIndex) {
        setSelectedHouse(null);
        return;
      }
      if (houseLots(game.streets, houseNumber(card)).length === 0) {
        showToast(i18n.t("games:picketFence.noLotFits"));
      }
      setSelectedHouse(handIndex);
      return;
    }

    // Choosing the effect: a spade or club first needs a target, and tapping
    // it again puts it back.
    if (selectedEffect === handIndex) {
      setSelectedEffect(null);
      return;
    }
    if (card.suit === "spades" || card.suit === "clubs") {
      if (effectTargets(game, card).length > 0) {
        setSelectedEffect(handIndex);
        return;
      }
    }
    playEffectCard(handIndex);
  }

  function onLotPress(s: number, lot: number) {
    if (ended || !isTargetLot(s, lot)) return;
    if (phase.kind === "house" && selectedHouse !== null) {
      const handIndex = selectedHouse;
      commit((draft) => {
        buildHouse(draft, handIndex, { street: s, lot });
      });
    } else if (phase.kind === "secondHouse") {
      playEffectCard(phase.card, { street: s, lot });
    }
  }

  function onFencePress(s: number, gap: number) {
    if (phase.kind !== "fence" || game.streets[s].fences[gap]) return;
    playEffectCard(phase.card, { street: s, gap });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const streetZones: MapZone[] = game.streets.flatMap((street, s) => {
      const lotZones: MapZone[] = street.houses.flatMap((house, lot) => {
        const tucked = street.tucked[lot];
        const isPool = isPoolLot({ street: s, lot });
        const dead = isDeadLot(street, lot);
        // Empty lots show what can go under them: a pool on a pool lot, and
        // a park anywhere on a park street.
        const kind = streetKind(street);
        const icon = dead
          ? "cancel"
          : kind === "hearts"
            ? "hearts"
            : isPool
              ? "diamonds"
              : undefined;
        return [
          {
            id: `tuck-${s}-${lot}`,
            name: "tuck",
            pileIndex: s,
            refIndex: lot,
            cards: tucked ? [tucked] : [],
            col: streetCol(s) + lot,
            row: lotRow(s) - TUCK_PEEK,
            baseZIndex: 5,
          },
          {
            id: `lot-${s}-${lot}`,
            name: "lot",
            pileIndex: s,
            refIndex: lot,
            cards: house ? [house] : [],
            col: streetCol(s) + lot,
            row: lotRow(s),
            baseZIndex: 10,
            placeholder: {
              showCount: false,
              iconName: icon,
              iconSize: 0.5,
            },
          },
        ];
      });

      const fenceZones: MapZone[] = street.fences.flatMap((fence, gap) => {
        if (fence) {
          return [
            {
              id: `fence-${s}-${gap}`,
              col: gapCol(s, gap, FENCE_WIDTH),
              row: lotRow(s) - FENCE_OVERHANG,
              width: FENCE_WIDTH,
              height: 1 + FENCE_OVERHANG * 2,
            },
          ];
        }
        if (phase.kind !== "fence") return [];
        return [
          {
            id: `post-${s}-${gap}`,
            name: "post",
            pileIndex: s,
            refIndex: gap,
            col: gapCol(s, gap, POST_WIDTH),
            row: lotRow(s) + (1 - POST_HEIGHT) / 2,
            width: POST_WIDTH,
            height: POST_HEIGHT,
            baseZIndex: 40,
            placeholder: { showCount: false, hideShadow: true },
          },
        ];
      });

      const estateZones: MapZone[] = estates(street).map(([first, last]) => ({
        id: `estate-${s}-${first}`,
        col: streetCol(s) + first,
        row: estateLabelRow(s),
        width: last - first + 1,
        height: LABEL_HEIGHT,
      }));

      return [...lotZones, ...fenceZones, ...estateZones];
    });

    const handZones: MapZone[] = Array.from({ length: HAND_SIZE }, (_, i) => ({
      id: `hand-${i}`,
      name: "hand",
      pileIndex: i,
      cards: game.hand[i] ? [game.hand[i]] : [],
      col: HAND_COL + i,
      row: HAND_ROW,
      baseZIndex: 10,
    }));

    return [
      {
        id: "hudBars",
        col: 0,
        row: HUD_ROW,
        width: "full",
        height: 0.45,
      },
      ...streetZones,
      {
        id: "status",
        col: 0,
        row: STATUS_ROW,
        width: COLS,
        height: 0.4,
      },
      {
        id: "legend",
        col: 0,
        row: LEGEND_ROW,
        width: COLS,
        height: 0.35,
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: HAND_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "right",
        },
      },
      ...handZones,
      {
        id: "discard",
        name: "discard",
        cards: flipAllToBack(game.discard),
        col: COLS - 1,
        row: HAND_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:discard"),
          infoPos: "left",
        },
      },
    ];
  }, [game, phase.kind]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const { zoneName, pileIndex, refIndex } = mappedCard;

    if (zoneName === "tuck") {
      return {
        isDisabled: true,
        selectColor: SUIT_EFFECT_COLORS[mappedCard.card.suit],
        forceOverlayColor: true,
      };
    }

    if (zoneName === "hand" && pileIndex !== undefined) {
      const isSelected =
        phase.kind === "house"
          ? selectedHouse === pileIndex
          : selectedEffect === pileIndex;
      const effectPhase = phase.kind === "effect";
      const choosingEffect = phase.kind !== "house" && !isSelected;
      // Effect cards that would do nothing are greyed: playing one only
      // discards it.
      const useless = effectPhase && !effectUse(game, mappedCard.card);
      return {
        onPress: () => onHandPress(pileIndex),
        isDisabled: ended,
        isSelected,
        selectColor: useless
          ? "grey"
          : effectPhase
            ? SUIT_EFFECT_COLORS[mappedCard.card.suit]
            : isSelected
              ? "blue"
              : choosingEffect
                ? "orange"
                : "none",
        forceSelectColor: isSelected,
        forceOverlayColor: effectPhase || choosingEffect,
      };
    }

    if (zoneName === "lot" && pileIndex !== undefined) {
      const isPending =
        !!game.pending &&
        game.pending.street === pileIndex &&
        game.pending.lot === refIndex;
      // A house the selected card can replace.
      const isTarget =
        !ended && refIndex !== undefined && isTargetLot(pileIndex, refIndex);
      return {
        onPress: isTarget ? () => onLotPress(pileIndex, refIndex) : undefined,
        isDisabled: !isTarget,
        selectColor: isTarget ? "orange" : isPending ? "purple" : "none",
        forceSelectColor: isPending && !isTarget,
        forceOverlayColor: isTarget,
      };
    }

    if (zoneName === "discard") {
      return {
        onPress: onDiscardPress,
        isDisabled: !canDiscardSelected,
        selectColor: canDiscardSelected ? "orange" : "none",
        forceOverlayColor: canDiscardSelected,
      };
    }

    return { isDisabled: true };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const { name, pileIndex: s, refIndex } = zone;
    if (name === "discard") {
      return {
        onPress: onDiscardPress,
        isDisabled: !canDiscardSelected,
        selectColor: canDiscardSelected ? "orange" : "none",
        forceOverlayColor: canDiscardSelected,
      };
    }
    if (s === undefined || refIndex === undefined) return;

    if (name === "lot") {
      const isTarget = !ended && isTargetLot(s, refIndex);
      return {
        onPress: () => onLotPress(s, refIndex),
        isDisabled: !isTarget,
        selectColor: isTarget ? "green" : "none",
      };
    }

    if (name === "post") {
      return {
        onPress: () => onFencePress(s, refIndex),
        isDisabled: phase.kind !== "fence",
        selectColor: "green",
        forceOverlayColor: true,
      };
    }

    return;
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: GAP,
    cardSize: "small",
    cardMapper,
    zoneMapper,
  });

  const tier = getTier(score.total);
  // The score if every estate that can still be finished is.
  const potential = useMemo(
    () =>
      score.total +
      game.streets.reduce(
        (sum, street) =>
          sum +
          estates(street)
            .filter((estate) => estateStatus(street, estate) === "open")
            .reduce((total, estate) => total + estateValue(estate), 0),
        0,
      ),
    [game.streets, score.total],
  );
  const tallies = [
    { suit: "spades", color: colorPale, value: score.estates },
    { suit: "hearts", color: PICKET_FENCE_COLORS.park, value: score.parks },
    { suit: "diamonds", color: PICKET_FENCE_COLORS.pool, value: score.pools },
  ] as const;

  const statusKey = ended
    ? null
    : phase.kind === "house"
      ? houseCard
        ? "games:picketFence.statusChooseLot"
        : "games:picketFence.statusChooseHouse"
      : phase.kind === "effect"
        ? "games:picketFence.statusChooseEffect"
        : phase.kind === "fence"
          ? "games:picketFence.statusChooseFence"
          : "games:picketFence.statusChooseSecondHouse";

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score.total}
      hideScore
      winLoseMessage={
        won
          ? i18n.t("games:picketFence.wonWithTier", {
              score: score.total,
              tier: i18n.t(tier.key),
            })
          : i18n.t("games:picketFence.lostShortOfTarget", {
              score: score.total,
              tier: i18n.t(tier.key),
              target: WIN_SCORE,
            })
      }
      canUndo={canUndo}
      undo={() => {
        setSelectedHouse(null);
        setSelectedEffect(null);
        undo();
      }}
    >
      {cardMap}

      {game.streets.flatMap((street, s) =>
        street.fences.map((fence, gap) =>
          fence ? (
            <View
              key={`fence-${s}-${gap}`}
              style={[
                pointerEventsStyles.none,
                getZoneStylesById(`fence-${s}-${gap}`),
                {
                  zIndex: 30,
                  backgroundColor: PICKET_FENCE_COLORS.fence,
                  borderRadius: cardWidth * 0.03,
                  borderTopLeftRadius: cardWidth * 0.05,
                  borderTopRightRadius: cardWidth * 0.05,
                },
              ]}
            />
          ) : null,
        ),
      )}

      {game.streets.flatMap((street, s) =>
        estates(street).map((estate) => {
          const status = estateStatus(street, estate);
          // What the estate scores, or would once finished.
          const points = estateValue(estate);
          return (
            <View
              key={`estate-${s}-${estate[0]}`}
              style={[
                pointerEventsStyles.none,
                getZoneStylesById(`estate-${s}-${estate[0]}`),
                {
                  justifyContent: "flex-end",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderColor: rgba(
                    colorPale,
                    status === "complete" ? 0.7 : 0.25,
                  ),
                  marginHorizontal: cardWidth * 0.05,
                },
              ]}
            >
              <Text
                size="xs"
                weight={status === "complete" ? 700 : 500}
                color={rgba(
                  colorPale,
                  status === "open" ? 0.6 : status === "complete" ? 1 : 0.35,
                )}
              >
                {status === "complete"
                  ? `+${points}`
                  : status === "blocked"
                    ? i18n.t("games:picketFence.estateBlocked")
                    : `${points}`}
              </Text>
            </View>
          );
        }),
      )}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("status"),
          flexStyles.rowCentered,
        ]}
      >
        {statusKey && (
          <Text
            size="xs"
            weight={500}
            color={colorPale}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{ flex: 1, textAlign: "center" }}
          >
            {i18n.t(statusKey)}
          </Text>
        )}
      </View>

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("legend"),
          flexStyles.rowCentered,
          { gap: cardWidth * 0.2 },
        ]}
      >
        {LEGEND.map(({ suit, color, label, points }) => (
          <View
            key={suit}
            style={[flexStyles.rowCentered, { gap: cardWidth * 0.04 }]}
          >
            <Icon name={suit} size={cardWidth * 0.17} color={color} />
            <Text size="xxs" weight={500} color={color} numberOfLines={1}>
              {i18n.t(label)}
              {points ? ` +${points}` : ""}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("hudBars"),
          flexStyles.rowCentered,
          { gap: cardHeight * 0.1 },
        ]}
      >
        {tallies.map(({ suit, color, value }) => (
          <View
            key={suit}
            style={[
              flexStyles.rowCentered,
              {
                gap: cardWidth * 0.06,
                height: cardHeight * 0.42,
                paddingHorizontal: cardWidth * 0.14,
                borderRadius: cardHeight * 0.21,
                backgroundColor: rgba(colorDark, 0.7),
              },
            ]}
          >
            <Icon name={suit} size={cardWidth * 0.2} color={color} />
            <Text size="sm" weight={700} color={colorPale} numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
        <ProgressBar
          progressValue={score.total}
          previewProgressValue={ended ? undefined : potential}
          totalValue={WIN_SCORE}
          color={PICKET_FENCE_COLORS.score}
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:picketFence.score")}
          tallyText={`${score.total} / ${WIN_SCORE}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 1 }}
        />
      </View>
    </GameWrapper>
  );
}
