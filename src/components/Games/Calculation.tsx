import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
import { useZoneLayout, ZoneConfig } from "@/hooks/useZoneLayout";
import { CardPositionBuilder, getZoneGrid } from "../Cards/CardPositionBuilder";
import { AnimatedCard } from "../Cards/AnimatedCard";
import { CardSelectColor } from "../Cards/Card";
import { ZoneVisualizer } from "../Cards/ZoneVisualizer";
import { ZoneBackgrounds } from "../Cards/ZoneBackgrounds";

const cardsPerRow = 4;
const cardSize = "regular";

type GameState = {
  stock: PlayingCard[];
  foundations: PlayingCard[][];
  wastes: PlayingCard[][];
  started: boolean;
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: GameState;
};

const START_RANKS: CardRank[] = ["A", "2", "3", "4"];
const STEPS = [1, 2, 3, 4];

function nextRankValue(card: PlayingCard, step: number) {
  return (rankValue(card) + step) % 13;
}

function setup(firstSetup = false): GameState {
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

export const layoutZones: ZoneConfig[] = [
  {
    id: "stock",
    col: 1.5,
    row: 0,
    fan: { maxVisible: 3 },
    placeholder: { show: true, showCount: true },
  },
  ...getZoneGrid({
    idPrefix: "waste",
    length: 4,
    cols: 4,
    rowOffset: 1.25,
    config: {
      fan: { direction: "up", offset: 0.1 },
      placeholder: { show: true, showCount: true, infoPos: "above" },
    },
  }),
  ...getZoneGrid({
    idPrefix: "foundation",
    length: 4,
    cols: 4,
    rowOffset: 2.75,
    config: { fan: { direction: "up", offset: 0.1 } },
  }),
];

export default function Calculation() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const [game, setGame] = useState<GameState>(setup(true));

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

  // Turn over top stock card
  async function turnOverStockCard() {
    if (topStockCard === undefined) return;

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

    if (selectedCard.id === topStockCard?.id) {
      cardFromStock = true;
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

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    paddingBottomPc: 1,
  });
  const {
    cardWidth,
    cardHeight,
    getCardPosition,
    getZoneStyles,
    getZoneBasePos,
    layoutMetrics,
  } = layoutManager;

  // ========== Card Positions ========== //
  const cardPositions = useMemo(() => {
    const builder = new CardPositionBuilder(getCardPosition);

    builder.addDeck(game.stock, "stock", 20, "stock");
    game.foundations.forEach((foundation, foundationIndex) => {
      builder.addDeck(
        foundation,
        `foundation-${foundationIndex}`,
        10,
        "foundation",
      );
    });
    game.wastes.forEach((waste, wasteIndex) => {
      builder.addDeck(waste, `waste-${wasteIndex}`, 10, "waste");
    });

    return builder.build();
  }, [game, getCardPosition]);

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
      <ZoneBackgrounds layoutManager={layoutManager} game={game} />
      <ZoneVisualizer
        layoutManager={layoutManager}
        layoutMetrics={layoutMetrics}
      />

      {Object.values(cardPositions).map((target) => {
        let selectColor: CardSelectColor = "none";
        let isSelected = undefined;
        let forceOverlay = false;
        let forceSelectColor = false;
        let isDisabled = false;
        let isPlaceholder = false;
        let onPress: (() => void) | undefined = undefined;

        if (target.zoneId === "stock" && target.misc?.topOfDeck) {
          // Stock
          selectColor = "blue";
          isSelected = selectedCard?.id === topStockCard?.id;
          onPress = () => {
            if (selectedCard?.id === topStockCard?.id) {
              setSelectedCard(undefined);
            } else if (topStockCard) {
              setSelectedCard(topStockCard);
            }
          };
        } else if (target.type === "waste") {
          // Waste Piles
          const wasteIndex = Number(target.zoneId.split("-")[1]);
          const waste = game.wastes[wasteIndex];

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

          isSelected = selectedCard?.id === topWasteCard?.id;
          isDisabled = !isEnabled;
          selectColor = selectedColor();
          onPress = () => {
            if (thisIsSelected) {
              setSelectedCard(undefined);
            } else if (stockIsSelected) {
              target.index && moveStockToWaste(target.index);
            } else if (anotherWasteCardIsSelected || topWasteCard) {
              setSelectedCard(topWasteCard);
            }
          };
        } else if (target.type === "foundation") {
          // Foundation
          const foundationIndex = Number(target.zoneId.split("-")[1]);
          const foundation = game.foundations[foundationIndex];

          const canPlaySelectedHere = canPlayToFoundation(
            selectedCard,
            foundation,
            foundationIndex + 1,
          );
          selectColor = "green";
          onPress = () => {
            if (canPlaySelectedHere) {
              moveCardToFoundation(foundationIndex);
            }
          };
          isDisabled = !canPlaySelectedHere;
        }

        return (
          <AnimatedCard
            key={target.card.id}
            targetState={target}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            onPress={onPress}
            isSelected={isSelected}
            selectColor={selectColor}
            forceOverlay={forceOverlay}
            forceSelectColor={forceSelectColor}
            isPlaceholder={isPlaceholder}
            isDisabled={isDisabled}
          />
        );
      })}

      {Array.from({ length: 4 }, (_, i) => {
        return (
          // Wastes
          <Pressable
            key={`waste-${i}`}
            style={[
              getZoneStyles(`waste-${i}`),
              { zIndex: 1, borderWidth: 2, borderColor: Colors.accentBlue },
            ]}
            onPress={() => {}}
          />
        );
      })}

      {Array.from({ length: 4 }, (_, i) => {
        const zonePos = getZoneBasePos(
          layoutZones.find((z) => z.id === `foundation-${i}`)!,
        );

        return (
          // Foundation
          <View
            key={`calc-found-${i}`}
            style={[
              flexStyles.colCentered,
              getZoneStyles(`foundation-${i}`),
              {
                backgroundColor: Colors.K875,
                height: "auto",
                padding: 10,
                top: zonePos.y + cardHeight,
              },
            ]}
          >
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
        );
      })}
    </GameWrapper>
  );
}
