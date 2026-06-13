import { useGameLoading } from "@/hooks/useGameLoading";
import { useLayoutManager } from "@/hooks/useLayoutManager";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles, transitionStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  CardAnimationParams,
  defaultAnimDuration,
  useAnimations,
} from "../Animations/Animations";
import { Button } from "../Button/Button";
import { Card, CardGrid, useCardSizing } from "../Cards/Card";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { buttonStyles } from "@/styles/buttonStyles";
import { cardStyles } from "@/styles/cardStyles";
import { produce } from "immer";

const cardsPerRow = 6;
const cardSize = "small";

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
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const { cardWidth, cardHeight } = useCardSizing(cardsPerRow);

  const [game, setGame] = useState<BobaState>(setup);
  const [selectedPos, setSelectedPos] = useState<SelectedPos | undefined>(
    undefined,
  );
  const [decisionNeeded, setDecisionNeeded] = useState(false);

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

  const { getLayout, setRef } = useLayoutManager([
    "deck",
    "discard",
    "queueRoots",
    "queues",
    "selectedPos",
  ]);

  const {
    animateCards,
    clearAnimations,
    addToAnimQueue,
    animateQueue,
    isAnimating,
    animatingCardIds,
  } = useAnimations();

  const nextCustomerRevealed = useMemo(
    () => top(game.deck)?.faceUp,
    [game.deck],
  );

  function reset() {
    clearHistory();
    clearAnimations();
    setSelectedPos(undefined);
    setDecisionNeeded(false);
    setGame(setup());
  }

  // =========================================

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

    // Flip card over - animation
    const topCard = flipToFace(
      nextGameState.deck[nextGameState.deck.length - 1],
    );

    addToAnimQueue({
      card: topCard,
      from: getLayout("deck"),
      to: getLayout("deck"),
      flip: "toFace",
    });
    animateQueue();

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
      addToAnimQueue({
        card: topCard,
        from: getLayout("deck"),
        to: getLayout("selectedPos"),
      });
      animateQueue();

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

    const anims: CardAnimationParams[] = [];
    const discardPos = getLayout("discard");

    if (discardPos) {
      // Animate customers to discard
      queueToDiscard.forEach((card, index) => {
        const guessPos = getLayout("queues", selectedPos.queueIndex + index);

        if (guessPos) {
          anims.push({
            card,
            from: guessPos,
            to: discardPos,
            cardsPerRow,
            cardSize: "small",
            flip: "toBack",
            delay: index * 100,
            keepAlive: true,
          });
        }
      });

      // Animate new customer to queue
      const deckPos = getLayout("deck");
      const queueStartPos = getLayout("queueRoots", selectedPos.queueIndex);

      if (deckPos) {
        anims.push({
          card: topCard,
          from: deckPos,
          to: queueStartPos,
          cardsPerRow,
          cardSize: "small",
          delay: queueToDiscard.length * 100,
        });
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

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

    const cardsToDiscard = [...gameState.deck.slice(-2)].reverse();

    const nextGameState = produce(gameState, (draft) => {
      draft.deck.splice(-2);
      draft.discard.push(...flipAllToBack(cardsToDiscard));
      draft.discardsByRank = updatedDiscardsByRank(
        draft.discardsByRank,
        cardsToDiscard,
      );
    });

    const anims: CardAnimationParams[] = [];
    const deckPos = getLayout("deck");
    const discardPos = getLayout("discard");

    if (deckPos && discardPos) {
      cardsToDiscard.forEach((card, index) => {
        anims.push({
          card,
          from: { ...deckPos, zIndex: 10 - index },
          to: { ...discardPos, zIndex: index },
          cardsPerRow,
          cardSize: "small",
          flip: "toBack",
          delay: index * defaultAnimDuration,
          keepAlive: true,
        });
      });
    }

    if (anims.length > 0) {
      await animateCards(anims);
      clearAnimations();
    }

    setGame(nextGameState);
  }

  function cardTopPos(
    queueIndex: number,
    cardIndex: number,
    selectedPos?: SelectedPos,
  ) {
    let topMargin = 0;

    if (cardIndex > 0) {
      topMargin += cardHeight * cardIndex * 0.5;
    }

    if (
      selectedPos &&
      selectedPos.queueIndex === queueIndex &&
      cardIndex >= selectedPos.cardIndex
    ) {
      topMargin += cardHeight * 0.5;
    }

    return topMargin;
  }

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
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.flex1,
          flexStyles.fullWidth,
          flexStyles.gap40,
        ]}
      >
        <View style={[flexStyles.colStart, flexStyles.fullWidth, { gap: 40 }]}>
          {/* Rank Tallies */}
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.spaceBetween,
              flexStyles.fullWidth,
              { paddingHorizontal: 8 },
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
                        { fontSize: 16, fontFamily: FontWeight[500] },
                      ]}
                    >
                      {rank}
                    </Text>
                  </View>
                );
              })}
          </View>
        </View>

        {/* Decks */}
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.gap40,
            flexStyles.fullWidth,
          ]}
        >
          <Deck
            refTop={setRef("deck")}
            cards={game.deck}
            cardsPerRow={cardsPerRow}
            limitFan
            fan="horizontalRight"
            showCount
            iconName="draw"
            countPosition="left"
            cardSize={cardSize}
            hideTopCard={
              top(game.deck) && animatingCardIds.includes(top(game.deck)!.id)
            }
            selectColor={
              isAnimating
                ? "none"
                : selectedPos !== undefined
                  ? decisionNeeded
                    ? "red"
                    : "purple"
                  : "none"
            }
            forceSelectColor={!isAnimating && selectedPos !== undefined}
            forceOverlay={!isAnimating && selectedPos !== undefined}
          />
          <Deck
            refNext={setRef("discard")}
            cards={game.discard}
            cardsPerRow={cardsPerRow}
            cardSize={cardSize}
            fan="horizontalLeft"
            limitFan
            showCount
            iconName="delete"
            countPosition="right"
            // selectColor="none"
          />
        </View>

        {/* Queues */}
        <CardGrid
          cardsPerRow={cardsPerRow}
          targetGridCols={cardsPerRow}
          style={[flexStyles.fullWidth, flexStyles.flex1]}
        >
          {game.queues.map((queue, queueIndex) => (
            <View
              key={`queue-${queueIndex}`}
              style={[
                flexStyles.colStart,
                flexStyles.gap14,
                flexStyles.flex1,
                { position: "relative", height: "100%" },
              ]}
            >
              {/* Queue Root Placeholder (needs to be card sized) */}
              <Card
                ref={setRef("queueRoots", queueIndex)}
                card={undefined}
                style={[cardStyles.animHide, { zIndex: 1 }]}
                cardsPerRow={cardsPerRow}
                cardSize={cardSize}
              />

              {/* Selected position back card */}
              {selectedPos && selectedPos.queueIndex === queueIndex && (
                <Card
                  ref={setRef("selectedPos")}
                  card={undefined}
                  cardsPerRow={cardsPerRow}
                  cardSize={cardSize}
                  style={[
                    // isAnimating && decisionNeeded && cardStyles.animHide,
                    {
                      position: "absolute",
                      top: cardTopPos(
                        selectedPos.queueIndex,
                        selectedPos.cardIndex,
                      ),
                      left: 0,
                      zIndex: 10 + selectedPos.cardIndex * 2,
                    },
                  ]}
                  selectColor={
                    isAnimating ? "none" : decisionNeeded ? "red" : "purple"
                  }
                  forceSelectColor={!isAnimating}
                  forceOverlay={!isAnimating}
                />
              )}

              {/* Queue */}
              {queue.map((card, cardIndex) => {
                return (
                  <Card
                    key={`queue-${queueIndex}-${cardIndex}`}
                    ref={setRef("queues", queueIndex + cardIndex)}
                    card={card}
                    cardsPerRow={cardsPerRow}
                    cardSize={cardSize}
                    style={[
                      animatingCardIds.includes(card.id) && cardStyles.animHide,
                      // isAnimating && transitionStyles.none,
                      {
                        position: "absolute",
                        top: cardTopPos(queueIndex, cardIndex, selectedPos),
                        left: 0,
                        zIndex: 10 + cardIndex * 2,
                      },
                    ]}
                  />
                );
              })}

              {/* Select position buttons */}
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
                        left: cardWidth,
                        width:
                          cardWidth * 0.4 +
                          (isSelected ? cardWidth * 0.22 : cardWidth * 0.1),
                        top: cardTopPos(queueIndex, i) + cardHeight / 8,
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
                          fontSize: cardWidth * 0.2,
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
        </CardGrid>

        {/* Action Buttons */}
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.gap12,
          ]}
        >
          {!nextCustomerRevealed && !selectedPos && (
            <View
              style={[
                flexStyles.rowCentered,
                flexStyles.fullWidth,
                buttonStyles.sizeMedium,
                { backgroundColor: Colors.K875 },
              ]}
            >
              <Text
                style={[
                  textStyles.default,
                  { fontSize: 16, textAlign: "center" },
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
              style={[flexStyles.flex1]}
              theme="purple"
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
                style={[flexStyles.flex1]}
              />
              <Button
                text="Kick them out"
                onPress={() => {
                  if (selectedPos?.queueIndex !== undefined) {
                    kickOutCustomer(game);
                  }
                }}
                disabled={selectedPos === undefined}
                style={[flexStyles.flex1]}
              />
            </>
          )}
        </View>
      </View>
    </GameWrapper>
  );
}
