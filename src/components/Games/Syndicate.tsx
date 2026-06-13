import { useGameLoading } from "@/hooks/useGameLoading";
import { useLayoutManager } from "@/hooks/useLayoutManager";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAnimations } from "../Animations/Animations";
import { Button } from "../Button/Button";
import { useCardSizing } from "../Cards/Card";
import {
  RANK_VALUE,
  createDeck,
  isFace,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 7;
const cardSize = "small";
const selectedCardTopMargin = -16;
const tableSize = {
  borderRadius: 6,
  colGap: 4,
  innerGap: 10,
  paddingHorizontal: 8,
  paddingVertical: 6,
  rankWidth: 20,
};

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

type GameSnapshot = {
  game: SyndicateState;
};

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

  // Ranks 1 to 5 have 1, 3, 5, 7, and 9 cards
  const ranks: RankBand[] = [
    { members: [], candidates: cards.slice(0, 1) },
    { members: [], candidates: cards.slice(1, 4) },
    { members: [], candidates: cards.slice(4, 9) },
    { members: [], candidates: cards.slice(9, 16) },
    { members: [], candidates: cards.slice(16, 25) },
  ];

  // Last rank starts with 3 members
  ranks[4].members = cards.slice(25, 28);

  return {
    ranks,
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

// ==============================
// SYNDICATE
// ==============================
export default function Syndicate() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<SyndicateState>(setup);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [selectedReplacement, setSelectedReplacement] =
    useState<PlayingCard | null>(null);
  const [selectedSacrifice, setSelectedSacrifice] =
    useState<PlayingCard | null>(null);

  function resetSelected() {
    setSelectedRank(null);
    setSelectedMember(null);
    setSelectedReplacement(null);
    setSelectedSacrifice(null);
  }

  const { cardWidth } = useCardSizing(cardsPerRow);
  const membersWidth = cardWidth * 2.2;

  function leftMargin(i: number) {
    return i === 0 ? 0 : cardWidth * -0.53;
  }

  const { animateCards, isAnimating, animatingCardIds } = useAnimations();

  const { getLayout, setRef } = useLayoutManager([
    "members",
    "candidates",
    "discard",
  ]);

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
      resetSelected();
    }
  };

  function reset() {
    clearHistory();
    setGame(setup());
    resetSelected();
  }

  // ==============================
  // Valid Replacements
  // ==============================
  const validReplacementCards = useMemo(() => {
    if (selectedRank === null || selectedMember === null) {
      return [] as PlayingCard[];
    }

    const band = game.ranks[selectedRank];
    if (!band || band.members.length !== 3 || !band.members[selectedMember])
      return [];

    const remaining = band.members.filter((_, idx) => idx !== selectedMember);

    return band.candidates.filter((candidate) =>
      replacementMatches(candidate, remaining[0], remaining[1]),
    );
  }, [game.ranks, selectedMember, selectedRank]);

  // ==============================
  // Promote
  // ==============================
  function promote(promotionType: "members" | "candidates") {
    if (
      selectedRank === null ||
      selectedMember === null ||
      !selectedReplacement
    ) {
      return;
    }

    saveUndoState(structuredClone({ game }));

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
          candidate.id === selectedReplacement.id &&
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
      if (promotionType === "members") {
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

    resetSelected();
  }

  const score = game.dead.length;

  const InstructionText = () => {
    if (selectedMember === null) {
      return "Select a member to promote";
    } else if (selectedReplacement === null) {
      if (validReplacementCards.length) {
        return "Select a valid replacement";
      } else {
        return "No valid replacement";
      }
    } else if (selectedRank !== null) {
      return `Promote to rank ${selectedRank}:`;
    }
  };

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? `You won by promoting from Rank 1. Final score: ${score}`
          : "No valid promotion/replacement remains. You lose."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      <Text style={styles.textSmall}>Dead cards: {score}</Text>

      {/* Table */}
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.fullWidth,
          {
            gap: tableSize.colGap,
          },
        ]}
      >
        {/* Table Headers */}
        <View
          style={[
            flexStyles.rowStart,
            flexStyles.fullWidth,
            {
              paddingVertical: tableSize.paddingVertical,
              paddingHorizontal: tableSize.paddingHorizontal,
              borderRadius: tableSize.borderRadius,
              backgroundColor: Colors.K875,
              gap: tableSize.innerGap,
            },
          ]}
        >
          <Text
            style={[
              styles.textSmall,
              {
                width: tableSize.rankWidth,
                color: Colors.K600,
                textAlign: "center",
              },
            ]}
          >
            Rk
          </Text>
          <Text
            style={[
              styles.textSmall,
              { width: membersWidth, color: Colors.btnBlue },
            ]}
          >
            Members
          </Text>
          <Text
            style={[
              styles.textSmall,
              flexStyles.flex1,
              { color: Colors.btnPurple },
            ]}
          >
            Candidates
          </Text>
        </View>

        {/* Rank Rows */}
        <View
          style={[
            flexStyles.colStart,
            flexStyles.fullWidth,
            {
              borderRadius: tableSize.borderRadius,
              gap: tableSize.colGap,
            },
          ]}
        >
          {game.ranks.map((band, rankIndex) => (
            <View
              key={`rank-${rankIndex}`}
              style={[
                flexStyles.rowStart,
                flexStyles.fullWidth,
                {
                  position: "relative",
                  flex: 1,
                  alignItems: "center",
                  borderRadius: tableSize.borderRadius,
                  paddingVertical: tableSize.paddingVertical,
                  paddingHorizontal: tableSize.paddingHorizontal,
                  backgroundColor: Colors.K875,
                  zIndex: rankIndex + 1,
                  gap: tableSize.innerGap,
                },
              ]}
            >
              <Text
                style={[
                  textStyles.default,
                  {
                    width: tableSize.rankWidth,
                    textAlign: "center",
                    color: Colors.K600,
                    fontFamily: FontWeight[600],
                  },
                ]}
              >
                {rankIndex + 1}
              </Text>

              <View style={[flexStyles.rowStart, { width: membersWidth }]}>
                {band.members.map((card, i) => {
                  const isSelectedMember =
                    selectedRank === rankIndex && selectedMember === i;
                  const isSelectedSacrifice = selectedSacrifice === card;
                  const isSelected = isSelectedMember || isSelectedSacrifice;

                  const isPotentialSacrifice =
                    selectedReplacement &&
                    selectedRank === rankIndex + 1 &&
                    band.members.length === 3;

                  return (
                    <CardButton
                      key={`${card.id}-${i}`}
                      onPress={() => {
                        if (isSelectedMember) {
                          resetSelected();
                        } else if (isSelectedSacrifice) {
                          setSelectedSacrifice(null);
                        } else if (isPotentialSacrifice) {
                          setSelectedSacrifice(card);
                        } else {
                          setSelectedReplacement(null);
                          setSelectedRank(rankIndex);
                          setSelectedMember(i);
                        }
                      }}
                      isSelected={isSelected}
                      card={card}
                      cardsPerRow={cardsPerRow}
                      style={[
                        {
                          marginLeft: leftMargin(i),
                          marginTop: isSelected
                            ? selectedReplacement && isSelectedMember
                              ? selectedCardTopMargin * 1.8
                              : selectedCardTopMargin
                            : 0,
                          transitionProperty:
                            "bottom, left, right, top, transform, margin-top",
                        },
                      ]}
                      cardSize={cardSize}
                      selectColor={isPotentialSacrifice ? "red" : "blue"}
                    />
                  );
                })}
              </View>

              {/* Candidates */}
              <View style={[flexStyles.rowStart, {}]}>
                {band.candidates.map((card, i) => {
                  const isSelected = selectedReplacement?.id === card.id;
                  const isValidReplacement =
                    validReplacementCards.includes(card);

                  return (
                    <CardButton
                      key={card.id}
                      card={card}
                      cardsPerRow={cardsPerRow}
                      onPress={() => {
                        setSelectedReplacement(isSelected ? null : card);
                      }}
                      isSelected={isSelected}
                      disabled={!isValidReplacement}
                      style={[
                        {
                          marginLeft: leftMargin(i),
                          marginTop: isValidReplacement
                            ? selectedCardTopMargin
                            : 0,
                          transitionProperty:
                            "bottom, left, right, top, transform, margin-top",
                        },
                      ]}
                      cardSize={cardSize}
                      selectColor="purple"
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View
        style={[flexStyles.colCentered, flexStyles.fullWidth, flexStyles.gap16]}
      >
        <Text
          style={[
            textStyles.default,
            flexStyles.fullWidth,
            {
              fontSize: 14,
              fontFamily: FontWeight[400],
              textAlign: "center",
              textTransform: "uppercase",
            },
          ]}
        >
          <InstructionText />
        </Text>
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.gap12,
          ]}
        >
          <Button
            onPress={() => promote("members")}
            text="Members"
            size="medium"
            disabled={
              !selectedReplacement ||
              !!(
                selectedRank &&
                game.ranks[selectedRank].members.length === 3 &&
                !selectedSacrifice
              )
            }
            style={[flexStyles.flex1]}
            theme="blue"
          />
          <Button
            onPress={() => promote("candidates")}
            text="Candidates"
            size="medium"
            disabled={!selectedReplacement}
            style={[flexStyles.flex1]}
            theme="purple"
          />
        </View>
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  textSmall: {
    fontSize: 12,
    textTransform: "uppercase",
    color: Colors.K200,
    fontFamily: FontWeight[300],
  },
});
