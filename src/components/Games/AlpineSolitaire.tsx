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
  flipToBack,
  flipToFace,
  type PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

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
  const { cardBg, cardText } = useGameZoneBackground();
  const difficulty = useGameSettingValue("alpineDifficulty") as Difficulty;
  const challenge = useGameSettingValue("alpineChallenge");
  const settingsRef = useRef({ difficulty, challenge });
  settingsRef.current = { difficulty, challenge };

  const [selected, setSelected] = useState<string[]>([]);

  const handSize = challenge === "everest" ? 7 : 10;

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

  function dealSetup(draft: GameState) {
    const ch = settingsRef.current.challenge;
    const size = ch === "everest" ? 7 : 10;
    draft.deck = shuffle(createDeck({ faceUp: false }));
    draft.hand = draft.deck.splice(0, size).map(flipToFace);
    draft.fatigue =
      draft.deck.length > 0 ? [flipToBack(draft.deck.pop()!)] : [];
    draft.discard = [];
    draft.playedRoutes = [];
    draft.trail = [];
    draft.phase = "play";
    draft.message = "Play a route or rest to build toward a camp.";
    draft.ended = false;
    draft.won = false;
  }

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => setSelected([]),
      resetAndSetup: async () => {
        setGame((draft) => {
          dealSetup(draft);
        });
        await delay();
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
    const { difficulty: diff, challenge: ch } = settingsRef.current;
    const played = draft.playedRoutes;
    const qualifies = milestoneQualifies(
      milestone,
      draft.trail,
      diff,
      ch,
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
      if (draft.trail.length >= TRAIL_LENGTH[ch]) {
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

    const target = ch === "everest" ? 7 : 10;
    const { cards, defeat } = drawInto(draft, target);
    draft.hand = cards;
    if (defeat) {
      draft.ended = true;
      draft.won = false;
      draft.message = "Out of cards while making camp — overwhelmed.";
      return;
    }
    if (ch !== "manaslu" && draft.deck.length > 0) {
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
      const ch = settingsRef.current.challenge;
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
      const drawN = computeDraw(record, draft.hand, ch);
      const { cards, defeat } = drawInto(draft, drawN);
      if (defeat) {
        draft.hand.push(...cards);
        draft.ended = true;
        draft.won = false;
        draft.message = "The deck and fatigue pile ran dry — overwhelmed.";
        return;
      }
      draft.hand.push(...cards);

      // Annapurna I — matching drawn suit recalls the route.
      if (ch === "annapurna") {
        if (cards.some((c) => c.suit === record.anchorSuit)) {
          draft.playedRoutes.pop();
          draft.hand.push(...record.cards.map(flipToFace));
          draft.message = "Annapurna: a matching suit recalled the route.";
        }
        if (draft.hand.length >= HAND_LIMIT) {
          draft.ended = true;
          draft.won = false;
          draft.message = "Your hand overflowed (18+ cards) — overwhelmed.";
          return;
        }
      }

      if (ch === "makalu" && draft.hand.length > 0) {
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
      const ch = settingsRef.current.challenge;
      draft.discard.push(...draft.playedRoutes.flatMap((r) => r.cards));
      draft.playedRoutes = [];

      const prevFatigue = draft.fatigue.length;
      draft.hand.push(...draft.fatigue.map(flipToFace));
      draft.fatigue = [];

      const toAdd = ch === "manaslu" ? 1 : prevFatigue + 1;
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
      { id: "hud", col: 0, row: 0, width: "full", height: 1.1 },
      { id: "trailLabel", col: 0, row: 1.2, width: "full", height: 0.4 },
    ];

    if (trailAnchors.length > 0) {
      result.push({
        id: "trail",
        name: "trail",
        cards: trailAnchors,
        col: 0.3,
        row: 1.7,
        width: 6.4,
        fan: {
          direction: "right",
          offset: fanOffset(trailAnchors.length, 6.4),
          center: true,
        },
      });
    } else {
      result.push({
        id: "trailEmpty",
        col: 0.3,
        row: 1.7,
        width: 6.4,
        placeholder: { text: "No camps yet" },
      });
    }

    result.push({
      id: "playLabel",
      col: 0,
      row: 3.0,
      width: "full",
      height: 0.4,
    });
    if (playCards.length > 0) {
      result.push({
        id: "play",
        name: "play",
        cards: playCards,
        col: 0.3,
        row: 3.5,
        width: 6.4,
        fan: {
          direction: "right",
          offset: fanOffset(playCards.length, 6.4),
          center: true,
        },
      });
    } else {
      result.push({
        id: "playEmpty",
        col: 0.3,
        row: 3.5,
        width: 6.4,
        placeholder: { text: "Play area" },
      });
    }

    // Piles row: fatigue / deck / discard.
    result.push({
      id: "fatigue",
      name: "fatigue",
      cards:
        game.fatigue.length > 0 ? [game.fatigue[game.fatigue.length - 1]] : [],
      col: 0.6,
      row: 4.9,
      placeholder: { text: "Fatigue" },
    });
    result.push({
      id: "deck",
      name: "deck",
      cards: game.deck.length > 0 ? [game.deck[game.deck.length - 1]] : [],
      col: 3.0,
      row: 4.9,
      placeholder: { text: "Deck" },
    });
    result.push({
      id: "discard",
      name: "discard",
      cards:
        game.discard.length > 0
          ? [flipToFace(game.discard[game.discard.length - 1])]
          : [],
      col: 5.4,
      row: 4.9,
      placeholder: { text: "Discard" },
    });

    result.push({
      id: "handLabel",
      col: 0,
      row: 6.3,
      width: "full",
      height: 0.4,
    });
    if (handCards.length > 0) {
      result.push({
        id: "hand",
        name: "hand",
        cards: handCards,
        col: 0.3,
        row: 6.8,
        width: 6.4,
        fan: {
          direction: "right",
          offset: fanOffset(handCards.length, 6.4),
          center: true,
        },
      });
    }

    result.push({
      id: "controls",
      col: 0,
      row: 8.4,
      width: "full",
      height: 1.8,
    });
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
    gap: 0.08,
    cardSize: "small",
    fixedRows: 10.4,
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
        style={[getZoneStylesById("hud"), { justifyContent: "center", gap: 2 }]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text size="sm" weight={700} color={cardText}>
            Trail {game.trail.length}/{trailLength}
          </Text>
          <Text size="xs" weight={600} color={cardText}>
            {challengeName} · {difficulty}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text size="xs" weight={500} color={cardText}>
            Deck {game.deck.length} · Fatigue {game.fatigue.length}
          </Text>
          <Text size="xs" weight={500} color={cardText}>
            Hand {game.hand.length} · Discard {game.discard.length}
          </Text>
        </View>
      </View>

      <View
        style={[getZoneStylesById("trailLabel"), { justifyContent: "center" }]}
      >
        <Text size="xs" weight={600} color={cardText}>
          Trail (milestones)
        </Text>
      </View>

      <View
        style={[getZoneStylesById("playLabel"), { justifyContent: "center" }]}
      >
        <Text size="xs" weight={600} color={cardText}>
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
        <Text size="xs" weight={600} color={cardText}>
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
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
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
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                text="Rest"
                size="md"
                onPress={rest}
                fullWidth
                taller
                disabled={game.ended}
                theme="red"
              />
            </View>
          </View>
        )}
      </View>
    </GameWrapper>
  );
}
