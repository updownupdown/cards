import type { AscentChallenge } from "@/data/game-menu";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, transitionStyles } from "@/styles/styles";
import { rotatedText } from "@/styles/textStyles";
import {
  commaFormattedNumber,
  delay,
  firstLetterUppercase,
} from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { View, type DimensionValue } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  sortCardsBySuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { bestLine } from "@/hints/lookahead";
import {
  cardTarget,
  makeHint,
  pressHint,
  withNote,
  zoneTarget,
} from "@/hints/hint";
// ── Rules configuration ────────────────────────────────────────────────────
export type AscentRouteType = "ascent" | "traverse" | "descent";
export type AscentDifficulty = "gentle" | "standard" | "intense";

const SUIT_GLYPH: Record<string, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};
const APPROACH_GLYPH: Record<string, string> = {
  ascent: "\u2197",
  traverse: "\u2192",
  descent: "\u2198",
};
const APPROACH_NAME = {
  hearts: "games:ascent.approachCautious",
  clubs: "games:ascent.approachReckless",
  diamonds: "games:ascent.approachTechnical",
  spades: "games:ascent.approachFreeClimbing",
} as const;
const APPROACH_DESCRIPTION = {
  hearts: "games:ascent.drawHigherInHand",
  clubs: "games:ascent.drawLowerInHand",
  diamonds: "games:ascent.drawDiamondsInHand",
  spades: "games:ascent.drawNonSpadesInRoute",
} as const;

const TYPE_RANK: Record<AscentRouteType, number> = {
  ascent: 2,
  traverse: 1,
  descent: 0,
};
const BOARD_WIDTH = 7;

const TRAIL_LENGTH: Record<AscentChallenge, number> = {
  none: 3,
  "cho-oyu": 2,
  shishapangma: 3,
  manaslu: 4,
  "broad-peak": 3,
  "gasherbrum-ii": 4,
  everest: 5,
  dhaulagiri: 3,
  "gasherbrum-i": 3,
  kangchenjunga: 4,
  lhotse: 3,
  makalu: 4,
  "nanga-parbat": 3,
  k2: 3,
  annapurna: 4,
};

const MOUNTAIN_HEIGHT: Record<AscentChallenge, number> = {
  none: 7500,
  "cho-oyu": 8188,
  shishapangma: 8027,
  manaslu: 8163,
  "broad-peak": 8051,
  "gasherbrum-ii": 8035,
  everest: 8848,
  dhaulagiri: 8167,
  "gasherbrum-i": 8080,
  kangchenjunga: 8586,
  lhotse: 8516,
  makalu: 8485,
  "nanga-parbat": 8126,
  k2: 8611,
  annapurna: 8091,
};

const HAND_LIMIT = 18; // Annapurna loss threshold

function v(card: PlayingCard) {
  return rankValue(card); // A=1 .. K=13
}

function rankLabel(value: number) {
  if (value === 1) return "A";
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  return String(value);
}

// ── Types ──────────────────────────────────────────────────────────────────
export type AscentRouteRecord = {
  cards: PlayingCard[];
  type: AscentRouteType;
  size: number;
  anchorValue: number;
  anchorSuit: string;
};

type Phase = "play" | "makaluDiscard";

type GameState = {
  deck: PlayingCard[];
  fatigue: PlayingCard[];
  discard: PlayingCard[];
  hand: PlayingCard[];
  playedRoutes: AscentRouteRecord[];
  trail: AscentRouteRecord[];
  phase: Phase;
  winLoseMessage: string;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  deck: shuffle(createDeck({ faceUp: false })),
  fatigue: [],
  discard: [],
  hand: [],
  playedRoutes: [],
  trail: [],
  phase: "play",
  winLoseMessage: "",
  ended: false,
  won: false,
};

// ── Route analysis (pure) ────────────────────────────────────────────────────
/**
 * Determine whether an ordered selection of cards forms a legal route.
 * The last card tapped is the anchor. Order encodes ascent/traverse/descent
 * (Kangchenjunga relaxes ordering so any card may be the anchor).
 */
function analyzeRoute(
  cards: PlayingCard[],
  challenge: AscentChallenge,
): AscentRouteRecord | null {
  if (cards.length === 0) return null;
  const kang = challenge === "kangchenjunga";
  const nanga = challenge === "nanga-parbat";

  const anchor = cards[cards.length - 1];
  const anchorValue = v(anchor);
  const anchorSuit = anchor.suit;
  const vals = cards.map(v);

  const make = (type: AscentRouteType): AscentRouteRecord => ({
    cards,
    type,
    size: cards.length,
    anchorValue,
    anchorSuit,
  });

  // TRAVERSE — all cards share a value.
  if (vals.every((x) => x === vals[0])) {
    if (nanga) return null; // Nanga Parbat allows only ascents.
    return make("traverse");
  }

  const distinct = new Set(vals).size === vals.length;
  if (cards.length < 2 || !distinct) return null;

  const sortedAsc = [...vals].sort((a, b) => a - b);
  const maxVal = sortedAsc[sortedAsc.length - 1];
  const minVal = sortedAsc[0];

  // ASCENT
  if (nanga) {
    // Equal-step ascent: constant positive difference between sorted values.
    const step = sortedAsc[1] - sortedAsc[0];
    const equalStep =
      step >= 1 &&
      sortedAsc.every((x, i) => i === 0 || x - sortedAsc[i - 1] === step);
    if (equalStep && (kang || anchorValue === maxVal)) return make("ascent");
    return null;
  }

  const consecutive = sortedAsc.every(
    (x, i) => i === 0 || x === sortedAsc[i - 1] + 1,
  );
  if (consecutive) {
    if (kang) return make("ascent");
    const orderedInc = cards.every(
      (c, i) => i === 0 || v(c) === vals[i - 1] + 1,
    );
    if (orderedInc && anchorValue === maxVal) return make("ascent");
  }

  // DESCENT — same suit, strictly decreasing (gaps allowed).
  const sameSuit = cards.every((c) => c.suit === anchorSuit);
  if (sameSuit) {
    if (kang) return make("descent");
    const orderedDec = cards.every((c, i) => i === 0 || v(c) < vals[i - 1]);
    if (orderedDec && anchorValue === minVal) return make("descent");
  }

  return null;
}

