import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import MenuButton from "../Home/HomeButton";
import {
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Games/card-utils";

type RankBand = {
  members: PlayingCard[];
  candidates: PlayingCard[];
};

type SyndicateState = {
  ranks: RankBand[];
  dead: PlayingCard[];
  ended: boolean;
  won: boolean;
};

function isFace(card: PlayingCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}

function cardVal(card: PlayingCard) {
  if (card.rank === "10") return 0;
  return RANK_VALUE[card.rank];
}

function lastDigit(n: number) {
  const x = n % 10;
  return x < 0 ? x + 10 : x;
}

function setup(): SyndicateState {
  const cards = shuffle(createDeck({ faceUp: true }).filter((c) => !isFace(c)));

  const bands: RankBand[] = [
    { members: [], candidates: cards.slice(0, 9) },
    { members: [], candidates: cards.slice(9, 16) },
    { members: [], candidates: cards.slice(16, 21) },
    { members: [], candidates: cards.slice(21, 24) },
    { members: [], candidates: cards.slice(24, 25) },
  ];

  const leftovers = cards.slice(25);
  bands[0].members = leftovers.slice(0, 3);

  return {
    ranks: bands,
    dead: [],
    ended: false,
    won: false,
  };
}

function replacementMatches(
  candidate: PlayingCard,
  remA: PlayingCard,
  remB: PlayingCard,
) {
  const a = cardVal(remA);
  const b = cardVal(remB);
  const v = cardVal(candidate);
  return v === lastDigit(a + b) || v === lastDigit(a * b);
}

function hasAnyMove(state: SyndicateState) {
  for (let rank = 0; rank < 5; rank += 1) {
    const band = state.ranks[rank];
    if (band.members.length !== 3) continue;

    for (let m = 0; m < band.members.length; m += 1) {
      const remaining = band.members.filter((_, idx) => idx !== m);
      const canReplace = band.candidates.some((c) =>
        replacementMatches(c, remaining[0], remaining[1]),
      );
      if (canReplace) return true;
    }
  }

  return false;
}

export default function Syndicate() {
  const [game, setGame] = useState<SyndicateState>(setup);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [selectedReplacementId, setSelectedReplacementId] = useState<
    string | null
  >(null);
  const [targetArea, setTargetArea] = useState<"members" | "candidates">(
    "members",
  );
  const [message, setMessage] = useState(
    "Choose a rank member, pick a valid replacement, then choose where the promotion goes.",
  );

  const kingdomsWon = useMemo(() => (game.won ? 1 : 0), [game.won]);

  function reset() {
    setGame(setup());
    setSelectedRank(null);
    setSelectedMember(null);
    setSelectedReplacementId(null);
    setTargetArea("members");
    setMessage(
      "Choose a rank member, pick a valid replacement, then choose where the promotion goes.",
    );
  }

  const validReplacementCards = useMemo(() => {
    if (selectedRank === null || selectedMember === null)
      return [] as PlayingCard[];
    const band = game.ranks[selectedRank];
    if (!band || band.members.length !== 3 || !band.members[selectedMember])
      return [];

    const remaining = band.members.filter((_, idx) => idx !== selectedMember);
    return band.candidates.filter((candidate) =>
      replacementMatches(candidate, remaining[0], remaining[1]),
    );
  }, [game.ranks, selectedMember, selectedRank]);

  function promote() {
    if (
      selectedRank === null ||
      selectedMember === null ||
      !selectedReplacementId
    )
      return;

    setGame((prev) => {
      if (prev.ended) return prev;

      const rank = selectedRank;
      const ranks = prev.ranks.map((r) => ({
        members: [...r.members],
        candidates: [...r.candidates],
      }));
      const dead = [...prev.dead];

      const from = ranks[rank];
      if (!from || from.members.length !== 3 || !from.members[selectedMember]) {
        return prev;
      }

      const promoted = from.members[selectedMember];
      const remaining = from.members.filter((_, idx) => idx !== selectedMember);

      const replacementIndex = from.candidates.findIndex(
        (candidate) =>
          candidate.id === selectedReplacementId &&
          replacementMatches(candidate, remaining[0], remaining[1]),
      );
      if (replacementIndex < 0) {
        return prev;
      }

      const replacement = from.candidates.splice(replacementIndex, 1)[0];
      from.members = [remaining[0], remaining[1], replacement];

      const toIndex = rank - 1;
      if (toIndex < 0) {
        return {
          ...prev,
          ranks,
          dead,
          ended: true,
          won: true,
        };
      }

      const to = ranks[toIndex];
      if (targetArea === "members") {
        to.members.push(promoted);
      } else {
        to.candidates.push(promoted);
      }

      if (to.members.length > 3) {
        // Auto-sacrifice the highest value member to keep tension and limit.
        let highestIdx = 0;
        for (let i = 1; i < to.members.length; i += 1) {
          if (cardVal(to.members[i]) > cardVal(to.members[highestIdx])) {
            highestIdx = i;
          }
        }
        dead.push(to.members.splice(highestIdx, 1)[0]);
      }

      const next: SyndicateState = {
        ...prev,
        ranks,
        dead,
      };

      if (!hasAnyMove(next)) {
        return { ...next, ended: true, won: false };
      }

      return next;
    });

    setSelectedRank(null);
    setSelectedMember(null);
    setSelectedReplacementId(null);
    setMessage("Promotion resolved.");
  }

  const score = game.dead.length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MenuButton ended={game.ended} won={game.won} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Syndicate</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      <Text style={styles.metaText}>Dead cards (lower is better): {score}</Text>
      <Text style={styles.metaText}>Message: {message}</Text>

      {selectedRank !== null && selectedMember !== null ? (
        <View style={styles.selectionBox}>
          <Text style={styles.subTitle}>Valid replacements</Text>
          <View style={styles.replacementRow}>
            {validReplacementCards.length > 0 ? (
              validReplacementCards.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => setSelectedReplacementId(card.id)}
                  style={
                    selectedReplacementId === card.id
                      ? styles.selectedCard
                      : undefined
                  }
                >
                  <Card suit={card.suit} rank={card.rank} widthRatio={14} />
                </Pressable>
              ))
            ) : (
              <Text style={styles.metaText}>
                No valid replacement in this rank.
              </Text>
            )}
          </View>

          <View style={styles.targetRow}>
            <Pressable
              style={[
                styles.targetButton,
                targetArea === "members" ? styles.targetActive : null,
              ]}
              onPress={() => setTargetArea("members")}
            >
              <Text style={styles.targetButtonText}>Promote to Members</Text>
            </Pressable>
            <Pressable
              style={[
                styles.targetButton,
                targetArea === "candidates" ? styles.targetActive : null,
              ]}
              onPress={() => setTargetArea("candidates")}
            >
              <Text style={styles.targetButtonText}>Promote to Candidates</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.rankWrap}>
        {game.ranks.map((band, rankIndex) => (
          <View key={`rank-${rankIndex}`} style={styles.rankCol}>
            <Text style={styles.rankTitle}>R{5 - rankIndex}</Text>
            <Text style={styles.subTitle}>Members</Text>
            <View style={styles.stackWrap}>
              {band.members.map((card, memberIdx) => {
                const selected =
                  selectedRank === rankIndex && selectedMember === memberIdx;
                return (
                  <Pressable
                    key={`${card.id}-${memberIdx}`}
                    onPress={() => {
                      setSelectedRank(rankIndex);
                      setSelectedMember(memberIdx);
                    }}
                    style={selected ? styles.selectedCard : undefined}
                  >
                    <Card suit={card.suit} rank={card.rank} widthRatio={12} />
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.subTitle}>
              Candidates: {band.candidates.length}
            </Text>
            <View style={styles.stackWrap}>
              {band.candidates.slice(0, 3).map((card) => (
                <Card
                  key={card.id}
                  suit={card.suit}
                  rank={card.rank}
                  widthRatio={15}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.promoteBtn} onPress={promote}>
        <Text style={styles.promoteText}>Promote Selected Member</Text>
      </Pressable>

      {game.ended ? (
        <Text style={game.won ? styles.winText : styles.loseText}>
          {game.won
            ? `You won by promoting from Rank 1. Final score: ${score}`
            : "No valid promotion/replacement remains. You lose."}
        </Text>
      ) : null}

      <Text style={styles.metaText}>Progress marker: {kingdomsWon}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingHorizontal: 10,
    paddingBottom: 24,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit_600SemiBold",
    color: "#1f2937",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  rankWrap: {
    flexDirection: "row",
    gap: 8,
  },
  selectionBox: {
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    padding: 8,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  replacementRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  targetRow: {
    flexDirection: "row",
    gap: 8,
  },
  targetButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#475569",
  },
  targetActive: {
    backgroundColor: "#0f766e",
  },
  targetButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  rankCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    padding: 6,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  rankTitle: {
    fontFamily: "Outfit_600SemiBold",
    color: "#0f172a",
  },
  subTitle: {
    fontSize: 11,
    color: "#334155",
  },
  stackWrap: {
    gap: 4,
  },
  selectedCard: {
    backgroundColor: "rgba(37,99,235,0.16)",
    borderRadius: 8,
  },
  promoteBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#0f766e",
  },
  promoteText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  winText: {
    color: "#065f46",
    fontFamily: "Outfit_600SemiBold",
  },
  loseText: {
    color: "#991b1b",
    fontFamily: "Outfit_600SemiBold",
  },
});
