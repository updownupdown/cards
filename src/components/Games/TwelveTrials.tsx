import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardLabel,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isFace,
  isJoker,
  rankValue,
  shuffle,
  sortCardsBySuit,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { ProgressBar } from "../Home/ProgressBar";
import { rotatedText } from "@/styles/textStyles";
import { Text } from "../common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import {
  cardTarget,
  makeHint,
  withNote,
  zoneTarget,
  type Hint,
  type HintTarget,
} from "@/hints/hint";
const maxDamage = 7;

// Row sizes (top to bottom) per dungeon level; each sums to 12.
const LAYOUT = {
  fixedCols: 6,
  fixedRows: 7,
  xScale: 1.4,
  rowGap: 0.4,
  dungeonTop: 1.2,
  bottomStart: 4.9,
  rows: {
    1: [4, 4, 4],
    2: [3, 3, 3, 3],
    3: [2, 3, 3, 4],
    4: [2, 2, 3, 2, 3],
    5: [1, 2, 3, 1, 2, 3],
  } as Record<number, number[]>,
};

export type TwelveTrialsPlacement = {
  card: PlayingCard;
  role: "attack" | "trigger";
  doubled?: boolean;
};
export type TwelveTrialsSlot = {
  monster: PlayingCard;
  row: number;
  x: number;
  defeated: boolean;
  placed: TwelveTrialsPlacement[];
};

export type TwelveTrialsGameState = {
  slots: TwelveTrialsSlot[];
  deck: PlayingCard[];
  hand: PlayingCard[];
  reserve: PlayingCard[];
  damage: number;
  discard: PlayingCard[];
  kings: PlayingCard[];
  reserveSetup: boolean;
  ended: boolean;
  won: boolean;
};

type GameState = TwelveTrialsGameState;

const gameStateInitial: GameState = {
  slots: [],
  deck: [],
  hand: [],
  reserve: [],
  damage: 0,
  discard: [],
  kings: [],
  reserveSetup: false,
  ended: false,
  won: false,
};

const kingHint = (
  suit: CardSuit | "hearts-action" | "spades-action" | "diamonds-action",
) => {
  switch (suit) {
    case "hearts":
      return i18n.t("games:twelveTrials.buryAHandCard");
    case "hearts-action":
      return i18n.t("games:twelveTrials.selectHandCard");
    case "spades":
      return i18n.t("games:twelveTrials.doubleAnAttack");
    case "spades-action":
      return i18n.t("games:twelveTrials.chooseAnAttack");
    case "diamonds-action":
      return i18n.t("games:twelveTrials.chooseWhetherToMoveCard");
    case "diamonds":
      return i18n.t("games:twelveTrials.moveBottomCardToTop");
    case "clubs":
      return i18n.t("games:twelveTrials.drawACard");
  }
};

function fanOffset(count: number, widthUnits: number) {
  if (count <= 1) return 0.4;
  return Math.max(0.1, Math.min(0.8, (widthUnits - 1) / (count - 1)));
}

// ── Rules helpers ─────────────────────────────────────────────────────────────
function attackValue(card: PlayingCard, boomer: boolean) {
  if (isJoker(card)) return 10;
  if (card.rank === "A") return boomer ? 11 : 1;
  return rankValue(card);
}
function monsterPower(monster: PlayingCard) {
  return rankValue(monster); // J=11, Q=12, K=13
}
function attackerSum(slot: TwelveTrialsSlot, boomer: boolean) {
  return slot.placed
    .filter((p) => p.role === "attack")
    .reduce(
      (sum, p) => sum + attackValue(p.card, boomer) * (p.doubled ? 2 : 1),
      0,
    );
}
function isAttackable(slots: TwelveTrialsSlot[], idx: number) {
  const s = slots[idx];
  if (s.defeated) return false;
  return !slots.some(
    (o) => o.row > s.row && Math.abs(o.x - s.x) < 0.9 && !o.defeated,
  );
}
function canPlace(
  slots: TwelveTrialsSlot[],
  idx: number,
  card: PlayingCard,
  boomer: boolean,
  doubleAttack = false,
) {
  const s = slots[idx];
  if (!isAttackable(slots, idx)) return false;
  if (s.placed.length === 0) return true; // first attacker
  if (s.placed.length === 1) {
    return (
      attackerSum(s, boomer) +
        attackValue(card, boomer) * (doubleAttack ? 2 : 1) >=
      monsterPower(s.monster)
    );
  }
  if (s.placed.length === 2) {
    if (attackerSum(s, boomer) < monsterPower(s.monster)) return false;
    return card.suit === s.monster.suit || isJoker(card);
  }
  return false;
}

// ── Hints ─────────────────────────────────────────────────────────────────────
export type TwelveTrialsHintOptions = {
  boomer: boolean;
  abilitiesOn: boolean;
  selected: { zone: "hand" | "reserve"; index: number } | null;
  reservePick: string[];
  selectedKing: PlayingCard | null;
  kingMode: { type: "return" | "double" | "move"; kingId: string } | null;
};

