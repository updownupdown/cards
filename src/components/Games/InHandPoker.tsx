import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToFace,
  RANKS,
  shuffle,
  SUITS,
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

const startScore = 5;
const winScore = 10;
const maxFoldStreak = 3;

// ── Poker evaluation (pure) ───────────────────────────────────────────────────
const RANK_ORDER: Record<CardRank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
  Joker: 0,
};
function isJoker(card: PlayingCard) {
  return card.rank === "Joker";
}
function cardValue(card: PlayingCard) {
  return RANK_ORDER[card.rank];
}

const ALL_CARDS: PlayingCard[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({
    id: `all-${suit}-${rank}`,
    suit,
    rank,
    faceUp: true,
  })),
);

const CAT_NAMES = [
  "High Card",
  "One Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
];

/** Rank a concrete (no-joker) 5-card hand as a comparable length-6 array. */
function handValue(cards: PlayingCard[]): number[] {
  const vals = cards.map(cardValue).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const flush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(vals)].sort((a, b) => b - a);

  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (
      uniq[0] === 14 &&
      uniq[1] === 5 &&
      uniq[2] === 4 &&
      uniq[3] === 3 &&
      uniq[4] === 2
    ) {
      straightHigh = 5; // wheel A-2-3-4-5
    }
  }

  const counts: Record<number, number> = {};
  for (const v of vals) counts[v] = (counts[v] ?? 0) + 1;
  const groups = Object.entries(counts)
    .map(([v, c]) => [c, Number(v)] as [number, number])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const cnt = groups.map((g) => g[0]);
  const gv = groups.map((g) => g[1]);

  let cat: number;
  let tie: number[];
  if (straightHigh && flush) {
    cat = 8;
    tie = [straightHigh];
  } else if (cnt[0] === 4) {
    cat = 7;
    tie = [gv[0], gv[1]];
  } else if (cnt[0] === 3 && cnt[1] === 2) {
    cat = 6;
    tie = [gv[0], gv[1]];
  } else if (flush) {
    cat = 5;
    tie = vals;
  } else if (straightHigh) {
    cat = 4;
    tie = [straightHigh];
  } else if (cnt[0] === 3) {
    cat = 3;
    tie = gv;
  } else if (cnt[0] === 2 && cnt[1] === 2) {
    cat = 2;
    tie = [gv[0], gv[1], gv[2]];
  } else if (cnt[0] === 2) {
    cat = 1;
    tie = gv;
  } else {
    cat = 0;
    tie = vals;
  }

  const out = [cat, ...tie];
  while (out.length < 6) out.push(0);
  return out.slice(0, 6);
}

/** Best value of a 5-card hand that may contain wild Jokers. */
function bestHand(cards: PlayingCard[]): number[] {
  const jokers = cards.filter(isJoker);
  const concrete = cards.filter((c) => !isJoker(c));
  if (jokers.length === 0) return handValue(cards);

  const used = new Set(concrete.map((c) => `${c.suit}-${c.rank}`));
  const cands = ALL_CARDS.filter((c) => !used.has(`${c.suit}-${c.rank}`));

  let best: number[] | null = null;
  const chosen: PlayingCard[] = [];
  const local = new Set<string>();
  const recurse = (i: number) => {
    if (i === jokers.length) {
      const hv = handValue([...concrete, ...chosen]);
      if (!best || compareValues(hv, best) > 0) best = hv;
      return;
    }
    for (const c of cands) {
      const key = `${c.suit}-${c.rank}`;
      if (local.has(key)) continue;
      local.add(key);
      chosen.push(c);
      recurse(i + 1);
      chosen.pop();
      local.delete(key);
    }
  };
  recurse(0);
  return best ?? handValue(concrete);
}