/** >0 when route a is higher than route b. */
function compareRoutes(a: AscentRouteRecord, b: AscentRouteRecord) {
  if (a.size !== b.size) return a.size - b.size;
  if (a.type !== b.type) return TYPE_RANK[a.type] - TYPE_RANK[b.type];
  return a.anchorValue - b.anchorValue;
}

type ComparisonField = "Type" | "Cards" | "Anchor";
type PlayCheck = {
  ok: boolean;
  reason?: string;
  comparisonField?: ComparisonField;
};

function canPlayRoute(
  route: AscentRouteRecord,
  prev: AscentRouteRecord | null,
  challenge: AscentChallenge,
  prevApproach: string | null,
): PlayCheck {
  if (challenge === "lhotse" && route.size < 2)
    return {
      ok: false,
      reason: i18n.t("games:ascent.lhotseRoutesNeed2Cards"),
      comparisonField: "Cards",
    };
  if (challenge === "gasherbrum-i" && route.anchorValue % 2 === 1)
    return {
      ok: false,
      reason: i18n.t("games:ascent.gasherbrumIAnchorMustBe"),
      comparisonField: "Anchor",
    };
  if (
    challenge === "broad-peak" &&
    prevApproach !== null &&
    route.anchorSuit === prevApproach
  )
    return {
      ok: false,
      reason: i18n.t("games:ascent.broadPeakChangeYourApproach"),
    };
  if (prev && compareRoutes(route, prev) <= 0) {
    const comparisonField =
      route.size !== prev.size
        ? "Cards"
        : route.type !== prev.type
          ? "Type"
          : "Anchor";
    return {
      ok: false,
      reason: undefined,
      comparisonField,
    };
  }
  return { ok: true };
}

/** Inherent Danger: number of cards to draw after playing a route. */
function computeDraw(
  route: AscentRouteRecord,
  hand: PlayingCard[],
  challenge: AscentChallenge,
) {
  const anchorValue = route.anchorValue;
  let d: number;
  switch (route.anchorSuit) {
    case "hearts":
      d = hand.filter((c) => v(c) > anchorValue).length;
      break;
    case "clubs":
      d = hand.filter((c) => v(c) < anchorValue).length;
      break;
    case "diamonds":
      d = hand.filter((c) => c.suit === "diamonds").length;
      break;
    default: // spades — non-spade suits present in the route
      d = new Set(
        route.cards.filter((c) => c.suit !== "spades").map((c) => c.suit),
      ).size;
      break;
  }

  if (challenge === "shishapangma") {
    if (route.anchorSuit === "diamonds" || route.anchorSuit === "spades")
      d += 1;
    else d -= 1;
  }

  if (challenge === "gasherbrum-ii") {
    d -= 1;
    if (d < 0) return route.size;
  }

  if (d < 0) d = 0;
  if (challenge === "k2") return d;
  return Math.min(d, route.size);
}

function milestoneQualifies(
  milestone: AscentRouteRecord,
  trail: AscentRouteRecord[],
  difficulty: AscentDifficulty,
  challenge: AscentChallenge,
  playedRoutes: AscentRouteRecord[],
) {
  const last = trail[trail.length - 1] ?? null;

  let base: boolean;
  if (difficulty === "gentle") base = true;
  else if (difficulty === "intense")
    base = last === null || milestone.size > last.size;
  else base = last === null || compareRoutes(milestone, last) > 0;

  if (!base) return false;

  if (challenge === "cho-oyu") return milestone.size >= 6;
  if (challenge === "broad-peak")
    return trail.every((r) => r.anchorSuit !== milestone.anchorSuit);
  if (challenge === "dhaulagiri")
    return playedRoutes.some((r) => r.type === "traverse" && r.size >= 2);
  return true;
}

// —— Hints ——

type AscentSettings = {
  difficulty: AscentDifficulty;
  challenge: AscentChallenge;
};

/** A route the hand can make, with the hand cards it takes as bits. */
type HandRoute = { route: AscentRouteRecord; mask: number };

// Routes listed at most, so a long hand can't make the list huge.
const MAX_ROUTES = 800;

/**
 * Every route the hand can make, its cards in the order they are tapped
 * (the anchor last), checked by analyzeRoute so challenges' rules apply.
 */
