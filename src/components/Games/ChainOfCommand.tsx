import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
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

import { i18n } from "@/i18n";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";
import { planMove } from "@/hints/lookahead";
type RankBand = {
  members: PlayingCard[];
  candidates: PlayingCard[];
};

export type ChainOfCommandRankBand = RankBand;

type GameState = {
  ranks: RankBand[];
  dead: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type ChainOfCommandGameState = GameState;

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

  await delay();

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
  return ((n % 10) + 10) % 10;
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

type ChainMove = {
  rank: number;
  member: string;
  replacement: string;
  as: "members" | "candidates";
  sacrifice?: string;
};

/** One card of each value: cards of a value play alike. */
function byValue(cards: PlayingCard[]) {
  const seen = new Set<number>();
  return cards.filter((card) => {
    const value = cardVal(card);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function chainMoves(state: GameState) {
  const moves: ChainMove[] = [];
  if (state.ended) return moves;
  state.ranks.forEach((band, rank) => {
    if (band.members.length !== 3) return;
    for (const member of byValue(band.members)) {
      const remaining = [...band.members];
      remaining.splice(band.members.indexOf(member), 1);
      const replacements = byValue(
        band.candidates.filter((candidate) =>
          replacementMatches(candidate, remaining[0], remaining[1]),
        ),
      );
      for (const replacement of replacements) {
        const promotion = {
          rank,
          member: member.id,
          replacement: replacement.id,
        };
        if (rank === 0) {
          moves.push({ ...promotion, as: "candidates" });
          continue;
        }
        moves.push({ ...promotion, as: "candidates" });
        const above = state.ranks[rank - 1].members;
        if (above.length < 3) {
          moves.push({ ...promotion, as: "members" });
        } else {
          for (const sacrifice of byValue(above)) {
            moves.push({
              ...promotion,
              as: "members",
              sacrifice: sacrifice.id,
            });
          }
        }
      }
    }
  });
  return moves;
}

function applyChainMove(state: GameState, move: ChainMove): GameState {
  const ranks = state.ranks.map((band) => ({
    members: [...band.members],
    candidates: [...band.candidates],
  }));
  const from = ranks[move.rank];
  const promoted = from.members.find((card) => card.id === move.member)!;
  const replacement = from.candidates.find(
    (card) => card.id === move.replacement,
  )!;
  from.members = [
    ...from.members.filter((card) => card !== promoted),
    replacement,
  ];
  from.candidates = from.candidates.filter((card) => card !== replacement);
  if (move.rank === 0) {
    return { ...state, ranks, ended: true, won: true };
  }
  const to = ranks[move.rank - 1];
  const dead = [...state.dead];
  to[move.as] = [...to[move.as], promoted];
  if (to.members.length > 3) {
    const sacrifice = to.members.find((card) => card.id === move.sacrifice);
    dead.push(sacrifice ?? to.members[to.members.length - 1]);
    to.members = to.members.filter(
      (card) => card !== (sacrifice ?? to.members[to.members.length - 1]),
    );
  }
  const next = { ...state, ranks, dead };
  return hasAnyMove(next) ? next : { ...next, ended: true, won: false };
}

function chainKey(state: GameState) {
  const values = (cards: PlayingCard[]) =>
    cards
      .map(cardVal)
      .sort((a, b) => a - b)
      .join("");
  return state.ranks
    .map((band) => `${values(band.members)}/${values(band.candidates)}`)
    .join("|");
}

// What a card in each rank is worth to the climb, members and candidates.
const MEMBER_WORTH = [1000, 200, 40, 8, 0];
const CANDIDATE_WORTH = [300, 60, 12, 3, 0];

function chainWorth(state: GameState, depth: number) {
  if (state.ended) return state.won ? 1e6 - depth : -1e5;
  return state.ranks.reduce(
    (sum, band, rank) =>
      sum +
      MEMBER_WORTH[rank] * band.members.length +
      CANDIDATE_WORTH[rank] * band.candidates.length,
    0,
  );
}

/**
 * The hint: the next promotion on the way to a win (every card is on view,
 * so this looks for one), shown as the taps it takes from what's selected.
 */
function findChainOfCommandHint(
  state: GameState,
  selected: {
    member: string | null;
    replacement: string | null;
    sacrifice: string | null;
  },
) {
  if (state.ended) return null;
  const move =
    planMove(state, {
      moves: chainMoves,
      apply: applyChainMove,
      score: chainWorth,
      key: chainKey,
      positionKey: chainKey,
      budget: 6000,
    }) ??
    // When every line loses, any promotion still keeps the game going.
    chainMoves(state)[0];
  if (!move) return null;
  const memberChosen = selected.member === move.member;
  return makeHint(
    {
      key: "press",
      values: {
        label: i18n.t(
          move.as === "members"
            ? "games:chainOfCommand.member"
            : "games:chainOfCommand.candidate",
        ),
      },
    },
    memberChosen ? [] : cardTarget(move.member),
    memberChosen && selected.replacement === move.replacement
      ? []
      : cardTarget(move.replacement),
    move.sacrifice && !(memberChosen && selected.sacrifice === move.sacrifice)
      ? cardTarget(move.sacrifice)
      : [],
    zoneTarget("instructions-buttons"),
  );
}

export const chainOfCommandRules = {
  cardVal,
  lastDigit,
  replacementMatches,
  hasAnyMove,
  totalCardsNeeded,
  findHint: findChainOfCommandHint,
};

// ========== Main Component ========== //
export default function ChainOfCommand() {
  const { colorZone } = useGameColors(0.6);

  const {
    isLoaded,
    isSettingUp,
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

  useHint(
    () =>
      findChainOfCommandHint(game, {
        member: selectedMember,
        replacement: selectedReplacement?.id ?? null,
        sacrifice: selectedSacrifice?.id ?? null,
      }),
    {
      game,
      enabled: !isSettingUp && !game.ended && game.ranks[4].members.length > 0,
    },
  );

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
      return i18n.t("games:chainOfCommand.selectAMemberToPromote");
    } else if (selectedReplacement === null) {
      if (validReplacementCards.length) {
        return i18n.t("games:chainOfCommand.selectAValidReplacement");
      } else {
        return i18n.t("games:chainOfCommand.noValidReplacement");
      }
    } else if (selectedRank !== null) {
      // Check if sacrifice is needed for next rank member
      const nextRank = selectedRank - 1;
      if (
        nextRank >= 0 &&
        game.ranks[nextRank].members.length === 3 &&
        !selectedSacrifice
      ) {
        return i18n.t("games:chainOfCommand.sacrificeNeededForMemberPromotion");
      }
      return i18n.t("games:chainOfCommand.promoteAsA");
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
        placeholder: {
          text: i18n.t("games:chainOfCommand.dead"),
          infoPos: "above",
        },
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
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:chainOfCommand.youWonByPromotingFrom", { score })
          : i18n.t("games:chainOfCommand.noValidPromotionReplacementRemains")
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
            backgroundColor: colorZone,
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
          {i18n.t("games:chainOfCommand.rk")}
        </Text>
        <Text
          size="xxs"
          textTransform="uppercase"
          weight={300}
          color={Colors.K200}
          style={[{ width: cardWidth * 2.2, color: Colors.brightBlue }]}
        >
          {i18n.t("games:chainOfCommand.members")}
        </Text>
        <Text
          size="xxs"
          textTransform="uppercase"
          weight={300}
          color={Colors.K200}
          style={[flexStyles.flex1, { color: Colors.brightPurple }]}
        >
          {i18n.t("games:chainOfCommand.candidates")}
        </Text>
      </View>

      {/* Rank Rows */}
      {game.ranks.map((_band, rankIndex) => {
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
                backgroundColor: colorZone,
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
            text={i18n.t("games:chainOfCommand.member")}
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
            text={i18n.t("games:chainOfCommand.candidate")}
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
