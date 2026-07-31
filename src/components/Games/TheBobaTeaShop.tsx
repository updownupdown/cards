import { Text } from "@/components/common/Text";
import { useFade } from "@/hooks/useFade";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba, transitionStyles } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  RANKS,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { CardColor } from "../Cards/CardStyles";
import { GameWrapper } from "../common/GameWrapper";
import { DeckPreviewModal } from "../Modals/DeckPreviewModal";

type SelectedPos = { queueIndex: number; cardIndex: number };

type GameState = {
  deck: PlayingCard[];
  queues: PlayingCard[][];
  discard: PlayingCard[];
  discardsByRank: Record<PlayingCard["rank"], number>;
  decisionNeeded: boolean;
  selectedPos?: SelectedPos;
  ended: boolean;
  won: boolean;
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

const gameStateInitial: GameState = {
  deck: shuffle(createDeck()),
  queues: [[], [], [], []],
  discard: [],
  discardsByRank: createDiscardCount(),
  decisionNeeded: false,
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [...draft.deck, ...draft.queues.flat(), ...draft.discard];

    draft.queues = [[], [], [], []];
    draft.deck = flipAllToBack(allCards);
    draft.discard = [];
    draft.discardsByRank = createDiscardCount();
    draft.selectedPos = undefined;
    draft.decisionNeeded = false;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const draw = shuffle(draft.deck);
    draft.queues[0] = [flipToFace(draw.pop()!)];
    draft.queues[1] = [flipToFace(draw.pop()!)];
    draft.queues[2] = [flipToFace(draw.pop()!)];
    draft.queues[3] = [flipToFace(draw.pop()!)];
    draft.deck = draw;
  });
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

function evaluateEnd(state: GameState): { ended: boolean; won: boolean } {
  for (const rank of RANKS) {
    if (state.discardsByRank[rank] >= 4) {
      return { ended: true, won: false };
    }
  }
  if (state.deck.length === 0) {
    return { ended: true, won: true };
  }
  return { ended: false, won: false };
}

