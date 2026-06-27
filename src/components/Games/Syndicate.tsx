import { useGameLoading } from "@/hooks/useGameLoading";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  isFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

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

// ==============================
// SYNDICATE
// ==============================
export default function Syndicate() {
  const { zoneBg } = useGameZoneBackground(0.6);
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<GameState>(setup);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
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

  // ========== Card Mapping ========== //
  const positioning = {
    innerGap: 10,
    paddingHorizontal: 0.07,
    paddingVertical: 6,
    rankWidth: 0.5,
    tableHeaderHeight: 0.6,
    borderRadius: 0.14,
  };

  const zones: MapZone[] = useMemo(() => {
    const colRows = getGridColRows({
      cols: 5,
      rows: 1,
    });

    const rankZones: MapZone[][] = colRows.map((pos, i) => [
      // Rank (for backgrounds)
      {
        id: `rank-${i}`,
        pileIndex: i,
        name: "rank",

        col: 0,
        row: i * 1.1 + positioning.tableHeaderHeight - 0.09,
        width: "full",
        height: 1.18,
        baseZIndex: 1,
      },
      // Members
      {
        id: `member-${i}`,
        pileIndex: i,
        cards: game.ranks[i].members.length ? game.ranks[i].members : undefined,
        name: "member",

        col: positioning.rankWidth,
        row: i * 1.1 + positioning.tableHeaderHeight,
        width: 2,
        baseZIndex: i + 20,
        fan: { direction: "right", offset: 0.47 },
      },
      // Candidates
      {
        id: `candidate-${i}`,
        pileIndex: i,
        cards: game.ranks[i].candidates.length
          ? game.ranks[i].candidates
          : undefined,
        name: "candidate",

        col: 2.4,
        width: pos.r + 4.5,
        row: i * 1.1 + positioning.tableHeaderHeight,
        baseZIndex: i + 20,
        fan: { direction: "right", offset: 0.47 },
      },
    ]);

    return [
      {
        id: "table-headers",

        col: 0,
        row: 0,
        width: "full",
        height: positioning.tableHeaderHeight,
      },
      ...rankZones.flat(),
      {
        id: "instructions",

        col: 0,
        row: 6,
        width: "full",
        height: 1,
      },
      {
        id: "buttons",

        col: 0,
        row: 7,
        width: "full",
        height: 1,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const yOffsetHeight = -0.2;

    if (mappedCard.zoneName === "member") {
      // Member logic
      const rankIndex = mappedCard.pileIndex;

      if (rankIndex === undefined) return {};

      const isSelectedMember =
        rankIndex !== undefined &&
        selectedRank === rankIndex &&
        selectedMember === mappedCard.card.id;
      const isSelectedSacrifice = selectedSacrifice === mappedCard.card;
      const isPotentialSacrifice =
        rankIndex !== undefined &&
        selectedReplacement &&
        selectedRank === rankIndex + 1 &&
        game.ranks[rankIndex].members.length === 3;

      const isSelected = isSelectedMember || isSelectedSacrifice;

      return {
        isSelected,
        selectColor: isPotentialSacrifice ? "red" : "blue",
        yOffset: isSelected ? yOffsetHeight : 0,
        onPress: () => {
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
            setSelectedSacrifice(mappedCard.card);
          } else {
            setSelectedReplacement(null);
            setSelectedRank(rankIndex);
            setSelectedMember(mappedCard.card.id);
          }
        },
      };
    } else if (mappedCard.zoneName === "candidate") {
      // Candidate logic
      const isValidReplacement = validReplacementCards.includes(
        mappedCard.card,
      );

      const isSelected = selectedReplacement?.id === mappedCard.card.id;

      return {
        isSelected,
        yOffset: isValidReplacement ? yOffsetHeight : 0,
        isDisabled: !isValidReplacement,
        selectColor: "purple",
        onPress: () => {
          setSelectedReplacement(isSelected ? null : mappedCard.card);
        },
      };
    }
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
  });

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
      {cardMap}

      {/* Table Headers */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
          getZoneStylesById("table-headers"),
          {
            gap: positioning.innerGap,
            paddingVertical: positioning.paddingVertical,
            paddingHorizontal: cardWidth * positioning.paddingHorizontal,
            borderRadius: cardWidth * positioning.borderRadius,
            backgroundColor: zoneBg,
          },
        ]}
      >
        <Text
          style={[
            styles.textSmall,
            {
              width: cardWidth * positioning.rankWidth,
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
            { width: cardWidth * 2.2, color: Colors.btnBlue },
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
        return (
          <View
            key={`rank-${rankIndex}`}
            style={[
              flexStyles.rowStart,
              flexStyles.fullWidth,
              getZoneStylesById(`rank-${rankIndex}`),
              {
                paddingHorizontal: cardWidth * positioning.paddingHorizontal,
                alignItems: "center",
                borderRadius: cardWidth * positioning.borderRadius,
                backgroundColor: zoneBg,
              },
            ]}
          >
            <Text
              style={[
                textStyles.default,
                {
                  width: cardWidth * positioning.rankWidth,
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

      {/* Instructions */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
          getZoneStylesById("instructions"),
          {
            paddingHorizontal: cardWidth * 0.3,
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
          getZoneStylesById("buttons"),
          {
            position: "absolute",
            zIndex: 1,
            gap: cardHeight * 0.25,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <Button
          onPress={() => promote("members")}
          text="Promote as Member"
          size="large"
          disabled={
            !selectedReplacement ||
            !!(
              selectedRank &&
              selectedRank !== 0 &&
              game.ranks[selectedRank - 1].members.length === 3 &&
              !selectedSacrifice
            )
          }
          style={[flexStyles.flex1, { height: "100%" }]}
          theme="blue"
          cardWidth={cardWidth}
        />
        <Button
          onPress={() => promote("candidates")}
          text="Promote as Candidate"
          size="large"
          disabled={!selectedReplacement}
          style={[flexStyles.flex1, { height: "100%" }]}
          theme="purple"
          cardWidth={cardWidth}
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
