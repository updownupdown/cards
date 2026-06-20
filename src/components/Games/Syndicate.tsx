import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useZoneLayout, ZoneConfig } from "@/hooks/useZoneLayout";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCard } from "../Cards/AnimatedCard";
import { CardColor } from "../Cards/Card";
import {
  cardDims,
  createDeck,
  isFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardPositionBuilder } from "../Cards/CardPositionBuilder";
import { GameWrapper } from "../common/GameWrapper";
import { ZoneVisualizer } from "../Cards/ZoneVisualizer";

const cardSize = "small";
const tableSize = {
  borderRadius: 6,
  colGap: 4,
  innerGap: 10,
  paddingHorizontal: 6,
  paddingVertical: 6,
  rankWidth: 20,
};

type RankBand = {
  members: PlayingCard[];
  candidates: PlayingCard[];
};

type GameState = {
  ranks: RankBand[];
  dead: PlayingCard[];
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: GameState;
};

function cardVal(card: PlayingCard) {
  if (card.rank === "10") return 0;
  return rankValue(card);
}

function lastDigit(n: number) {
  const x = n % 10;
  return x < 0 ? x + 10 : x;
}

function setup(): GameState {
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

function hasAnyMove(state: GameState) {
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

function layoutRanks() {
  let members: ZoneConfig[] = [];

  for (let i = 0; i < 5; i++) {
    // Members
    members.push({
      id: `members-${i}`,
      col: 0.55,
      row: i * 1.1,
      fan: { direction: "right", offset: 0.47 },
    });

    // Candidates
    members.push({
      id: `candidates-${i}`,
      col: 2.4,
      row: i * 1.1,
      fan: { direction: "right", offset: 0.47 },
    });
  }

  return members;
}

const layoutZones: ZoneConfig[] = [...layoutRanks()];

// ==============================
// SYNDICATE
// ==============================
export default function Syndicate() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<GameState>(setup);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedReplacement, setSelectedReplacement] =
    useState<PlayingCard | null>(null);
  const [selectedSacrifice, setSelectedSacrifice] =
    useState<PlayingCard | null>(null);

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    targetCols: 7.8,
    paddingTopPc: cardDims.layoutPadding + 0.6,
    paddingBottomPc: cardDims.layoutPadding + 1.6,
  });

  const {
    cardWidth,
    cardHeight,
    getCardPosition,
    getZoneBasePos,
    layoutMetrics,
  } = layoutManager;

  function resetSelected() {
    setSelectedRank(null);
    setSelectedMember(null);
    setSelectedReplacement(null);
    setSelectedSacrifice(null);
  }

  const membersWidth = cardWidth * 2.2;

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
    if (!band || band.members.length !== 3) return [];

    const remaining = band.members.filter((c) => c.id !== selectedMember);

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
      if (!from || from.members.length !== 3) {
        return prev;
      }

      const promoted = from.members.find((c) => c.id === selectedMember);
      const remaining = from.members.filter((c) => c.id !== selectedMember);

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
      if (promoted) {
        if (promotionType === "members") {
          to.members.push(promoted);
        } else {
          to.candidates.push(promoted);
        }
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

      const next: GameState = {
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

  // ========== Card Positions ========== //
  const cardPositions = useMemo(() => {
    const builder = new CardPositionBuilder(getCardPosition);

    game.ranks.forEach((rank, rankIdx) => {
      builder
        .addArray(rank.members, `members-${rankIdx}`, rankIdx + 20, () => ({
          type: "member",
          rankIndex: rankIdx,
        }))
        .addArray(
          rank.candidates,
          `candidates-${rankIdx}`,
          rankIdx + 20,
          () => ({
            type: "candidate",
            rankIndex: rankIdx,
          }),
        );
    });

    return builder.build();
  }, [game, selectedMember, getCardPosition]);

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
      {/* Table Headers */}
      <View
        style={[
          {
            position: "absolute",
            zIndex: 1,
            left: layoutMetrics.startX,
            width: layoutMetrics.gridWidthPadded,
            top: layoutMetrics.startY - cardHeight * 0.7,
            height: cardHeight * 0.5,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: tableSize.innerGap,
            paddingVertical: tableSize.paddingVertical,
            paddingHorizontal: tableSize.paddingHorizontal,
            borderRadius: tableSize.borderRadius,
            backgroundColor: Colors.K875,
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
      {game.ranks.map((band, rankIndex) => {
        const zonePos = getZoneBasePos(
          layoutZones.find((z) => z.id === `members-${rankIndex}`)!,
        );
        const tablePaddingUnit = cardHeight * 0.1;

        return (
          <View
            key={`rank-${rankIndex}`}
            style={[
              flexStyles.rowStart,
              flexStyles.fullWidth,
              {
                position: "absolute",
                zIndex: 1,
                left: layoutMetrics.startX,
                top: zonePos.y - tablePaddingUnit,
                gap: tableSize.innerGap,

                width: layoutMetrics.gridWidthPadded,
                height: cardHeight + tablePaddingUnit * 2,

                // paddingVertical: tableSize.paddingVertical,
                paddingHorizontal: tableSize.paddingHorizontal,

                flex: 1,
                alignItems: "center",

                borderRadius: tableSize.borderRadius,
                backgroundColor: Colors.K875,
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
          </View>
        );
      })}

      {/* Card Positions */}
      {Object.values(cardPositions).map((target) => {
        const rankIndex: number | undefined = target.misc?.rankIndex;
        const type: "member" | "candidate" = target.misc?.type;

        const yOffsetHeight = -0.2 * cardHeight;
        let isSelected = false;
        let onPress: (() => void) | undefined = undefined;
        let isDisabled = false;
        let selectColor: CardColor = "none";
        let yOffset: number | undefined = undefined;

        if (type === "member") {
          // Member logic
          const isSelectedMember =
            rankIndex !== undefined &&
            selectedRank === rankIndex &&
            selectedMember === target.card.id;
          const isSelectedSacrifice = selectedSacrifice === target.card;
          const isPotentialSacrifice =
            rankIndex !== undefined &&
            selectedReplacement &&
            selectedRank === rankIndex + 1 &&
            game.ranks[rankIndex].members.length === 3;

          isSelected = isSelectedMember || isSelectedSacrifice;
          selectColor = isPotentialSacrifice ? "red" : "blue";
          yOffset = isSelected ? yOffsetHeight : 0;

          onPress = () => {
            const isPotentialSacrifice =
              rankIndex !== undefined &&
              selectedReplacement &&
              selectedRank === rankIndex + 1 &&
              game.ranks[rankIndex].members.length === 3;

            if (isSelectedMember) {
              resetSelected();
            } else if (isSelectedSacrifice) {
              setSelectedSacrifice(null);
            } else if (isPotentialSacrifice) {
              setSelectedSacrifice(target.card);
            } else {
              setSelectedReplacement(null);
              setSelectedRank(target.misc.rankIndex);
              setSelectedMember(target.card.id);
            }
          };
        } else {
          // Candidate logic
          const isValidReplacement = validReplacementCards.includes(
            target.card,
          );

          isSelected = selectedReplacement?.id === target.card.id;
          yOffset = isValidReplacement ? yOffsetHeight : 0;
          isDisabled = !isValidReplacement;
          selectColor = "purple";

          onPress = () => {
            setSelectedReplacement(isSelected ? null : target.card);
          };
        }

        return (
          <AnimatedCard
            key={target.card.id}
            targetState={target}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            onPress={onPress}
            isSelected={isSelected}
            isVisible={!target.isHiddenUnderDeck}
            yOffset={yOffset}
            selectColor={selectColor}
            isDisabled={isDisabled}
          />
        );
      })}

      {/* Instructions */}
      <View
        style={[
          {
            position: "absolute",
            zIndex: 1,
            left: layoutMetrics.startX,
            width: layoutMetrics.gridWidthPadded,
            top:
              layoutMetrics.startY +
              layoutMetrics.gridHeightPadded +
              cardHeight * 0.25,
            height: cardHeight * 0.5,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: cardWidth * 0.2,
          },
        ]}
      >
        <Text
          style={[
            textStyles.default,
            {
              fontSize: 16,
              fontFamily: FontWeight[300],
              color: Colors.K500,
            },
          ]}
        >
          <InstructionText />
        </Text>
        <Text
          style={[
            textStyles.default,
            {
              fontSize: 16,
              fontFamily: FontWeight[300],
            },
          ]}
        >
          Dead cards: {score}
        </Text>
      </View>

      {/* Action Buttons */}
      <View
        style={[
          {
            position: "absolute",
            zIndex: 1,
            left: layoutMetrics.startX,
            width: layoutMetrics.gridWidthPadded,
            top:
              layoutMetrics.startY +
              layoutMetrics.gridHeightPadded +
              cardHeight * 1,
            height: cardHeight * 0.5,
            gap: layoutMetrics.gridGap,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
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
