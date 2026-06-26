import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { buttonStyles } from "@/styles/buttonStyles";
import { flexStyles, transitionStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, ArcConfig } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { CardColor } from "../Cards/CardStyles";
import { GameWrapper } from "../common/GameWrapper";

type BobaState = {
  deck: PlayingCard[];
  queues: PlayingCard[][];
  discard: PlayingCard[];
  discardsByRank: Record<PlayingCard["rank"], number>;
  ended: boolean;
  won: boolean;
};

type SelectedPos = { queueIndex: number; cardIndex: number };

type GameSnapshot = {
  game: BobaState;
  selectedPos: SelectedPos;
  decisionNeeded: boolean;
};

function createDiscardCount(): Record<PlayingCard["rank"], number> {
  return {
    A: 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 0,
    J: 0,
    Q: 0,
    K: 0,
    Joker: 0,
  };
}

function setup(): BobaState {
  const deck = shuffle(createDeck());

  return {
    queues: [
      [flipToFace(deck[0])],
      [flipToFace(deck[1])],
      [flipToFace(deck[2])],
      [flipToFace(deck[3])],
    ],
    deck: deck.slice(4),
    discard: [],
    discardsByRank: createDiscardCount(),
    ended: false,
    won: false,
  };
}

function totalInQueues(queues: PlayingCard[][]) {
  return queues.reduce((sum, q) => sum + q.length, 0);
}

function checkNextCustomerFits(
  selectedPos: SelectedPos,
  nextCustomer: PlayingCard,
  nextCustomerQueue: PlayingCard[],
) {
  const customerBeforeNext: PlayingCard | undefined =
    nextCustomerQueue[selectedPos.cardIndex - 1];
  const customerAfterNext: PlayingCard | undefined =
    nextCustomerQueue[selectedPos.cardIndex];

  return (
    (customerBeforeNext === undefined ||
      rankValue(customerBeforeNext) >= rankValue(nextCustomer)) &&
    (customerAfterNext === undefined ||
      rankValue(customerAfterNext) <= rankValue(nextCustomer))
  );
}

function updatedDiscardsByRank(
  discardsByRank: Record<PlayingCard["rank"], number>,
  cards: PlayingCard[],
) {
  cards.forEach((c) => {
    discardsByRank[c.rank]++;
  });
  return discardsByRank;
}