type TrialsAction =
  | {
      type: "place";
      from: "hand" | "reserve";
      card: PlayingCard;
      slot: number;
      doubled: boolean;
    }
  | { type: "discard"; card: PlayingCard }
  | { type: "bury"; card: PlayingCard };

/** What a line of moves through the hand changes. */
type TrialsSim = {
  slots: TwelveTrialsSlot[];
  hand: PlayingCard[];
  reserve: PlayingCard[];
  kings: PlayingCard[];
  damage: number;
  /** Cards a King of Hearts put back under the deck. */
  buried: PlayingCard[];
};

// Positions a hint looks through: plenty for a hand of three or five.
const SEARCH_BUDGET = 4000;

function kingOf(sim: TrialsSim, suit: CardSuit) {
  return sim.kings.find((king) => king.suit === suit);
}

function trialsActions(
  sim: TrialsSim,
  boomer: boolean,
  mode: TwelveTrialsHintOptions["kingMode"],
  holdReserve = false,
): TrialsAction[] {
  if (mode?.type === "return") {
    return sim.hand.map((card) => ({ type: "bury", card }));
  }
  const actions: TrialsAction[] = [];
  const canDouble = mode?.type === "double" || !!kingOf(sim, "spades");
  const sources = [
    ...sim.hand.map((card) => ({ from: "hand" as const, card })),
    ...(holdReserve ? [] : sim.reserve).map((card) => ({
      from: "reserve" as const,
      card,
    })),
  ];
  for (const { from, card } of sources) {
    sim.slots.forEach((slot, idx) => {
      // Reserve cards wait for a monster they help finish (or for the end,
      // when they're all that's left).
      if (from === "reserve" && sim.hand.length > 0 && !slot.placed.length) {
        return;
      }
      const attack = slot.placed.length < 2;
      for (const doubled of attack && canDouble ? [false, true] : [false]) {
        // A King of Spades in play doubles the next attack.
        if (mode?.type === "double" && attack && !doubled) continue;
        if (canPlace(sim.slots, idx, card, boomer, doubled)) {
          actions.push({ type: "place", from, card, slot: idx, doubled });
        }
      }
    });
  }
  if (mode?.type !== "double") {
    for (const card of sim.hand) {
      actions.push({ type: "discard", card });
      if (kingOf(sim, "hearts")) actions.push({ type: "bury", card });
    }
  }
  return actions;
}

function applyTrialsAction(
  sim: TrialsSim,
  action: TrialsAction,
  boomer: boolean,
  abilitiesOn: boolean,
): TrialsSim {
  const next: TrialsSim = {
    ...sim,
    hand: sim.hand.filter((card) => card.id !== action.card.id),
  };
  if (action.type === "discard") {
    next.damage += 1;
    return next;
  }
  if (action.type === "bury") {
    const hearts = kingOf(sim, "hearts")!;
    next.kings = sim.kings.filter((king) => king.id !== hearts.id);
    next.buried = [...sim.buried, action.card];
    return next;
  }
  if (action.from === "reserve") {
    next.hand = sim.hand;
    next.reserve = sim.reserve.filter((card) => card.id !== action.card.id);
  }
  const slot = sim.slots[action.slot];
  const role = slot.placed.length < 2 ? "attack" : "trigger";
  const doubled = action.doubled && role === "attack";
  if (doubled) {
    const spades = kingOf(sim, "spades");
    if (spades) next.kings = sim.kings.filter((king) => king.id !== spades.id);
  }
  next.slots = sim.slots.map((other, idx) =>
    idx !== action.slot
      ? other
      : role === "attack"
        ? {
            ...other,
            placed: [
              ...other.placed,
              { card: action.card, role, doubled: doubled || undefined },
            ],
          }
        : { ...other, placed: [], defeated: true },
  );
  if (role === "trigger") {
    if (boomer && action.card.rank === "A") {
      next.hand = [...next.hand, action.card];
    }
    if (abilitiesOn && slot.monster.rank === "K") {
      next.kings = [...next.kings, slot.monster];
    }
  }
  return next;
}

/** The cards still to come (the deck, as a set), counted once per hint. */
type TrialsPool = {
  cards: { value: number; suit: CardSuit; joker: boolean }[];
  /** Attack values, highest first. */
  values: number[];
  suits: Record<CardSuit, number>;
  jokers: number;
};

function trialsPool(cards: PlayingCard[], boomer: boolean): TrialsPool {
  const pool: TrialsPool = {
    cards: cards.map((card) => ({
      value: attackValue(card, boomer),
      suit: card.suit,
      joker: isJoker(card),
    })),
    values: [],
    suits: { hearts: 0, diamonds: 0, clubs: 0, spades: 0 },
    jokers: 0,
  };
  pool.values = pool.cards.map((card) => card.value).sort((a, b) => b - a);
  for (const card of pool.cards) {
    if (card.joker) pool.jokers += 1;
    else pool.suits[card.suit] += 1;
  }
  return pool;
}