function handRoutes(hand: PlayingCard[], challenge: AscentChallenge) {
  const routes: HandRoute[] = [];
  const add = (indexes: number[]) => {
    if (routes.length >= MAX_ROUTES) return;
    const route = analyzeRoute(
      indexes.map((index) => hand[index]),
      challenge,
    );
    if (route) {
      routes.push({
        route,
        mask: indexes.reduce((bits, index) => bits | (1 << index), 0),
      });
    }
  };
  const indexes = hand.map((_, index) => index);
  const byValue = new Map<number, number[]>();
  indexes.forEach((index) => {
    const value = v(hand[index]);
    byValue.set(value, [...(byValue.get(value) ?? []), index]);
  });

  // Traverses: cards of one value, any of them the anchor.
  byValue.forEach((group) => {
    for (let bits = 1; bits < 1 << group.length; bits++) {
      const picked = group.filter((_, i) => bits & (1 << i));
      picked.forEach((anchor) =>
        add([...picked.filter((index) => index !== anchor), anchor]),
      );
    }
  });

  // Ascents: values rising by a step (only Nanga Parbat allows more than
  // one), a card of each, the highest last.
  const steps = challenge === "nanga-parbat" ? [1, 2, 3, 4, 5, 6] : [1];
  const values = [...byValue.keys()].sort((a, b) => a - b);
  for (const step of steps) {
    for (const start of values) {
      const extend = (picked: number[], value: number) => {
        if (picked.length >= 2) add(picked);
        for (const index of byValue.get(value + step) ?? []) {
          extend([...picked, index], value + step);
        }
      };
      for (const index of byValue.get(start)!) extend([index], start);
    }
  }

  // Descents: cards of one suit, falling, the lowest last.
  const suits = new Map<string, number[]>();
  indexes.forEach((index) => {
    const suit = hand[index].suit;
    suits.set(suit, [...(suits.get(suit) ?? []), index]);
  });
  suits.forEach((group) => {
    const falling = [...group].sort((a, b) => v(hand[b]) - v(hand[a]));
    for (let bits = 1; bits < 1 << Math.min(falling.length, 10); bits++) {
      const picked = falling.filter((_, i) => bits & (1 << i));
      if (picked.length >= 2) add(picked);
    }
  });
  return routes;
}

/**
 * A climb as the player can plan it: the hand cards on view (as bits of the
 * hand), how many cards come in unseen (drawn, or the fatigue pile), and what
 * is left to draw from.
 */
type ClimbPlan = {
  handMask: number;
  unseen: number;
  deck: number;
  fatigue: number;
  played: AscentRouteRecord[];
  camp: "milestone" | "missed" | null;
  lost: boolean;
};

type ClimbMove = { kind: "route"; route: HandRoute } | { kind: "rest" };

function bitCount(bits: number) {
  let count = 0;
  for (let rest = bits; rest; rest &= rest - 1) count++;
  return count;
}

/**
 * The move to make, by trying lines of routes over the cards in hand: a line
 * that empties the hand makes camp, which is best of all when the last route
 * makes a milestone; otherwise fewer cards left to climb with (counting the
 * unseen ones a line draws) and less of the deck spent are better.
 */
