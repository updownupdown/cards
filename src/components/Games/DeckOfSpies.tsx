import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  isFace,
  rankValue,
  shuffle,
  sortCardsBySuit,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

type GamePhase = "action" | "retire" | "assassinate";
type AceSource = "hand" | "drawDeck" | "drawDiscard";

export type DeckOfSpiesGameState = {
  spyDeck: PlayingCard[];
  spyDiscard: PlayingCard[];
  removedDeck: PlayingCard[];
  drawDeck: PlayingCard[];
  drawDiscard: PlayingCard[];
  hand: PlayingCard[];
  selectedCards: PlayingCard[];
  phase: GamePhase;
  ended: boolean;
  won: boolean;
  winLoseMessage: string | null;
};

const gameStateInitial: DeckOfSpiesGameState = {
  spyDeck: [],
  spyDiscard: [],
  removedDeck: [],
  drawDeck: [],
  drawDiscard: createDeck().map(flipToBack),
  hand: [],
  selectedCards: [],
  phase: "action",
  ended: false,
  won: false,
  winLoseMessage: null,
};

function cardValue(card: PlayingCard) {
  return rankValue(card);
}

function selectedValue(cards: PlayingCard[]) {
  return cards.reduce((total, card) => total + cardValue(card), 0);
}

function isMinimalCounter(cards: PlayingCard[], spy: PlayingCard) {
  if (cards.length === 0 || selectedValue(cards) < cardValue(spy)) return false;

  return cards.every(
    (card) => selectedValue(cards) - cardValue(card) < cardValue(spy),
  );
}

function canRecruit(cards: PlayingCard[], spy: PlayingCard) {
  if (cards.length === 0 || selectedValue(cards) < cardValue(spy)) return false;

  const hasMatchingDoubleAgent = cards.some(
    (card) => card.rank === "A" && card.suit === spy.suit,
  );

  return (
    hasMatchingDoubleAgent || cards.every((card) => card.suit === spy.suit)
  );
}

function canRetire(cards: PlayingCard[]) {
  return (
    cards.length >= 2 &&
    cards.length <= 4 &&
    cards.every((card) => card.rank === cards[0].rank)
  );
}

function hasRetireSet(hand: PlayingCard[]) {
  return hand.some(
    (card) =>
      hand.filter((handCard) => handCard.rank === card.rank).length >= 2,
  );
}

function toggleRetireSetSelection(
  hand: PlayingCard[],
  selectedCards: PlayingCard[],
  card: PlayingCard,
) {
  const matchingCards = hand.filter((handCard) => handCard.rank === card.rank);

  if (matchingCards.length < 2) return selectedCards;

  const selectedIds = new Set(
    selectedCards.map((selectedCard) => selectedCard.id),
  );
  if (selectedIds.has(card.id)) {
    return selectedCards.filter(
      (selectedCard) => selectedCard.rank !== card.rank,
    );
  }

  return matchingCards;
}

function drawToFive(
  drawDeck: PlayingCard[],
  drawDiscard: PlayingCard[],
  hand: PlayingCard[],
  shuffleCards: <T>(cards: T[]) => T[] = shuffle,
) {
  let nextDrawDeck = [...drawDeck];
  let nextDrawDiscard = [...drawDiscard];
  const nextHand = [...hand];

  while (nextHand.length < 5) {
    if (nextDrawDeck.length === 0) {
      if (nextDrawDiscard.length === 0) break;
      nextDrawDeck = shuffleCards(nextDrawDiscard.map(flipToBack));
      nextDrawDiscard = [];
    }

    const drawnCard = nextDrawDeck.pop();
    if (drawnCard) nextHand.push(flipToFace(drawnCard));
  }

  return {
    drawDeck: nextDrawDeck,
    drawDiscard: nextDrawDiscard,
    hand: sortCardsBySuit(nextHand),
  };
}