/**
 * How good a position is to draw the next hand in, judged against the cards
 * still to come (the deck, the reserve and buried cards):
 * - every card placed is one fewer needed, every discard costs health;
 * - the attackers to come must still add up to what the monsters need (a
 *   high card spent on a trigger, or an attack overshooting, costs that);
 * - the next hand's cards should find a monster to go on;
 * - a monster no card left can finish loses the game.
 */
function trialsStanding(sim: TrialsSim, pool: TrialsPool, boomer: boolean) {
  const left = sim.slots.filter((slot) => !slot.defeated);
  if (left.length === 0) return 1e6;
  if (sim.damage >= maxDamage) return -1e6;
  const extras = [...sim.buried, ...sim.reserve];
  const needed = left.reduce((sum, slot) => sum + 3 - slot.placed.length, 0);
  const spare = pool.cards.length + extras.length - needed;
  let value =
    150 * spare -
    150 * sim.damage +
    30 * (sim.slots.length - left.length) +
    60 * sim.kings.length;
  if (spare < 0) value -= 2000 * -spare;

  const extraValues = extras
    .map((card) => attackValue(card, boomer))
    .sort((a, b) => b - a);
  const doubling = !!kingOf(sim, "spades");
  const best =
    Math.max(pool.values[0] ?? 0, extraValues[0] ?? 0) * (doubling ? 2 : 1);
  let attackers = 0;
  let demand = 0;
  for (const slot of left) {
    const power = monsterPower(slot.monster);
    if (slot.placed.length === 0) {
      attackers += 2;
      demand += power;
    } else if (slot.placed.length === 1) {
      const need = power - attackerSum(slot, boomer);
      attackers += 1;
      demand += Math.max(0, need);
      if (need > best) value -= 5000;
    }
  }
  // The best attackers to come, as many as are needed.
  let supply = 0;
  for (let i = 0, j = 0; i + j < attackers; ) {
    const fromPool = pool.values[i];
    const fromExtras = extraValues[j];
    if (fromPool === undefined && fromExtras === undefined) break;
    if (
      fromExtras === undefined ||
      (fromPool !== undefined && fromPool >= fromExtras)
    ) {
      supply += fromPool;
      i += 1;
    } else {
      supply += fromExtras;
      j += 1;
    }
  }
  const slack = supply - demand;
  value += 25 * Math.min(slack, 20) + 50 * Math.min(0, slack);

  // The next hand is drawn from the deck: each card that will find no
  // monster to go on is likely a discard. A monster with nothing on it
  // takes any card; one waiting for a high attacker, few.
  const open = sim.slots.filter((_, idx) => isAttackable(sim.slots, idx));
  if (pool.cards.length > 0 && !open.some((slot) => !slot.placed.length)) {
    const needs = open
      .filter((slot) => slot.placed.length === 1)
      .map((slot) => monsterPower(slot.monster) - attackerSum(slot, boomer));
    const suits = open
      .filter((slot) => slot.placed.length === 2)
      .map((slot) => slot.monster.suit);
    const homeless = pool.cards.filter(
      (card) =>
        !card.joker &&
        !suits.includes(card.suit) &&
        !needs.some((need) => card.value >= need),
    ).length;
    value -= (300 * homeless) / pool.cards.length;
  }

  // Each monster needs a trigger of its suit (or a joker).
  let jokers = pool.jokers;
  const suitCards = { ...pool.suits };
  for (const card of extras) {
    if (isJoker(card)) jokers += 1;
    else suitCards[card.suit] += 1;
  }
  let missing = 0;
  for (const suit of ["hearts", "diamonds", "clubs", "spades"] as const) {
    const triggers = left.filter((slot) => slot.monster.suit === suit).length;
    missing += Math.max(0, triggers - suitCards[suit]);
  }
  value -= 3000 * Math.max(0, missing - jokers);
  return value;
}

/**
 * The best way to play out the hand (every order, every monster, the reserve
 * to finish monsters), judged by trialsStanding once the hand is spent.
 */
