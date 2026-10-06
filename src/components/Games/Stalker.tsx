import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors, rgba } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { delay } from "@/utils/utils";
import { flexStyles } from "@/styles/flexStyles";

import { i18n } from "@/i18n";
import { ARROW_LABELS, cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";
import { seededRandom, shuffledWith } from "@/hints/random";
const HORROR_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9"] as const;
const HORROR_DECK_SIZE = HORROR_RANKS.length * 4;
type HorrorRank = (typeof HORROR_RANKS)[number];

export type StalkerGameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: StalkerGameState = {
  deck: [],
  hand: [],
  discard: [],
  ended: false,
  won: false,
};

function RouteDots({
  discardCount,
  handCount,
  dotSpacing,
}: {
  discardCount: number;
  handCount: number;
  dotSpacing: (base: number) => number;
}) {
  const himIndex = discardCount;
  const herIndex = himIndex + handCount + 1;

  return Array.from({ length: HORROR_DECK_SIZE + 2 }, (_, index) => {
    const isCharacter = index === himIndex || index === herIndex;
    const isDiscard = index < himIndex;
    const isHand = index > himIndex && index < herIndex;
    const isHim = index === himIndex;
    const diameter = dotSpacing(isCharacter ? 14 : 6);

    return (
      <View
        key={index}
        style={{
          width: diameter,
          height: diameter,
          borderRadius: dotSpacing(isCharacter ? 7 : 3),
          borderWidth: isCharacter ? dotSpacing(1) : 0,
          borderColor: Colors.white,
          backgroundColor: isCharacter
            ? isHim
              ? Colors.cardSelectRed
              : Colors.cardSelectBlue
            : isDiscard
              ? rgba(Colors.white, 0.25)
              : isHand
                ? rgba(Colors.white, 1)
                : rgba(Colors.white, 0.4),
        }}
      />
    );
  });
}

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

function evaluateEnd(draft: StalkerGameState) {
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

function drawCards(draft: StalkerGameState, count: number) {
  for (let index = 0; index < count; index += 1) {
    const card = draft.deck.pop();
    if (!card) break;
    draft.hand.push(flipToFace(card));
  }
}

function pursue(draft: StalkerGameState) {
  const originalSequenceLength = sequenceLengthFrom(draft.hand, 0);
  const first = draft.hand.shift();
  if (!first) return;
  draft.discard.push(flipToBack(first));

  if (originalSequenceLength < 3) return;
  while (sequenceLengthFrom(draft.hand, 0) >= 3) {
    const next = draft.hand.shift();
    if (!next) break;
    draft.discard.push(flipToBack(next));
  }
}

function searchDrawCount(cards: readonly PlayingCard[], rank: HorrorRank) {
  return cards.filter((card) => card.rank === rank).length;
}

function searchRank(draft: StalkerGameState, rank: HorrorRank) {
  if (draft.ended) return false;
  const discarded = draft.hand.filter((card) => card.rank === rank);
  if (discarded.length === 0) return false;

  draft.hand = draft.hand.filter((card) => card.rank !== rank);
  draft.discard.push(...discarded.map(flipToBack));
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

function moveCard(
  cards: readonly PlayingCard[],
  cardIndex: number,
  destinationIndex: number,
) {
  const nextCards = [...cards];
  const [card] = nextCards.splice(cardIndex, 1);
  if (!card) return nextCards;
  const target = Math.max(0, Math.min(destinationIndex, nextCards.length));
  nextCards.splice(target, 0, card);
  return nextCards;
}

function escapeDrawCount(
  cards: readonly PlayingCard[],
  cardIndex: number,
  destinationIndex: number,
) {
  const reorderedHand = moveCard(cards, cardIndex, destinationIndex);
  const target = Math.max(
    0,
    Math.min(destinationIndex, reorderedHand.length - 1),
  );
  return isCardInSequence(reorderedHand, target) ? 2 : 0;
}

function escapeCard(
  draft: StalkerGameState,
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

  const drawCount = escapeDrawCount(draft.hand, cardIndex, destinationIndex);
  draft.hand = moveCard(draft.hand, cardIndex, destinationIndex);

  if (drawCount > 0) drawCards(draft, drawCount);
  evaluateEnd(draft);

  if (!draft.ended) {
    pursue(draft);
    evaluateEnd(draft);
  }

  return true;
}

async function resetAndSetup(
  setGame: (updater: (draft: StalkerGameState) => void) => void,
) {
  setGame((draft) => {
    let allCards = [...draft.deck, ...draft.hand, ...draft.discard];
    if (allCards.length === 0) {
      allCards = createHorrorDeck();
    }

    draft.deck = shuffle(allCards.map(flipToBack));
    draft.hand = [];
    draft.discard = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    drawCards(draft, 8);
    evaluateEnd(draft);
  });

  await delay();

  setGame((draft) => {
    if (!draft.ended) {
      pursue(draft);
      evaluateEnd(draft);
    }
  });
}

type StalkerAction =
  | { kind: "search"; rank: HorrorRank }
  | { kind: "escape"; from: number; to: number };

function stalkerActions(hand: readonly PlayingCard[]) {
  const actions: StalkerAction[] = [];
  for (const rank of new Set(hand.map((card) => card.rank as HorrorRank))) {
    actions.push({ kind: "search", rank });
  }
  hand.forEach((_, from) => {
    if (isCardInSequence(hand, from)) return;
    hand.forEach((__, to) => {
      if (to !== from) actions.push({ kind: "escape", from, to });
    });
  });
  return actions;
}

/** How good a position looks: a long line to hide behind, a thin deck. */
function stalkerWorth(state: StalkerGameState) {
  if (state.ended) return state.won ? 10000 : -10000;
  const runReady = state.hand.some(
    (_, from) =>
      !isCardInSequence(state.hand, from) &&
      state.hand.some(
        (__, to) => to !== from && escapeDrawCount(state.hand, from, to) > 0,
      ),
  );
  return 10 * state.hand.length - 4 * state.deck.length + (runReady ? 8 : 0);
}

/**
 * The action that does best over the draws the deck could give: escapes
 * that build a run gain a card, searches thin the deck, and a trap wins.
 */
function bestStalkerAction(state: StalkerGameState) {
  const random = seededRandom(
    state.hand.map((card) => card.id).join(",") + state.deck.length,
  );
  const draws = Array.from({ length: 8 }, () =>
    shuffledWith(state.deck, random),
  );
  let best: StalkerAction | null = null;
  let bestWorth = -Infinity;
  for (const action of stalkerActions(state.hand)) {
    let worth = 0;
    for (const deck of draws) {
      const trial: StalkerGameState = {
        ...state,
        deck: [...deck],
        hand: [...state.hand],
        discard: [],
      };
      if (action.kind === "search") searchRank(trial, action.rank);
      else escapeCard(trial, action.from, action.to);
      worth += stalkerWorth(trial);
    }
    if (worth > bestWorth) {
      bestWorth = worth;
      best = action;
    }
  }
  return best;
}

/**
 * The hint, one press at a time: pick the card, then Search, or move it
 * with the arrows and Escape.
 */
function findStalkerHint(
  state: StalkerGameState,
  selectedCardId: string | null,
  mockHand: PlayingCard[] | null,
) {
  if (state.ended || state.hand.length === 0) return null;
  const action = bestStalkerAction(state);
  if (!action) return null;
  const buttonLabel = (text: string) => text.split("\n")[0];

  if (action.kind === "search") {
    if (mockHand) {
      return makeHint(
        { key: "press", values: { label: i18n.t("cards:cancel") } },
        zoneTarget("escapeAction"),
      );
    }
    const cards = state.hand.filter((card) => card.rank === action.rank);
    const selected = cards.some((card) => card.id === selectedCardId);
    return makeHint(
      {
        key: "removeCards",
        values: {
          label: buttonLabel(
            i18n.t("games:stalker.searchDraw", {
              pendingSearchDrawCount: cards.length,
            }),
          ),
        },
      },
      selected ? [] : cards.map(cardTarget),
      zoneTarget("searchAction"),
    );
  }

  const card = state.hand[action.from];
  if (mockHand && selectedCardId !== card.id) {
    return makeHint(
      { key: "press", values: { label: i18n.t("cards:cancel") } },
      zoneTarget("escapeAction"),
    );
  }
  const at = (mockHand ?? state.hand).findIndex(
    (entry) => entry.id === card.id,
  );
  const label =
    at === action.to
      ? buttonLabel(
          i18n.t("games:stalker.escapeDraw", {
            pendingEscapeDrawCount: escapeDrawCount(
              state.hand,
              action.from,
              action.to,
            ),
          }),
        )
      : at < action.to
        ? ARROW_LABELS.forward
        : ARROW_LABELS.back;
  return makeHint(
    { key: "press", values: { label } },
    selectedCardId === card.id ? [] : cardTarget(card),
    zoneTarget("escapeAction"),
  );
}

export const stalkerRules = {
  createDeck: createHorrorDeck,
  sequenceLengthFrom,
  isCardInSequence,
  hasFourOfAKind,
  evaluateEnd,
  pursue,
  moveCard,
  escapeDrawCount,
  searchDrawCount,
  searchRank,
  escapeCard,
  findHint: findStalkerHint,
};

export default function Stalker() {
  const { spacing } = useResponsiveMetrics();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [mockHand, setMockHand] = useState<PlayingCard[] | null>(null);

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
      setSelectedCardId(null);
      setMockHand(null);
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

  useHint(() => findStalkerHint(game, selectedCardId, mockHand), {
    game: mockHand ?? game,
    enabled: !isSettingUp && !game.ended,
  });

  function takeSearch() {
    const selectedCard = game.hand.find((card) => card.id === selectedCardId);
    if (!selectedCard || game.ended || mockHand) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      searchRank(draft, selectedCard.rank as HorrorRank);
    });
    setSelectedCardId(null);
  }

  function selectCard(index: number) {
    if (game.ended || mockHand) return;
    const cardId = game.hand[index].id;
    setSelectedCardId((currentCardId) =>
      currentCardId === cardId ? null : cardId,
    );
  }

  function moveSelectedCard(direction: -1 | 1) {
    if (!selectedCardId || game.ended) return;
    const hand = mockHand ?? game.hand;
    const cardIndex = hand.findIndex((card) => card.id === selectedCardId);
    const destinationIndex = cardIndex + direction;
    if (
      cardIndex < 0 ||
      destinationIndex < 0 ||
      destinationIndex >= hand.length
    ) {
      return;
    }
    setMockHand(moveCard(hand, cardIndex, destinationIndex));
  }

  function cancelEscape() {
    setMockHand(null);
  }

  function takeEscape() {
    if (!selectedCardId || !mockHand || game.ended) return;
    const cardIndex = game.hand.findIndex((card) => card.id === selectedCardId);
    const destinationIndex = mockHand.findIndex(
      (card) => card.id === selectedCardId,
    );
    if (cardIndex < 0 || destinationIndex < 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      escapeCard(draft, cardIndex, destinationIndex);
    });
    setSelectedCardId(null);
    setMockHand(null);
  }

  const displayedHand = mockHand ?? game.hand;
  const selectedCardIndex = selectedCardId
    ? displayedHand.findIndex((card) => card.id === selectedCardId)
    : -1;
  const selectedCard = selectedCardId
    ? game.hand.find((card) => card.id === selectedCardId)
    : undefined;
  const selectedCardGameIndex = selectedCard
    ? game.hand.findIndex((card) => card.id === selectedCard.id)
    : -1;
  const selectedCardCanEscape =
    selectedCardGameIndex >= 0 &&
    !isCardInSequence(game.hand, selectedCardGameIndex);
  const pendingEscapeDrawCount =
    mockHand && selectedCardGameIndex >= 0 && selectedCardIndex >= 0
      ? escapeDrawCount(game.hand, selectedCardGameIndex, selectedCardIndex)
      : 0;
  const isSearchDisabled = !selectedCard || game.ended || mockHand !== null;
  const pendingSearchDrawCount =
    !isSearchDisabled && selectedCard
      ? searchDrawCount(game.hand, selectedCard.rank as HorrorRank)
      : 0;

  const zones: MapZone[] = useMemo(() => {
    return [
      { id: "route", col: 0, row: 0, width: 7, height: 0.5 },
      {
        id: "discard",
        col: 0,
        row: 1,
        cards: game.discard,
        baseZIndex: 10,
        fan: {
          maxVisible: 3,
          shadowVisibleCount: 6,
          direction: "right",
          offset: 0.1,
        },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "above" },
      },
      {
        id: "deck",
        col: 6,
        row: 1,
        cards: game.deck,
        baseZIndex: 10,
        fan: {
          maxVisible: 3,
          shadowVisibleCount: 6,
          direction: "left",
          offset: 0.1,
        },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "above" },
      },
      {
        id: "hand",
        name: "hand",
        cards: displayedHand,
        col: 0.5,
        row: 1,
        width: 6,
        baseZIndex: 50,
        fan: {
          direction: "right",
          offset: zoneFanOffset(displayedHand.length, 6, 0.1, 0.9),
        },
      },
      {
        id: "searchAction",
        col: 0,
        row: 2.5,
        width: 2,
        height: 2,
      },
      {
        id: "escapeAction",
        col: 2.5,
        row: 2.5,
        width: 4.5,
        height: 2,
        baseZIndex: 50,
      },
    ];
  }, [displayedHand, game.deck, game.discard]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName !== "hand" || mappedCard.cardIndex === undefined) {
      return undefined;
    }

    const gameHandIndex = game.hand.findIndex(
      (card) => card.id === mappedCard.card.id,
    );
    const selected = selectedCardId === mappedCard.card.id;
    const related =
      !selected &&
      selectedCard !== undefined &&
      selectedCard.rank === mappedCard.card.rank;
    const isMockingEscape = mockHand !== null;

    return {
      isDisabled: game.ended || mockHand !== null,
      isSelected: selected,
      selectColor: isMockingEscape
        ? selected
          ? "green"
          : "grey"
        : related || selected
          ? "purple"
          : "none",
      forceSelectColor: !isMockingEscape && selected,
      forceOverlayColor: isMockingEscape || selected || related,
      onPress: () => {
        selectCard(gameHandIndex);
      },
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      score={game.deck.length}
      winLoseMessage={
        game.won
          ? game.deck.length === 0
            ? i18n.t("games:stalker.youMadeItToDawn")
            : i18n.t("games:stalker.theTrapSnapsShut")
          : i18n.t("games:stalker.heCaughtYou")
      }
    >
      {cardMap}

      {(displayedHand.length > 0 || game.discard.length > 0) && (
        <View
          style={[
            flexStyles.rowCentered,
            getZoneStylesById("route"),
            { gap: spacing(4) },
          ]}
        >
          <RouteDots
            discardCount={game.discard.length}
            handCount={displayedHand.length}
            dotSpacing={spacing}
          />
        </View>
      )}

      <View style={[flexStyles.colCentered, getZoneStylesById("searchAction")]}>
        <Button
          size="sm"
          text={i18n.t("games:stalker.searchDraw", { pendingSearchDrawCount })}
          theme="purple"
          disabled={isSearchDisabled}
          onPress={takeSearch}
          taller
          fullWidth
          lineHeight={1.1}
        />
      </View>

      <View
        style={[
          flexStyles.colCentered,
          getZoneStylesById("escapeAction"),
          { gap: spacing(12) },
        ]}
      >
        <View
          style={[flexStyles.rowCentered, { width: "100%", gap: spacing(12) }]}
        >
          <Button
            size="sm"
            iconName="arrow-back"
            accessibilityLabel={ARROW_LABELS.back}
            theme="green"
            onPress={() => moveSelectedCard(-1)}
            style={{ flex: 1 }}
            disabled={
              !selectedCardCanEscape || selectedCardIndex <= 0 || game.ended
            }
            taller
          />
          <Button
            size="sm"
            iconName="arrow-forward"
            accessibilityLabel={ARROW_LABELS.forward}
            theme="green"
            onPress={() => moveSelectedCard(1)}
            style={{ flex: 1 }}
            disabled={
              selectedCardIndex < 0 ||
              selectedCardIndex >= displayedHand.length - 1 ||
              !selectedCardCanEscape ||
              game.ended
            }
            taller
          />
        </View>

        <View
          style={[flexStyles.rowCentered, { width: "100%", gap: spacing(12) }]}
        >
          <Button
            size="sm"
            text={i18n.t("cards:cancel")}
            theme="orange"
            onPress={cancelEscape}
            disabled={mockHand === null || game.ended}
            taller
          />
          <Button
            size="sm"
            text={i18n.t("games:stalker.escapeDraw", {
              pendingEscapeDrawCount,
            })}
            theme="green"
            onPress={takeEscape}
            disabled={mockHand === null || game.ended}
            fullWidth
            style={{ flex: 1 }}
            lineHeight={1.1}
            taller
          />
        </View>
      </View>
    </GameWrapper>
  );
}
