import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
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
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

type GamePhase = "action" | "retire" | "assassinate";
type AceSource = "hand" | "drawDeck" | "drawDiscard";

export type DeckOfSpiesGameState = {
  spyDeck: PlayingCard[];
  spyDiscard: PlayingCard[];
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
        ...draft.drawDeck,
        ...draft.drawDiscard,
        ...draft.hand,
      ].map(flipToBack),
    );
    draft.spyDeck = [];
    draft.spyDiscard = [];
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
  const { colorZone } = useGameColors();
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

  function toggleCard(card: PlayingCard) {
    if (game.ended || game.phase === "assassinate") return;

    setGame((draft) => {
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

  function retire() {
    if (game.phase !== "retire" || !retireValid) return;

    setGame((draft) => {
      draft.hand = removeSelected(draft.hand, draft.selectedCards);
      draft.spyDiscard.push(...draft.selectedCards.map(flipToBack));
      finishTurn(draft);
    });
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
      if (aceIndex >= 0) cards.splice(aceIndex, 1);
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
        id: "spyDeck",
        name: "spyDeck",
        col: 0.5,
        row: 0,
        cards: game.spyDeck,
        fan: { maxVisible: 1 },
        placeholder: { text: "Spies", infoPos: "right", showCount: true },
        baseZIndex: 20,
      },
      {
        id: "spyDiscard",
        col: 2.5,
        row: 0,
        cards: game.spyDiscard,
        fan: { maxVisible: 1 },
        placeholder: {
          text: "Discard",
          infoPos: "left",
          showCount: true,
        },
        baseZIndex: 20,
      },
      {
        id: "drawDeck",
        col: 0.5,
        row: 1,
        cards: game.drawDeck,
        fan: { maxVisible: 1 },
        placeholder: { text: "Draw", infoPos: "right", showCount: true },
        baseZIndex: 20,
      },
      {
        id: "drawDiscard",
        col: 2.5,
        row: 1,
        cards: game.drawDiscard,
        fan: { maxVisible: 1 },
        placeholder: {
          text: "Discard",
          infoPos: "left",

          showCount: true,
        },
        baseZIndex: 20,
      },
      {
        id: "hand",
        name: "hand",
        col: 0,
        row: 2.25,
        width: 4,
        cards: game.hand,
        fan: { direction: "right", offset: 0.56, center: true },
        placeholder: { text: "Hand", infoPos: "above" },
        baseZIndex: 30,
      },
      {
        id: "actions",
        col: 0,
        row: 3.25,
        width: 4,
        // height: 1,
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

    return {
      isSelected: selected,
      yOffset: selected ? -0.16 : 0,
      selectColor: selected
        ? game.phase === "retire"
          ? retireValid
            ? "purple"
            : "orange"
          : counterValid || recruitValid
            ? "blue"
            : "orange"
        : "none",
      onPress: () => toggleCard(mappedCard.card),
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
  });

  const sourceNames: Record<AceSource, string> = {
    hand: "Hand A",
    drawDeck: "Deck A",
    drawDiscard: "Discard A",
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
          {
            position: "absolute",
            justifyContent: "space-evenly",
            paddingHorizontal: spacing(8),
            backgroundColor: colorZone,
            borderRadius: spacing(8),
          },
        ]}
      >
        <Text size="sm" color={Colors.white}>
          {game.phase === "retire"
            ? "Retire a matching set, or finish"
            : game.phase === "assassinate"
              ? "Remove a Double Agent"
              : spy
                ? `${spy.rank} target · selected ${selectionTotal}`
                : "No spies remain"}
        </Text>
        <View
          style={[
            flexStyles.rowCentered,
            { width: "100%", gap: spacing(6), flexWrap: "wrap" },
          ]}
        >
          {game.phase === "action" && (
            <>
              <Button
                text="Counter"
                size="sm"
                theme="blue"
                disabled={!counterValid}
                onPress={() => resolvePrimary("counter")}
              />
              <Button
                text="Recruit"
                size="sm"
                theme="green"
                disabled={!recruitValid}
                onPress={() => resolvePrimary("recruit")}
              />
              <Button
                text="Assassinate"
                size="sm"
                theme="red"
                onPress={beginAssassination}
              />
            </>
          )}
          {game.phase === "retire" && (
            <>
              <Button
                text="Retire"
                size="sm"
                theme="purple"
                disabled={!retireValid}
                onPress={retire}
              />
              <Button
                text="Finish"
                size="sm"
                theme="blue"
                onPress={finishWithoutRetiring}
              />
            </>
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
              />
            ))}
        </View>
      </View>
    </GameWrapper>
  );
}