function compareValues(a: number[], b: number[]) {
  for (let i = 0; i < 6; i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function combos5(cards: PlayingCard[]): PlayingCard[][] {
  const res: PlayingCard[][] = [];
  const n = cards.length;
  for (let a = 0; a < n; a += 1)
    for (let b = a + 1; b < n; b += 1)
      for (let c = b + 1; c < n; c += 1)
        for (let d = c + 1; d < n; d += 1)
          for (let e = d + 1; e < n; e += 1)
            res.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
  return res;
}

function bestFiveOf(cards: PlayingCard[]) {
  let best: PlayingCard[] = cards.slice(0, 5);
  let bestVal = bestHand(best);
  for (const combo of combos5(cards)) {
    const v = bestHand(combo);
    if (compareValues(v, bestVal) > 0) {
      bestVal = v;
      best = combo;
    }
  }
  return { best, val: bestVal };
}

function handName(val: number[]) {
  if (val[0] === 8 && val[1] === 14) return "Royal Flush";
  return CAT_NAMES[val[0]] ?? "High Card";
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = "decide" | "discard" | "bet" | "roundEnd";

type GameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  opponent: PlayingCard[];
  oppBest: string[]; // ids of opponent's best 5
  phase: Phase;
  discardCount: number;
  bet: number;
  foldStreak: number;
  score: number;
  roundResult: "win" | "lose" | "push" | null;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  deck: [],
  hand: [],
  opponent: [],
  oppBest: [],
  phase: "decide",
  discardCount: 0,
  bet: 0,
  foldStreak: 0,
  score: startScore,
  roundResult: null,
  ended: false,
  won: false,
};

function buildDeck(jokers: boolean) {
  const deck = createDeck({ includeJokers: jokers });
  const fiveIndex = deck.findIndex((c) => c.rank === "5");
  if (fiveIndex >= 0) deck.splice(fiveIndex, 1); // the score card
  return deck;
}

function scoreRank(score: number): CardRank {
  if (score <= 1) return "A";
  if (score >= 10) return "10";
  return String(score) as CardRank;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function InHandPoker() {
  const { cardBg, cardText } = useGameZoneBackground();
  const jokers = useGameSettingValue("pokerJokers") as boolean;
  const jokersRef = useRef(jokers);
  jokersRef.current = jokers;

  const [selectedDiscards, setSelectedDiscards] = useState<string[]>([]);

  function dealHand(draft: GameState) {
    draft.deck = shuffle(buildDeck(jokersRef.current));
    draft.hand = draft.deck.splice(0, 5).map(flipToFace);
    draft.opponent = [];
    draft.oppBest = [];
    draft.phase = "decide";
    draft.discardCount = 0;
    draft.bet = 0;
    draft.roundResult = null;
  }

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => setSelectedDiscards([]),
      resetAndSetup: async () => {
        setGame((draft) => {
          draft.score = startScore;
          draft.foldStreak = 0;
          draft.ended = false;
          draft.won = false;
          dealHand(draft);
        });
        await delay();
      },
    });

  const myValue = useMemo(
    () => (game.hand.length === 5 ? bestHand(game.hand) : null),
    [game.hand],
  );
  const oppValue = useMemo(
    () =>
      game.opponent.length > 0
        ? bestHand(game.opponent.filter((c) => game.oppBest.includes(c.id)))
        : null,
    [game.opponent, game.oppBest],
  );

  function play() {
    if (game.phase !== "decide" || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.foldStreak = 0;
      draft.phase = "discard";
    });
    setSelectedDiscards([]);
  }

  function fold() {
    if (game.phase !== "decide" || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.foldStreak += 1;
      if (draft.foldStreak > maxFoldStreak) {
        draft.ended = true;
        draft.won = false;
        return;
      }
      dealHand(draft);
    });
    setSelectedDiscards([]);
  }

  function toggleDiscard(id: string) {
    if (game.phase !== "discard") return;
    setSelectedDiscards((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function drawAction() {
    if (game.phase !== "discard" || game.ended) return;
    const discardIds = new Set(selectedDiscards);
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const keep = draft.hand.filter((c) => !discardIds.has(c.id));
      const need = 5 - keep.length;
      const drawn = draft.deck.splice(0, need).map(flipToFace);
      draft.hand = [...keep, ...drawn];
      draft.discardCount += 1;
      if (draft.discardCount >= 3) draft.phase = "bet";
    });
    setSelectedDiscards([]);
  }

  function setHand() {
    if (game.phase !== "discard" || game.discardCount < 1) return;
    setGame((draft) => {
      draft.phase = "bet";
    });
    setSelectedDiscards([]);
  }

  function placeBet(amount: number) {
    if (game.phase !== "bet" || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.bet = amount;
      const oppCards = draft.deck.splice(0, 5 + amount).map(flipToFace);
      draft.opponent = oppCards;
      const { best, val } = bestFiveOf(oppCards);
      draft.oppBest = best.map((c) => c.id);
      const mine = bestHand(draft.hand);
      const cmp = compareValues(mine, val);
      if (cmp > 0) {
        draft.roundResult = "win";
        draft.score += amount;
      } else if (cmp < 0) {
        draft.roundResult = "lose";
        draft.score -= amount;
      } else {
        draft.roundResult = "push";
      }
      if (draft.score >= winScore) {
        draft.ended = true;
        draft.won = true;
      } else if (draft.score <= 0) {
        draft.ended = true;
        draft.won = false;
      }
      draft.phase = "roundEnd";
    });
  }

  function nextRound() {
    if (game.ended) return;
    setGame((draft) => {
      dealHand(draft);
    });
    setSelectedDiscards([]);
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      { id: "hud", col: 0, row: 0, width: "full", height: 0.6 },
      {
        id: "score",
        name: "score",
        cards: [
          flipToFace({
            id: "score-card",
            suit: "hearts" as CardSuit,
            rank: scoreRank(game.score),
            faceUp: true,
          }),
        ],
        col: 6,
        row: 0.75,
        baseZIndex: 30,
        placeholder: {},
      },
      { id: "yourLabel", col: 0, row: 0.8, width: 5.5, height: 0.5 },
    ];

    game.hand.forEach((card, i) => {
      result.push({
        id: `hand-${i}`,
        name: "hand",
        cards: [card],
        col: 0.5 + i * 1.15,
        row: 1.4,
        baseZIndex: 20,
      });
    });

    if (game.opponent.length > 0) {
      result.push({
        id: "oppLabel",
        col: 0,
        row: 3.2,
        width: "full",
        height: 0.5,
      });
      game.opponent.forEach((card, i) => {
        result.push({
          id: `opp-${i}`,
          name: "opp",
          cards: [card],
          col: 0.2 + i * 0.95,
          row: 3.8,
          baseZIndex: 10,
        });
      });
    }

    result.push({
      id: "controls",
      col: 0,
      row: 5.4,
      width: "full",
      height: 1.6,
    });
    return result;
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const id = mappedCard.card.id;
      return {
        isSelected: selectedDiscards.includes(id),
        selectColor: "red",
        isDisabled: game.phase !== "discard" || game.ended,
        onPress: () => toggleDiscard(id),
      };
    }
    if (mappedCard.zoneName === "opp") {
      const inBest = game.oppBest.includes(mappedCard.card.id);
      return {
        isSelected: inBest,
        selectColor: inBest ? "green" : "none",
        isDisabled: true,
      };
    }
    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.1,
    cardSize: "small",
  });

  const minBet = Math.max(1, game.discardCount);
  const betOptions = [minBet, minBet + 1, minBet + 2].filter((b) => b <= 3);

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      score={game.score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "You hit 10 points — you win!"
          : game.foldStreak > maxFoldStreak
            ? "Folded four times in a row."
            : "You busted out."
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
        <Text size="sm" weight={600} color={cardText}>
          Score {game.score}/{winScore}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Folds {game.foldStreak}/{maxFoldStreak}
        </Text>
        {game.bet > 0 ? (
          <Text size="sm" weight={600} color={cardText}>
            Bet {game.bet}
          </Text>
        ) : (
          <Text size="sm" weight={600} color={cardText}>
            Draws {game.discardCount}
          </Text>
        )}
      </View>

      <View
        style={[
          getZoneStylesById("yourLabel"),
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text size="xs" weight={500} color={cardText}>
          {myValue ? `Your hand: ${handName(myValue)}` : ""}
        </Text>
      </View>

      {game.opponent.length > 0 ? (
        <View
          style={[
            getZoneStylesById("oppLabel"),
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <Text size="xs" weight={500} color={cardText}>
            Opponent: {oppValue ? handName(oppValue) : ""}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          getZoneStylesById("controls"),
          { alignItems: "center", justifyContent: "center", gap: 8 },
        ]}
      >
        {game.phase === "decide" ? (
          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <View style={{ flex: 1 }}>
              <Button
                text="Play"
                size="md"
                onPress={play}
                fullWidth
                taller
                theme={cardBg}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                text="Fold"
                size="md"
                onPress={fold}
                fullWidth
                taller
                theme="red"
              />
            </View>
          </View>
        ) : null}

        {game.phase === "discard" ? (
          <View style={{ width: "100%", gap: 8 }}>
            <Text size="xs" weight={400} color={cardText}>
              Tap cards to discard. Draw {game.discardCount}/3 · min bet{" "}
              {Math.max(1, game.discardCount || 1)}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  text={`Draw (${selectedDiscards.length})`}
                  size="md"
                  onPress={drawAction}
                  fullWidth
                  taller
                  theme={cardBg}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text="Set Hand"
                  size="md"
                  onPress={setHand}
                  fullWidth
                  taller
                  disabled={game.discardCount < 1}
                  theme={cardBg}
                />
              </View>
            </View>
          </View>
        ) : null}

        {game.phase === "bet" ? (
          <View style={{ width: "100%", gap: 8 }}>
            <Text size="xs" weight={400} color={cardText}>
              Bet points (min {minBet}) — the opponent draws 5 + your bet.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {betOptions.map((b) => (
                <View key={b} style={{ flex: 1 }}>
                  <Button
                    text={`Bet ${b}`}
                    size="md"
                    onPress={() => placeBet(b)}
                    fullWidth
                    taller
                    theme={cardBg}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {game.phase === "roundEnd" ? (
          <View style={{ width: "100%", gap: 8, alignItems: "center" }}>
            <Text size="md" weight={700} color={cardText}>
              {game.roundResult === "win"
                ? `You win +${game.bet}`
                : game.roundResult === "lose"
                  ? `You lose -${game.bet}`
                  : "Push (tie)"}
            </Text>
            {!game.ended ? (
              <Button
                text="Next Round"
                size="md"
                onPress={nextRound}
                fullWidth
                taller
                theme={cardBg}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </GameWrapper>
  );
}
