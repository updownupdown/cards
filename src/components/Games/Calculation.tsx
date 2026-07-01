import { Text } from "@/components/common/Text";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
  CardMapBGMapping,
} from "../Cards/AnimatedCard";
import {
  cardDims,
  CardRank,
  createDeck,
  flipAllToBack,
  flipToFace,
  flipTopCardToFace,
  nameFromRankValue,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

type GameState = {
  draw: PlayingCard[];
  foundations: PlayingCard[][];
  wastes: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  draw: shuffle(createDeck()),
  foundations: [[], [], [], []],
  wastes: [[], [], [], []],
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.foundations.flat(),
      ...draft.wastes.flat(),
    ].filter((card): card is PlayingCard => card !== null);

    draft.draw = shuffle(flipAllToBack(allCards));
    draft.foundations = [[], [], [], []];
    draft.wastes = [[], [], [], []];
    draft.ended = false;
    draft.won = false;
  });

  await delay(bufferedDefaultAnimDuration);

  setGame((draft) => {
    for (let i = 0; i < START_RANKS.length; i += 1) {
      const rank = START_RANKS[i];
      const idx = draft.draw.findIndex((card) => card.rank === rank);
      if (idx >= 0) {
        const startingCard = draft.draw.splice(idx, 1)[0];
        draft.foundations[i].push(flipToFace(startingCard));
      }
    }
  });
}

// =============== Helper functions =============== //
const START_RANKS: CardRank[] = ["A", "2", "3", "4"];
const STEPS = [1, 2, 3, 4];

