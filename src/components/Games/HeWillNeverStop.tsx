import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors, rgba } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  rankValue,
  shuffle,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { Text } from "../common/Text";
import { GameWrapper } from "../common/GameWrapper";

const HORROR_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9"] as const;
type HorrorRank = (typeof HORROR_RANKS)[number];
type ActionMode = "search" | "escape";

export type HeWillNeverStopGameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: HeWillNeverStopGameState = {
  deck: [],
  hand: [],
  discard: [],
  ended: false,
  won: false,
};

function createHorrorDeck() {
  return createDeck({ faceUp: true }).filter((card) =>
    HORROR_RANKS.includes(card.rank as HorrorRank),
  );
}

function sequenceLengthFrom(cards: readonly PlayingCard[], startIndex: number) {
  if (startIndex >= cards.length) return 0;
  if (startIndex === cards.length - 1) return 1;

  const direction =
    rankValue(cards[startIndex + 1]) - rankValue(cards[startIndex]);
  if (Math.abs(direction) !== 1) return 1;

  let length = 2;
  for (let index = startIndex + 2; index < cards.length; index += 1) {
    if (rankValue(cards[index]) - rankValue(cards[index - 1]) !== direction) {
      break;
    }
    length += 1;
  }
  return length;
}

function isCardInSequence(cards: readonly PlayingCard[], cardIndex: number) {
  for (let startIndex = 0; startIndex <= cardIndex; startIndex += 1) {
    const length = sequenceLengthFrom(cards, startIndex);
    if (length >= 3 && cardIndex < startIndex + length) return true;
  }
  return false;
}

function hasFourOfAKind(cards: readonly PlayingCard[]) {
  return cards.some(
    (card, index) =>
      cards.slice(index, index + 4).length === 4 &&
      cards.slice(index, index + 4).every((other) => other.rank === card.rank),
  );
}

function evaluateEnd(draft: HeWillNeverStopGameState) {
  if (draft.hand.length === 0) {
    draft.ended = true;
    draft.won = false;
  } else if (hasFourOfAKind(draft.hand) || draft.deck.length === 0) {
    draft.ended = true;
    draft.won = true;
  } else {
    draft.ended = false;
    draft.won = false;
  }
}

function drawCards(draft: HeWillNeverStopGameState, count: number) {
  for (let index = 0; index < count; index += 1) {
    const card = draft.deck.pop();
    if (!card) break;
    draft.hand.push(card);
  }
}

function pursue(draft: HeWillNeverStopGameState) {
  const originalSequenceLength = sequenceLengthFrom(draft.hand, 0);
  const first = draft.hand.shift();
  if (!first) return;
  draft.discard.push(first);

  if (originalSequenceLength < 3) return;
  while (sequenceLengthFrom(draft.hand, 0) >= 3) {
    const next = draft.hand.shift();
    if (!next) break;
    draft.discard.push(next);
  }
}

function searchRank(draft: HeWillNeverStopGameState, rank: HorrorRank) {
  if (draft.ended) return false;
  const discarded = draft.hand.filter((card) => card.rank === rank);
  if (discarded.length === 0) return false;

  draft.hand = draft.hand.filter((card) => card.rank !== rank);
  draft.discard.push(...discarded);
  evaluateEnd(draft);
  if (!draft.ended) {
    drawCards(draft, discarded.length);
    evaluateEnd(draft);
  }
  if (!draft.ended) {
    pursue(draft);
    evaluateEnd(draft);
  }
  return true;
}

function escapeCard(
  draft: HeWillNeverStopGameState,
  cardIndex: number,
  destinationIndex: number,
) {
  if (
    draft.ended ||
    cardIndex < 0 ||
    cardIndex >= draft.hand.length ||
    isCardInSequence(draft.hand, cardIndex)
  ) {
    return false;
  }

  const [card] = draft.hand.splice(cardIndex, 1);
  const target = Math.max(0, Math.min(destinationIndex, draft.hand.length));
  draft.hand.splice(target, 0, card);

  if (isCardInSequence(draft.hand, target)) drawCards(draft, 2);
  evaluateEnd(draft);
  if (!draft.ended) {
    pursue(draft);
    evaluateEnd(draft);
  }
  return true;
}

async function resetAndSetup(
  setGame: (updater: (draft: HeWillNeverStopGameState) => void) => void,
) {
  setGame((draft) => {
    draft.deck = shuffle(createHorrorDeck());
    draft.hand = [];
    draft.discard = [];
    draft.ended = false;
    draft.won = false;
    drawCards(draft, 8);
    evaluateEnd(draft);
    if (!draft.ended) {
      pursue(draft);
      evaluateEnd(draft);
    }
  });
}

export const heWillNeverStopRules = {
  createDeck: createHorrorDeck,
  sequenceLengthFrom,
  isCardInSequence,
  hasFourOfAKind,
  evaluateEnd,
  pursue,
  searchRank,
  escapeCard,
};

const HAND_COLUMNS = 8;