function planTrials(
  root: TrialsSim,
  pool: TrialsPool,
  options: Pick<TwelveTrialsHintOptions, "boomer" | "abilitiesOn"> & {
    mode?: TwelveTrialsHintOptions["kingMode"];
    /** Keep the reserve out of this hand (it's there for later). */
    holdReserve?: boolean;
  },
) {
  const { boomer, abilitiesOn } = options;
  const seen = new Map<string, number>();
  let visited = 0;
  const keyOf = (sim: TrialsSim) =>
    [
      sim.slots
        .map((slot) =>
          slot.defeated ? "x" : slot.placed.map((p) => p.card.id).join("+"),
        )
        .join("|"),
      sim.hand.map((card) => card.id).join("+"),
      sim.reserve.map((card) => card.id).join("+"),
      sim.kings.length,
      sim.damage,
    ].join("/");

  const visit = (
    sim: TrialsSim,
    depth: number,
  ): { value: number; first: TrialsAction | null } => {
    // The same cards played in another order end in the same place.
    const key = depth > 0 ? keyOf(sim) : "";
    const known = seen.get(key);
    if (known !== undefined) return { value: known, first: null };
    const over =
      sim.damage >= maxDamage || sim.slots.every((slot) => slot.defeated);
    if (over || (depth > 0 && sim.hand.length === 0)) {
      const value = trialsStanding(sim, pool, boomer);
      seen.set(key, value);
      return { value, first: null };
    }
    let best: { value: number; first: TrialsAction | null } = {
      value: -Infinity,
      first: null,
    };
    visited += 1;
    const actions = trialsActions(
      sim,
      boomer,
      depth === 0 ? (options.mode ?? null) : null,
      options.holdReserve,
    );
    for (const action of actions) {
      if (visited > SEARCH_BUDGET && best.first) break;
      const value = visit(
        applyTrialsAction(sim, action, boomer, abilitiesOn),
        depth + 1,
      ).value;
      if (value > best.value) best = { value, first: action };
    }
    if (!best.first) {
      // Only reserve cards that can't go anywhere yet: the hand is done.
      best.value = trialsStanding(sim, pool, boomer);
    }
    seen.set(key, best.value);
    return best;
  };
  return visit(root, 0);
}

function simOf(state: GameState): TrialsSim {
  return {
    slots: state.slots,
    hand: state.hand,
    reserve: state.reserve,
    kings: state.kings,
    damage: state.damage,
    buried: [],
  };
}

/** The two cards to keep in reserve: the pair whose hand plays out best. */
function bestReserve(state: GameState, options: TwelveTrialsHintOptions) {
  const pool = trialsPool(state.deck, options.boomer);
  let best: { pair: PlayingCard[]; value: number } | null = null;
  state.hand.forEach((first, i) => {
    state.hand.slice(i + 1).forEach((second) => {
      const pair = [first, second];
      const value = planTrials(
        {
          ...simOf(state),
          hand: state.hand.filter((card) => !pair.includes(card)),
          reserve: pair,
        },
        pool,
        { ...options, holdReserve: true },
      ).value;
      if (!best || value > best.value) best = { pair, value };
    });
  });
  return best!.pair;
}

/**
 * Plays out the hand the way that leaves the dungeon most winnable: cards
 * on monsters rather than discarded, attacks that don't overshoot, low
 * cards as triggers, and no monster left that no card to come can finish.
 */
function findTwelveTrialsHint(
  state: GameState,
  options: TwelveTrialsHintOptions,
): Hint | null {
  if (state.ended || state.slots.length === 0) return null;
  const { selected, kingMode, selectedKing } = options;
  const controls = (label: string, ...taps: HintTarget[]) =>
    makeHint(
      { key: "press", values: { label } },
      ...taps,
      zoneTarget("controls"),
    );

  if (state.reserveSetup) {
    if (state.hand.length < 2) return null;
    const pair = bestReserve(state, options).map((card) => card.id);
    const taps = [
      ...options.reservePick.filter((id) => !pair.includes(id)),
      ...pair.filter((id) => !options.reservePick.includes(id)),
    ].map((id) => cardTarget(id));
    return withNote(
      controls(
        i18n.t("games:twelveTrials.setReserve2", { length: 2 }),
        ...taps,
      ),
      i18n.t("games:twelveTrials.hint.reserve"),
    );
  }

  if (kingMode?.type === "move") {
    // The bottom card shows on the button: worth drawing next if it attacks.
    const bottom = state.deck[0];
    return bottom && attackValue(bottom, options.boomer) >= 7
      ? controls(
          i18n.t("games:twelveTrials.moveToTop", { value: cardLabel(bottom) }),
        )
      : controls(i18n.t("games:twelveTrials.doNothing"));
  }

  const pool = trialsPool(state.deck, options.boomer);
  const plan = planTrials(simOf(state), pool, { ...options, mode: kingMode });
  if (kingMode) {
    // A King's power in play: use it, or put it away if there's better.
    const free = planTrials(simOf(state), pool, { ...options, mode: null });
    if (!plan.first || free.value > plan.value) {
      return controls(i18n.t("cards:cancel"));
    }
  }
  const action = plan.first;
  if (!action) return null;

  const selectedCard =
    selected &&
    (selected.zone === "hand" ? state.hand : state.reserve)[selected.index];
  const pick = (card: PlayingCard) =>
    selectedCard?.id === card.id ? [] : [cardTarget(card)];
  const kingPower = (suit: CardSuit) => {
    const king = state.kings.find((card) => card.suit === suit)!;
    return controls(
      kingHint(suit),
      ...(selectedKing?.id === king.id ? [] : [cardTarget(king)]),
    );
  };

  if (action.type === "bury") {
    return kingMode?.type === "return"
      ? withNote(
          makeHint("tapCard", cardTarget(action.card)),
          i18n.t("games:twelveTrials.hint.bury"),
        )
      : withNote(
          kingPower("hearts"),
          i18n.t("games:twelveTrials.hint.buryWithKing"),
        );
  }
  if (action.type === "discard") {
    return withNote(
      controls(i18n.t("cards:discard"), ...pick(action.card)),
      i18n.t("games:twelveTrials.hint.discard"),
    );
  }
  if (action.doubled && kingMode?.type !== "double") {
    return withNote(
      kingPower("spades"),
      i18n.t("games:twelveTrials.hint.double"),
    );
  }
  return makeHint(
    "moveCard",
    pick(action.card),
    cardTarget(state.slots[action.slot].monster),
  );
}

