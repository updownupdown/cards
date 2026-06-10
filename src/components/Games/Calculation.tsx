import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { MeasuredRef, useAnimations } from "../Animations/Animations";
import {
  CardRank,
  createDeck,
  nameFromRankValue,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useLayoutManager } from "@/hooks/useLayoutManager";

const cardsPerRow = 4;

type CalculationState = {
  stock: PlayingCard[];
  foundations: PlayingCard[][];
  wastes: PlayingCard[][];
  started: boolean;
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: CalculationState;
};

const START_RANKS: CardRank[] = ["A", "2", "3", "4"];
const STEPS = [1, 2, 3, 4];

function nextRankValue(card: PlayingCard, step: number) {
  return (rankValue(card) + step) % 13;
}

function setup(firstSetup = false): CalculationState {
  const deck = shuffle(createDeck());
  const foundations: PlayingCard[][] = [[], [], [], []];
  const wastes: PlayingCard[][] = [[], [], [], []];

  for (let i = 0; i < START_RANKS.length; i += 1) {
    const rank = START_RANKS[i];
    const idx = deck.findIndex((card) => card.rank === rank);
    if (idx >= 0) {
      const startingCard = deck.splice(idx, 1)[0];
      foundations[i].push({ ...startingCard, faceUp: true });
    }
  }

  return {
    stock: deck,
    foundations,
    wastes,
    started: !firstSetup,
    ended: false,
    won: false,
  };
}

function canPlayToFoundation(
  card: PlayingCard | undefined,
  foundation: PlayingCard[],
  step: number,
) {
  if (!card || foundation.length === 0) return false;
  const top = foundation[foundation.length - 1];
  const expected = nextRankValue(top, step);
  return rankValue(card) === expected;
}

function anyFoundationPlayable(
  card: PlayingCard,
  foundations: PlayingCard[][],
) {
  for (let i = 0; i < foundations.length; i += 1) {
    if (canPlayToFoundation(card, foundations[i], STEPS[i])) return true;
  }
  return false;
}