function nextRankValue(card: PlayingCard, step: number) {
  return (rankValue(card) + step) % 13;
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

// ================ Game Component ========== //
export default function Calculation() {
  const { zoneBg } = useGameZoneBackground();
  const responsiveScale = useResponsiveLayout();

  const {
    isLoaded,
    showIntro,
    setShowIntro,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
    isSettingUp,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
  });

  const topDrawCard = useMemo(() => {
    return game.draw.length ? game.draw[game.draw.length - 1] : undefined;
  }, [game.draw]);

  const [selectedCard, setSelectedCard] = useState<PlayingCard | undefined>(
    undefined,
  );

  // Turn over top draw card
  async function turnOverDrawCard() {
    setGame((draft) => {
      if (
        draft.draw.length === 0 ||
        draft.draw[draft.draw.length - 1].faceUp ||
        draft.ended
      )
        return;
      draft.draw = flipTopCardToFace(draft.draw);
    });
  }

  // Turn over draw card
  useEffect(() => {
    if (isSettingUp) return;

    // Evaluate win/lose conditions
    const totalOnFoundations = game.foundations.reduce(
      (sum, pile) => sum + pile.length,
      0,
    );

    // Win!
    if (totalOnFoundations === 52) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = true;
      });
    }

    // No more draw cards, check if waste cards can be added to foundations
    if (!topDrawCard) {
      const availableWasteCards = game.wastes.find((waste, i) => {
        if (game.wastes[i].length !== 0) return false;
        const topWasteCard = game.wastes[i][game.wastes[i].length - 1];
        return anyFoundationPlayable(topWasteCard, game.foundations);
      });

      // Lost!
      if (availableWasteCards === undefined) {
        setGame((draft) => {
          draft.ended = true;
          draft.won = false;
        });
      }
    }

    // Turn over draw card
    turnOverDrawCard();
  }, [game, showIntro]);

  // Move from draw to waste pile
  async function moveDrawToWaste(wastePileIndex: number) {
    saveUndoState(structuredClone(game));

    setSelectedCard(undefined);

    setGame((draft) => {
      if (!selectedCard) return;

      // Move selected card to waste pile
      draft.wastes[wastePileIndex].push(selectedCard);
      draft.draw.pop();
    });
  }

  async function moveCardToFoundation(foundationPileIndex: number) {
    if (!selectedCard) return;

    saveUndoState(structuredClone(game));

    let selectedCardIsFromDraw = false;
    let cardFromWasteIndex: number | undefined;

    // Figure out where the selected card is
    if (selectedCard.id === topDrawCard?.id) {
      selectedCardIsFromDraw = true;
    } else {
      let selectedWasteIndex = game.wastes.findIndex((_, i) => {
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
    setGame((draft) => {
      if (
        !selectedCard ||
        (!selectedCardIsFromDraw && cardFromWasteIndex === undefined)
      )
        return;

      // Add selected card to foundation pile
      draft.foundations[foundationPileIndex].push(selectedCard);

      // Remove card from draw or waste pile
      if (selectedCardIsFromDraw) {
        draft.draw.pop();
      } else if (cardFromWasteIndex !== undefined) {
        draft.wastes[cardFromWasteIndex].pop();
      }
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
      baseZIndex: 20,
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
      baseZIndex: 30,
      fan: { maxVisible: 3 },
    }));

    return [
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 1.5,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 20,
        placeholder: { text: "Draw", infoPos: "left" },
      },
      ...wasteZones,
      ...foundationZones,
    ];
  }, [game]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "waste" && zone.pileIndex !== undefined) {
      const waste = game.wastes[zone.pileIndex];
      const topWasteCard =
        waste.length === 0 ? undefined : waste[waste.length - 1];
      const drawIsSelected =
        selectedCard?.id !== undefined && selectedCard?.id === topDrawCard?.id;
      const thisIsSelected =
        selectedCard?.id !== undefined && selectedCard?.id === topWasteCard?.id;
      const anotherWasteCardIsSelected =
        selectedCard !== undefined && !thisIsSelected;

      return {
        onPress: () => {
          if (thisIsSelected) {
            setSelectedCard(undefined);
          } else if (drawIsSelected) {
            zone.pileIndex !== undefined && moveDrawToWaste(zone.pileIndex);
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
    if (mappedCard.zoneName === "draw" && mappedCard.topOfZone) {
      // Draw
      return {
        selectColor: "blue",
        isSelected: selectedCard?.id === topDrawCard?.id,
        onPress: () => {
          if (selectedCard?.id === topDrawCard?.id) {
            setSelectedCard(undefined);
          } else if (topDrawCard) {
            setSelectedCard(topDrawCard);
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
        const drawIsSelected =
          selectedCard?.id !== undefined &&
          selectedCard?.id === topDrawCard?.id;
        const thisIsSelected =
          selectedCard?.id !== undefined &&
          selectedCard?.id === topWasteCard?.id;
        const nothingSelected = !selectedCard;
        const hasTopCard = topWasteCard !== undefined;
        const anotherWasteCardIsSelected =
          selectedCard !== undefined && !thisIsSelected;

        const isEnabled =
          drawIsSelected || // Draw card is selected
          anotherWasteCardIsSelected || // Another waste card is selected
          (nothingSelected && hasTopCard) || // No selected card, this pile has a top card
          thisIsSelected; // This is the currently selected card

        function selectedColor() {
          if (!isEnabled) {
            return "none";
          } else if (drawIsSelected) {
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
            } else if (drawIsSelected) {
              mappedCard.pileIndex && moveDrawToWaste(mappedCard.pileIndex);
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
    paddingTop: 0.2,
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
      undo={undo}
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
              padding: 10 * responsiveScale,
              gap: 2 * responsiveScale,
              marginTop: cardHeight,
              zIndex: 100,
              borderBottomLeftRadius: cardDims.ratioRadius * cardWidth,
              borderBottomRightRadius: cardDims.ratioRadius * cardWidth,
            },
          ]}
        >
          <Text weight={400} size="sm" color={Colors.K500}>
            +{STEPS[i]}
          </Text>
          <Text weight={600} size="sm" color={Colors.K100}>
            ={" "}
            {game.foundations[i].length &&
              nameFromRankValue(
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