function createGame(
  cards: PlayingCard[] = createDeck(),
  shuffleCards: <T>(cards: T[]) => T[] = shuffle,
): DeckOfSpiesGameState {
  const pileOne = shuffleCards(
    cards.filter((card) => ["A", "2", "3", "4"].includes(card.rank)),
  ).map(flipToBack);
  const pileTwo = shuffleCards(
    cards.filter((card) => ["5", "6", "7"].includes(card.rank)),
  );
  const pileThree = shuffleCards(
    cards.filter((card) => ["8", "9", "10"].includes(card.rank)),
  );
  const pileFour = shuffleCards(
    cards.filter((card) => ["J", "Q", "K"].includes(card.rank)),
  );
  const dealt = drawToFive(pileOne, [], [], shuffleCards);

  return {
    spyDeck: [...pileFour, ...pileThree, ...pileTwo].map(flipToFace),
    spyDiscard: [],
    removedDeck: [],
    ...dealt,
    selectedCards: [],
    phase: "action",
    ended: false,
    won: false,
    winLoseMessage: null,
  };
}

function keySpyCount(cards: PlayingCard[]) {
  return cards.filter(isFace).length;
}

function scoreGame(state: DeckOfSpiesGameState) {
  const personalCount = keySpyCount([
    ...state.hand,
    ...state.drawDeck,
    ...state.drawDiscard,
  ]);
  const discardedCount = keySpyCount(state.spyDiscard);

  return {
    personalCount,
    discardedCount,
    won: personalCount > discardedCount,
  };
}

export const deckOfSpiesRules = {
  cardValue,
  selectedValue,
  isMinimalCounter,
  canRecruit,
  canRetire,
  hasRetireSet,
  toggleRetireSetSelection,
  drawToFive,
  createGame,
  keySpyCount,
  scoreGame,
};

async function setupGame(
  setGame: (
    updater: (draft: DeckOfSpiesGameState) => DeckOfSpiesGameState | void,
  ) => void,
) {
  setGame((draft) => {
    draft.drawDiscard = shuffle(
      [
        ...draft.spyDeck,
        ...draft.spyDiscard,
        ...draft.removedDeck,
        ...draft.drawDeck,
        ...draft.drawDiscard,
        ...draft.hand,
      ].map(flipToBack),
    );
    draft.spyDeck = [];
    draft.spyDiscard = [];
    draft.removedDeck = [];
    draft.drawDeck = [];
    draft.hand = [];
    draft.selectedCards = [];
    draft.phase = "action";
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = null;
  });

  await delay();

  setGame((draft) => createGame(draft.drawDiscard));
}

function removeSelected(hand: PlayingCard[], selectedCards: PlayingCard[]) {
  const selectedIds = new Set(selectedCards.map((card) => card.id));
  return hand.filter((card) => !selectedIds.has(card.id));
}