export const twelveTrialsRules = {
  findHint: findTwelveTrialsHint,
  attackValue,
  monsterPower,
  attackerSum,
  isAttackable,
  canPlace,
  maxDamage,
};

// ── Component ────────────────────────────────────────────────────────────────
export default function TwelveTrials() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const level = useGameSettingValue("dungeonLevel") as number;
  const boomer = useGameSettingValue("boomerAce") as boolean;
  const powerReserveOn = useGameSettingValue("powerReserve") as boolean;
  const abilitiesOn = useGameSettingValue("specialAbilities") as boolean;

  const settingsRef = useRef({ level, powerReserveOn });
  settingsRef.current = { level, powerReserveOn };

  const showToast = useToast();

  const [selected, setSelected] = useState<{
    zone: "hand" | "reserve";
    index: number;
  } | null>(null);
  const [reservePick, setReservePick] = useState<string[]>([]);
  const [selectedKing, setSelectedKing] = useState<PlayingCard | null>(null);
  const [kingMode, setKingMode] = useState<{
    type: "return" | "double" | "move";
    kingId: string;
  } | null>(null);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        setReservePick([]);
        setSelectedKing(null);
        setKingMode(null);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          const allCards = new Map<string, PlayingCard>();
          const collect = (card: PlayingCard) => {
            allCards.set(card.id, card);
          };

          draft.slots.forEach((slot) => {
            collect(slot.monster);
            slot.placed.forEach((placement) => collect(placement.card));
          });
          [
            ...draft.deck,
            ...draft.hand,
            ...draft.reserve,
            ...draft.discard,
            ...draft.kings,
          ].forEach(collect);

          const full =
            allCards.size > 0
              ? Array.from(allCards.values())
              : createDeck({ includeJokers: true });

          draft.slots = [];
          draft.deck = [];
          draft.hand = [];
          draft.reserve = [];
          draft.damage = 0;
          draft.discard = flipAllToBack(full);
          draft.kings = [];
          draft.reserveSetup = false;
          draft.ended = false;
          draft.won = false;
        });

        await delay();

        setGame((draft) => {
          const shuffled = shuffle(draft.discard);
          const monsters = shuffle(shuffled.filter((c) => isFace(c)));
          const power = shuffle(shuffled.filter((c) => !isFace(c)));

          const layout =
            LAYOUT.rows[settingsRef.current.level] ?? LAYOUT.rows[1];
          const slots: TwelveTrialsSlot[] = [];
          let k = 0;
          for (let r = 0; r < layout.length; r += 1) {
            const size = layout[r];
            for (let i = 0; i < size; i += 1) {
              slots.push({
                monster: monsters[k],
                row: r,
                x: i - (size - 1) / 2,
                defeated: false,
                placed: [],
              });
              k += 1;
            }
          }

          const handSize = settingsRef.current.powerReserveOn ? 5 : 3;
          const hand: PlayingCard[] = [];
          for (let i = 0; i < handSize; i += 1) {
            const c = power.pop();
            if (c) hand.push(flipToFace(c));
          }

          draft.slots = slots;
          draft.discard = [];
          draft.deck = power.map(flipToBack);
          draft.hand = sortCardsBySuit(hand);
          draft.reserveSetup = settingsRef.current.powerReserveOn;
        });

        await delay();
      },
    });

  useHint(
    () =>
      findTwelveTrialsHint(game, {
        boomer,
        abilitiesOn,
        selected,
        reservePick,
        selectedKing,
        kingMode,
      }),
    { game },
  );

  // Keep a stale selection from pointing at a missing card.
  useEffect(() => {
    if (!selected) return;
    const arr = selected.zone === "hand" ? game.hand : game.reserve;
    if (!arr[selected.index]) setSelected(null);
  }, [game.hand, game.reserve, selected]);

  const selectedCard =
    selected &&
    (selected.zone === "hand"
      ? game.hand[selected.index]
      : game.reserve[selected.index]);

  // ── Shared mutation helpers (operate on immer draft) ─────────────────────────
  function removeKing(draft: GameState, id: string) {
    const king = draft.kings.find((k) => k.id === id);
    draft.kings = draft.kings.filter((k) => k.id !== id);
    if (king) draft.discard.push(king);
  }

  function defeatMonster(draft: GameState, idx: number) {
    const s = draft.slots[idx];
    for (const p of s.placed) {
      if (p.role === "trigger" && boomer && p.card.rank === "A") {
        draft.hand.push(p.card);
        draft.hand = sortCardsBySuit(draft.hand);
      } else {
        draft.discard.push(p.card);
      }
    }
    s.placed = [];
    s.defeated = true;
    if (abilitiesOn && s.monster.rank === "K") {
      draft.kings.push(flipToFace(s.monster));
    } else {
      draft.discard.push(s.monster);
    }
  }

  function postAction(draft: GameState) {
    if (draft.slots.every((s) => s.defeated)) {
      draft.ended = true;
      draft.won = true;
      return;
    }
    if (draft.damage >= maxDamage) {
      draft.ended = true;
      draft.won = false;
      return;
    }
    if (!draft.reserveSetup && draft.hand.length === 0) {
      for (let i = 0; i < 3 && draft.deck.length > 0; i += 1) {
        const c = draft.deck.pop();
        if (c) draft.hand.push(flipToFace(c));
      }
    }
    if (draft.deck.length === 0 && draft.hand.length === 0) {
      const anyReserveMove = draft.reserve.some((card) =>
        draft.slots.some((_, i) => canPlace(draft.slots, i, card, boomer)),
      );
      if (!anyReserveMove) {
        draft.ended = true;
        draft.won = false;
      }
    }

    draft.hand = sortCardsBySuit(draft.hand);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  function placeOnMonster(idx: number) {
    if (game.ended || game.reserveSetup || !selected || !selectedCard) return;
    const doubling = kingMode?.type === "double";
    if (!canPlace(game.slots, idx, selectedCard, boomer, doubling)) {
      showToast(i18n.t("games:twelveTrials.notAValidPlacement"));
      return;
    }

    const role = game.slots[idx].placed.length < 2 ? "attack" : "trigger";
    const doubledAttack = doubling && role === "attack";
    const src = selected;
    const doubleKingId = doubledAttack ? kingMode!.kingId : null;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card =
        src.zone === "hand"
          ? draft.hand.splice(src.index, 1)[0]
          : draft.reserve.splice(src.index, 1)[0];
      if (!card) return;

      draft.slots[idx].placed.push({
        card,
        role,
        doubled: doubledAttack || undefined,
      });
      if (doubleKingId) removeKing(draft, doubleKingId);
      if (role === "trigger") defeatMonster(draft, idx);
      postAction(draft);
    });

    setSelected(null);
    if (doubledAttack) setKingMode(null);
  }

  function discardSelected() {
    if (
      game.ended ||
      game.reserveSetup ||
      !selected ||
      selected.zone !== "hand"
    )
      return;
    const index = selected.index;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.hand.splice(index, 1)[0];
      if (card) {
        draft.damage++;
        draft.discard.push(flipToBack(card));
      }
      postAction(draft);
    });
    setSelected(null);
  }

  function confirmReserve() {
    if (reservePick.length !== 2) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.reserve = draft.hand.filter((c) => reservePick.includes(c.id));
      draft.hand = draft.hand.filter((c) => !reservePick.includes(c.id));
      draft.reserveSetup = false;
    });
    setReservePick([]);
  }

  function activateKing(king: PlayingCard) {
    if (game.ended || game.reserveSetup) return;
    const suit = king.suit;

    saveUndoState(structuredClone(game));

    if (suit === "hearts") {
      setKingMode({ type: "return", kingId: king.id });
      setSelectedKing(null);
      setSelected(null);
      return;
    }
    if (suit === "spades") {
      setKingMode({ type: "double", kingId: king.id });
      setSelectedKing(null);
      return;
    }

    if (suit === "diamonds") {
      setGame((draft) => {
        removeKing(draft, king.id);
        postAction(draft);
      });
      setKingMode({ type: "move", kingId: king.id });
      setSelectedKing(null);
      return;
    }

    setGame((draft) => {
      if (suit === "clubs") {
        if (draft.deck.length > 0) {
          const c = draft.deck.pop();
          if (c) draft.hand.push(flipToFace(c));
        }
      }

      draft.hand = sortCardsBySuit(draft.hand);

      removeKing(draft, king.id);
      postAction(draft);
    });
    setSelectedKing(null);
  }

  function resolveMoveKing(moveCard: boolean) {
    if (!kingMode || kingMode.type !== "move") return;
    if (moveCard) {
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        if (draft.deck.length > 1) {
          const bottom = draft.deck.shift();
          if (bottom) draft.deck.push(bottom);
        }
        postAction(draft);
      });
    }
    setKingMode(null);
  }

  function selectKing(king: PlayingCard) {
    if (game.ended || game.reserveSetup || kingMode) return;
    setSelectedKing((current) => (current?.id === king.id ? null : king));
  }

  function returnHandCard(index: number) {
    if (!kingMode || kingMode.type !== "return") return;
    const kingId = kingMode.kingId;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.hand.splice(index, 1)[0];
      if (card) draft.deck.unshift(flipToBack(card));
      removeKing(draft, kingId);
      postAction(draft);
    });
    setKingMode(null);
  }

  function onHandPress(index: number) {
    if (game.ended) return;
    if (game.reserveSetup) {
      const id = game.hand[index]?.id;
      if (!id) return;
      setSelectedKing(null);
      setReservePick((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length < 2
            ? [...prev, id]
            : prev,
      );
      return;
    }
    if (kingMode?.type === "return") {
      setSelectedKing(null);
      returnHandCard(index);
      return;
    }
    setSelectedKing(null);
    setSelected((s) =>
      s && s.zone === "hand" && s.index === index
        ? null
        : { zone: "hand", index },
    );
  }

  function onReservePress(index: number) {
    if (game.ended || game.reserveSetup) return;
    setSelectedKing(null);
    setSelected((s) =>
      s && s.zone === "reserve" && s.index === index
        ? null
        : { zone: "reserve", index },
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const shiftX = (LAYOUT.fixedCols - 1) / 2;

  const zones: MapZone[] = useMemo(() => {
    const extraCardsZone = powerReserveOn || abilitiesOn;

    const result: MapZone[] = [];

    game.slots.forEach((slot, idx) => {
      if (slot.defeated) return;
      const attackable = isAttackable(game.slots, idx);
      const col = slot.x * LAYOUT.xScale + shiftX;
      const row = LAYOUT.dungeonTop + slot.row * LAYOUT.rowGap;
      result.push({
        id: `slot-${idx}`,
        name: "slot",
        pileIndex: idx,
        cards: [
          attackable ? flipToFace(slot.monster) : flipToBack(slot.monster),
        ],
        col,
        row,
        baseZIndex: 5 + slot.row,
      });
      slot.placed.forEach((p, k) => {
        result.push({
          id: `placed-${idx}-${k}`,
          name: "placed",
          pileIndex: idx,
          cards: [p.card],
          col: col - 0.2 + k * 0.4,
          row: row + 0.65,
          baseZIndex: 40 + k,
        });
      });
    });

    result.push(
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      {
        id: "hud",
        name: "hud",
        col: 1.75,
        row: 0,
        width: 2.5,
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 5,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "left" },
      },
    );

    result.push({
      id: "controls",
      col: 0,
      row: LAYOUT.bottomStart,
      width: "full",
      height: 0.9,
    });

    if (extraCardsZone) {
      const reserveCards = [
        ...(powerReserveOn ? game.reserve : []),
        ...(abilitiesOn ? game.kings : []),
      ];
      result.push({
        id: "reserve",
        name: "reserve",
        cards: reserveCards,
        col: 0,
        row: 5.8,
        width: 2.9,
        height: 1.2,
        baseZIndex: 30,
        fan: {
          direction: "right",
          offset: fanOffset(reserveCards.length, 2.9),
        },
        placeholder: {},
      });
    }

    result.push({
      id: "hand",
      name: "hand",
      cards: game.hand,
      col: extraCardsZone ? 3 : 0,
      row: 5.8,
      width: extraCardsZone ? 3 : 6,
      height: 1.2,
      baseZIndex: 60,
      fan: {
        direction: "right",
        offset: fanOffset(game.hand.length, extraCardsZone ? 3 : 6),
      },
      placeholder: {},
    });

    return result;
  }, [game, abilitiesOn, powerReserveOn, level]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "slot" && mappedCard.pileIndex !== undefined) {
      // ----- Slots ----- //
      const idx = mappedCard.pileIndex;
      const attackable = isAttackable(game.slots, idx);
      const canDrop =
        !!selectedCard &&
        canPlace(
          game.slots,
          idx,
          selectedCard,
          boomer,
          kingMode?.type === "double",
        );
      return {
        isDisabled: game.ended || game.reserveSetup || !attackable,
        selectColor: canDrop ? "green" : "none",
        onPress: () => placeOnMonster(idx),
      };
    } else if (mappedCard.zoneName === "hand") {
      // ----- Hand ----- //
      const index = mappedCard.cardIndex;
      const isSelected = game.reserveSetup
        ? reservePick.includes(mappedCard.card.id)
        : selected?.zone === "hand" && selected.index === index;

      return {
        isSelected,
        selectColor: game.reserveSetup ? "purple" : "blue",
        isDisabled: game.ended,
        onPress: () => onHandPress(index),
      };
    } else if (mappedCard.zoneName === "reserve") {
      // ----- Reserve ----- //
      const index = mappedCard.cardIndex;
      const isKing = index >= game.reserve.length;
      if (isKing) {
        const king = mappedCard.card;
        const armed =
          selectedKing?.id === king.id || kingMode?.kingId === king.id;

        return {
          isSelected: armed,
          selectColor: kingMode?.kingId === king.id ? "red" : "green",
          isDisabled: game.ended || game.reserveSetup,
          onPress: () => selectKing(king),
        };
      } else {
        return {
          isSelected: selected?.zone === "reserve" && selected.index === index,
          selectColor: "purple",
          isDisabled: game.ended || game.reserveSetup,
          onPress: () => onReservePress(index),
        };
      }
    } else if (
      mappedCard.zoneName === "placed" &&
      mappedCard.pileIndex !== undefined
    ) {
      // ----- Placed ----- //
      const idx = mappedCard.pileIndex;
      const attackable = isAttackable(game.slots, idx);
      const canDrop =
        !!selectedCard &&
        canPlace(
          game.slots,
          idx,
          selectedCard,
          boomer,
          kingMode?.type === "double",
        );
      const doubled = game.slots[idx].placed.some(
        (placement) =>
          placement.card.id === mappedCard.card.id && placement.doubled,
      );
      return {
        isDisabled: game.ended || game.reserveSetup || !attackable,
        forceOverlayColor: doubled,
        selectColor: doubled ? "red" : canDrop ? "green" : "none",
        onPress: () => placeOnMonster(idx),
      };
    }
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.2,
    fixedCols: LAYOUT.fixedCols,
    fixedRows: LAYOUT.fixedRows,
    cardSize: "small",
  });

  const score =
    game.deck.length + (powerReserveOn && game.won ? game.reserve.length : 0);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:twelveTrials.dungeonClearedScore", { score })
          : game.damage >= maxDamage
            ? i18n.t("games:twelveTrials.youRanOutOfHealth")
            : i18n.t("games:twelveTrials.youRanOutOfAttacks")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          },
        ]}
      >
        <ProgressBar
          progressValue={maxDamage - game.damage}
          totalValue={maxDamage}
          color={game.damage > 5 ? "red" : game.damage > 3 ? "orange" : "green"}
          iconName="heart"
          autoTallyText
          scaledHeight={cardHeight * 0.5}
        />
      </View>

      {[
        {
          id: "reserve",
          label: i18n.t("games:twelveTrials.special"),
        },
        {
          id: "hand",
          label: i18n.t("games:twelveTrials.hand"),
        },
      ].map((label) => {
        if (label.id === "reserve" && !powerReserveOn && !abilitiesOn)
          return null;

        return (
          <View
            key={label.id}
            style={[flexStyles.rowStart, getZoneStylesById(label.id)]}
          >
            <Text
              textTransform="uppercase"
              weight={400}
              style={[
                rotatedText,
                {
                  left: 0,
                  fontSize: cardWidth * 0.16,
                  color: rgba(colorPale, 0.6),
                },
              ]}
            >
              {label.label}
            </Text>
          </View>
        );
      })}

      <View
        style={[
          getZoneStylesById("controls"),
          flexStyles.rowCentered,
          { gap: spacing(14) },
        ]}
      >
        {game.reserveSetup ? (
          <Button
            text={i18n.t("games:twelveTrials.setReserve2", {
              length: reservePick.length,
            })}
            size="md"
            onPress={confirmReserve}
            taller
            disabled={reservePick.length !== 2}
            theme="purple"
            style={{ flex: 1 }}
          />
        ) : (
          <>
            <View style={[flexStyles.colCentered, flexStyles.flex1]}>
              {abilitiesOn &&
                (kingMode ? (
                  kingMode.type === "move" ? (
                    <View
                      style={[
                        flexStyles.rowCentered,
                        flexStyles.fullWidth,
                        { gap: spacing(10) },
                      ]}
                    >
                      <Button
                        text={i18n.t("games:twelveTrials.moveToTop", {
                          value: cardLabel(game.deck[0]),
                        })}
                        size="sm"
                        onPress={() => resolveMoveKing(true)}
                        theme="green"
                        taller
                      />
                      <Button
                        text={i18n.t("games:twelveTrials.doNothing")}
                        size="sm"
                        onPress={() => resolveMoveKing(false)}
                        theme="red"
                        taller
                      />
                    </View>
                  ) : (
                    <View
                      style={[
                        flexStyles.rowCentered,
                        flexStyles.fullWidth,
                        { gap: spacing(14) },
                      ]}
                    >
                      <Button
                        text={i18n.t("cards:cancel")}
                        size="sm"
                        onPress={() => {
                          setKingMode(null);
                          setSelectedKing(null);
                        }}
                        theme="red"
                      />
                      <Text style={{ flexGrow: 1, textAlign: "center" }}>
                        {kingHint(
                          kingMode.type === "return"
                            ? "hearts-action"
                            : "spades-action",
                        )}
                      </Text>
                    </View>
                  )
                ) : (
                  <Button
                    text={
                      selectedKing
                        ? kingHint(selectedKing.suit)
                        : i18n.t("games:twelveTrials.noKingSelected")
                    }
                    size="md"
                    onPress={() => {
                      if (kingMode) {
                        setKingMode(null);
                      } else if (selectedKing) {
                        activateKing(selectedKing);
                      }
                    }}
                    taller
                    theme={selectedKing || kingMode ? "green" : "none"}
                    fullWidth
                    disabled={!selectedKing && !kingMode}
                  />
                ))}
            </View>

            <Button
              text={i18n.t("cards:discard")}
              size="md"
              onPress={discardSelected}
              taller
              disabled={!selected || selected.zone !== "hand" || game.ended}
              theme="orange"
            />
          </>
        )}
      </View>
    </GameWrapper>
  );
}