export default function TheBobaTeaShop() {
  const [game, setGame] = useState<BobaState>(setup);
  const [selectedPos, setSelectedPos] = useState<SelectedPos | undefined>(
    undefined,
  );
  const [decisionNeeded, setDecisionNeeded] = useState(false);
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const score = useMemo(() => totalInQueues(game.queues), [game.queues]);

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
      setDecisionNeeded(previousState.decisionNeeded);
      setSelectedPos(previousState.selectedPos);
    }
  };

  const nextCustomerRevealed = useMemo(
    () => top(game.deck)?.faceUp,
    [game.deck],
  );

  function reset() {
    clearHistory();
    setSelectedPos(undefined);
    setDecisionNeeded(false);
    setGame(setup());
  }

  // ===== Reveal Next Customer ===== //
  async function revealNextCustomer(gameState: BobaState) {
    if (!gameState.deck.length || selectedPos?.queueIndex === undefined) return;

    saveUndoState(
      structuredClone({ game: gameState, selectedPos, decisionNeeded }),
    );

    let nextGameState = produce(gameState, (draft) => {
      const topCardIndex = draft.deck.length - 1;
      draft.deck[topCardIndex] = flipToFace(draft.deck[topCardIndex]);
    });

    // Flip card over
    const topCard = flipToFace(
      nextGameState.deck[nextGameState.deck.length - 1],
    );

    // Check if card fits in queue
    const targetQueue = nextGameState.queues[selectedPos.queueIndex];
    const nextCustomerFits = checkNextCustomerFits(
      selectedPos,
      topCard,
      targetQueue,
    );

    // If card fits, add it to queue - logic
    nextGameState = produce(nextGameState, (draft) => {
      if (nextCustomerFits) {
        const customer = draft.deck.pop();

        if (customer) {
          const queue = draft.queues[selectedPos.queueIndex];

          if (selectedPos.cardIndex === 0) {
            queue.unshift(customer);
          } else {
            queue.splice(selectedPos.cardIndex, 0, customer);
          }
        }
      }
    });

    if (nextCustomerFits) {
      setSelectedPos(undefined);
      decisionNeeded && setDecisionNeeded(false);
      setGame(nextGameState);
    } else {
      setGame(nextGameState);
      setDecisionNeeded(true);
    }
  }

  // ===== Let Customer Stay ===== //
  async function placeCustomer(gameState: BobaState) {
    const topCard = top(gameState.deck);
    if (!topCard || selectedPos?.queueIndex === undefined) return;

    saveUndoState(
      structuredClone({ game: gameState, selectedPos, decisionNeeded }),
    );

    const queueToDiscard = gameState.queues[selectedPos.queueIndex];

    let nextGameState = produce(gameState, (draft) => {
      draft.deck.pop();
      draft.queues[selectedPos.queueIndex] = [topCard];
      draft.discard.push(...flipAllToBack(queueToDiscard));
      draft.discardsByRank = updatedDiscardsByRank(
        draft.discardsByRank,
        queueToDiscard,
      );
    });

    setDecisionNeeded(false);
    setGame(nextGameState);
  }

  // ===== Quick Customer Out ===== //
  async function kickOutCustomer(gameState: BobaState) {
    const topCard = top(gameState.deck);
    if (!topCard || selectedPos?.queueIndex === undefined) return;

    saveUndoState(
      structuredClone({ game: gameState, selectedPos, decisionNeeded }),
    );

    for (let i = 0; i < 2; i++) {
      // Discard top of deck
      setGame((prev) => {
        return produce(prev, (draft) => {
          if (draft.deck.length > 0) {
            const cardToDiscard = draft.deck.pop()!;
            draft.discard.push(flipToBack(cardToDiscard));
            draft.discardsByRank = updatedDiscardsByRank(draft.discardsByRank, [
              cardToDiscard,
            ]);
          }
        });
      });

      await delay(200);

      // Flip next card over
      setGame((prev) => {
        return produce(prev, (draft) => {
          if (draft.deck.length > 0 && i === 0) {
            draft.deck[draft.deck.length - 1] = flipToFace(
              draft.deck[draft.deck.length - 1],
            );
          }
        });
      });

      await delay(400);
    }
  }

  // ========== Card Mapping ========== //
  const positioning = {
    queueCardOffset: 0.47,
    btnColWidth: 0.8,
    queueHeight: 3.5,
    queueRowStart: 3,
    queueZIndexIncrement: 20,
  };

  const zones: MapZone[] = useMemo(() => {
    let queueZones: MapZone[] = [];

    for (let i = 0; i < 4; i++) {
      queueZones.push({
        id: `queue-${i}`,
        cards: game.queues[i],
        col: i * (positioning.btnColWidth + 1),
        row: positioning.queueRowStart,
        height: positioning.queueHeight,
        pileIndex: i,
        refIndex: i,
        name: "queue",

        baseZIndex: i + positioning.queueZIndexIncrement,
        fan: { direction: "down", offset: positioning.queueCardOffset },
      });
      queueZones.push({
        id: `btns-${i}`,

        col: i * (positioning.btnColWidth + 1) + 1,
        row: positioning.queueRowStart,
        width: positioning.btnColWidth,
        height: positioning.queueHeight,
      });
    }

    if (selectedPos) {
      queueZones.push({
        id: "selected-placeholder",
        name: "selected-placeholder",

        cards: [
          {
            rank: "Joker",
            faceUp: false,
            suit: "hearts",
            id: "placeholder-joker",
          },
        ],
        col: selectedPos.queueIndex * (positioning.btnColWidth + 1),
        row: positioning.queueRowStart,
        baseZIndex:
          selectedPos.queueIndex +
          positioning.queueZIndexIncrement +
          selectedPos.cardIndex -
          1,
      });
    }

    return [
      {
        id: "rankTally",

        col: 0,
        row: 0,
        width: "full",
      },
      {
        id: "deck",
        name: "deck",

        cards: game.deck,
        col: 2,
        row: 1.5,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "left" },
      },
      {
        id: "discard",
        name: "discard",

        cards: game.discard,
        col: 4,
        row: 1.5,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Discard", infoPos: "right" },
      },
      ...queueZones,
      {
        id: "actionBtns",

        col: 0,
        row: 6.5,
        width: "full",
        height: 0.75,
      },
    ];
  }, [game, selectedPos]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    let selectColor: CardColor = "none";
    let isSelected = undefined;
    let yOffset: number | undefined = undefined;
    let forceOverlayColor = false;
    let forceSelectColor = false;
    let arcConfig: ArcConfig | undefined = { enabled: false };

    // Placeholder card
    if (selectedPos && mappedCard.zoneName === "selected-placeholder") {
      selectColor = decisionNeeded ? "red" : "purple";
      forceOverlayColor = true;
      forceSelectColor = true;

      arcConfig = {
        enabled: true,
        magnitudeY: 0.25,
      };

      yOffset = selectedPos.cardIndex * positioning.queueCardOffset;
    } else if (
      selectedPos !== undefined &&
      mappedCard.pileIndex === selectedPos.queueIndex &&
      mappedCard.cardIndex !== undefined &&
      mappedCard.cardIndex >= selectedPos.cardIndex
    ) {
      // Shift card down if under the placeholder
      yOffset = positioning.queueCardOffset;
    }

    return {
      isSelected,
      forceSelectColor,
      forceOverlayColor,
      arcConfig,
      selectColor,
      yOffset,
    };
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0,
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
          ? `You won. Score is cards still in queues: ${score}`
          : "You lost: discarded the fourth card of a rank."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      {cardMap}

      {/* Rank Tallies */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
          getZoneStylesById("rankTally"),
        ]}
      >
        {(Object.keys(game.discardsByRank) as Array<PlayingCard["rank"]>)
          .filter((r) => r !== "Joker")
          .map((rank) => {
            const discardCount = game.discardsByRank[rank];

            return (
              <View
                key={rank}
                style={[
                  flexStyles.colCentered,
                  flexStyles.gap6,
                  flexStyles.flex1,
                ]}
              >
                <View
                  key={rank}
                  style={[
                    flexStyles.colCentered,
                    flexStyles.gap6,
                    { flexDirection: "column-reverse" },
                  ]}
                >
                  {Array.from({ length: 3 }, (_, i) => {
                    let bgColor: string = Colors.K900;

                    if (i < discardCount) {
                      if (i === 0) bgColor = Colors.cardSelectGreen;
                      if (i === 1) bgColor = Colors.cardSelectYellow;
                      if (i === 2) bgColor = Colors.cardSelectRed;
                    }

                    return (
                      <View
                        key={`discard-by-rank-${rank}-${i}`}
                        style={[
                          transitionStyles.sec05,
                          {
                            display: "flex",
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: bgColor,
                            boxShadow: `0 0 3px ${bgColor}`,
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                <Text
                  style={[
                    textStyles.default,
                    { fontSize: cardWidth * 0.3, fontFamily: FontWeight[500] },
                  ]}
                >
                  {rank}
                </Text>
              </View>
            );
          })}
      </View>

      {/* Select position buttons */}
      {game.queues.map((queue, queueIndex) => (
        <View
          key={`queue-${queueIndex}`}
          style={[
            flexStyles.colStart,
            flexStyles.gap14,
            flexStyles.flex1,
            getZoneStylesById(`btns-${queueIndex}`),
          ]}
        >
          {Array.from({ length: queue.length + 1 }, (_, i) => {
            const isSelected =
              selectedPos?.queueIndex === queueIndex &&
              selectedPos.cardIndex === i;

            let backgroundColor: string = "";
            let textColor: string = "";

            if (isSelected) {
              textColor = Colors.white;
              backgroundColor = decisionNeeded
                ? Colors.cardSelectRed
                : Colors.cardSelectPurple;
            } else {
              textColor = decisionNeeded ? Colors.K600 : Colors.K100;
              backgroundColor = decisionNeeded ? Colors.K800 : Colors.K700;
            }

            return (
              <Pressable
                key={`select-pos-${queueIndex}-${i}`}
                onPress={() => {
                  if (isSelected) {
                    setSelectedPos(undefined);
                  } else {
                    setSelectedPos({ queueIndex, cardIndex: i });
                  }
                }}
                disabled={decisionNeeded}
                style={[
                  flexStyles.colCentered,
                  transitionStyles.sec02,
                  {
                    alignItems: "flex-end",
                    position: "absolute",
                    padding: 10,
                    left: 0,
                    width:
                      cardWidth * 0.4 +
                      (isSelected ? cardWidth * 0.22 : cardWidth * 0.1),
                    top:
                      cardHeight * i * positioning.queueCardOffset +
                      cardHeight / 10,
                    height: cardWidth * 0.5,
                    borderTopRightRadius: cardWidth * 0.25,
                    borderBottomRightRadius: cardWidth * 0.25,
                    backgroundColor: backgroundColor,
                    zIndex: i * 2 - 2,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.default,
                    {
                      fontSize: cardWidth * 0.21,
                      fontFamily: FontWeight[500],
                      color: textColor,
                    },
                  ]}
                >
                  {i + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Action Buttons */}
      <View
        style={[
          getZoneStylesById("actionBtns"),
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
          {
            zIndex: 100,
            gap: cardWidth * 0.25,
          },
        ]}
      >
        {!nextCustomerRevealed && !selectedPos && (
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              buttonStyles.sizeMedium,
            ]}
          >
            <Text
              style={[
                textStyles.default,
                {
                  fontSize: cardWidth * 0.32,
                  textAlign: "center",
                  color: Colors.K500,
                },
              ]}
            >
              Select queue position for next customer
            </Text>
          </View>
        )}

        {!nextCustomerRevealed && selectedPos && (
          <Button
            text="Reveal next customer"
            onPress={() => {
              revealNextCustomer(game);
            }}
            disabled={selectedPos === undefined}
            style={[flexStyles.flex1, { height: "100%" }]}
            theme="purple"
            cardWidth={cardWidth}
          />
        )}

        {nextCustomerRevealed && decisionNeeded && (
          <>
            <Button
              text="Let them stay"
              onPress={() => {
                if (selectedPos?.queueIndex !== undefined) {
                  setSelectedPos(undefined);
                  placeCustomer(game);
                }
              }}
              disabled={selectedPos === undefined}
              style={[flexStyles.flex1, { height: "100%" }]}
              cardWidth={cardWidth}
            />
            <Button
              text="Kick them out"
              onPress={() => {
                if (selectedPos?.queueIndex !== undefined) {
                  kickOutCustomer(game);
                }
              }}
              disabled={selectedPos === undefined}
              style={[flexStyles.flex1, { height: "100%" }]}
              cardWidth={cardWidth}
            />
          </>
        )}
      </View>
    </GameWrapper>
  );
}
