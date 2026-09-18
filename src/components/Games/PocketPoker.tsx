import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  RANKS,
  shuffle,
  SUITS,
  type CardRank,
  type PlayingCard,
  zoneFanOffset,
  sortCardsBySuit,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { rotatedText } from "@/styles/textStyles";

import { i18n } from "@/i18n";
const startScore = 5;
const winScore = 10;
const maxFoldStreak = 3;

const LAYOUT = {
  cols: 7,
  oppTop: 1.3,
  handTop: 4,
  buttonsTop: 5.9,
  cardAreaGap: 0.15,
  cardAreaHeight: 1.7,
  cardAreaLabelHeight: 0.55,
  middleMessageHeight: 0.5,
};

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

// Hand categories, weakest first, as keys in games:pocketPoker.hands.
const CAT_NAMES = [
  "highCard",
  "onePair",
  "twoPair",
  "threeOfAKind",
  "straight",
  "flush",
  "fullHouse",
  "fourOfAKind",
  "straightFlush",
] as const;

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
  if (val[0] === 8 && val[1] === 14) return i18n.t("cards:royalFlush");
  const name = CAT_NAMES[val[0]];
  return name
    ? i18n.t(`games:pocketPoker.hands.${name}`)
    : i18n.t("cards:highCard");
}

function foldOutcome(foldStreak: number) {
  const nextFoldStreak = foldStreak + 1;
  return {
    foldStreak: nextFoldStreak,
    ended: nextFoldStreak >= maxFoldStreak,
  };
}

