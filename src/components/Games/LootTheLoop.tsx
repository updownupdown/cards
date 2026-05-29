import { useContentWidth } from "@/hooks/useContentWidth";
import { useGameLoading } from "@/hooks/useGameLoading";
import { buttonTransition } from "@/styles/buttonStyles";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, ContentSidePadding, rgba } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { View, ViewStyle } from "react-native";
import { Button } from "../Button/Button";
import {
  cardBorderRadiusRatio,
  CardSelectColor,
  useCardSize,
} from "../Cards/Card";
import {
  CardSuit,
  createDeck,
  isNumberRank,
  RANK_VALUE,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";

const loopCardTranslate = 14;
const firstCardAngleIncrease = 12;
const secondCardAngleIncrease = 4;
const gapAngle = 46;

const maxMarkedPaths = 3;
const exploreTransitionInMs = 1200;
const cardsPerRow = {
  loop: 5,
  markedPaths: 5,
  loot: 7,
};

export type LoopRank = PlayingCard["rank"] | "Joker";

type LoopCard = {
  id: string;
  suit: CardSuit;
  rank: LoopRank;
  faceUp: boolean;
};

type LoopState = {
  deck: LoopCard[];
  deckPos: number;
  notes: LoopCard[];
  scorePile: LoopCard[];
  ended: boolean;
  won: boolean;
};

function isFace(card: LoopCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}
function isAce(card: LoopCard) {
  return card.rank === "A";
}
function isJoker(card: LoopCard) {
  return card.rank === "Joker";
}
function rankValue(card: LoopCard) {
  if (card.rank === "Joker") return 0;
  return RANK_VALUE[card.rank];
}
function countAces(score: LoopCard[]) {
  return score.filter(isAce).length;
}
function isBadStartCard(card: LoopCard) {
  return isJoker(card) || isAce(card) || isFace(card);
}

function setup(): LoopState {
  const base: LoopCard[] = createDeck({ faceUp: false }).map((card) => ({
    ...card,
    rank: card.rank as LoopRank,
    faceUp: false,
  }));

  const withJoker: LoopCard[] = [
    ...base,
    { id: "joker-loop", suit: "spades", rank: "Joker", faceUp: false },
  ];

  let deck: LoopCard[];
  // Ensure first two cards are not both face cards
  do {
    deck = shuffle(withJoker);
  } while (isBadStartCard(deck[0]) && isBadStartCard(deck[1]));

  return {
    deck,
    deckPos: 0,
    notes: [],
    scorePile: [],
    ended: false,
    won: false,
  };
}

export default function LootTheLoop() {
  const isLoaded = useGameLoading();
  const { contentRadius } = useContentWidth();
  const { width: cardWidth, height: cardHeight } = useCardSize(
    cardsPerRow.loop,
  );
  const [game, setGame] = useState<LoopState>(setup);

  const [selectedCardIndex, setSelectedCardIndex] = useState<
    number | undefined
  >(undefined);

  const [selectedNoteIndex, setSelectedNoteIndex] = useState<
    { card: LoopCard; index: number } | undefined
  >(undefined);

  const [selectedRevealedRank, setSelectedRevealedRank] = useState<
    number | undefined
  >(undefined);

  useEffect(() => {
    const selectedRevealedIsNumber = !!(
      selectedCardIndex !== undefined &&
      game.deck[selectedCardIndex].faceUp &&
      isNumberRank(game.deck[selectedCardIndex].rank)
    );

    setSelectedRevealedRank(
      selectedRevealedIsNumber
        ? RANK_VALUE[game.deck[selectedCardIndex].rank]
        : undefined,
    );
  }, [selectedCardIndex]);

  function reset() {
    setSelectedCardIndex(undefined);
    setGame(setup());
  }

  // Look around
  function lookAround() {
    setGame((prev) => {
      // Turn two cards up in current and next position
      const updated = prev;

      const index0 = prev.deckPos;
      const index1 = (prev.deckPos + 1) % prev.deck.length;

      updated.deck[index0] = { ...updated.deck[index0], faceUp: true };
      updated.deck[index1] = { ...updated.deck[index1], faceUp: true };

      return updated;
    });

    setSelectedCardIndex(game.deckPos);
  }

  // Mark path
  function markPath(selectedCardIndex: number) {
    const pathToMark = game.deck[selectedCardIndex];
    if (
      game.notes.length >= maxMarkedPaths ||
      !pathToMark.faceUp ||
      !isNumberRank(pathToMark.rank)
    ) {
      return;
    }

    setSelectedCardIndex(undefined);

    setGame((prev) => {
      return {
        ...prev,
        notes: [...prev.notes, pathToMark],
        deck: [...prev.deck.toSpliced(selectedCardIndex, 1)],
      };
    });
  }

  const [isExploring, setIsExploring] = useState(false);

  useEffect(() => {
    if (isExploring && selectedCardIndex !== undefined) {
      explore(selectedCardIndex);
    }
  }, [isExploring]);

  // Explore
  function explore(selectedCardIndex: number) {
    setSelectedCardIndex(undefined);
    setGame((prev) => {
      const selectedCard = prev.deck[selectedCardIndex];

      // Can't explore
      if (
        !selectedCard ||
        !selectedCard.faceUp ||
        !isNumberRank(selectedCard.rank)
      ) {
        return prev;
      }

      const updated = prev;

      const movedBy = rankValue(selectedCard);
      const newDeckPos = (prev.deckPos + movedBy) % prev.deck.length;

      updated.deckPos = newDeckPos;

      const newTopCard = updated.deck[newDeckPos];
      const deck = prev.deck;

      if (newTopCard.faceUp && isFace(newTopCard)) {
        // Lose due to landing on face card
        return { ...updated, ended: true, won: false };
      } else if (newTopCard.faceUp && isJoker(newTopCard)) {
        // Win by having all aces and landing on joker/exit
        if (countAces(updated.scorePile) === 4) {
          return { ...updated, ended: true, won: true };
        } else {
          // Landing on joker without all aces does nothing
          return updated;
        }
      } else if (
        newTopCard.faceUp &&
        (isAce(newTopCard) || isNumberRank(newTopCard.rank))
      ) {
        // Add newTopCard to scorePile, and remove from deck
        const newScorePile = [...updated.scorePile, newTopCard];
        updated.deck = updated.deck.toSpliced(newDeckPos, 1);

        if (deck.length === 0) {
          return {
            ...updated,
            scorePile: newScorePile,
            ended: true,
            won: false,
          };
        }
      }

      return updated;
    });

    setTimeout(() => {
      setIsExploring(false);
    }, exploreTransitionInMs);
  }

  function returnToMarked(pathCard: LoopCard, indexOfPathCard: number) {
    setSelectedCardIndex(undefined);

    setGame((prev) => {
      // Remove cards from notes
      const notes = prev.notes.filter((_, i) => i !== indexOfPathCard);

      // Insert path card in deck
      const deck = prev.deck.toSpliced(prev.deckPos, 0, pathCard);

      // Selected newly inserted card
      setSelectedCardIndex(prev.deckPos);

      return { ...prev, deck, notes };
    });
  }

  function returnToSelectedMarkedPath() {
    if (selectedNoteIndex !== undefined) {
      setSelectedNoteIndex(undefined);
      returnToMarked(selectedNoteIndex.card, selectedNoteIndex.index);
    }
  }

  const canMarkPath = useMemo(() => {
    return (
      selectedCardIndex !== undefined &&
      isNumberRank(game.deck[selectedCardIndex].rank) &&
      game.deck[selectedCardIndex].faceUp &&
      game.notes.length < maxMarkedPaths
    );
  }, [selectedCardIndex, game.notes, game.deck]);

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "You escaped with all four jewels."
          : "You were trapped or hit a revealed trap."
      }
    >
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.fullWidth,
          flexStyles.gap20,
          flexStyles.flex1,
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.flex1,
            {
              position: "relative",
              aspectRatio: 1,
              marginBottom: ContentSidePadding * 2,
            },
          ]}
        >
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.gap14,
              {
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -60%)",
              },
            ]}
          >
            <View style={[flexStyles.rowCentered, flexStyles.gap20]}>
              {/* Trinkets */}
              <Deck
                cards={game.scorePile.filter((card) => card.rank !== "A")}
                cardsPerRow={cardsPerRow.loot}
                showCount
                countPosition="left"
                limitFan
                fan="horizontalLeft"
              />

              {/* Aces */}
              <Deck
                cards={game.scorePile.filter((card) => card.rank === "A")}
                cardsPerRow={cardsPerRow.loot}
                showCount
                countPosition="right"
                limitFan
                fan="horizontalRight"
              />
            </View>

            {/* Marked Paths */}
            <View style={[flexStyles.rowCentered, flexStyles.gap6]}>
              {Array.from({ length: maxMarkedPaths }, (_, index) => {
                const noteCard: LoopCard | undefined = game.notes[index];
                const isSelected = selectedNoteIndex?.index === index;

                const MarkButton = (
                  <Button
                    onPress={() => {
                      if (selectedCardIndex !== undefined) {
                        markPath(selectedCardIndex);
                      }
                    }}
                    text="Mark"
                    theme="green"
                    style={[
                      {
                        ...buttonTransition,
                        width: "88%",
                        height: "90%",
                        borderRadius: cardWidth * 0.1,
                        padding: 0,
                        opacity: canMarkPath && !noteCard ? 1 : 0,
                        pointerEvents:
                          canMarkPath && !noteCard ? undefined : "none",
                      },
                    ]}
                    textStyle={[
                      {
                        fontSize: cardWidth * 0.2,
                        lineHeight: cardWidth * 0.22,
                      },
                    ]}
                  />
                );

                return (
                  <CardButton
                    key={`note-${index}`}
                    onPress={
                      noteCard
                        ? () => {
                            setSelectedCardIndex(undefined);
                            setSelectedNoteIndex(
                              selectedNoteIndex?.index === index
                                ? undefined
                                : { card: noteCard, index },
                            );
                          }
                        : undefined
                    }
                    cardsPerRow={cardsPerRow.markedPaths}
                    suit={noteCard?.suit}
                    rank={noteCard?.rank}
                    isPlaceholder={!noteCard}
                    selectColor={"green"}
                    isSelected={isSelected}
                    placeholderContent={MarkButton}
                  />
                );
              })}
            </View>
          </View>

          {/* ========== Loop ========== */}
          {game.deck.map((card, index) => {
            const deckLength = game.deck.length;
            const isSelected = selectedCardIndex === index;
            const isLookAround = index === game.deckPos && !card.faceUp;
            const isExploreTarget = !!(
              selectedRevealedRank !== undefined &&
              selectedCardIndex !== undefined &&
              index === (selectedCardIndex + selectedRevealedRank) % deckLength
            );
            const isPotentialPathTarget = !!(
              selectedNoteIndex?.index !== undefined &&
              index ===
                (RANK_VALUE[selectedNoteIndex.card.rank] + game.deckPos - 1) %
                  deckLength
            );

            // Style

            const eachCardAngle = (360 - gapAngle) / deckLength;
            let angle =
              index * eachCardAngle - 180 - game.deckPos * eachCardAngle;
            const translate =
              isSelected || isExploreTarget ? loopCardTranslate : 0;
            let zIndex = 100 - index;

            if (index < game.deckPos) {
              angle -= gapAngle;
              zIndex -= deckLength + index;
            }

            if (index === game.deckPos && selectedNoteIndex === undefined) {
              angle -= firstCardAngleIncrease;
            } else if (
              index === game.deckPos + 1 &&
              selectedNoteIndex === undefined
            ) {
              angle -= secondCardAngleIncrease;
            }

            const style: ViewStyle = {
              position: "absolute",
              transform: [
                { rotate: `${angle}deg` },
                { translateY: contentRadius * -1 + translate },
              ],
              zIndex,
              transitionDuration: isExploring
                ? `${exploreTransitionInMs / 1000}s`
                : "0.5s",
            };

            const onPressFn = () => {
              if (index !== game.deckPos && index !== game.deckPos + 1) {
                return undefined;
              }

              if (!card.faceUp) {
                if (index === game.deckPos) {
                  return lookAround;
                }
                return undefined;
              }

              return () => {
                if (selectedNoteIndex !== undefined) {
                  setSelectedNoteIndex(undefined);
                }
                setSelectedCardIndex(
                  selectedCardIndex === index ? undefined : index,
                );
              };
            };

            const selectedColor = () => {
              if (isLookAround) {
                return "blue" as CardSelectColor;
              } else if (index === selectedCardIndex) {
                return "blue" as CardSelectColor;
              } else if (isExploreTarget) {
                return "purple" as CardSelectColor;
              } else if (isPotentialPathTarget) {
                return "green" as CardSelectColor;
              }
              return "blue" as CardSelectColor;
            };

            // Loop Card
            return (
              <CardButton
                key={`deck-${index}`}
                onPress={onPressFn()}
                suit={card.faceUp ? card.suit : undefined}
                rank={card.faceUp ? card.rank : undefined}
                style={[style]}
                isSelected={isSelected}
                selectColor={selectedColor()}
                forceSelectColor={isExploreTarget || isPotentialPathTarget}
                forceOverlay={
                  isExploreTarget || isPotentialPathTarget || isLookAround
                }
                cardsPerRow={cardsPerRow.loop}
              />
            );
          })}

          {/* Ghost "return to marked path" card */}
          <Button
            onPress={returnToSelectedMarkedPath}
            text="Return"
            theme="green"
            style={[
              {
                ...buttonTransition,
                position: "absolute",
                pointerEvents:
                  selectedNoteIndex !== undefined ? undefined : "none",
                opacity: selectedNoteIndex !== undefined ? 1 : 0,
                zIndex: 1000,
                transform: [
                  {
                    rotate:
                      selectedNoteIndex !== undefined
                        ? `${firstCardAngleIncrease * -1}deg`
                        : `${firstCardAngleIncrease * -2}deg`,
                  },
                  { translateY: contentRadius - loopCardTranslate },
                ],
                width: cardWidth,
                height: cardHeight,
                borderRadius: cardWidth * cardBorderRadiusRatio,
                backgroundColor: rgba(Colors.btnGreen, 0.3),
              },
            ]}
            textStyle={[
              {
                fontSize: cardWidth * 0.2,
                lineHeight: cardWidth * 0.22,
              },
            ]}
          />
        </View>

        {/* ----- Buttons ----- */}
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.gap12,
          ]}
        >
          <Button
            text="Explore"
            onPress={() => {
              if (selectedCardIndex !== undefined) {
                setIsExploring(true);
              }
            }}
            disabled={
              selectedCardIndex === undefined ||
              !isNumberRank(game.deck[selectedCardIndex].rank) ||
              !game.deck[selectedCardIndex].faceUp
            }
            style={[flexStyles.flex1]}
            theme={"purple"}
          />

          <Button
            text="Return to Path"
            onPress={returnToSelectedMarkedPath}
            disabled={selectedNoteIndex === undefined}
            style={[flexStyles.flex1]}
            theme={"green"}
          />

          <Button
            text="Look Around"
            onPress={lookAround}
            disabled={
              game.ended ||
              game.deck.length === 0 ||
              game.deck[game.deckPos].faceUp
            }
            style={[flexStyles.flex1]}
            theme={"blue"}
          />
        </View>
      </View>
    </GameWrapper>
  );
}
