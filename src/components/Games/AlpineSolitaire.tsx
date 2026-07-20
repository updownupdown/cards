import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import type { AlpineChallenge } from "@/data/game-menu";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { Text } from "../common/Text";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  type PlayingCard,
  rankValue,
  shuffle,
  sortCards,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";

// ── Rules configuration ────────────────────────────────────────────────────
type RouteType = "ascent" | "traverse" | "descent";
type Difficulty = "gentle" | "standard" | "intense";

const SUIT_GLYPH: Record<string, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};
const APPROACH_NAME: Record<string, string> = {
  hearts: "Cautious",
  clubs: "Reckless",
  diamonds: "Technical",
  spades: "Free-Climbing",
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
  message: string;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  deck: [],
  fatigue: [],
  discard: [],
  hand: [],
  playedRoutes: [],
  trail: [],
  phase: "play",
  message: "",
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

type PlayCheck = { ok: boolean; reason?: string };

function canPlayRoute(
  route: RouteRecord,
  prev: RouteRecord | null,
  challenge: AlpineChallenge,
  prevApproach: string | null,
): PlayCheck {
  if (challenge === "lhotse" && route.size < 2)
    return { ok: false, reason: "Lhotse: routes need 2+ cards." };
  if (challenge === "gasherbrum-i" && route.anchorValue % 2 === 1)
    return { ok: false, reason: "Gasherbrum I: anchor must be even." };
  if (
    challenge === "broad-peak" &&
    prevApproach !== null &&
    route.anchorSuit === prevApproach
  )
    return { ok: false, reason: "Broad Peak: change your approach." };
  if (prev && compareRoutes(route, prev) <= 0)
    return { ok: false, reason: "Route must be higher than the last one." };
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
    draft.message = "Play a route or rest to build toward a camp.";
    draft.ended = false;
    draft.won = false;
  }

  function dealSetup(draft: GameState) {
    const challenge = settingsRef.current.challenge;
    const handSize = challenge === "everest" ? 7 : 10;
    draft.hand = draft.deck.splice(0, handSize).map(flipToFace);
    sortCards(draft.hand);
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
        draft.message = "You summited the mountain!";
        return;
      }
      draft.message = "Camp reached — milestone added to the trail.";
    } else {
      draft.discard.push(...allCards);
      draft.playedRoutes = [];
      draft.message = "Camp reached, but the milestone did not qualify.";
    }

    const target = challenge === "everest" ? 7 : 10;
    const { cards, defeat } = drawInto(draft, target);
    draft.hand = cards;
    sortCards(draft.hand);
    if (defeat) {
      draft.ended = true;
      draft.won = false;
      draft.message = "Out of cards while making camp — overwhelmed.";
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
      const record: RouteRecord = {
        cards: routeCards.map(flipToFace),
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
        sortCards(draft.hand);
        draft.ended = true;
        draft.won = false;
        draft.message = "The deck and fatigue pile ran dry — overwhelmed.";
        return;
      }
      draft.hand.push(...cards);
      sortCards(draft.hand);

      // Annapurna I — matching drawn suit recalls the route.
      if (challenge === "annapurna") {
        if (cards.some((c) => c.suit === record.anchorSuit)) {
          draft.playedRoutes.pop();
          draft.hand.push(...record.cards.map(flipToFace));
          sortCards(draft.hand);
          draft.message = "Annapurna: a matching suit recalled the route.";
        }
        if (draft.hand.length >= HAND_LIMIT) {
          draft.ended = true;
          draft.won = false;
          draft.message = "Your hand overflowed (18+ cards) — overwhelmed.";
          return;
        }
      }

      if (challenge === "makalu" && draft.hand.length > 0) {
        draft.phase = "makaluDiscard";
        draft.message = "Makalu: you may discard one card, or skip.";
      } else {
        draft.message = "Route played. Keep climbing.";
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
      draft.message = "Route played. Keep climbing.";
    });
    setSelected([]);
  }

  function skipMakalu() {
    if (game.phase !== "makaluDiscard" || game.ended) return;
    setGame((draft) => {
      draft.phase = "play";
      draft.message = "Route played. Keep climbing.";
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
      sortCards(draft.hand);
      draft.fatigue = [];

      const toAdd = challenge === "manaslu" ? 1 : prevFatigue + 1;
      for (let i = 0; i < toAdd; i += 1) {
        if (draft.deck.length === 0) break;
        draft.fatigue.push(flipToBack(draft.deck.pop()!));
      }
      draft.message = "You rested. Fatigue cards returned to your hand.";
    });
    setSelected([]);
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  const handCards = game.hand;
  const playCards = game.playedRoutes.flatMap((r) => r.cards);
  const trailAnchors = game.trail.map((r) => {
    const anchor =
      r.cards.find((c) => v(c) === r.anchorValue && c.suit === r.anchorSuit) ??
      r.cards[r.cards.length - 1];
    return anchor;
  });

  function fanOffset(count: number, widthUnits: number) {
    if (count <= 1) return 0.4;
    return Math.max(0.16, Math.min(0.55, (widthUnits - 1) / (count - 1)));
  }

  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      { id: "hud", col: 0, row: 0, width: BOARD_WIDTH, height: 1 },
      {
        id: "trail",
        name: "trail",
        cards: trailAnchors,
        col: 0,
        row: 1.2,
        width: BOARD_WIDTH,
        fan: {
          direction: "right",
          offset: fanOffset(trailAnchors.length, 6.4),
          center: true,
        },
        placeholder: {
          text: trailAnchors.length > 0 ? "Trail" : "No camps",
          infoPos: "left",
          showCount: false,
        },
      },
      {
        id: "playLabel",
        col: 0,
        row: 2.5,
        width: BOARD_WIDTH,
        height: 0.5,
      },
      {
        id: "play",
        name: "play",
        cards: playCards,
        col: 0,
        row: 3,
        width: BOARD_WIDTH,
        fan: {
          direction: "right",
          offset: fanOffset(playCards.length, BOARD_WIDTH),
          center: true,
        },
        placeholder: {
          infoPos: "left",
          showCount: false,
          text: playCards.length > 0 ? "Play area" : "No route played",
        },
      },
      // Piles row: fatigue / deck / discard.
      {
        id: "fatigue",
        name: "fatigue",
        cards:
          game.fatigue.length > 0
            ? [game.fatigue[game.fatigue.length - 1]]
            : [],
        col: 0.6,
        row: 4.3,
        placeholder: { text: "Fatigue", infoPos: "right" },
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck.length > 0 ? [game.deck[game.deck.length - 1]] : [],
        col: 3.0,
        row: 4.3,
        placeholder: { text: "Deck", infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards:
          game.discard.length > 0
            ? [flipToFace(game.discard[game.discard.length - 1])]
            : [],
        col: 5.4,
        row: 4.3,
        placeholder: { text: "Discard", infoPos: "right" },
      },
      {
        id: "handLabel",
        col: 0,
        row: 5.6,
        width: BOARD_WIDTH,
        height: 0.4,
      },
      {
        id: "hand",
        name: "hand",
        cards: handCards,
        col: 0,
        row: 6.2,
        width: BOARD_WIDTH,
        fan: {
          direction: "right",
          offset: fanOffset(handCards.length, BOARD_WIDTH),
          center: true,
        },
        placeholder: {
          text: "Hand",
          infoPos: "left",
          showCount: false,
        },
      },
      {
        id: "controls",
        col: 0,
        row: 7.6,
        width: BOARD_WIDTH,
        height: 1.8,
      },
    ];

    return result;
  }, [game, handCards, playCards, trailAnchors]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const id = mappedCard.card.id;
      const isAnchor =
        selected.length > 0 && selected[selected.length - 1] === id;
      const isSel = selected.includes(id);
      return {
        isSelected: isSel,
        selectColor: isAnchor ? "green" : isSel ? "blue" : "none",
        isDisabled: game.phase === "makaluDiscard" ? false : game.ended,
        onPress: () =>
          game.phase === "makaluDiscard" ? makaluDiscard(id) : toggleSelect(id),
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0,
    cardSize: "small",
    visualizer: true,
  });

  const challengeName =
    challenge === "none"
      ? "Base Climb"
      : challenge
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

  const approachInfo = analysis
    ? `${APPROACH_NAME[analysis.anchorSuit]} ${SUIT_GLYPH[analysis.anchorSuit]}`
    : "";

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      score={game.trail.length}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won ? "You reached the summit!" : "You were overwhelmed."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
        ]}
      >
        <View
          style={[
            flexStyles.colStart,
            flexStyles.spaceAround,
            flexStyles.fullHeight,
          ]}
        >
          <Text size="sm" weight={500} color={cardText}>
            Trail {game.trail.length}/{trailLength}
          </Text>
          <Text size="sm" weight={500} color={cardText}>
            {challengeName} · {difficulty}
          </Text>
        </View>
        <View
          style={[
            flexStyles.colStart,
            flexStyles.spaceAround,
            flexStyles.fullHeight,
          ]}
        >
          <Text size="sm" weight={500} color={cardText}>
            Deck {game.deck.length} · Fatigue {game.fatigue.length}
          </Text>
          <Text size="sm" weight={500} color={cardText}>
            Hand {game.hand.length} · Discard {game.discard.length}
          </Text>
        </View>
      </View>

      <View style={[getZoneStylesById("playLabel"), flexStyles.colCentered]}>
        <Text size="sm" weight={400} color={cardText}>
          {prevRoute
            ? `Beat: ${prevRoute.type} · ${prevRoute.size} card${
                prevRoute.size === 1 ? "" : "s"
              } · anchor ${rankLabel(prevRoute.anchorValue)}${
                SUIT_GLYPH[prevRoute.anchorSuit]
              }`
            : "Play Area (empty)"}
        </Text>
      </View>

      <View
        style={[getZoneStylesById("handLabel"), { justifyContent: "center" }]}
      >
        <Text size="xs" weight={400} color={cardText}>
          {analysis
            ? `${analysis.type} · ${approachInfo} · draw ${drawPreview}${
                playCheck.ok ? "" : ` — ${playCheck.reason ?? "invalid"}`
              }`
            : "Your hand — tap to build a route (last card = anchor)"}
        </Text>
      </View>

      <View
        style={[
          getZoneStylesById("controls"),
          { justifyContent: "flex-start", gap: 8 },
        ]}
      >
        <Text size="xs" weight={400} color={cardText}>
          {game.message}
        </Text>
        {game.phase === "makaluDiscard" ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                text="Skip discard"
                size="md"
                onPress={skipMakalu}
                fullWidth
                taller
                theme={cardBg}
              />
            </View>
          </View>
        ) : (
          <View style={[flexStyles.rowCentered, { gap: spacing(10) }]}>
            <Button
              text="Rest"
              size="md"
              onPress={rest}
              fullWidth
              taller
              disabled={game.ended}
              theme="red"
              style={{ flex: 1 }}
            />
            <Button
              text={
                analysis && playCheck.ok
                  ? `Play (draw ${drawPreview})`
                  : "Play Route"
              }
              size="md"
              onPress={playRoute}
              fullWidth
              taller
              disabled={!analysis || !playCheck.ok || game.ended}
              theme={cardBg}
              style={{ flex: 2 }}
            />
          </View>
        )}
      </View>
    </GameWrapper>
  );
}
