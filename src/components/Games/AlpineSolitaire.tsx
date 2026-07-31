import type { AlpineChallenge } from "@/data/game-menu";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
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

// ── Rules configuration ────────────────────────────────────────────────────
type RouteType = "ascent" | "traverse" | "descent";
type Difficulty = "gentle" | "standard" | "intense";

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
const APPROACH_NAME: Record<string, string> = {
  hearts: "Cautious",
  clubs: "Reckless",
  diamonds: "Technical",
  spades: "Free-Climbing",
};
const APPROACH_DESCRIPTION: Record<string, string> = {
  hearts: "Draw #: ranks in hand > anchor",
  clubs: "Draw #: ranks in hand < anchor",
  diamonds: "Draw #: diamonds in hand",
  spades: "Draw #: non-spades in route",
};

const TYPE_RANK: Record<RouteType, number> = {
  ascent: 2,
  traverse: 1,
  descent: 0,
};
const BOARD_WIDTH = 7;

const TRAIL_LENGTH: Record<AlpineChallenge, number> = {
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

const MOUNTAIN_HEIGHT: Record<AlpineChallenge, number> = {
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
type RouteRecord = {
  cards: PlayingCard[];
  type: RouteType;
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
  playedRoutes: RouteRecord[];
  trail: RouteRecord[];
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
  challenge: AlpineChallenge,
): RouteRecord | null {
  if (cards.length === 0) return null;
  const kang = challenge === "kangchenjunga";
  const nanga = challenge === "nanga-parbat";

  const anchor = cards[cards.length - 1];
  const anchorValue = v(anchor);
  const anchorSuit = anchor.suit;
  const vals = cards.map(v);

  const make = (type: RouteType): RouteRecord => ({
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
function compareRoutes(a: RouteRecord, b: RouteRecord) {
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
  route: RouteRecord,
  prev: RouteRecord | null,
  challenge: AlpineChallenge,
  prevApproach: string | null,
): PlayCheck {
  if (challenge === "lhotse" && route.size < 2)
    return {
      ok: false,
      reason: "Lhotse: routes need 2+ cards.",
      comparisonField: "Cards",
    };
  if (challenge === "gasherbrum-i" && route.anchorValue % 2 === 1)
    return {
      ok: false,
      reason: "Gasherbrum I: anchor must be even.",
      comparisonField: "Anchor",
    };
  if (
    challenge === "broad-peak" &&
    prevApproach !== null &&
    route.anchorSuit === prevApproach
  )
    return { ok: false, reason: "Broad Peak: change your approach." };
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
  route: RouteRecord,
  hand: PlayingCard[],
  challenge: AlpineChallenge,
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
  milestone: RouteRecord,
  trail: RouteRecord[],
  difficulty: Difficulty,
  challenge: AlpineChallenge,
  playedRoutes: RouteRecord[],
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

// ── Component ────────────────────────────────────────────────────────────────
function cloneCards(cards: PlayingCard[]) {
  return cards.map((c) => ({ ...c }));
}

function getGroupedFanOffsets(groups: RouteRecord[]) {
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

export default function AlpineSolitaire() {
  const { spacing } = useResponsiveMetrics();
  const { cardBg, cardText } = useGameZoneBackground();
  const difficulty = useGameSettingValue("alpineDifficulty") as Difficulty;
  const challenge = useGameSettingValue("alpineChallenge");
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

  function resolveCamp(draft: GameState, milestone: RouteRecord) {
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
        draft.winLoseMessage = "You summited the mountain!";
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
      draft.winLoseMessage = "Out of cards while making camp.";
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

      const record: RouteRecord = {
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
        draft.winLoseMessage = "The deck and fatigue pile ran dry.";
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
          draft.winLoseMessage = "Your hand overflowed (18+ cards).";
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
        placeholder: { text: "Fatigue", infoPos: "below" },
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 4.75,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Deck", infoPos: "below" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 6,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Dscrd", infoPos: "below" },
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
      ? "Base Climb"
      : challenge
          .split("-")
          .map((w) => firstLetterUppercase(w))
          .join(" ");

  const trailProgress = Math.min(game.trail.length, trailLength);
  const trailProgressFraction =
    trailLength > 0 ? trailProgress / trailLength : 1;

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      score={game.trail.length}
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
            color={rgba(cardText, 0.6)}
            lineHeight={1.2}
          >
            {firstLetterUppercase(difficulty)}
          </Text>
          <Text size="md" weight={400} color={cardText} lineHeight={1.2}>
            {challengeName}
          </Text>
          <Text size="xl" weight={600} color={cardText} lineHeight={1.2}>
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
              boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.2)}`,
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
                  backgroundColor: reached ? Colors.white : Colors.K950,
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
            <Text size="md" weight={400} color={rgba(cardText, 0.4)}>
              No cards selected
            </Text>
            <Text size="sm" weight={300} color={rgba(cardText, 0.7)}>
              Last selected card is the anchor
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
            {`${playCheck.reason ?? "invalid"}`}
          </Text>
        )}

        {analysis && playCheck.reason === undefined && (
          <>
            <View style={[flexStyles.colStart, { flex: 2 }]}>
              <Text size="md" weight={500} color={cardText}>
                {APPROACH_NAME[analysis.anchorSuit]}{" "}
                {firstLetterUppercase(analysis.type)}
              </Text>
              <Text size="sm" weight={300} color={rgba(cardText, 0.7)}>
                {APPROACH_DESCRIPTION[analysis.anchorSuit]}
              </Text>
            </View>

            <View
              style={[flexStyles.colCentered, { flex: 1, gap: spacing(2) }]}
            >
              <View style={[flexStyles.rowCentered, { gap: spacing(7) }]}>
                <Text size="lg" weight={300} color={rgba(cardText, 0.7)}>
                  Draw
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
          label: "Camps",
        },
        {
          id: "play",
          label: "Routes",
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
                color: rgba(cardText, 0.8),
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
                text="Skip discard"
                size="md"
                onPress={skipMakalu}
                style={{ flex: 1 }}
                theme={cardBg}
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
              text="Rest"
              size="md"
              onPress={rest}
              fullWidth
              disabled={game.ended}
              theme="red"
              style={{ flex: 1 }}
              taller
            />
            <Button
              text="Clear"
              size="md"
              onPress={clearSelection}
              fullWidth
              disabled={selected.length === 0 || game.ended}
              theme="blue"
              style={{ flex: 1 }}
              taller
            />
            <Button
              text="Play Route"
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