export default function DeckOfSpies() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const { game, setGame, reset, isLoaded, canUndo, undo, saveUndoState } =
    useStateManager<DeckOfSpiesGameState>({
      gameStateInitial,
      resetAndSetup: async (): Promise<void> => setupGame(setGame),
      resetNonGameStates: () => {
        setGame((draft) => {
          draft.selectedCards = [];
        });
      },
    });

  const spy = game.spyDeck.at(-1);
  const selectionTotal = selectedValue(game.selectedCards);
  const counterValid = spy ? isMinimalCounter(game.selectedCards, spy) : false;
  const recruitValid = spy ? canRecruit(game.selectedCards, spy) : false;
  const retireValid = canRetire(game.selectedCards);
  const retireSetAvailable = hasRetireSet(game.hand);

  function toggleCard(card: PlayingCard) {
    if (game.ended || game.phase === "assassinate") return;

    setGame((draft) => {
      if (draft.phase === "retire") {
        const selectedCards = toggleRetireSetSelection(
          draft.hand,
          draft.selectedCards,
          card,
        );
        if (canRetire(selectedCards)) {
          draft.hand = removeSelected(draft.hand, selectedCards);
          draft.removedDeck.push(...selectedCards.map(flipToBack));
          finishTurn(draft);
          return;
        }

        draft.selectedCards = selectedCards;
        return;
      }

      const selected = draft.selectedCards.some(
        (selectedCard) => selectedCard.id === card.id,
      );
      draft.selectedCards = selected
        ? draft.selectedCards.filter(
            (selectedCard) => selectedCard.id !== card.id,
          )
        : [...draft.selectedCards, card];
    });
  }

  function clearSelection() {
    setGame((draft) => {
      draft.selectedCards = [];
    });
  }

  function finishTurn(draft: DeckOfSpiesGameState) {
    const refilled = drawToFive(draft.drawDeck, draft.drawDiscard, draft.hand);
    draft.drawDeck = refilled.drawDeck;
    draft.drawDiscard = refilled.drawDiscard;
    draft.hand = refilled.hand;
    draft.selectedCards = [];
    draft.phase = "action";

    if (draft.spyDeck.length === 0) {
      const result = scoreGame(draft);
      draft.ended = true;
      draft.won = result.won;
      draft.winLoseMessage = result.won
        ? `Mission complete: ${result.personalCount} Key Spies recruited.`
        : `Mission failed: ${result.personalCount} Key Spies recruited, ${result.discardedCount} lost.`;
    }
  }

  useEffect(() => {
    if (game.phase !== "retire" || retireSetAvailable) return;

    const timeout = setTimeout(() => {
      setGame((draft) => {
        if (draft.phase === "retire" && !hasRetireSet(draft.hand)) {
          finishTurn(draft);
        }
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [game.phase, retireSetAvailable, setGame]);

  function resolvePrimary(action: "counter" | "recruit") {
    if (!spy || (action === "counter" ? !counterValid : !recruitValid)) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const target = draft.spyDeck.pop();
      if (!target) return;

      draft.hand = removeSelected(draft.hand, draft.selectedCards);
      draft.drawDiscard.push(
        ...draft.selectedCards.map(flipToFace),
        ...(action === "recruit" ? [flipToFace(target)] : []),
      );
      if (action === "counter") draft.spyDiscard.push(flipToBack(target));
      draft.selectedCards = [];
      draft.phase = "retire";
    });
  }

  function finishWithoutRetiring() {
    if (game.phase !== "retire") return;
    setGame((draft) => finishTurn(draft));
  }

  function chooseAssassinationSource(source: AceSource) {
    const sourceCards = game[source];
    if (!sourceCards.some((card) => card.rank === "A")) return;

    saveUndoState({ ...structuredClone(game), phase: "action" });
    setGame((draft) => {
      const target = draft.spyDeck.pop();
      if (target) draft.spyDiscard.push(flipToBack(target));

      const cards = draft[source];
      const aceIndex = cards.findIndex((card) => card.rank === "A");
      if (aceIndex >= 0) {
        const [ace] = cards.splice(aceIndex, 1);
        if (ace) draft.removedDeck.push(flipToBack(ace));
      }
      if (source === "drawDeck") draft.drawDeck = shuffle(draft.drawDeck);

      draft.drawDiscard.push(...draft.hand.map(flipToFace));
      draft.hand = [];
      finishTurn(draft);
    });
  }

  const aceSources: AceSource[] = ["hand", "drawDeck", "drawDiscard"];
  const hasAnyAce = aceSources.some((source) =>
    game[source].some((card) => card.rank === "A"),
  );

  function beginAssassination() {
    if (!spy || game.phase !== "action") return;
    if (!hasAnyAce) {
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.selectedCards = [];
        draft.winLoseMessage = "No Double Agents remain. Mission failed.";
      });
      return;
    }

    setGame((draft) => {
      draft.phase = "assassinate";
      draft.selectedCards = [];
    });
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "spyDiscard",
        col: 0,
        row: 0,
        cards: game.spyDiscard,
        fan: { maxVisible: 3 },
        placeholder: {
          text: "Discard",
          infoPos: "right",
          showCount: true,
        },
        baseZIndex: 20,
      },
      {
        id: "spyDeck",
        name: "spyDeck",
        col: 0,
        row: 1,
        cards: game.spyDeck,
        fan: { maxVisible: 3 },
        placeholder: { text: "Spies", infoPos: "right", showCount: true },
        baseZIndex: 20,
      },

      {
        id: "removedDeck",
        col: 1.5,
        row: 0,
        cards: game.removedDeck,
        fan: { maxVisible: 3 },
        placeholder: {
          text: "Rem.",
          infoPos: "below",
          showCount: true,
        },
        baseZIndex: 20,
      },

      {
        id: "drawDiscard",
        col: 3,
        row: 0,
        cards: game.drawDiscard,
        fan: { maxVisible: 3 },
        placeholder: {
          text: "Discard",
          infoPos: "left",

          showCount: true,
        },
        baseZIndex: 20,
      },

      {
        id: "drawDeck",
        col: 3,
        row: 1,
        cards: game.drawDeck,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "left", showCount: true },
        baseZIndex: 20,
      },

      {
        id: "hand",
        name: "hand",
        col: 0,
        row: 2.2,
        width: 4,
        cards: game.hand,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.hand.length, 4.7, 0.1, 0.75),
          center: true,
        },
        baseZIndex: 30,
      },
      {
        id: "actions",
        col: 0,
        row: 3.3,
        width: 4,
        height: 1.04,
      },
    ],
    [game],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName !== "hand") return;
    const selected = game.selectedCards.some(
      (card) => card.id === mappedCard.card.id,
    );
    const isRetireSingleton =
      game.phase === "retire" &&
      game.hand.filter((card) => card.rank === mappedCard.card.rank).length ===
        1;

    return {
      isSelected: selected,
      selectColor: isRetireSingleton
        ? "grey"
        : selected
          ? game.phase === "retire"
            ? retireValid
              ? "purple"
              : "orange"
            : "blue"
          : "none",
      forceOverlayColor: isRetireSingleton,
      onPress: () => toggleCard(mappedCard.card),
    };
  };

  const { cardMap, cardHeight, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
    // visualizer: true,
  });

  const sourceNames: Record<AceSource, string> = {
    hand: "Hand",
    drawDeck: "Deck",
    drawDiscard: "Discard",
  };

  return (
    <GameWrapper
      reset={reset}
      isLoaded={isLoaded}
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      winLoseMessage={game.winLoseMessage ?? undefined}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.colCentered,
          flexStyles.spaceBetween,
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.spaceBetween,
            {
              gap: spacing(20),
            },
          ]}
        >
          {game.phase === "action" && spy ? (
            <ProgressBar
              progressValue={selectionTotal}
              totalValue={rankValue(spy)}
              color={
                selectionTotal > rankValue(spy)
                  ? "red"
                  : selectionTotal === rankValue(spy)
                    ? "green"
                    : "blue"
              }
              style={{ flex: 1, width: cardWidth * 2 }}
              scaledHeight={cardHeight * 0.33}
              autoTallyText
            />
          ) : (
            <Text
              size="md"
              weight={400}
              color={colorPale}
              style={{ flex: 1, textAlign: "center" }}
            >
              {game.phase === "retire"
                ? retireSetAvailable
                  ? "Retire a matching set, or skip"
                  : "No sets available for retirement"
                : game.phase === "assassinate"
                  ? "Remove a Double Agent from:"
                  : "No spies remain"}
            </Text>
          )}

          {game.phase === "action" && (
            <Button
              text="Clear"
              size="sm"
              theme="blue"
              onPress={clearSelection}
              disabled={game.selectedCards.length === 0}
            />
          )}
        </View>
        <View style={[flexStyles.rowCentered, flexStyles.fullWidth]}></View>

        <View
          style={[
            flexStyles.rowCentered,
            { width: "100%", gap: spacing(12), flexWrap: "wrap" },
          ]}
        >
          {game.phase === "action" && (
            <>
              <Button
                text="Assassinate"
                size="sm"
                theme="red"
                onPress={beginAssassination}
                style={{ flex: 1 }}
                taller
              />
              <Button
                text="Counter"
                size="sm"
                theme="orange"
                disabled={!counterValid}
                onPress={() => resolvePrimary("counter")}
                style={{ flex: 1 }}
                taller
              />
              <Button
                text="Recruit"
                size="sm"
                theme="green"
                disabled={!recruitValid}
                onPress={() => resolvePrimary("recruit")}
                taller
                style={{ flex: 1 }}
              />
            </>
          )}
          {game.phase === "retire" && (
            <Button
              text="Skip"
              size="sm"
              theme="green"
              onPress={finishWithoutRetiring}
              style={{ flex: 1 }}
              taller
            />
          )}
          {game.phase === "assassinate" &&
            aceSources.map((source) => (
              <Button
                key={source}
                text={sourceNames[source]}
                size="sm"
                theme="red"
                disabled={!game[source].some((card) => card.rank === "A")}
                onPress={() => chooseAssassinationSource(source)}
                taller
                style={{ flex: 1 }}
              />
            ))}
        </View>
      </View>
    </GameWrapper>
  );
}