export const pocketPokerRules = {
  handValue,
  bestHand,
  compareValues,
  combos5,
  bestFiveOf,
  handName,
  foldOutcome,
  startScore,
  winScore,
  maxFoldStreak,
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = "decide" | "discard" | "bet" | "roundEnd";

type GameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  opponent: PlayingCard[];
  discard: PlayingCard[];
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

export type PocketPokerGameState = GameState;

const gameStateInitial: GameState = {
  deck: [],
  hand: [],
  opponent: [],
  discard: [],
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

// ── Component ────────────────────────────────────────────────────────────────
export default function PocketPoker() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const jokers = useGameSettingValue("pokerJokers") as boolean;
  const jokersRef = useRef(jokers);
  jokersRef.current = jokers;

  const [selectedDiscards, setSelectedDiscards] = useState<string[]>([]);

  function distributeHand(draft: GameState) {
    draft.hand = sortCardsBySuit(draft.deck.splice(0, 5).map(flipToFace));
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
          const cards = [
            ...draft.deck,
            ...draft.hand,
            ...draft.opponent,
            ...draft.discard,
          ];
          draft.deck = flipAllToBack(
            shuffle(cards.length > 0 ? cards : buildDeck(jokersRef.current)),
          );
          draft.hand = [];
          draft.opponent = [];
          draft.discard = [];
          draft.oppBest = [];
          draft.score = startScore;
          draft.foldStreak = 0;
          draft.ended = false;
          draft.won = false;
        });
        await delay();
        setGame(distributeHand);
      },
    });

  async function dealNextRound() {
    setGame((draft) => {
      draft.deck = flipAllToBack(
        shuffle([
          ...draft.deck,
          ...draft.hand,
          ...draft.opponent,
          ...draft.discard,
        ]),
      );
      draft.hand = [];
      draft.opponent = [];
      draft.discard = [];
      draft.oppBest = [];
    });
    await delay();
    setGame(distributeHand);
  }

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

  async function fold() {
    if (game.phase !== "decide" || game.ended) return;
    saveUndoState(structuredClone(game));
    const outcome = foldOutcome(game.foldStreak);

    if (outcome.ended) {
      setGame((draft) => {
        draft.foldStreak = outcome.foldStreak;
        draft.ended = true;
        draft.won = false;
      });
      return;
    }

    setGame((draft) => {
      draft.foldStreak = outcome.foldStreak;
    });
    setSelectedDiscards([]);
    await dealNextRound();
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
      const discarded = draft.hand.filter((c) => discardIds.has(c.id));
      const keep = draft.hand.filter((c) => !discardIds.has(c.id));
      const need = 5 - keep.length;
      const drawn = draft.deck.splice(0, need).map(flipToFace);
      draft.hand = sortCardsBySuit([...keep, ...drawn]);
      draft.discard.push(...flipAllToBack(discarded));
      draft.discardCount += 1;
      if (draft.discardCount >= 3) draft.phase = "bet";
    });
    setSelectedDiscards([]);
  }

  function setHand() {
    if (game.phase !== "discard") return;
    setGame((draft) => {
      draft.phase = "bet";
    });
    setSelectedDiscards([]);
  }

  async function placeBet(amount: number) {
    if (game.phase !== "bet" || game.ended) return;

    saveUndoState(structuredClone(game));

    let best: PlayingCard[] = [];
    let val: number[] = [];

    setGame((draft) => {
      draft.bet = amount;
      const oppCards = draft.deck.splice(0, 5 + amount).map(flipToFace);
      draft.opponent = sortCardsBySuit(oppCards);
      const result = bestFiveOf(oppCards);
      best = result.best;
      val = result.val;
      draft.oppBest = best.map((c) => c.id);
    });

    await delay(800);

    setGame((draft) => {
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

  async function nextRound() {
    if (game.ended) return;
    setSelectedDiscards([]);
    await dealNextRound();
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      // Top
      {
        id: "draw",
        name: "draw",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 30,
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      { id: "hud", col: 1.9, row: 0, width: 3.2 },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: LAYOUT.cols - 1,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 30,
        placeholder: { text: i18n.t("cards:discard"), infoPos: "left" },
      },

      // Opponent
      {
        id: "oppBackground",
        col: 0,
        row: LAYOUT.oppTop,
        width: LAYOUT.cols,
        height: LAYOUT.cardAreaHeight,
        placeholder: {},
        baseZIndex: 0,
      },
      {
        id: "oppLabel",
        col: 0,
        row: LAYOUT.oppTop + LAYOUT.cardAreaGap + 1,
        width: LAYOUT.cols,
        height: LAYOUT.cardAreaLabelHeight,
        baseZIndex: 10,
      },
      {
        id: "opp",
        name: "opp",
        cards: game.opponent,
        col: 0,
        row: LAYOUT.oppTop + LAYOUT.cardAreaGap,
        width: LAYOUT.cols,
        baseZIndex: 10,
        fan: {
          offset: zoneFanOffset(game.opponent.length, 6),
          direction: "right",
        },
      },

      // Middle Message
      {
        id: "message",
        col: 0,
        row: LAYOUT.oppTop + LAYOUT.cardAreaHeight,
        width: LAYOUT.cols,
        height: 1,
        baseZIndex: 1,
      },

      // Hand
      {
        id: "handBackground",
        col: 0,
        row: LAYOUT.handTop,
        width: LAYOUT.cols,
        height: LAYOUT.cardAreaHeight,
        placeholder: {},
        baseZIndex: 0,
      },
      {
        id: "handLabel",
        col: 0,
        row: LAYOUT.handTop,
        width: LAYOUT.cols,
        height: LAYOUT.cardAreaLabelHeight,
        baseZIndex: 10,
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: LAYOUT.handTop + LAYOUT.cardAreaLabelHeight,
        width: LAYOUT.cols,
        baseZIndex: 20,
        fan: {
          offset: zoneFanOffset(game.hand.length, 6),
          direction: "right",
        },
      },

      // Buttons
      {
        id: "controls",
        col: 0,
        row: LAYOUT.buttonsTop,
        width: LAYOUT.cols,
        height: 1,
      },
    ];

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
        forceOverlayColor: true,
        selectColor: inBest ? "none" : "grey",
        isDisabled: true,
      };
    }
    return {};
  };

  const { cardMap, cardHeight, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0,
    cardSize: "small",
  });

  const minBet = Math.max(1, game.discardCount);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:pocketPoker.youHit10PointsYou")
          : game.foldStreak >= maxFoldStreak
            ? i18n.t("games:pocketPoker.foldedThreeTimesInA")
            : i18n.t("games:pocketPoker.youBustedOut")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {/* Top */}
      <View style={[flexStyles.colCentered, getZoneStylesById("hud")]}>
        <ProgressBar
          labelText={i18n.t("cards:score")}
          progressValue={game.score}
          totalValue={winScore}
          color={
            game.score <= 2
              ? "red"
              : game.score <= 4
                ? "orange"
                : game.score >= 8
                  ? "green"
                  : "blue"
          }
          autoTallyText
          scaledHeight={cardHeight * 0.5}
          style={{ marginVertical: "auto" }}
        />
      </View>

      {/* Opponent */}
      <View style={[flexStyles.colCentered, getZoneStylesById("oppLabel")]}>
        <Text size="md" weight={400} color={colorPale}>
          {oppValue && handName(oppValue)}
        </Text>
      </View>

      {/* Middle Message  */}
      <View style={[flexStyles.colCentered, getZoneStylesById("message")]}>
        {game.phase === "decide" && (
          <View style={[flexStyles.colCentered, { flex: 1 }]}>
            <Text
              size="xs"
              weight={400}
              color={colorPale}
              textTransform="uppercase"
            >
              {i18n.t("cards:fold")}
            </Text>
            <Text size="xl" weight={600} color={colorPale}>
              {game.foldStreak}/{maxFoldStreak}
            </Text>
          </View>
        )}

        {game.phase === "discard" && (
          <View style={[flexStyles.rowCentered, flexStyles.fullWidth]}>
            <View style={[flexStyles.colCentered, { flex: 1 }]}>
              <Text
                size="xs"
                weight={400}
                color={colorPale}
                textTransform="uppercase"
              >
                {i18n.t("cards:draw")}
              </Text>
              <Text size="xl" weight={600} color={colorPale}>
                {game.discardCount} / 3
              </Text>
            </View>

            <Text
              size="sm"
              weight={400}
              color={Colors.white}
              style={{ flex: 2, textAlign: "center" }}
            >
              {i18n.t("games:pocketPoker.tapCardsToDiscard")}
            </Text>

            <View style={[flexStyles.colCentered, { flex: 1 }]}>
              <Text
                size="xs"
                weight={400}
                color={colorPale}
                textTransform="uppercase"
              >
                {i18n.t("games:pocketPoker.minBet")}
              </Text>
              <Text size="xl" weight={600} color={colorPale}>
                {Math.max(1, game.discardCount || 1)}
              </Text>
            </View>
          </View>
        )}

        {game.phase === "bet" && (
          <Text size="sm" weight={400} color={Colors.white}>
            {i18n.t("games:pocketPoker.opponentDraws5YourBet")}
          </Text>
        )}

        {game.phase === "roundEnd" && (
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.flex1,
              {
                width: "40%",
                gap: spacing(8),
                marginVertical: spacing(14),
                marginHorizontal: "15%",
                backgroundColor: rgba(
                  game.roundResult === "win"
                    ? Colors.buttonGreen
                    : game.roundResult === "lose"
                      ? Colors.buttonRed
                      : Colors.buttonBlue,
                  0.6,
                ),
                padding: spacing(10),
                borderRadius: spacing(8),
                borderWidth: spacing(2),
                borderColor: rgba(
                  game.roundResult === "win"
                    ? Colors.buttonGreen
                    : game.roundResult === "lose"
                      ? Colors.buttonRed
                      : Colors.buttonBlue,
                  0.6,
                ),
                boxShadow: `0 0 ${spacing(12)}px ${rgba(Colors.black, 0.5)}`,
              },
            ]}
          >
            <Text size="md" weight={400} color={Colors.white}>
              {game.roundResult === "win"
                ? i18n.t("games:pocketPoker.youWin")
                : game.roundResult === "lose"
                  ? i18n.t("games:pocketPoker.youLose")
                  : i18n.t("games:pocketPoker.pushTie")}
            </Text>
            <Text size="xl" weight={600} color={Colors.white}>
              {game.roundResult === "win"
                ? `+${game.bet}`
                : game.roundResult === "lose"
                  ? `-${game.bet}`
                  : i18n.t("games:pocketPoker.pushTie")}
            </Text>
          </View>
        )}
      </View>

      {/* Hand */}
      <View style={[flexStyles.colCentered, getZoneStylesById("handLabel")]}>
        <Text size="md" weight={400} color={colorPale}>
          {myValue && handName(myValue)}
        </Text>
      </View>

      {/* Buttons */}
      <View
        style={[
          flexStyles.rowCentered,
          getZoneStylesById("controls"),
          { gap: spacing(12) },
        ]}
      >
        {game.phase === "decide" && (
          <>
            <Button
              text={i18n.t("cards:fold")}
              size="md"
              onPress={fold}
              taller
              theme="red"
              disabled={game.ended || game.foldStreak >= maxFoldStreak}
              style={{ flex: 1 }}
            />
            <Button
              text={i18n.t("cards:play")}
              size="md"
              onPress={play}
              taller
              theme="green"
              style={{ flex: 1 }}
            />
          </>
        )}

        {game.phase === "discard" && (
          <>
            <Button
              text={i18n.t("games:pocketPoker.draw", {
                value: selectedDiscards.length ? selectedDiscards.length : "",
              })}
              size="md"
              onPress={drawAction}
              taller
              theme="blue"
              disabled={selectedDiscards.length === 0}
              style={{ flex: 1 }}
            />
            <Button
              text={i18n.t("games:pocketPoker.setHand")}
              size="md"
              onPress={setHand}
              taller
              theme="purple"
              style={{ flex: 1 }}
            />
          </>
        )}

        {game.phase === "bet" &&
          Array.from({ length: 3 }, (_, i) => i).map((b) => (
            <Button
              key={b}
              text={i18n.t("games:pocketPoker.bet", { value: b + 1 })}
              size="md"
              onPress={() => placeBet(b + 1)}
              disabled={b + 1 < minBet}
              taller
              theme="orange"
              style={{ flex: 1 }}
            />
          ))}

        {game.phase === "roundEnd" && !game.ended && (
          <Button
            text={i18n.t("games:pocketPoker.nextRound")}
            size="md"
            onPress={nextRound}
            fullWidth
            taller
            theme="green"
          />
        )}
      </View>

      {[
        {
          id: "oppBackground",
          label: i18n.t("games:pocketPoker.opponent"),
        },
        {
          id: "handBackground",
          label: i18n.t("cards:player"),
        },
      ].map((label) => {
        return (
          <View
            key={label.id}
            style={[
              flexStyles.rowStart,
              getZoneStylesById(label.id),
              { zIndex: 10 },
            ]}
          >
            <Text
              textTransform="uppercase"
              weight={400}
              color={Colors.white}
              style={[
                rotatedText,
                {
                  left: spacing(5),
                  fontSize: cardWidth * 0.18,
                },
              ]}
            >
              {label.label}
            </Text>
          </View>
        );
      })}

      {cardMap}
    </GameWrapper>
  );
}