function planClimb(
  state: GameState,
  settings: AscentSettings,
  budget = 3000,
): ClimbMove | null {
  const { difficulty, challenge } = settings;
  const hand = state.hand;
  const routes = handRoutes(hand, challenge);
  const unseenCards = state.deck.length + state.fatigue.length;
  // An unseen card's chance to be higher (or lower) than a value, or a
  // diamond: for the draws a route makes, with unseen cards in hand.
  const drawCount = (route: AscentRouteRecord, plan: ClimbPlan) => {
    const rest = hand.filter(
      (card, index) =>
        plan.handMask & (1 << index) &&
        !route.cards.some((other) => other.id === card.id),
    );
    const known = computeDraw(route, rest, challenge);
    const odds =
      route.anchorSuit === "hearts"
        ? (13 - route.anchorValue) / 13
        : route.anchorSuit === "clubs"
          ? (route.anchorValue - 1) / 13
          : route.anchorSuit === "diamonds"
            ? 1 / 4
            : 0;
    const draws = known + plan.unseen * odds;
    return challenge === "k2" ? draws : Math.min(route.size, draws);
  };

  const root: ClimbPlan = {
    handMask: (1 << hand.length) - 1,
    unseen: 0,
    deck: state.deck.length,
    fatigue: state.fatigue.length,
    played: state.playedRoutes,
    camp: null,
    lost: false,
  };

  const moves = (plan: ClimbPlan): ClimbMove[] => {
    if (plan.camp || plan.lost) return [];
    const prev = plan.played.at(-1) ?? null;
    const playable = routes
      .filter(
        ({ route, mask }) =>
          (plan.handMask & mask) === mask &&
          canPlayRoute(route, prev, challenge, prev?.anchorSuit ?? null).ok,
      )
      // The cheapest climbs first: fewest draws, then smallest.
      .map((route) => ({ route, draws: drawCount(route.route, plan) }))
      .sort(
        (a, b) =>
          a.draws - b.draws ||
          compareRoutes(a.route.route, b.route.route) ||
          a.route.mask - b.route.mask,
      )
      .slice(0, plan === root ? ROOT_MOVES : 5)
      .map(({ route }): ClimbMove => ({ kind: "route", route }));
    const canRest = plan.played.length > 0 || playable.length === 0;
    return canRest ? [...playable, { kind: "rest" }] : playable;
  };

  const apply = (plan: ClimbPlan, move: ClimbMove): ClimbPlan => {
    if (move.kind === "rest") {
      const refill = Math.min(
        plan.deck,
        challenge === "manaslu" ? 1 : plan.fatigue + 1,
      );
      return {
        ...plan,
        unseen: plan.unseen + plan.fatigue,
        deck: plan.deck - refill,
        fatigue: refill,
        played: [],
      };
    }
    const { route, mask } = move.route;
    const handMask = plan.handMask & ~mask;
    const played = [...plan.played, route];
    if (handMask === 0 && plan.unseen < 0.5) {
      const qualifies = milestoneQualifies(
        route,
        state.trail,
        difficulty,
        challenge,
        played,
      );
      const fresh = challenge === "everest" ? 7 : 10;
      return {
        ...plan,
        handMask,
        played,
        camp: qualifies ? "milestone" : "missed",
        lost: plan.deck + plan.fatigue < fresh,
      };
    }
    const draws = drawCount(route, plan);
    const fromDeck = Math.min(plan.deck, draws);
    return {
      ...plan,
      handMask,
      played,
      unseen: plan.unseen + draws,
      deck: plan.deck - fromDeck,
      fatigue: plan.fatigue - (draws - fromDeck),
      lost: plan.deck + plan.fatigue < draws,
    };
  };

  const score = (plan: ClimbPlan) => {
    if (plan.lost) return -1e6;
    const spent = unseenCards - plan.deck - plan.fatigue;
    if (plan.camp === "milestone") return 1e5 - spent;
    // A camp without a milestone starts over with a fresh hand.
    if (plan.camp === "missed") return -1500 - spent;
    return -100 * bitCount(plan.handMask) - 150 * plan.unseen - spent;
  };

  const positionKey = (plan: ClimbPlan) =>
    `${plan.handMask}:${Math.round(plan.unseen * 10)}:${plan.deck}:${plan.fatigue}:${plan.played
      .map(
        (route) =>
          `${route.size}${route.type}${route.anchorValue}${route.anchorSuit}`,
      )
      .join(",")}`;
  // Each first move gets its share of the search, so the first few can't
  // use it all up.
  const first = moves(root);
  let best = null as { move: ClimbMove; score: number } | null;
  for (const move of first) {
    const child = apply(root, move);
    const line = bestLine(child, {
      moves,
      apply,
      score,
      budget: Math.ceil(budget / first.length),
      maxDepth: 10,
      positionKey,
    });
    const end = line.reduce(apply, child);
    const value = score(end);
    if (!best || value > best.score) best = { move, score: value };
  }
  return best?.move ?? null;
}

// First moves weighed by planClimb (the cheapest climbs, see moves).
const ROOT_MOVES = 14;

function findAscentHint(
  state: GameState,
  selected: string[],
  settings: AscentSettings,
) {
  if (state.ended) return null;
  if (state.phase === "makaluDiscard") {
    // Makalu: let go of the card the hand climbs best without.
    let best = null as { card: PlayingCard; score: number } | null;
    for (const card of state.hand) {
      const rest = {
        ...state,
        phase: "play" as Phase,
        hand: state.hand.filter((other) => other.id !== card.id),
      };
      const move = planClimb(rest, settings, 300);
      const score =
        move?.kind === "route" ? move.route.route.size : move ? -1 : -2;
      if (!best || score > best.score) best = { card, score };
    }
    return best
      ? withNote(
          makeHint("tapCard", cardTarget(best.card)),
          i18n.t("games:ascent.hint.discard"),
        )
      : pressHint("buttons", i18n.t("games:ascent.skipDiscard"));
  }

  const move = planClimb(state, settings);
  if (!move) return null;
  if (move.kind === "rest") {
    return withNote(
      pressHint("buttons", i18n.t("games:ascent.rest")),
      i18n.t("games:ascent.hint.rest"),
    );
  }
  const { route } = move.route;
  const order = route.cards.map((card) => card.id);
  // Picked cards that don't start the route: clear them first.
  if (selected.some((id, index) => order[index] !== id)) {
    return pressHint("buttons", i18n.t("cards:clear"));
  }
  const camps = route.size === state.hand.length;
  const hint = makeHint(
    { key: "press", values: { label: i18n.t("games:ascent.playRoute") } },
    ...route.cards.slice(selected.length).map((card) => cardTarget(card)),
    zoneTarget("buttons"),
  );
  if (camps) {
    // The camp counts only if this last route qualifies as a milestone.
    const qualifies = milestoneQualifies(
      route,
      state.trail,
      settings.difficulty,
      settings.challenge,
      [...state.playedRoutes, route],
    );
    return withNote(
      hint,
      i18n.t(
        qualifies ? "games:ascent.hint.camp" : "games:ascent.hint.campMissed",
      ),
    );
  }
  const rest = state.hand.filter(
    (card) => !route.cards.some((other) => other.id === card.id),
  );
  const draws = computeDraw(route, rest, settings.challenge);
  return withNote(hint, i18n.t("games:ascent.hint.route", { count: draws }));
}