export default function HeWillNeverStop() {
  const { spacing } = useResponsiveMetrics();
  const [mode, setMode] = useState<ActionMode>("search");
  const [selectedRank, setSelectedRank] = useState<HorrorRank | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
    null,
  );

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager({
    gameStateInitial,
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    resetNonGameStates: () => {
      setMode("search");
      setSelectedRank(null);
      setSelectedCardIndex(null);
    },
  });

  useEffect(() => {
    if (isSettingUp || game.ended) return;
    const snapshot = structuredClone(game);
    evaluateEnd(snapshot);
    if (snapshot.ended !== game.ended || snapshot.won !== game.won) {
      setGame((draft) => evaluateEnd(draft));
    }
  }, [game, isSettingUp, setGame]);

  function chooseMode(nextMode: ActionMode) {
    setMode(nextMode);
    setSelectedRank(null);
    setSelectedCardIndex(null);
  }

  function takeSearch() {
    if (!selectedRank || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      searchRank(draft, selectedRank);
    });
    setSelectedRank(null);
  }

  function chooseEscapeCard(index: number) {
    if (game.ended || isCardInSequence(game.hand, index)) return;
    setSelectedCardIndex(index);
  }

  function takeEscape(destinationIndex: number) {
    if (selectedCardIndex === null || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      escapeCard(draft, selectedCardIndex, destinationIndex);
    });
    setSelectedCardIndex(null);
  }

  const zones: MapZone[] = useMemo(() => {
    const handZones = game.hand.map((card, index) => ({
      id: `hand-${card.id}`,
      name: "hand",
      pileIndex: index,
      cards: [card],
      col: index % HAND_COLUMNS,
      row: Math.floor(index / HAND_COLUMNS),
      baseZIndex: 10,
      placeholder: {},
    }));

    return [
      ...handZones,
      {
        id: "status",
        col: 0,
        row: 4.2,
        width: "full",
        height: 0.75,
        baseZIndex: 50,
      },
      {
        id: "modes",
        col: 0,
        row: 5.1,
        width: "full",
        height: 0.55,
        baseZIndex: 50,
      },
      {
        id: "action",
        col: 0,
        row: 5.8,
        width: "full",
        height: 1.45,
        baseZIndex: 50,
      },
    ];
  }, [game.hand]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName !== "hand" || mappedCard.pileIndex === undefined) {
      return undefined;
    }

    const index = mappedCard.pileIndex;
    const inSequence = isCardInSequence(game.hand, index);
    const selected =
      mode === "search"
        ? selectedRank === mappedCard.card.rank
        : selectedCardIndex === index;
    const selectable = !game.ended && (mode === "search" || !inSequence);

    return {
      isDisabled: !selectable,
      isSelected: selected,
      selectColor: selected
        ? "orange"
        : mode === "escape" && !inSequence
          ? "blue"
          : "none",
      forceSelectColor: selected,
      forceOverlayColor: selected,
      onPress: () => {
        if (mode === "search") {
          setSelectedRank(mappedCard.card.rank as HorrorRank);
        } else {
          chooseEscapeCard(index);
        }
      },
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: HAND_COLUMNS,
    fixedRows: 7.5,
    paddingTop: 0.25,
    paddingBottom: 0.25,
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      score={32 - game.deck.length}
      winLoseMessage={
        game.won
          ? game.deck.length === 0
            ? "You made it to dawn."
            : "The trap snaps shut."
          : "He caught you."
      }
    >
      {cardMap}
      <View
        style={[
          getZoneStylesById("status"),
          { paddingHorizontal: spacing(4), gap: spacing(4) },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="xs" weight="medium" color={rgba(Colors.white, 0.82)}>
            Pursuer <Text weight="bold">left</Text>
          </Text>
          <Text size="xs" weight="medium" color={rgba(Colors.white, 0.82)}>
            Safety <Text weight="bold">right</Text>
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: spacing(4),
            borderRadius: 6,
          }}
        >
          <Text size="xs">Deck: {game.deck.length}</Text>
          <Text size="xs">Discard: {game.discard.length}</Text>
          <Text size="xs">Line: {game.hand.length}</Text>
        </View>
      </View>

      <View
        style={[
          getZoneStylesById("modes"),
          { flexDirection: "row", gap: spacing(8) },
        ]}
      >
        <Button
          text="Search"
          theme={mode === "search" ? "orange" : "purple"}
          onPress={() => chooseMode("search")}
          style={{ flex: 1 }}
          disabled={game.ended}
        />
        <Button
          text="Escape"
          theme={mode === "escape" ? "orange" : "purple"}
          onPress={() => chooseMode("escape")}
          style={{ flex: 1 }}
          disabled={game.ended}
        />
      </View>

      <View style={[getZoneStylesById("action"), { gap: spacing(8) }]}>
        {mode === "search" ? (
          <>
            <Text size="sm" color={rgba(Colors.white, 0.82)}>
              Select a card to search for every card of that rank.
            </Text>
            <Button
              text="Search the Line"
              theme="green"
              fullWidth
              disabled={!selectedRank || game.ended}
              onPress={takeSearch}
            />
          </>
        ) : (
          <>
            <Text size="sm" color={rgba(Colors.white, 0.82)}>
              Select a card not in a run, then choose its new position.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing(7) }}
            >
              {Array.from({ length: game.hand.length + 1 }, (_, index) => (
                <Button
                  key={`gap-${index}`}
                  text={`To ${index + 1}`}
                  theme="blue"
                  onPress={() => takeEscape(index)}
                  disabled={selectedCardIndex === null || game.ended}
                />
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </GameWrapper>
  );
}
