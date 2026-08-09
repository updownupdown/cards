import { Button } from "@/components/Button/Button";
import {
  AnimatedCardMapping,
  CardMapBGMapping,
} from "@/components/Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { DeckInfoPosition } from "@/components/Cards/CardMapBackgrounds";
import { Text } from "@/components/common/Text";
import { useToast } from "@/components/common/Toast";
import { useFade } from "@/hooks/useFade";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba, transitionStyles } from "@/styles/styles";
import { rotatedText } from "@/styles/textStyles";
import { useEffect, useMemo, useState } from "react";
import { Animated, View, ViewStyle } from "react-native";
import {
  flipAllToBack,
  flipToBack,
  flipToFace,
  shuffle,
  sortCardsBySuit,
  top,
  type PlayingCard,
} from "../../Cards/card-utils";
import { GameWrapper } from "../../common/GameWrapper";
import { AdvisorInfo } from "./AdvisorInfo";
import {
  canDebateWithCard,
  debateWithCardAction,
  finishVisitAction,
  gameStateInitial,
  resetAndSetup,
  startVisitAction,
} from "./TheEmissaryLogic";
import {
  defaultHandSize,
  EmissarySuitsColorMap,
  TheEmissaryKingdom,
} from "./TheEmissaryTypes";

export default function TheEmissary() {
  const { spacing } = useResponsiveMetrics();
  const { colorZone, colorDark, colorPale } = useGameColors();
  const showToast = useToast();

  const [selectedAdvisor, setSelectedAdvisor] = useState<
    PlayingCard | undefined
  >(undefined);

  const lastSelectedAdvisor: PlayingCard | undefined = useMemo(() => {
    return selectedAdvisor ?? undefined;
  }, [selectedAdvisor]);

  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
    resetNonGameStates: () => {
      setSelectedAdvisor(undefined);
    },
  });

  const showChooseKingdom = useMemo(() => {
    return !game.ended && game.visit === null;
  }, [game.visit]);

  // ----- useEffect: Refill hand after visit ----- //
  useEffect(() => {
    if (
      isSettingUp ||
      game.ended ||
      game.hand.length > 0 ||
      game.visit !== null
    ) {
      return;
    }

    setGame((draft) => {
      draft.neededToHand = defaultHandSize;
    });
  }, [game.visit, game.hand, isSettingUp]);

  // ----- useEffect: Finish Kingdom Visit ----- //
  useEffect(() => {
    if (!game.visit || game.hand.length > 0) return;

    const wonKingdom = game.visit.wins === game.visit.requiredWins;

    if (wonKingdom) {
      showToast(`You won over Kingdom #${game.visit.kingdomId + 1}!`);
    }

    saveUndoState(structuredClone(game));

    // Finish kingdom visit
    // This needs to be in a useEffect because it can be triggered in two ways:
    // 1: player plays a debate card, updates states, then has no cards left
    // 2: player uses advisor to remove trump cards left in hand, and has no cards left
    setGame((draft) => {
      finishVisitAction(draft);
    });
  }, [game.hand]);

  // ========== Start Visit ========== //
  function startVisit(kingdomId: number) {
    if (
      game.ended ||
      game.visit !== null ||
      !game.kingdoms[kingdomId] ||
      game.kingdoms[kingdomId].visited
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      startVisitAction(draft, kingdomId);
    });
  }

  // ========== Debate with Card ========== //
  async function debateWithCard(card: PlayingCard) {
    if (!game.visit?.debateTopic) return;

    saveUndoState(structuredClone(game));

    setSelectedAdvisor(undefined);

    setGame((draft) => {
      debateWithCardAction(draft, card.id);
    });
  }

  // ========== Refresh Deck WITHIN Kingdom ========== //
  async function refreshDeckWithinKingdom() {
    setGame((draft) => {
      draft.draw = flipAllToBack(
        shuffle([...draft.discardLost, ...draft.draw]),
      );
      draft.discardLost = [];
    });
  }

  // ========== Refresh Deck AFTER Kingdom ========== //
  async function refreshDeckAfterKingdom() {
    setGame((draft) => {
      draft.draw = flipAllToBack(
        shuffle([
          ...draft.discardLost,
          ...draft.hand,
          ...draft.discardWon,
          ...draft.draw,
        ]),
      );
      draft.hand = [];
      draft.discardLost = [];
      draft.discardWon = [];
    });
  }

  // ========== Draw Card to Hand ========== //
  async function drawCardToHand() {
    setGame((draft) => {
      const newCard = top(draft.draw);
      if (!newCard) return;

      draft.hand.push(flipToFace(newCard));
      draft.draw.pop();
      draft.neededToHand -= 1;

      if (draft.neededToHand === 0) {
        sortCardsBySuit(draft.hand);
      }
    });
  }

  // ========== Draw Card to Topic ========== //
  async function drawCardToTopic() {
    saveUndoState(structuredClone(game));

    if (game.draw.length === 0) {
      await refreshDeckWithinKingdom();
    }

    setGame((draft) => {
      if (draft.ended || draft.visit === null) return;

      const nextTopic = flipToFace(draft.draw[draft.draw.length - 1]);
      draft.draw.pop();
      draft.visit.debateTopic = nextTopic;
    });
  }

  // ========== Discard Card ========== //
  async function discardCard(card: PlayingCard) {
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.hand = draft.hand.filter((c) => c.id !== card.id);
      draft.discardLost.push(flipToBack(card));
      draft.discardFromHand -= 1;
    });
  }

  // ----- useEffect: Deck and hand refresh ----- //
  useEffect(() => {
    if (game.neededToHand === 0) return;

    if (game.draw.length === 0) {
      if (game.visit === null) {
        refreshDeckAfterKingdom();
      } else {
        refreshDeckWithinKingdom();
      }
    } else {
      drawCardToHand();
    }
  }, [game.neededToHand, game.draw, game.visit]);

  // ========== Spend Advisor ========== //
  async function spendAdvisor(advisor: PlayingCard) {
    saveUndoState(structuredClone(game));

    // Turn advisor face down, or remove it
    setGame((draft) => {
      if (advisor.rank === "J") {
        // If Jack, turn it face down
        const advisorIndex = draft.advisors.findIndex(
          (a) => a.id === advisor.id,
        );
        if (advisorIndex !== -1) {
          draft.advisors[advisorIndex] = flipToBack(
            draft.advisors[advisorIndex],
          );
        }
      } else {
        // Otherwise, remove from advisors
        draft.advisors = draft.advisors.filter((a) => a.id !== advisor.id);
      }
    });

    setSelectedAdvisor(undefined);
  }

  // ========== Discard Cards Matching Trump ========== //
  async function discardCardsMatchingTrump() {
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (!draft.visit) return;

      const trumpSuit = draft.visit.trumpSuit;
      const cardsToDiscard = draft.hand.filter((c) => c.suit === trumpSuit);

      draft.hand = draft.hand.filter((c) => c.suit !== trumpSuit);
      draft.draw = [...cardsToDiscard, ...draft.draw];
      draft.handSize = Math.max(draft.handSize - cardsToDiscard.length, 0);
    });
  }

  // ========== Do Advisor Action ========== //
  async function doAdvisorAction(advisor: PlayingCard | undefined) {
    if (!advisor) return;

    saveUndoState(structuredClone(game));

    const suit = advisor.suit;

    await spendAdvisor(advisor);

    if (suit === "diamonds") {
      setGame((draft) => {
        draft.neededToHand = 2;
        draft.discardFromHand = 2;
      });
    } else if (suit === "hearts") {
      await discardCardsMatchingTrump();
    } else if (suit === "clubs") {
      setGame((draft) => {
        const numCardsToDraw = draft.hand.filter(
          (c) => c.suit === "clubs",
        ).length;
        draft.handSize += numCardsToDraw;
        draft.neededToHand = numCardsToDraw;
      });
    }
  }

  async function swapRulers(kingdom: TheEmissaryKingdom, advisor: PlayingCard) {
    saveUndoState(structuredClone(game));

    await spendAdvisor(advisor);

    setGame((draft) => {
      if (!draft.visit) return;

      const currentKingdomId = draft.visit.kingdomId;
      const tempRuler = draft.kingdoms[currentKingdomId].ruler;

      draft.kingdoms[currentKingdomId].ruler = draft.kingdoms[kingdom.id].ruler;
      draft.kingdoms[kingdom.id].ruler = tempRuler;
      draft.visit.trumpSuit = kingdom.ruler.suit;
    });
  }

  // ========== Card Mapping ========== //
  const dims = {
    rowGap: 0.2,
    rulersNum: 8,
    width: 7,
    rulersHeaderHeight: 0.4,
    winsHeight: 0.6,
    debateAreaHeight: 2.5,
    advisorHeight: 1.2,
    handHeight: 1.2,
    debateRow: 2.38,
    minOffset: 1.2,
  };

  const zones: MapZone[] = useMemo(() => {
    const debateDeckWidth = dims.width / 4;
    const debateAreaRow = dims.rulersHeaderHeight + 1 + dims.rowGap;

    // Adding -0.01 offset to prevent right side overflowing due to rounding
    const rulersOffset = (dims.width - 1) / (dims.rulersNum - 1) - 0.01;
    const handOffset = Math.min(
      dims.minOffset,
      5 / (game.hand.length - 1) - 0.01,
    );
    const advisorsOffset =
      Math.min(dims.minOffset, 6 / game.advisors.length) - 0.01;

    const advisorRow = debateAreaRow + dims.debateAreaHeight + dims.rowGap;
    const advisorOverlayRow = debateAreaRow;
    const advisorOverlayHeight = dims.debateAreaHeight;

    const handRow =
      debateAreaRow +
      dims.debateAreaHeight +
      dims.advisorHeight +
      dims.rowGap * 2;
    const chooseKingdomHeight = handRow + dims.handHeight - debateAreaRow;

    // UI Zones
    const rulerHeadersZone: MapZone = {
      id: "ruler-headers",
      col: 0,
      row: 0,
      width: dims.width,
      height: dims.rulersHeaderHeight,
      baseZIndex: 1,
    };
    const debateAreaZone: MapZone = {
      id: "debate-area",
      col: 0,
      row: debateAreaRow,
      width: dims.width,
      height: dims.debateAreaHeight,
      baseZIndex: 1,
    };
    const chooseKingdomZone: MapZone = {
      id: "choose-kingdom",
      col: 0,
      row: debateAreaRow,
      width: dims.width,
      height: chooseKingdomHeight,
      baseZIndex: 80,
    };
    const advisorOverlay: MapZone = {
      id: "advisor-overlay",
      col: 0,
      row: advisorOverlayRow,
      width: dims.width,
      height: advisorOverlayHeight,
      baseZIndex: 80,
    };
    const advisorsZone: MapZone = {
      id: "advisors",
      name: "advisor",
      cards: game.advisors,
      col: 0,
      row: advisorRow,
      width: dims.width,
      height: dims.advisorHeight,
      fan: { offset: advisorsOffset, direction: "right" },
      baseZIndex: 1,
    };

    // Card Zones
    const rulerZones: MapZone = {
      id: "ruler",
      name: "ruler",
      cards: game.kingdoms.map((k) => k.ruler),
      col: 0,
      row: dims.rulersHeaderHeight,
      width: dims.width,
      fan: { offset: rulersOffset, direction: "right" },
      baseZIndex: 10,
    };

    const debateDeckProps = (
      id: string,
      title: string,
      row: number,
    ): MapZone => {
      return {
        id,
        name: id,
        col: debateDeckWidth * row,
        row: dims.debateRow,
        width: debateDeckWidth,
        height: 1.2,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: title,
          infoPos: "below" as DeckInfoPosition,
          showCount: id !== "topic",
          hideBackground: id !== "topic",
          backgroundColor: id === "topic" ? colorDark : undefined,
        },
      };
    };
    const drawZone: MapZone = {
      cards: game.draw,
      ...debateDeckProps("draw", "Stock", 0),
    };
    const topicZone: MapZone = {
      cards: game.visit?.debateTopic ? [game.visit.debateTopic] : undefined,
      ...debateDeckProps("topic", "Topic", 1),
    };
    const discardLostZone: MapZone = {
      cards: game.discardLost,
      ...debateDeckProps("lost", "Lost", 2),
    };
    const discardWonZone: MapZone = {
      cards: game.discardWon,
      ...debateDeckProps("won", "Won", 3),
    };

    const handZones: MapZone = {
      id: "hand",
      name: "hand",
      cards: game.hand,
      col: 0,
      row: handRow,
      width: dims.width,
      height: dims.handHeight,
      fan: { offset: handOffset, direction: "right" },
      baseZIndex: 20,
    };

    return [
      chooseKingdomZone,
      rulerHeadersZone,
      rulerZones,
      debateAreaZone,
      advisorOverlay,
      drawZone,
      topicZone,
      discardLostZone,
      discardWonZone,
      advisorsZone,
      handZones,
    ];
  }, [game]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "topic") {
      return {
        onPress: drawCardToTopic,
        selectColor:
          game.visit?.debateTopic !== undefined ? colorPale : undefined,
        forceOverlayColor: game.visit?.debateTopic !== undefined,
        forceSelectColor: game.visit?.debateTopic !== undefined,
      };
    }
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "ruler") {
      // .......... Ruler .......... //
      const index = mappedCard.cardIndex;
      const kingdom = game.kingdoms[index];

      const swappingRuler = selectedAdvisor?.suit === "spades";
      const isCurrent = game.visit?.kingdomId === kingdom.id;
      const isEnabled =
        (game.visit === null && kingdom.ruler.faceUp) ||
        (swappingRuler && !isCurrent) ||
        (isCurrent && !swappingRuler);

      const onPress = () => {
        if (game.visit === null) {
          return startVisit(kingdom.id);
        } else if (selectedAdvisor?.suit === "spades" && !isCurrent) {
          return swapRulers(kingdom, selectedAdvisor);
        } else {
          return undefined;
        }
      };

      const selectColor = () => {
        if (swappingRuler) {
          return isCurrent ? "none" : EmissarySuitsColorMap["spades"];
        } else {
          return isEnabled || isCurrent ? colorPale : "none";
        }
      };

      return {
        onPress,
        isDisabled: onPress === undefined,
        isVisible: !kingdom.won,
        yOffset: isCurrent ? 0.1 : 0,
        forceOverlayColor: isCurrent || swappingRuler,
        selectColor: selectColor(),
      };
    } else if (mappedCard.zoneName === "hand") {
      // .......... Hand .......... //
      const isDisabled =
        game.discardFromHand === 0 &&
        !canDebateWithCard(
          game.hand,
          game.visit?.debateTopic ?? undefined,
          mappedCard.card,
        );

      const diplomacySelected =
        selectedAdvisor && selectedAdvisor.suit === "hearts";
      const currentTrump = game.visit?.trumpSuit;
      const potentialDiscard =
        diplomacySelected && mappedCard.card.suit === currentTrump;

      return {
        onPress: () => {
          if (game.discardFromHand === 0) {
            debateWithCard(mappedCard.card);
          } else {
            discardCard(mappedCard.card);
          }
        },
        isDisabled,
        selectColor: potentialDiscard
          ? EmissarySuitsColorMap["hearts"]
          : colorPale,
        forceOverlayColor: !isDisabled || potentialDiscard,
      };
    } else if (mappedCard.zoneName === "advisor") {
      // .......... Advisor .......... //
      const debateActive = game.visit?.debateTopic !== undefined;

      return {
        onPress: () => {
          setSelectedAdvisor(
            selectedAdvisor === mappedCard.card ? undefined : mappedCard.card,
          );
        },
        isSelected: selectedAdvisor === mappedCard.card,
        isDisabled:
          game.discardFromHand !== 0 ||
          !game.visit ||
          !!game.visit.debateTopic ||
          !mappedCard.card.faceUp,
        selectColor: debateActive
          ? "grey"
          : EmissarySuitsColorMap[mappedCard.card.suit],
        forceOverlayColor: debateActive,
      };
    }
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    gap: 0,
    cardSize: "small",
  });

  const dotRadius = cardWidth * 0.08;

  const { isRendered: renderChooseKingdom, opacity: chooseKingdomOpacity } =
    useFade(showChooseKingdom, 300);
  const { isRendered: renderNextTopicBtn, opacity: nextTopicBtnOpacity } =
    useFade(game.visit?.debateTopic === undefined, 200, 200, 0);

  const darkZoneStyles: ViewStyle = {
    borderRadius: cardWidth * 0.15,
    backgroundColor: colorZone,
    borderWidth: 1,
    borderColor: rgba(colorPale, 0.2),
  };

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {/* Rulers Header */}
      <View
        style={[
          flexStyles.rowCentered,
          getZoneStylesById("ruler-headers"),
          {
            paddingLeft: cardWidth * 0.22,
            paddingRight: cardWidth * 0.04,
          },
        ]}
      >
        {game.kingdoms.map((k) => {
          const swappingRuler = selectedAdvisor?.suit === "spades";
          const isCurrent = game.visit?.kingdomId === k.id;
          const color = () => {
            if (swappingRuler) {
              return isCurrent ? Colors.K500 : EmissarySuitsColorMap["spades"];
            } else {
              return isCurrent ? colorPale : Colors.K600;
            }
          };

          return (
            <Text
              key={`ruler-header-${k.requiredWins}`}
              style={[
                {
                  flex: 1,
                  fontFamily: FontWeight[500],
                  fontSize: cardWidth * 0.26,
                  color: color(),
                },
              ]}
            >
              {k.requiredWins}
            </Text>
          );
        })}
      </View>

      {/* Choose a kingdom */}
      {renderChooseKingdom && (
        <Animated.View
          style={[
            flexStyles.colCentered,
            darkZoneStyles,
            getZoneStylesById("choose-kingdom"),
            {
              opacity: chooseKingdomOpacity,
              justifyContent: "flex-start",
              padding: cardWidth * 0.5,
            },
          ]}
        >
          <Text
            size="sm"
            style={[
              {
                paddingHorizontal: cardWidth * 0.4,
                paddingVertical: cardWidth * 0.3,

                borderRadius: cardWidth * 0.15,
                backgroundColor: colorPale,

                fontSize: cardWidth * 0.34,
                fontFamily: FontWeight[400],
                color: colorDark,
              },
            ]}
          >
            Choose a kingdom
          </Text>
        </Animated.View>
      )}

      {/* Debate Record */}
      <View
        style={[
          flexStyles.rowStart,
          flexStyles.spaceBetween,
          getZoneStylesById("debate-area"),
          darkZoneStyles,
          {
            paddingHorizontal: cardWidth * 0.26,
            paddingVertical: cardWidth * 0.26,
            gap: spacing(10),
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.spaceBetween,
          ]}
        >
          <Text
            textTransform="uppercase"
            style={[
              {
                fontSize: cardWidth * 0.3,
              },
            ]}
            color={Colors.K300}
          >
            Wins
          </Text>

          <View style={[flexStyles.rowCentered, { gap: dotRadius }]}>
            {Array.from({ length: game.handSize }, (_, i) => {
              if (!game.visit) return null;

              const won =
                game.visit.debateRecord[i] === undefined
                  ? undefined
                  : game.visit.debateRecord[i];

              const color =
                won === undefined
                  ? Colors.K800
                  : won
                    ? Colors.win
                    : Colors.lose;

              return (
                <View
                  key={`record-${i}`}
                  style={[
                    transitionStyles.all03sec,
                    {
                      backgroundColor: color,
                      width: dotRadius * 2,
                      height: dotRadius * 2,
                      borderRadius: dotRadius,
                    },
                  ]}
                />
              );
            })}
          </View>

          <Text
            textTransform="uppercase"
            style={[
              {
                fontFamily: FontWeight[500],
                fontSize: cardWidth * 0.3,
              },
            ]}
            color={Colors.K300}
          >
            {game.visit?.wins ?? "0"} / {game.visit?.requiredWins ?? "-"}
          </Text>
        </View>
      </View>

      {/* Next Topic Button */}
      {renderNextTopicBtn && (
        <Animated.View
          style={[
            getZoneStylesById("topic"),
            {
              opacity: nextTopicBtnOpacity,
              padding: cardWidth * 0.1,
              pointerEvents: "none",
              zIndex: 15,
            },
          ]}
        >
          <Button
            onPress={drawCardToTopic}
            text="Next Topic"
            style={[
              {
                borderRadius: cardWidth * 0.1,
                width: "100%",
                height: "100%",
              },
            ]}
            theme={colorPale}
            textOnly
          />
        </Animated.View>
      )}

      {/* Advisor List */}
      <View
        style={[
          flexStyles.rowStart,
          getZoneStylesById("advisors"),
          darkZoneStyles,
        ]}
      >
        <Text
          textTransform="uppercase"
          style={[
            rotatedText,
            {
              fontSize: cardWidth * 0.2,
            },
          ]}
          color={Colors.K300}
        >
          Advisors
        </Text>
      </View>

      {/* Hand */}
      <View
        style={[flexStyles.rowStart, getZoneStylesById("hand"), darkZoneStyles]}
      >
        <Text
          textTransform="uppercase"
          style={[
            rotatedText,
            {
              fontSize: cardWidth * 0.2,
            },
          ]}
          color={Colors.K300}
        >
          Hand
        </Text>
      </View>

      {/* Advisor Info */}
      <AdvisorInfo
        lastSelectedAdvisor={lastSelectedAdvisor}
        selectedAdvisor={selectedAdvisor}
        discardFromHand={game.discardFromHand}
        setSelectedAdvisor={setSelectedAdvisor}
        doAdvisorAction={doAdvisorAction}
        hand={game.hand}
        visit={game.visit}
        advisorStyles={getZoneStylesById("advisor-overlay")}
        cardWidth={cardWidth}
      />
    </GameWrapper>
  );
}