export const ascentRules = {
  findHint: findAscentHint,
  handRoutes,
  analyzeRoute,
  compareRoutes,
  canPlayRoute,
  computeDraw,
  milestoneQualifies,
};

// ── Component ────────────────────────────────────────────────────────────────
function cloneCards(cards: PlayingCard[]) {
  return cards.map((c) => ({ ...c }));
}

function getGroupedFanOffsets(groups: AscentRouteRecord[]) {
  const offsets: number[] = [];
  let totalOffset = 0;
  let cardCount = 0;

  groups.forEach((group) => {
    group.cards.forEach((_, cardIndex) => {
      if (cardCount > 0) {
        const offset = cardIndex === 0 ? 1.3 : 0.46;
        offsets.push(offset);
        totalOffset += offset;
      }
      cardCount += 1;
    });
  });

  const availableOffset = Math.max(0, BOARD_WIDTH - 1);
  const scale =
    totalOffset > availableOffset ? availableOffset / totalOffset : 1;

  return offsets.map((offset) => offset * scale);
}

export default function Ascent() {
  const { spacing } = useResponsiveMetrics();
  const { colorDark, colorPale } = useGameColors();
  const difficulty = useGameSettingValue(
    "ascentDifficulty",
  ) as AscentDifficulty;
  const challenge = useGameSettingValue("ascentChallenge");
  const settingsRef = useRef({ difficulty, challenge });
  settingsRef.current = { difficulty, challenge };

  const [selected, setSelected] = useState<string[]>([]);

  function drawInto(
    draft: GameState,
    n: number,
  ): { cards: PlayingCard[]; defeat: boolean } {
    const out: PlayingCard[] = [];
    for (let i = 0; i < n; i += 1) {
      let card: PlayingCard | undefined;
      if (draft.deck.length > 0) card = draft.deck.pop();
      else if (draft.fatigue.length > 0) card = draft.fatigue.pop();
      if (!card) return { cards: out, defeat: true };
      out.push(flipToFace(card));
    }
    return { cards: out, defeat: false };
  }

  function resetDeck(draft: GameState) {
    // Gather all cards to draw deck
    const allCards = [
      ...draft.deck,
      ...draft.fatigue,
      ...draft.hand,
      ...draft.discard,
      ...draft.playedRoutes.flatMap((r) => r.cards),
    ];
    draft.deck = shuffle(flipAllToBack(allCards));
    draft.hand = [];
    draft.fatigue = [];
    draft.discard = [];
    draft.playedRoutes = [];
    draft.trail = [];
    draft.phase = "play";
    draft.ended = false;
    draft.won = false;
  }

  function dealSetup(draft: GameState) {
    const challenge = settingsRef.current.challenge;
    const handSize = challenge === "everest" ? 7 : 10;
    draft.hand = draft.deck.splice(0, handSize).map(flipToFace);
    draft.hand = sortCardsBySuit(draft.hand);
    draft.fatigue =
      draft.deck.length > 0 ? [flipToBack(draft.deck.pop()!)] : [];
  }

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => setSelected([]),
      resetAndSetup: async () => {
        // Gather all cards to draw deck
        setGame((draft) => {
          resetDeck(draft);
        });

        await delay(600);

        // Deal the initial hand and fatigue pile
        setGame((draft) => {
          dealSetup(draft);
        });
      },
    });

  useHint(() => findAscentHint(game, selected, { difficulty, challenge }), {
    game,
  });

  const prevRoute =
    game.playedRoutes.length > 0
      ? game.playedRoutes[game.playedRoutes.length - 1]
      : null;
  const prevApproach = prevRoute ? prevRoute.anchorSuit : null;
  const trailLength = TRAIL_LENGTH[challenge];

  const orderedSelection = useMemo(
    () =>
      selected
        .map((id) => game.hand.find((c) => c.id === id))
        .filter((c): c is PlayingCard => Boolean(c)),
    [selected, game.hand],
  );

  const analysis = useMemo(
    () => analyzeRoute(orderedSelection, challenge),
    [orderedSelection, challenge],
  );

  const playCheck = useMemo<PlayCheck>(() => {
    if (!analysis) return { ok: false };
    return canPlayRoute(analysis, prevRoute, challenge, prevApproach);
  }, [analysis, prevRoute, challenge, prevApproach]);

  const drawPreview = useMemo(() => {
    if (!analysis) return 0;
    const remaining = game.hand.filter((c) => !selected.includes(c.id));
    return computeDraw(analysis, remaining, challenge);
  }, [analysis, game.hand, selected, challenge]);

  function toggleSelect(id: string) {
    if (game.phase !== "play" || game.ended) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function clearSelection() {
    if (game.phase !== "play" || game.ended) return;
    setSelected([]);
  }

  function resolveCamp(draft: GameState, milestone: AscentRouteRecord) {
    const { difficulty: diff, challenge } = settingsRef.current;
    const played = draft.playedRoutes;
    const qualifies = milestoneQualifies(
      milestone,
      draft.trail,
      diff,
      challenge,
      played,
    );
    const milestoneIds = new Set(milestone.cards.map((c) => c.id));
    const allCards = played.flatMap((r) => r.cards);

    if (qualifies) {
      draft.trail.push({
        ...milestone,
        cards: cloneCards(milestone.cards),
      });
      draft.discard.push(...allCards.filter((c) => !milestoneIds.has(c.id)));
      draft.playedRoutes = [];
      if (draft.trail.length >= TRAIL_LENGTH[challenge]) {
        draft.ended = true;
        draft.won = true;
        draft.winLoseMessage = i18n.t("games:ascent.youSummitedTheMountain");
        return;
      }
      // Camp reached; milestone added to the trail
    } else {
      draft.discard.push(...allCards);
      draft.playedRoutes = [];
      // Camp reached, but milestone did not qualify
    }

    const target = challenge === "everest" ? 7 : 10;
    const { cards, defeat } = drawInto(draft, target);
    draft.hand = sortCardsBySuit(cards);
    if (defeat) {
      draft.ended = true;
      draft.won = false;
      draft.winLoseMessage = i18n.t("games:ascent.outOfCardsWhileMakingCamp");
      return;
    }
    if (challenge !== "manaslu" && draft.deck.length > 0) {
      draft.fatigue.push(flipToBack(draft.deck.pop()!));
    }
  }

  function playRoute() {
    if (game.phase !== "play" || game.ended || !analysis || !playCheck.ok)
      return;
    const route = analysis;
    const ids = new Set(route.cards.map((c) => c.id));

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const challenge = settingsRef.current.challenge;
      const routeCards = draft.hand.filter((c) => ids.has(c.id));
      draft.hand = draft.hand.filter((c) => !ids.has(c.id));

      let mappedCards = routeCards.map(flipToFace);
      if (route.type === "descent") {
        // Order cards in descending order of rank, with the anchor last
        mappedCards.sort((a, b) => v(b) - v(a));
      } else if (route.type === "traverse") {
        // Make sure anchor card is last in the traverse route
        const anchorCard = mappedCards.find(
          (c) => c.id === route.cards[route.cards.length - 1].id,
        );
        if (anchorCard) {
          mappedCards = mappedCards.filter((c) => c.id !== anchorCard.id);
          mappedCards.push(anchorCard);
        }
      } else if (route.type === "ascent") {
        // Order cards in ascending order of rank, with the anchor last
        mappedCards.sort((a, b) => v(a) - v(b));
        const anchorCard = mappedCards.find(
          (c) => c.id === route.cards[route.cards.length - 1].id,
        );
        if (anchorCard) {
          mappedCards = mappedCards.filter((c) => c.id !== anchorCard.id);
          mappedCards.push(anchorCard);
        }
      }

      const record: AscentRouteRecord = {
        cards: mappedCards,
        type: route.type,
        size: route.size,
        anchorValue: route.anchorValue,
        anchorSuit: route.anchorSuit,
      };

      draft.playedRoutes.push(record);

      // Camp: playing a route emptied the hand.
      if (draft.hand.length === 0) {
        resolveCamp(draft, record);
        return;
      }

      // Inherent Danger draw.
      const drawN = computeDraw(record, draft.hand, challenge);
      const { cards, defeat } = drawInto(draft, drawN);
      if (defeat) {
        draft.hand.push(...cards);
        draft.hand = sortCardsBySuit(draft.hand);
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = i18n.t("games:ascent.deckAndFatigueRanDry");
        return;
      }
      draft.hand.push(...cards);
      draft.hand = sortCardsBySuit(draft.hand);

      // Annapurna I — matching drawn suit recalls the route.
      if (challenge === "annapurna") {
        if (cards.some((c) => c.suit === record.anchorSuit)) {
          draft.playedRoutes.pop();
          draft.hand.push(...record.cards.map(flipToFace));
          draft.hand = sortCardsBySuit(draft.hand);
          // Annapurna: a matching suit recalled the route
        }
        if (draft.hand.length >= HAND_LIMIT) {
          draft.ended = true;
          draft.won = false;
          draft.winLoseMessage = i18n.t("games:ascent.handOverflowed");
          return;
        }
      }

      if (challenge === "makalu" && draft.hand.length > 0) {
        draft.phase = "makaluDiscard";
        // Makalu: you may discard one card, or skip
      }
    });
    setSelected([]);
  }

  function makaluDiscard(id: string) {
    if (game.phase !== "makaluDiscard" || game.ended) return;
    setGame((draft) => {
      const idx = draft.hand.findIndex((c) => c.id === id);
      if (idx >= 0) draft.discard.push(draft.hand.splice(idx, 1)[0]);
      draft.phase = "play";
    });
    setSelected([]);
  }

  function skipMakalu() {
    if (game.phase !== "makaluDiscard" || game.ended) return;
    setGame((draft) => {
      draft.phase = "play";
    });
  }

  function rest() {
    if (game.ended || game.phase !== "play") return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const challenge = settingsRef.current.challenge;
      draft.discard.push(...draft.playedRoutes.flatMap((r) => r.cards));
      draft.playedRoutes = [];

      const prevFatigue = draft.fatigue.length;
      draft.hand.push(...draft.fatigue.map(flipToFace));
      draft.hand = sortCardsBySuit(draft.hand);
      draft.fatigue = [];

      const toAdd = challenge === "manaslu" ? 1 : prevFatigue + 1;
      for (let i = 0; i < toAdd; i += 1) {
        if (draft.deck.length === 0) break;
        draft.fatigue.push(flipToBack(draft.deck.pop()!));
      }
    });
    setSelected([]);
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  const trailCards = game.trail.flatMap((r) => r.cards);

  const routesCards = game.playedRoutes.flatMap((r) => r.cards);

  const routeFanOffsets = useMemo(() => {
    return getGroupedFanOffsets(game.playedRoutes);
  }, [game.playedRoutes]);

  const trailFanOffsets = useMemo(() => {
    return getGroupedFanOffsets(game.trail);
  }, [game.trail]);

  function fanOffset(count: number, widthUnits: number) {
    if (count <= 1) return 0.4;
    return Math.max(0.2, Math.min(0.8, (widthUnits - 1) / (count - 1)));
  }

  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      // Hud
      { id: "hud", col: 0, row: 0, width: 3, height: 1.28 },

      // Piles row: fatigue / deck / discard.
      {
        id: "fatigue",
        name: "fatigue",
        cards: game.fatigue,
        col: 3.5,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("games:ascent.fatigue"), infoPos: "below" },
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 4.75,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "below" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 6,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "below" },
      },

      // Trail (milestones)
      {
        id: "trail",
        name: "trail",
        cards: trailCards,
        col: 0,
        row: 1.6,
        width: BOARD_WIDTH,
        fan: {
          direction: "right",
          offsets: trailFanOffsets,
          center: true,
        },
        placeholder: {},
      },

      // Routes
      {
        id: "play",
        name: "play",
        cards: routesCards,
        col: 0,
        row: 2.8,
        width: BOARD_WIDTH,
        fan: {
          direction: "right",
          offsets: routeFanOffsets,
          center: true,
        },
        placeholder: {},
      },

      // Hand
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: 4,
        width: BOARD_WIDTH,
        fan: {
          direction: "right",
          offset: fanOffset(game.hand.length, BOARD_WIDTH),
          center: true,
        },
        placeholder: {},
      },

      // Route Info
      {
        id: "routeInfo",
        col: 0,
        row: 5.1,
        width: BOARD_WIDTH,
        height: 1.1,
      },

      // Buttons
      {
        id: "buttons",
        col: 0,
        row: 6.2,
        width: BOARD_WIDTH,
        height: 0.8,
      },
    ];

    return result;
  }, [
    game,
    game.hand,
    routesCards,
    trailCards,
    routeFanOffsets,
    trailFanOffsets,
  ]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      // Hand cards
      const id = mappedCard.card.id;
      const isAnchor =
        selected.length > 0 && selected[selected.length - 1] === id;
      const isSel = selected.includes(id);

      const selectedColor = () => {
        if (analysis && playCheck.ok) {
          if (isAnchor) return "purple";
          if (isSel) return "green";
          return "none";
        }
        if (isAnchor) return "purple";
        if (isSel) return "blue";
        return "none";
      };

      return {
        isSelected: isSel,
        selectColor: selectedColor(),
        isDisabled: game.phase === "makaluDiscard" ? false : game.ended,
        onPress: () =>
          game.phase === "makaluDiscard" ? makaluDiscard(id) : toggleSelect(id),
      };
    } else {
      // Other cards
      return { isDisabled: true };
    }
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0,
    cardSize: "small",
  });

  const challengeName =
    challenge === "none"
      ? i18n.t("games:ascent.baseClimb")
      : challenge
          .split("-")
          .map((w) => firstLetterUppercase(w))
          .join(" ");

  const trailProgress = Math.min(game.trail.length, trailLength);
  const trailProgressFraction =
    trailLength > 0 ? trailProgress / trailLength : 1;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.colStart,
          {
            justifyContent: "flex-end",
            gap: spacing(14),
          },
        ]}
      >
        <View style={[flexStyles.colStart]}>
          <Text
            size="xs"
            weight={300}
            color={rgba(colorPale, 0.6)}
            lineHeight={1.2}
          >
            {firstLetterUppercase(difficulty)}
          </Text>
          <Text size="md" weight={400} color={colorPale} lineHeight={1.2}>
            {challengeName}
          </Text>
          <Text size="xl" weight={600} color={colorPale} lineHeight={1.2}>
            {commaFormattedNumber(MOUNTAIN_HEIGHT[challenge] ?? 0)}m
          </Text>
        </View>

        <View
          style={{
            position: "relative",
            width: "100%",
            height: spacing(14),
            backgroundColor: Colors.K750,
            borderRadius: spacing(7),
          }}
        >
          <View
            style={{
              ...transitionStyles.all05sec,
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${trailProgressFraction * 100}%`,
              minWidth: spacing(14),
              backgroundColor: Colors.win,
              borderRadius: spacing(7),
              boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(8)}px ${rgba(Colors.black, 0.16)}`,
            }}
          />

          {Array.from({ length: trailLength + 1 }, (_, index) => {
            const reached = index <= trailProgress;
            const position =
              `${(index / trailLength) * 100}%` as DimensionValue;

            if (index === 0) return null;

            return (
              <View
                key={index}
                style={{
                  ...transitionStyles.all05sec,
                  position: "absolute",
                  left: position,
                  top: 0,
                  width: spacing(14),
                  height: spacing(14),
                  transform: [{ translateX: -spacing(14) }],
                  borderRadius: spacing(7),
                  borderWidth: spacing(3),
                  borderColor: reached ? Colors.win : Colors.K750,
                  backgroundColor: reached ? Colors.white : Colors.K875,
                }}
              />
            );
          })}
        </View>
      </View>

      {/* Route Info */}
      <View style={[flexStyles.rowCentered, getZoneStylesById("routeInfo")]}>
        {!analysis && (
          <View style={[flexStyles.colStart, flexStyles.fullWidth]}>
            <Text size="md" weight={400} color={rgba(colorPale, 0.4)}>
              {i18n.t("games:ascent.noCardsSelected")}
            </Text>
            <Text size="sm" weight={300} color={rgba(colorPale, 0.7)}>
              {i18n.t("games:ascent.lastSelectedCardIsThe")}
            </Text>
          </View>
        )}

        {analysis && playCheck.reason && (
          <Text
            size="sm"
            weight={400}
            color={Colors.cardSelectRed}
            style={[{ textAlign: "center" }]}
          >
            {`${playCheck.reason ?? i18n.t("games:ascent.invalid")}`}
          </Text>
        )}

        {analysis && playCheck.reason === undefined && (
          <>
            <View style={[flexStyles.colStart, { flex: 2 }]}>
              <Text size="md" weight={500} color={colorPale}>
                {i18n.t(
                  APPROACH_NAME[
                    analysis.anchorSuit as keyof typeof APPROACH_NAME
                  ],
                )}{" "}
                {firstLetterUppercase(analysis.type)}
              </Text>
              <Text size="sm" weight={300} color={rgba(colorPale, 0.7)}>
                {i18n.t(
                  APPROACH_DESCRIPTION[
                    analysis.anchorSuit as keyof typeof APPROACH_DESCRIPTION
                  ],
                )}
              </Text>
            </View>

            <View
              style={[flexStyles.colCentered, { flex: 1, gap: spacing(2) }]}
            >
              <View style={[flexStyles.rowCentered, { gap: spacing(7) }]}>
                <Text size="lg" weight={300} color={rgba(colorPale, 0.7)}>
                  {i18n.t("cards:draw")}
                </Text>
                <Text size="lg" weight={600} color={Colors.white}>
                  {drawPreview}
                </Text>
              </View>

              <View style={[flexStyles.rowCentered, flexStyles.fullWidth]}>
                <Text
                  size="xxl"
                  weight={600}
                  color={
                    playCheck.comparisonField === "Cards"
                      ? Colors.cardSelectRed
                      : Colors.cardSelectGreen
                  }
                  style={{ textAlign: "center", flex: 1 }}
                >
                  {analysis?.size}
                </Text>
                <Text
                  size="xxl"
                  weight={600}
                  color={
                    playCheck.comparisonField === "Type"
                      ? Colors.cardSelectRed
                      : Colors.cardSelectGreen
                  }
                  style={{ textAlign: "center", flex: 1 }}
                >
                  {APPROACH_GLYPH[analysis.type]}
                </Text>
                <Text
                  size="xxl"
                  weight={600}
                  color={
                    playCheck.comparisonField === "Anchor"
                      ? Colors.cardSelectRed
                      : Colors.cardSelectGreen
                  }
                  style={{ textAlign: "center", flex: 1 }}
                >
                  {`${rankLabel(analysis.anchorValue)}${SUIT_GLYPH[analysis.anchorSuit]}`}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {[
        {
          id: "trail",
          label: i18n.t("games:ascent.camps"),
        },
        {
          id: "play",
          label: i18n.t("games:ascent.routes"),
        },
        {
          id: "hand",
          label: "hand",
        },
      ].map((label) => (
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
                fontSize: cardWidth * 0.16,
                color: rgba(colorPale, 0.8),
              },
            ]}
          >
            {label.label}
          </Text>
        </View>
      ))}

      {/* Buttons */}
      <View
        style={[
          getZoneStylesById("buttons"),
          flexStyles.colCentered,
          flexStyles.spaceBetween,
        ]}
      >
        {game.phase === "makaluDiscard" ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                text={i18n.t("games:ascent.skipDiscard")}
                size="md"
                onPress={skipMakalu}
                style={{ flex: 1 }}
                theme={colorDark}
                taller
              />
            </View>
          </View>
        ) : (
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              { gap: spacing(10) },
            ]}
          >
            <Button
              text={i18n.t("games:ascent.rest")}
              size="md"
              onPress={rest}
              fullWidth
              disabled={game.ended}
              theme="red"
              style={{ flex: 1 }}
              taller
            />
            <Button
              text={i18n.t("cards:clear")}
              size="md"
              onPress={clearSelection}
              fullWidth
              disabled={selected.length === 0 || game.ended}
              theme="blue"
              style={{ flex: 1 }}
              taller
            />
            <Button
              text={i18n.t("games:ascent.playRoute")}
              size="md"
              onPress={playRoute}
              fullWidth
              disabled={!analysis || !playCheck.ok || game.ended}
              theme="green"
              style={{ flex: 2 }}
              taller
            />
          </View>
        )}
      </View>
    </GameWrapper>
  );
}
