import { Text } from "@/components/common/Text";
import { useGameLoading } from "@/hooks/useGameLoading";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  CardRank,
  createDeck,
  nameFromRankValue,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

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

export default function Calculation() {
  const { zoneBg } = useGameZoneBackground();
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

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const wasteZones: MapZone[] = game.wastes.map((pos, i) => ({
      id: `waste-${i}`,
      name: "waste",
      pileIndex: i,
      cards: game.wastes[i],

      col: i,
      row: 1.5,
      baseZIndex: 30,
      fan: { maxVisible: 3 },
      placeholder: { infoPos: "above" },
    }));
    const foundationZones: MapZone[] = game.foundations.map((pos, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: game.foundations[i],

      col: i,
      row: 2.75,
      baseZIndex: 20,
      fan: { maxVisible: 3 },
    }));

    return [
      {
        id: "stock",
        name: "stock",

        cards: game.stock,
        col: 1.5,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 20,
        placeholder: { text: "Draw", infoPos: "left" },
      },
      ...foundationZones,
      ...wasteZones,
    ];
  }, [game]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (
      zone.name === "waste" &&
      zone.pileIndex !== undefined &&
      zone.pileIndex !== undefined
    ) {
      const waste = game.wastes[zone.pileIndex];
      const topWasteCard =
        waste.length === 0 ? undefined : waste[waste.length - 1];
      const stockIsSelected =
        selectedCard?.id !== undefined && selectedCard?.id === topStockCard?.id;
      const thisIsSelected =
        selectedCard?.id !== undefined && selectedCard?.id === topWasteCard?.id;
      const anotherWasteCardIsSelected =
        selectedCard !== undefined && !thisIsSelected;

      return {
        onPress: () => {
          if (thisIsSelected) {
            setSelectedCard(undefined);
          } else if (stockIsSelected) {
            zone.pileIndex !== undefined && moveStockToWaste(zone.pileIndex);
          } else if (anotherWasteCardIsSelected || topWasteCard) {
            setSelectedCard(topWasteCard);
          }
        },
      };
    }
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      // Stock
      return {
        selectColor: "blue",
        isSelected: selectedCard?.id === topStockCard?.id,
        onPress: () => {
          if (selectedCard?.id === topStockCard?.id) {
            setSelectedCard(undefined);
          } else if (topStockCard) {
            setSelectedCard(topStockCard);
          }
        },
      };
    } else if (mappedCard.zoneName === "waste") {
      // Waste Piles
      const wasteIndex = mappedCard.pileIndex;

      if (wasteIndex !== undefined) {
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

        return {
          onPress: () => {
            if (thisIsSelected) {
              setSelectedCard(undefined);
            } else if (stockIsSelected) {
              mappedCard.pileIndex && moveStockToWaste(mappedCard.pileIndex);
            } else if (anotherWasteCardIsSelected || topWasteCard) {
              setSelectedCard(topWasteCard);
            }
          },
          isSelected: selectedCard?.id === topWasteCard?.id,
          selectColor: selectedColor(),
          isDisabled: !isEnabled,
        };
      }
    } else if (mappedCard.zoneName === "foundation") {
      // Foundation
      const foundationIndex = mappedCard.pileIndex;

      if (foundationIndex !== undefined) {
        const foundation = game.foundations[foundationIndex];

        const canPlaySelectedHere = canPlayToFoundation(
          selectedCard,
          foundation,
          foundationIndex + 1,
        );

        return {
          selectColor: "green",
          onPress: () => {
            if (canPlaySelectedHere) {
              moveCardToFoundation(foundationIndex);
            }
          },
          isDisabled: !canPlaySelectedHere,
        };
      }
    }
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "regular",
    paddingBottom: 0.9,
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
          ? "All 52 cards are on the foundations."
          : "No legal moves remain."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      {cardMap}

      {/* Foundations Info */}
      {Array.from({ length: 4 }, (_, i) => (
        <View
          key={`calc-found-${i}`}
          style={[
            flexStyles.colCentered,
            getZoneStylesById(`foundation-${i}`),
            {
              backgroundColor: zoneBg,
              height: cardHeight / 2,
              padding: 10,
              marginTop: cardHeight,
              zIndex: 100,
              borderBottomLeftRadius: cardDims.ratioRadius * cardWidth,
              borderBottomRightRadius: cardDims.ratioRadius * cardWidth,
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
            ={" "}
            {nameFromRankValue(
              nextRankValue(
                game.foundations[i][game.foundations[i].length - 1],
                i + 1,
              ),
            )}
          </Text>
        </View>
      ))}
    </GameWrapper>
  );
}