// ========== Main Game Component ========== //
export default function TheBobaTeaShop() {
  const { spacing } = useResponsiveMetrics();
  const { zoneBg, cardText } = useGameZoneBackground();
  const [showDeckPreview, setShowDeckPreview] = useState(false);
  const [isResolvingCustomerAction, setIsResolvingCustomerAction] =
    useState(false);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  const score = useMemo(() => totalInQueues(game.queues), [game.queues]);

  const nextCustomerRevealed = useMemo(
    () => !!top(game.deck)?.faceUp,
    [game.deck],
  );

  const showSelectQueuePrompt =
    !isResolvingCustomerAction && !nextCustomerRevealed && !game.selectedPos;
  const showRevealNextCustomerButton =
    !isResolvingCustomerAction && !nextCustomerRevealed && !!game.selectedPos;
  const showDecisionButtons =
    !isResolvingCustomerAction && nextCustomerRevealed && !!game.decisionNeeded;

  const {
    isRendered: renderSelectQueuePrompt,
    opacity: selectQueuePromptOpacity,
  } = useFade(showSelectQueuePrompt, 220);
  const {
    isRendered: renderRevealNextCustomerButton,
    opacity: revealNextCustomerButtonOpacity,
  } = useFade(showRevealNextCustomerButton, 220);
  const { isRendered: renderDecisionButtons, opacity: decisionButtonsOpacity } =
    useFade(showDecisionButtons, 220);

  // ===== Reveal Next Customer ===== //
  async function revealNextCustomer(gameState: GameState) {
    if (
      !gameState.deck.length ||
      gameState.selectedPos?.queueIndex === undefined
    )
      return;

    setIsResolvingCustomerAction(true);

    try {
      saveUndoState(structuredClone(gameState));

      const { selectedPos } = gameState;
      const topCard = top(gameState.deck)!;
      const targetQueue = gameState.queues[selectedPos.queueIndex];
      const nextCustomerFits = checkNextCustomerFits(
        selectedPos,
        topCard,
        targetQueue,
      );

      setGame(
        produce(gameState, (draft) => {
          draft.deck[draft.deck.length - 1].faceUp = true;

          if (nextCustomerFits) {
            const customer = draft.deck.pop()!;
            draft.queues[selectedPos.queueIndex].splice(
              selectedPos.cardIndex,
              0,
              customer,
            );
            draft.selectedPos = undefined;
            const { ended, won } = evaluateEnd(draft as GameState);
            draft.ended = ended;
            draft.won = won;
          } else {
            draft.decisionNeeded = true;
          }
        }),
      );
    } finally {
      setIsResolvingCustomerAction(false);
    }
  }

  // ===== Let Customer Stay ===== //
  async function placeCustomer(gameState: GameState) {
    if (!top(gameState.deck) || gameState.selectedPos?.queueIndex === undefined)
      return;

    setIsResolvingCustomerAction(true);

    try {
      saveUndoState(structuredClone(gameState));

      const { selectedPos } = gameState;
      const queueToDiscard = gameState.queues[selectedPos.queueIndex];

      setGame(
        produce(gameState, (draft) => {
          const customer = draft.deck.pop()!;
          draft.queues[selectedPos.queueIndex] = [customer];
          draft.discard.push(...flipAllToBack(queueToDiscard));
          updatedDiscardsByRank(draft.discardsByRank, queueToDiscard);
          draft.selectedPos = undefined;
          draft.decisionNeeded = false;
          const { ended, won } = evaluateEnd(draft as GameState);
          draft.ended = ended;
          draft.won = won;
        }),
      );
    } finally {
      setIsResolvingCustomerAction(false);
    }
  }

  // ===== Quick Customer Out ===== //
  async function kickOutCustomer(gameState: GameState) {
    if (!top(gameState.deck) || gameState.selectedPos?.queueIndex === undefined)
      return;

    setIsResolvingCustomerAction(true);

    try {
      saveUndoState(structuredClone(gameState));

      // Discard the revealed card
      setGame((draft) => {
        if (draft.deck.length === 0) return;
        const card = draft.deck.pop()!;
        draft.discard.push(flipToBack(card));
        updatedDiscardsByRank(draft.discardsByRank, [card]);
      });

      await delay(400);

      // Reveal the next card
      setGame((draft) => {
        if (draft.deck.length > 0) {
          draft.deck[draft.deck.length - 1].faceUp = true;
        }
      });

      await delay(1000);

      // Discard the next card and clear decision state
      setGame((draft) => {
        if (draft.deck.length > 0) {
          const card = draft.deck.pop()!;
          draft.discard.push(flipToBack(card));
          updatedDiscardsByRank(draft.discardsByRank, [card]);
        }
        draft.decisionNeeded = false;
        draft.selectedPos = undefined;
        const { ended, won } = evaluateEnd(draft as GameState);
        draft.ended = ended;
        draft.won = won;
      });

      await delay();
    } finally {
      setIsResolvingCustomerAction(false);
    }
  }

  // ========== Card Mapping ========== //
  const positioning = {
    queueCardOffset: 0.42,
    btnColWidth: 0.8,
    queueHeight: 4.25,
    queueRowStart: 2.75,
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
        fan: {
          direction: "down",
          offset: positioning.queueCardOffset,
          center: false,
        },
      });
      queueZones.push({
        id: `btns-${i}`,
        col: i * (positioning.btnColWidth + 1) + 1,
        row: positioning.queueRowStart,
        width: positioning.btnColWidth,
        height: positioning.queueHeight,
      });
    }

    if (game.selectedPos) {
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
        col: game.selectedPos.queueIndex * (positioning.btnColWidth + 1),
        row: positioning.queueRowStart,
        baseZIndex:
          game.selectedPos.queueIndex +
          positioning.queueZIndexIncrement +
          game.selectedPos.cardIndex -
          1,
      });
    }

    return [
      {
        id: "rankTally",
        col: 0,
        row: 0,
        width: "full",
        height: 1.14,
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 2,
        row: 1.4,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "left" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 4,
        row: 1.4,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: "Discard", infoPos: "right" },
      },
      ...queueZones,
      {
        id: "actionBtns",
        col: 0,
        row: 7,
        width: "full",
        height: 0.75,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    let selectColor: CardColor = "none";
    let isSelected = undefined;
    let yOffset: number | undefined = undefined;
    let forceOverlayColor = false;
    let forceSelectColor = false;
    let clickThroughCards: boolean | undefined = undefined;

    // Placeholder card
    if (game.selectedPos && mappedCard.zoneName === "selected-placeholder") {
      selectColor = game.decisionNeeded ? "red" : "purple";
      forceOverlayColor = true;
      forceSelectColor = true;

      yOffset = game.selectedPos.cardIndex * positioning.queueCardOffset;
    } else if (
      game.selectedPos !== undefined &&
      mappedCard.pileIndex === game.selectedPos.queueIndex &&
      mappedCard.cardIndex !== undefined &&
      mappedCard.cardIndex >= game.selectedPos.cardIndex
    ) {
      // Shift card down if under the placeholder
      yOffset = positioning.queueCardOffset;
    }

    // Click through deck cards
    if (mappedCard.zoneName === "deck") {
      clickThroughCards = true;
    }

    return {
      isSelected,
      forceSelectColor,
      forceOverlayColor,
      selectColor,
      yOffset,
      clickThroughCards,
    };
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0,
    cardMapper,
    zoneMapper: (zone) => {
      if (zone.id !== "deck") return;

      return {
        onPress: () => setShowDeckPreview(true),
        isDisabled: game.deck.length === 0,
      };
    },
    cardSize: "small",
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won ? undefined : "Discarded the fourth card of a rank."
      }
      score={score}
      canUndo={canUndo}
      undo={undo}
    >
      <DeckPreviewModal
        visible={showDeckPreview}
        cards={game.deck}
        onClose={() => setShowDeckPreview(false)}
        onCardsChange={(nextDeck) => {
          setGame((draft) => {
            draft.deck = nextDeck;
          });
        }}
        title="Deck Preview"
        shuffleOnClose
        sortCards
      />

      {cardMap}

      {/* Rank Tallies */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
          getZoneStylesById("rankTally"),
        ]}
      >
        {RANKS.map((rank) => {
          const discardCount = game.discardsByRank[rank];

          return (
            <View
              key={rank}
              style={[
                flexStyles.colCentered,
                flexStyles.flex1,
                {
                  gap: spacing(6),
                },
              ]}
            >
              <View
                key={rank}
                style={[
                  flexStyles.colCentered,
                  { flexDirection: "column-reverse", gap: spacing(6) },
                ]}
              >
                {Array.from({ length: 4 }, (_, i) => {
                  let bgColor: string | undefined = undefined;

                  if (i < discardCount) {
                    if (i === 0) bgColor = Colors.cardSelectGreen;
                    if (i === 1) bgColor = Colors.cardSelectYellow;
                    if (i === 2) bgColor = Colors.cardSelectOrange;
                    if (i === 3) bgColor = Colors.cardSelectRed;
                  }

                  return (
                    <View
                      key={`discard-by-rank-${rank}-${i}`}
                      style={[
                        transitionStyles.all05sec,
                        {
                          display: "flex",
                          width: spacing(8),
                          height: spacing(8),
                          borderRadius: spacing(4),
                          backgroundColor: bgColor ?? rgba(Colors.black, 0.5),
                          boxShadow: bgColor ? `0 0 3px ${bgColor}` : undefined,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <Text
                size="sm"
                style={[
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
            flexStyles.flex1,
            getZoneStylesById(`btns-${queueIndex}`),
            { gap: spacing(14) },
          ]}
        >
          {Array.from({ length: queue.length + 1 }, (_, i) => {
            const isSelected =
              game.selectedPos?.queueIndex === queueIndex &&
              game.selectedPos.cardIndex === i;

            let backgroundColor: string = "";
            let textColor: string = "";

            if (isSelected) {
              textColor = Colors.white;
              backgroundColor = game.decisionNeeded
                ? Colors.cardSelectRed
                : Colors.cardSelectPurple;
            } else {
              textColor = game.decisionNeeded ? Colors.K600 : Colors.K100;
              backgroundColor = game.decisionNeeded
                ? Colors.K800
                : rgba(Colors.K900, 0.8);
            }

            return (
              <Pressable
                key={`select-pos-${queueIndex}-${i}`}
                onPress={() => {
                  if (isSelected) {
                    setGame((draft) => {
                      draft.selectedPos = undefined;
                    });
                  } else {
                    setGame((draft) => {
                      draft.selectedPos = { queueIndex, cardIndex: i };
                    });
                  }
                }}
                disabled={game.decisionNeeded}
                style={[
                  flexStyles.colCentered,
                  transitionStyles.all02sec,
                  {
                    alignItems: "flex-end",
                    position: "absolute",
                    padding: spacing(10),
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
                    backgroundColor,
                    zIndex: i * 2 - 2,
                  },
                ]}
              >
                <Text size="sm" weight={500} color={textColor}>
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
        {renderSelectQueuePrompt && (
          <Animated.View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              flexStyles.fullHeight,
              {
                ...StyleSheet.absoluteFill,
                opacity: selectQueuePromptOpacity,
                backgroundColor: zoneBg,
                borderRadius: cardWidth * 0.2,
              },
            ]}
          >
            <Text
              size="sm"
              weight={400}
              color={cardText}
              style={{
                textAlign: "center",
              }}
            >
              Select queue position for next customer
            </Text>
          </Animated.View>
        )}

        {renderRevealNextCustomerButton && (
          <Animated.View
            style={[
              flexStyles.rowCentered,
              {
                opacity: revealNextCustomerButtonOpacity,
                ...StyleSheet.absoluteFill,
              },
            ]}
          >
            <Button
              text="Reveal next customer"
              onPress={() => {
                revealNextCustomer(game);
              }}
              disabled={game.selectedPos === undefined}
              theme="purple"
              style={{ flex: 1 }}
              taller
            />
          </Animated.View>
        )}

        {renderDecisionButtons && (
          <Animated.View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              {
                opacity: decisionButtonsOpacity,
                ...StyleSheet.absoluteFill,
                gap: cardWidth * 0.25,
              },
            ]}
          >
            <Button
              text="Let them stay"
              onPress={() => {
                if (game.selectedPos?.queueIndex !== undefined) {
                  setGame((draft) => {
                    draft.selectedPos = undefined;
                  });
                  placeCustomer(game);
                }
              }}
              disabled={game.selectedPos === undefined}
              style={{ flex: 1 }}
              taller
              theme="blue"
            />
            <Button
              text="Kick them out"
              onPress={() => {
                if (game.selectedPos?.queueIndex !== undefined) {
                  kickOutCustomer(game);
                }
              }}
              disabled={game.selectedPos === undefined}
              taller
              style={{ flex: 1 }}
              theme="orange"
            />
          </Animated.View>
        )}
      </View>
    </GameWrapper>
  );
}
