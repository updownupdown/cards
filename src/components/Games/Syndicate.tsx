import { Text } from "@/components/common/Text";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
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

const gameStateInitial: GameState = {
  ranks: Array.from({ length: 5 }).map(() => ({ members: [], candidates: [] })),
  dead: [],
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather all cards and reset the game state
  setGame((draft) => {
    const allCards = [
      ...draft.ranks.flatMap((r) => [...r.members, ...r.candidates]),
      ...draft.dead,
    ].filter((card): card is PlayingCard => card !== null);

    draft.ranks = Array.from({ length: 5 }).map(() => ({
      members: [],
      candidates: [],
    }));
    draft.dead = flipAllToBack(allCards);
    draft.ended = false;
    draft.won = false;
  });

  await delay(bufferedDefaultAnimDuration);

  setGame((draft) => {
    draft.dead = shuffle(
      createDeck()
        .filter((c) => !isFace(c))
        .slice(0, totalCardsNeeded),
    );
  });

  await delay(100);

  setGame((draft) => {
    // Ranks 1 to 5 have 1, 3, 5, 7, and 9 cards
    draft.ranks = [
      { members: [], candidates: flipAllToFace(draft.dead.slice(0, 1)) },
      { members: [], candidates: flipAllToFace(draft.dead.slice(1, 4)) },
      { members: [], candidates: flipAllToFace(draft.dead.slice(4, 9)) },
      { members: [], candidates: flipAllToFace(draft.dead.slice(9, 16)) },
      { members: [], candidates: flipAllToFace(draft.dead.slice(16, 25)) },
    ];

    // Last rank starts with 3 members
    draft.ranks[4].members = flipAllToFace(draft.dead.slice(25, 28));

    draft.dead = [];
  });
}

const totalCardsNeeded = 28; // 1 + 3 + 5 + 7 + 9 + 3

function cardVal(card: PlayingCard) {
  if (card.rank === "10") return 0;
  return rankValue(card);
}

function lastDigit(n: number) {
  const x = n % 10;
  return x < 0 ? x + 10 : x;
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

// ========== Main Component ========== //
export default function Syndicate() {
  const { zoneBg } = useGameZoneBackground(0.6);

  const {
    isLoaded,
    showIntro,
    setShowIntro,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
    resetNonGameStates: () => {
      resetSelected();
    },
  });

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

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (draft.ended) return;

      const rank = selectedRank;
      const from = draft.ranks[rank];

      if (!from || from.members.length !== 3) {
        return;
      }

      const promoted = from.members.find((c) => c.id === selectedMember);
      const remaining = from.members.filter((c) => c.id !== selectedMember);

      const replacementIndex = from.candidates.findIndex(
        (candidate) =>
          candidate.id === selectedReplacement.id &&
          replacementMatches(candidate, remaining[0], remaining[1]),
      );

      if (replacementIndex < 0) {
        return;
      }

      const replacement = from.candidates.splice(replacementIndex, 1)[0];
      from.members = [remaining[0], remaining[1], replacement];

      const toIndex = rank - 1;
      if (toIndex < 0) {
        draft.ended = true;
        draft.won = true;
        return;
      }

      const to = draft.ranks[toIndex];
      if (promoted) {
        if (promotionType === "members") {
          to.members.push(promoted);
        } else {
          to.candidates.push(promoted);
        }
      }

      // Move sacrifice to dead pile if needed
      if (to.members.length > 3) {
        const selectedSacrificeIndex = to.members.findIndex(
          (c) => c.id === selectedSacrifice?.id,
        );

        draft.dead.push(selectedSacrifice ?? to.members[to.members.length - 1]);

        if (selectedSacrificeIndex >= 0) {
          to.members.splice(selectedSacrificeIndex, 1);
        } else {
          to.members.pop();
        }
      }

      if (!hasAnyMove(draft)) {
        draft.ended = true;
        draft.won = false;
      }
    });

    resetSelected();
  }

  const score = game.dead.length;

  const instructionText = () => {
    if (selectedMember === null) {
      return "Select a member to promote";
    } else if (selectedReplacement === null) {
      if (validReplacementCards.length) {
        return "Select a valid replacement";
      } else {
        return "No valid replacement";
      }
    } else if (selectedRank !== null) {
      // Check if sacrifice is needed for next rank member
      const nextRank = selectedRank - 1;
      if (
        nextRank >= 0 &&
        game.ranks[nextRank].members.length === 3 &&
        !selectedSacrifice
      ) {
        return "(Sacrifice needed for member promotion)";
      }
      return `Promote as a:`;
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
      {
        id: "dead",
        name: "dead",
        cards: game.dead.length ? game.dead : undefined,
        col: 0,
        row: 6.5,
        fan: { maxVisible: 3 },
        placeholder: { text: "Dead", infoPos: "above" },
      },
      ...rankZones.flat(),
      {
        id: "instructions-buttons",
        col: 1.1,
        row: 6.15,
        width: 5.9,
        height: 1.35,
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
    paddingTop: 0,
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
      undo={undo}
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
          size="xxs"
          textTransform="uppercase"
          weight={300}
          color={Colors.K200}
          style={[
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
          size="xxs"
          textTransform="uppercase"
          weight={300}
          color={Colors.K200}
          style={[{ width: cardWidth * 2.2, color: Colors.brightBlue }]}
        >
          Members
        </Text>
        <Text
          size="xxs"
          textTransform="uppercase"
          weight={300}
          color={Colors.K200}
          style={[flexStyles.flex1, { color: Colors.brightPurple }]}
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
              size="sm"
              style={[
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
          flexStyles.colCentered,
          flexStyles.spaceBetween,
          getZoneStylesById("instructions-buttons"),
        ]}
      >
        <Text
          size="sm"
          weight={400}
          color={Colors.K300}
          style={[flexStyles.flex1, { textAlign: "center" }]}
        >
          {instructionText()}
        </Text>

        {/* Action Buttons */}
        <View
          style={[
            flexStyles.fullWidth,
            {
              gap: cardHeight * 0.25,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
        >
          <Button
            onPress={() => promote("members")}
            text="Member"
            size="medium"
            disabled={
              !selectedReplacement ||
              !!(
                selectedRank &&
                selectedRank !== 0 &&
                game.ranks[selectedRank - 1].members.length === 3 &&
                !selectedSacrifice
              )
            }
            style={[flexStyles.flex1]}
            theme="blue"
            taller
          />
          <Button
            onPress={() => promote("candidates")}
            text="Candidate"
            size="medium"
            disabled={!selectedReplacement}
            style={[flexStyles.flex1]}
            theme="purple"
            taller
          />
        </View>
      </View>
    </GameWrapper>
  );
}