export default function Calculation() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const [game, setGame] = useState<CalculationState>(setup(true));
  const { animateCards, isAnimating, animatingCardIds } = useAnimations();

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  function reset() {
    clearHistory();
    setGame(setup());
  }

  useEffect(() => {
    if (showIntro === false) {
      setGame((prev) => ({ ...prev, started: true }));
    }
  }, [showIntro]);

  const topStockCard = useMemo(() => {
    return game.stock.length ? game.stock[game.stock.length - 1] : undefined;
  }, [game.stock]);

  const [selectedCard, setSelectedCard] = useState<PlayingCard | undefined>(
    undefined,
  );

  const { getLayout, setRef } = useLayoutManager([
    "stockDeck",
    "wastesTop",
    "wastesNext",
    "foundationsNext",
  ]);

  // Turn over top stock card
  async function turnOverStockCard() {
    if (topStockCard === undefined) return;
    const stockDeckPos = getLayout("stockDeck");

    if (stockDeckPos) {
      await animateCards([
        {
          card: topStockCard,
          cardsPerRow,
          from: stockDeckPos,
          to: stockDeckPos,
          flip: "toFace",
        },
      ]);
    }

    setGame((prev) => {
      const stock = [...prev.stock];
      const lastIndex = prev.stock.length - 1;
      const newTopStockCard = { ...stock[lastIndex], faceUp: true };
      stock[lastIndex] = newTopStockCard;
      return { ...prev, stock };
    });
  }

  // Turn over draw card
  useEffect(() => {
    if (!game.started) return;

    // Evaluate win/lose conditions
    const totalOnFoundations = game.foundations.reduce(
      (sum, pile) => sum + pile.length,
      0,
    );

    // Win!
    if (totalOnFoundations === 52) {
      setGame((prev) => {
        return { ...prev, ended: true, won: true };
      });
    }

    // No more stock card, check if waste cards can be added to foundations
    if (!topStockCard) {
      const availableWasteCards = game.wastes.find((waste, i) => {
        if (game.wastes[i].length !== 0) return false;
        const topWasteCard = game.wastes[i][game.wastes[i].length - 1];
        return anyFoundationPlayable(topWasteCard, game.foundations);
      });

      // Lost!
      if (availableWasteCards === undefined) {
        setGame((prev) => {
          return { ...prev, ended: true, won: false };
        });
      }
    }

    // Turn over stock card if that makes sense
    if (
      !game.ended &&
      game.stock.length > 0 &&
      !game.stock[game.stock.length - 1].faceUp
    ) {
      turnOverStockCard();
    }
  }, [game, showIntro]);

  // Move from stock to waste pile
  async function moveStockToWaste(wastePileIndex: number) {
    saveUndoState(structuredClone({ game }));

    setSelectedCard(undefined);

    if (topStockCard) {
      const stockDeckPos = getLayout("stockDeck");
      const wasteDeckPos = getLayout("wastesNext", wastePileIndex);

      if (stockDeckPos && wasteDeckPos) {
        await animateCards([
          {
            card: topStockCard,
            cardsPerRow,
            from: stockDeckPos,
            to: wasteDeckPos,
          },
        ]);
      }
    }

    setGame((prev) => {
      if (!selectedCard) return prev;

      // Add stock card to waste pile
      const wastes = [...prev.wastes];
      const newWastePile = [...wastes[wastePileIndex], selectedCard];
      wastes[wastePileIndex] = newWastePile;

      // Remove top stock card
      const stock = [...prev.stock].slice(0, -1);
      return { ...prev, wastes, stock };
    });
  }

  async function moveCardToFoundation(foundationPileIndex: number) {
    if (!selectedCard) return;

    saveUndoState(structuredClone({ game }));

    let cardFromStock = false;
    let cardFromWasteIndex: number | undefined;

    // Figure out where the selected card is
    let fromPos: MeasuredRef | undefined = undefined;

    if (selectedCard.id === topStockCard?.id) {
      cardFromStock = true;
      fromPos = getLayout("stockDeck");
    } else {
      let selectedWasteIndex = game.wastes.findIndex((wastePile, i) => {
        if (game.wastes[i].length === 0) return false;
        const topWasteCard = game.wastes[i][game.wastes[i].length - 1];
        const cardFromThisWastePile = topWasteCard.id === selectedCard.id;
        if (cardFromThisWastePile) {
          cardFromWasteIndex = i;
          return true;
        }
      });
      if (selectedWasteIndex === undefined) return;
      fromPos = getLayout("wastesTop", selectedWasteIndex);
    }

    // To position (foundation)
    const toPos = getLayout("foundationsNext", foundationPileIndex);

    // Animate from waste to foundation
    if (fromPos && toPos) {
      await animateCards([
        {
          card: selectedCard,
          cardsPerRow,
          from: fromPos,
          to: toPos,
        },
      ]);
    }

    // Update game
    setGame((prev) => {
      if (!selectedCard || (!cardFromStock && cardFromWasteIndex === undefined))
        return prev;

      // Add stock card to foundation pile
      const foundations = [...prev.foundations];
      const newFoundationPile = [
        ...foundations[foundationPileIndex],
        selectedCard,
      ];
      foundations[foundationPileIndex] = newFoundationPile;

      let stock = [...prev.stock];
      let wastes = [...prev.wastes];

      if (cardFromStock) {
        // Remove card from stock
        stock = [...prev.stock].slice(0, -1);
      } else if (cardFromWasteIndex !== undefined) {
        // Remove card from waste pile
        const newWastePile = [...wastes[cardFromWasteIndex]].slice(0, -1);
        wastes[cardFromWasteIndex] = newWastePile;
      }

      return { ...prev, foundations, wastes, stock };
    });
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
          ? "All 52 cards are on the foundations."
          : "No legal moves remain."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.justifyEvenly,
          flexStyles.flex1,
        ]}
      >
        {/* Stock */}
        <Deck
          refTop={setRef("stockDeck")}
          cards={game.stock}
          showCount
          countPosition="left"
          iconName="draw"
          limitFan
          fan="horizontalRight"
          cardsPerRow={cardsPerRow}
          selectColor="blue"
          isSelected={selectedCard?.id === topStockCard?.id}
          isDisabled={isAnimating}
          onPress={() => {
            if (selectedCard?.id === topStockCard?.id) {
              setSelectedCard(undefined);
            } else if (topStockCard) {
              setSelectedCard(topStockCard);
            }
          }}
          hideTopCard={
            topStockCard && animatingCardIds.includes(topStockCard.id)
          }
        />
      </View>

      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.justifyEvenly,
          flexStyles.flex1,
        ]}
      >
        {/* Waste Piles */}
        {game.wastes.map((waste, i) => {
          const topWasteCard =
            waste.length === 0 ? undefined : waste[waste.length - 1];

          const stockIsSelected =
            selectedCard?.id !== undefined &&
            selectedCard?.id === topStockCard?.id;
          const thisIsSelected =
            selectedCard?.id !== undefined &&
            selectedCard?.id === topWasteCard?.id;
          const nothingSelected = !selectedCard;
          const hasTopCard = topWasteCard !== undefined;
          const anotherWasteCardIsSelected =
            selectedCard !== undefined && !thisIsSelected;

          const isEnabled =
            stockIsSelected || // Stock card is selected
            anotherWasteCardIsSelected || // Another waste card is selected
            (nothingSelected && hasTopCard) || // No selected card, this pile has a top card
            thisIsSelected; // This is the currently selected card

          function selectedColor() {
            if (!isEnabled) {
              return "none";
            } else if (stockIsSelected) {
              return "green";
            } else if (hasTopCard) {
              return "blue";
            } else {
              return "none";
            }
          }

          return (
            <Deck
              key={`calc-found-${i}`}
              refTop={setRef("wastesTop", i)}
              refNext={setRef("wastesNext", i)}
              cards={waste}
              cardsPerRow={cardsPerRow}
              fan="verticalUp"
              limitFan
              showCount
              countPosition="above"
              isSelected={selectedCard?.id === topWasteCard?.id}
              isDisabled={!isEnabled || isAnimating}
              selectColor={selectedColor()}
              onPress={() => {
                if (thisIsSelected) {
                  setSelectedCard(undefined);
                } else if (stockIsSelected) {
                  moveStockToWaste(i);
                } else if (anotherWasteCardIsSelected || topWasteCard) {
                  setSelectedCard(topWasteCard);
                }
              }}
              hideTopCard={
                topWasteCard && animatingCardIds.includes(topWasteCard.id)
              }
            />
          );
        })}
      </View>

      <View style={[flexStyles.rowCentered, flexStyles.fullWidth]}>
        {/* Foundation Piles */}
        {game.foundations.map((foundation, i) => {
          const canPlaySelectedHere = canPlayToFoundation(
            selectedCard,
            foundation,
            i + 1,
          );

          return (
            <View
              key={`calc-found-${i}`}
              style={[
                cardStyles.colUpwards,
                flexStyles.gap14,
                flexStyles.fullHeight,
              ]}
            >
              <View key={`calc-found-${i}`} style={[flexStyles.colCentered]}>
                <Text
                  style={[
                    {
                      fontFamily: FontWeight[400],
                      fontSize: 17,
                      color: Colors.K600,
                    },
                  ]}
                >
                  +{STEPS[i]}
                </Text>
                <Text
                  style={[
                    {
                      fontFamily: FontWeight[300],
                      fontSize: 17,
                      color: Colors.K100,
                    },
                  ]}
                >
                  {nameFromRankValue(
                    nextRankValue(
                      game.foundations[i][game.foundations[i].length - 1],
                      i + 1,
                    ),
                  )}
                </Text>
              </View>
              <Deck
                refNext={setRef("foundationsNext", i)}
                cards={foundation}
                cardsPerRow={cardsPerRow}
                fan="verticalUp"
                limitFan
                // showCount
                countPosition="below"
                selectColor={"green"}
                onPress={() => {
                  if (canPlaySelectedHere) {
                    moveCardToFoundation(i);
                  }
                }}
                isDisabled={!canPlaySelectedHere || isAnimating}
              />
            </View>
          );
        })}
      </View>
    </GameWrapper>
  );
}
