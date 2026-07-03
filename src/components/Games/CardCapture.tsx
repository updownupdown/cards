import { useStateManager } from "@/hooks/useStateManager";
import { useEffect } from "react";
import {
  createDeck,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { View } from "react-native";
import { Text } from "../common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { Button } from "../Button/Button";

function getCardValue(card: PlayingCard): number {
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  if (card.rank === "K") return 13;
  if (card.rank === "A") return 14;
  if (card.rank === "Joker") return 0; // Joker has special handling
  return rankValue(card);
}

function isJoker(card: PlayingCard): boolean {
  return card.rank === "Joker";
}

function isFaceCard(card: PlayingCard): boolean {
  return ["J", "Q", "K", "A"].includes(card.rank);
}

function createPersonalDeck(): PlayingCard[] {
  const deck = createDeck();
  const personal = deck.filter((card) => {
    if (card.rank === "Joker") return true;
    const val = rankValue(card);
    return val >= 2 && val <= 4;
  });
  return shuffle(personal);
}

function createEnemyDeck(): PlayingCard[] {
  const deck = createDeck();
  const enemy = deck.filter((card) => {
    if (card.rank === "Joker") return false;
    const val = rankValue(card);
    return val >= 5;
  });
  return shuffle(enemy);
}

type GamePhase =
  | "enemyPhase"
  | "discardPhase"
  | "drawPhase"
  | "capturePhase"
  | "gameOver";

type GameState = {
  personalDeck: PlayingCard[];
  personalDiscard: PlayingCard[];
  enemyDeck: PlayingCard[];
  enemyRow: (PlayingCard | null)[];
  enemyCaptured: PlayingCard[];
  hand: PlayingCard[];
  phase: GamePhase;
  round: number;
  gameWon: boolean;
  gameLost: boolean;
  selectedForCapture: PlayingCard[];
  selectedForSacrifice: PlayingCard[];
  targetEnemyIdx: number | null;
  message: string;
};

function setupGame(): GameState {
  const personalDeck = createPersonalDeck();
  const enemyDeck = createEnemyDeck();

  // Draw 4 cards from enemy deck
  const initialRow: (PlayingCard | null)[] = [null, null, null, null];
  const tempEnemyDeck = [...enemyDeck];

  for (let i = 0; i < 4; i++) {
    if (tempEnemyDeck.length > 0) {
      const card = tempEnemyDeck.shift()!;
      if (isFaceCard(card)) {
        tempEnemyDeck.push(card); // Move face card to bottom
      } else {
        initialRow[i] = card;
      }
    }
  }

  // Draw initial hand
  const hand: PlayingCard[] = [];
  while (hand.length < 4 && tempEnemyDeck.length > 0) {
    hand.push(personalDeck.shift()!);
  }

  return {
    personalDeck,
    personalDiscard: [],
    enemyDeck: tempEnemyDeck,
    enemyRow: initialRow,
    enemyCaptured: [],
    hand,
    phase: "enemyPhase",
    round: 1,
    gameWon: false,
    gameLost: false,
    selectedForCapture: [],
    selectedForSacrifice: [],
    targetEnemyIdx: null,
    message: "Starting game. Enemy is refreshing forces...",
  };
}

const gameStateInitial: GameState = setupGame();

export default function CardCapture() {
  const scale = useResponsiveScale();

  const {
    game,
    setGame,
    reset,
    isLoaded,
    showIntro,
    setShowIntro,
    canUndo,
    undo,
  } = useStateManager({
    gameStateInitial,
    resetAndSetup: async () => {
      setGame((draft) => {
        const newGame = setupGame();
        Object.assign(draft, newGame);
      });
    },
    resetNonGameStates: () => {
      // No additional UI state to reset
    },
  });

  // Enemy Phase
  useEffect(() => {
    if (game.phase !== "enemyPhase") return;

    const timer = setTimeout(() => {
      setGame((draft) => {
        // Move cards right and refill
        let newRow = [...draft.enemyRow];
        let newEnemyDeck = [...draft.enemyDeck];

        // Move cards right to fill gaps
        const compacted = newRow.filter((c) => c !== null);
        newRow = [...compacted, ...Array(4 - compacted.length).fill(null)];

        // Refill empty positions from enemy deck
        for (let i = 0; i < 4; i++) {
          if (newRow[i] === null && newEnemyDeck.length > 0) {
            let card = newEnemyDeck.shift()!;
            // Keep moving face cards to bottom
            while (isFaceCard(card) && newEnemyDeck.length > 0) {
              newEnemyDeck.push(card);
              card = newEnemyDeck.shift()!;
            }
            if (!isFaceCard(card)) {
              newRow[i] = card;
            }
          }
        }

        draft.enemyRow = newRow;
        draft.enemyDeck = newEnemyDeck;
        draft.phase = "discardPhase";
        draft.message = "Discard Phase: discard any cards you don't need";
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [game.phase, setGame]);

  // Draw Phase (after discard)
  useEffect(() => {
    if (game.phase !== "drawPhase") return;

    const timer = setTimeout(() => {
      setGame((draft) => {
        let newHand = [...draft.hand];
        let newPersonalDeck = [...draft.personalDeck];
        let newPersonalDiscard = [...draft.personalDiscard];

        // Draw until 4 cards
        while (newHand.length < 4) {
          if (newPersonalDeck.length > 0) {
            newHand.push(newPersonalDeck.shift()!);
          } else if (newPersonalDiscard.length > 0) {
            // Reshuffle discard
            newPersonalDeck = shuffle(newPersonalDiscard);
            newPersonalDiscard = [];
            if (newPersonalDeck.length > 0) {
              newHand.push(newPersonalDeck.shift()!);
            }
          } else {
            break;
          }
        }

        draft.hand = newHand;
        draft.personalDeck = newPersonalDeck;
        draft.personalDiscard = newPersonalDiscard;
        draft.phase = "capturePhase";
        draft.message = "Capture Phase: choose your action";
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [game.phase, setGame]);

  const handleDiscard = (card: PlayingCard) => {
    if (game.phase !== "discardPhase") return;

    setGame((draft) => {
      draft.hand = draft.hand.filter(
        (c: PlayingCard) => !(c.suit === card.suit && c.rank === card.rank),
      );
      draft.personalDiscard.push(card);
    });
  };

  const handleEndDiscard = () => {
    if (game.phase !== "discardPhase") return;
    setGame((draft) => {
      draft.phase = "drawPhase";
      draft.message = "Drawing cards...";
    });
  };

  const toggleCardForCapture = (card: PlayingCard, enemyIdx: number) => {
    if (game.phase !== "capturePhase") return;

    setGame((draft) => {
      const idx = draft.selectedForCapture.findIndex(
        (c: PlayingCard) => c.suit === card.suit && c.rank === card.rank,
      );

      if (idx >= 0) {
        // Deselect
        draft.selectedForCapture.splice(idx, 1);
        if (draft.selectedForCapture.length === 0) {
          draft.targetEnemyIdx = null;
        }
      } else {
        // Select
        draft.selectedForCapture.push(card);
        draft.targetEnemyIdx = enemyIdx;
      }
    });
  };

  const calculateCaptureValue = (cards: PlayingCard[]): number => {
    let total = 0;
    let jokerCount = 0;

    for (const card of cards) {
      if (isJoker(card)) {
        jokerCount++;
      } else {
        total += getCardValue(card);
      }
    }

    // Jokers can be used as any value - for now just return total + jokers
    // This simplifies to: jokers add flexibility
    return total;
  };

  const canCaptureEnemy = (
    cards: PlayingCard[],
    enemy: PlayingCard,
    cardSuit: string,
  ): boolean => {
    // Check if all non-joker cards match suit
    const nonJokers = cards.filter((c) => !isJoker(c));
    if (nonJokers.length === 0) {
      // All jokers - can use as any suit
      return true;
    }

    const allSameSuit = nonJokers.every((c) => c.suit === cardSuit);
    if (!allSameSuit) {
      return false;
    }

    // Calculate value
    const baseValue = nonJokers.reduce((sum, c) => sum + getCardValue(c), 0);
    const jokerCount = cards.filter((c) => isJoker(c)).length;

    // Each joker can add any value needed - simplified: if we have any jokers and base value is close, it works
    const enemyValue = getCardValue(enemy);
    if (jokerCount > 0) {
      return baseValue + 10 * jokerCount >= enemyValue; // Jokers can be up to 10 each as added value
    }

    return baseValue >= enemyValue;
  };

  const handleCapture = () => {
    if (game.selectedForCapture.length === 0 || game.targetEnemyIdx === null) {
      return;
    }

    const targetCard = game.enemyRow[game.targetEnemyIdx];
    if (!targetCard) return;

    // Check if capture is valid
    if (
      !canCaptureEnemy(game.selectedForCapture, targetCard, targetCard.suit)
    ) {
      setGame((draft) => {
        draft.message = "Invalid capture - not enough value or wrong suit";
      });
      return;
    }

    setGame((draft) => {
      // Move captured and spent cards to discard
      draft.personalDiscard.push(...draft.selectedForCapture);
      draft.personalDiscard.push(targetCard);

      // Remove from enemy row
      draft.enemyRow[draft.targetEnemyIdx!] = null;

      // Remove from hand
      for (const card of draft.selectedForCapture) {
        const idx = draft.hand.findIndex(
          (c: PlayingCard) => c.suit === card.suit && c.rank === card.rank,
        );
        if (idx >= 0) draft.hand.splice(idx, 1);
      }

      // Check if enemy deck and row are empty
      const isGameWon =
        draft.enemyDeck.length === 0 &&
        draft.enemyRow.every((c: PlayingCard | null) => c === null);

      if (isGameWon) {
        draft.selectedForCapture = [];
        draft.targetEnemyIdx = null;
        draft.phase = "gameOver";
        draft.gameWon = true;
        draft.message = "You won! All enemies captured!";
      } else {
        // Start next round
        draft.selectedForCapture = [];
        draft.targetEnemyIdx = null;
        draft.round += 1;
        draft.phase = "enemyPhase";
        draft.message = "Enemy captured! Next round...";
      }
    });
  };

  const handleLetEnemyCapture = (cardToLose: PlayingCard) => {
    if (game.phase !== "capturePhase") return;

    const enemyCard = game.enemyRow[0];
    if (!enemyCard) return;

    // Check if we're losing a face card
    if (isFaceCard(cardToLose)) {
      setGame((draft) => {
        draft.phase = "gameOver";
        draft.gameLost = true;
        draft.message = `You lost! Face card captured: ${cardToLose.rank}${cardToLose.suit}`;
      });
      return;
    }

    setGame((draft) => {
      // Remove from hand and add both to enemy captured
      draft.hand = draft.hand.filter(
        (c: PlayingCard) =>
          !(c.suit === cardToLose.suit && c.rank === cardToLose.rank),
      );
      draft.enemyCaptured.push(enemyCard);
      draft.enemyCaptured.push(cardToLose);
      draft.enemyRow[0] = null;
      draft.round += 1;
      draft.phase = "enemyPhase";
      draft.message = "Enemy captured your card. Next round...";
    });
  };

  const toggleCardForSacrifice = (card: PlayingCard) => {
    if (game.phase !== "capturePhase" || isFaceCard(card)) return;

    setGame((draft) => {
      const idx = draft.selectedForSacrifice.findIndex(
        (c: PlayingCard) => c.suit === card.suit && c.rank === card.rank,
      );

      if (idx >= 0) {
        draft.selectedForSacrifice.splice(idx, 1);
      } else {
        if (draft.selectedForSacrifice.length < 2) {
          draft.selectedForSacrifice.push(card);
        }
      }
    });
  };

  const handleSacrifice = (enemyIdx: number) => {
    if (game.selectedForSacrifice.length !== 2 || game.phase !== "capturePhase")
      return;

    const targetCard = game.enemyRow[enemyIdx];
    if (!targetCard) return;

    // Check for face cards
    if (game.selectedForSacrifice.some((c: PlayingCard) => isFaceCard(c))) {
      setGame((draft) => {
        draft.message = "Cannot sacrifice face cards!";
      });
      return;
    }

    setGame((draft) => {
      // Remove sacrifice cards from hand
      for (const card of draft.selectedForSacrifice) {
        const idx = draft.hand.findIndex(
          (c: PlayingCard) => c.suit === card.suit && c.rank === card.rank,
        );
        if (idx >= 0) draft.hand.splice(idx, 1);
      }

      // Add to enemy captured
      draft.enemyCaptured.push(...draft.selectedForSacrifice);

      // Move target to bottom of enemy deck
      draft.enemyRow[enemyIdx] = null;
      draft.enemyDeck.push(targetCard);

      draft.selectedForSacrifice = [];
      draft.round += 1;
      draft.phase = "enemyPhase";
      draft.message = "Card sacrificed. Next round...";
    });
  };

  const getSuitSymbol = (suit: string): string => {
    const symbols: Record<string, string> = {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    };
    return symbols[suit.toLowerCase()] || suit;
  };

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.phase === "gameOver"}
      won={game.gameWon}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <View style={[flexStyles.flex1, { backgroundColor: "#2b2d42" }]}>
        {/* Status Bar */}
        <View
          style={{
            marginHorizontal: 10 * scale,
            marginTop: 10 * scale,
            marginBottom: 10 * scale,
          }}
        >
          <Text
            style={{
              fontSize: 12 * scale,
              color: "#d4cdc3",
              marginBottom: 5 * scale,
            }}
          >
            Round: {game.round} | Enemy Deck: {game.enemyDeck.length} | Phase:{" "}
            {game.phase}
          </Text>
          <Text style={{ fontSize: 11 * scale, color: "#a8a29d" }}>
            Personal Deck: {game.personalDeck.length} | Discard:{" "}
            {game.personalDiscard.length}
          </Text>
        </View>

        {/* Enemy Row */}
        <View
          style={{ marginHorizontal: 10 * scale, marginBottom: 15 * scale }}
        >
          <Text
            style={{
              fontSize: 12 * scale,
              color: "#d4cdc3",
              marginBottom: 8 * scale,
            }}
          >
            Enemy Row
          </Text>
          <View style={{ flexDirection: "row", gap: 8 * scale }}>
            {game.enemyRow.map((card: PlayingCard | null, idx: number) => (
              <View
                key={`enemy-${idx}`}
                style={{
                  width: 70 * scale,
                  height: 100 * scale,
                  backgroundColor: card ? "#3a3c52" : "#1f2133",
                  borderRadius: 6 * scale,
                  borderWidth: 2,
                  borderColor: card ? "#d4cdc3" : "#555",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {card ? (
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 24 * scale,
                        fontWeight: "bold",
                        color:
                          card.suit === "hearts" || card.suit === "diamonds"
                            ? "#e74c3c"
                            : "#ecf0f1",
                      }}
                    >
                      {card.rank}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16 * scale,
                        color:
                          card.suit === "hearts" || card.suit === "diamonds"
                            ? "#e74c3c"
                            : "#ecf0f1",
                      }}
                    >
                      {getSuitSymbol(card.suit)}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 10 * scale, color: "#555" }}>
                    Empty
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Hand */}
        <View
          style={{ marginHorizontal: 10 * scale, marginBottom: 15 * scale }}
        >
          <Text
            style={{
              fontSize: 12 * scale,
              color: "#d4cdc3",
              marginBottom: 8 * scale,
            }}
          >
            Hand ({game.hand.length} / 4)
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 * scale }}
          >
            {game.hand.map((card: PlayingCard, idx: number) => {
              const isSelectedCapture = game.selectedForCapture.some(
                (c: PlayingCard) =>
                  c.suit === card.suit && c.rank === card.rank,
              );
              const isSelectedSacrifice = game.selectedForSacrifice.some(
                (c: PlayingCard) =>
                  c.suit === card.suit && c.rank === card.rank,
              );
              return (
                <View key={`hand-${idx}`}>
                  <Button
                    onPress={() => {
                      if (game.phase === "discardPhase") {
                        handleDiscard(card);
                      } else if (game.phase === "capturePhase") {
                        toggleCardForCapture(card, 0);
                      }
                    }}
                    text={`${card.rank}${getSuitSymbol(card.suit)}`}
                    style={{
                      width: 50 * scale,
                      height: 50 * scale,
                      backgroundColor:
                        isSelectedCapture || isSelectedSacrifice
                          ? "#666"
                          : "#333",
                      borderColor:
                        isSelectedCapture || isSelectedSacrifice
                          ? "#ffd700"
                          : "#666",
                      borderWidth: 2,
                    }}
                    textStyle={{
                      fontSize: 10 * scale,
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Actions */}
        {game.phase === "discardPhase" && (
          <View
            style={{ marginHorizontal: 10 * scale, marginBottom: 15 * scale }}
          >
            <Button
              onPress={handleEndDiscard}
              text="Done Discarding"
              theme="#27ae60"
            />
          </View>
        )}

        {game.phase === "capturePhase" && (
          <View
            style={{
              marginHorizontal: 10 * scale,
              marginBottom: 15 * scale,
              gap: 10 * scale,
            }}
          >
            {/* Capture Option */}
            <View>
              <Text
                style={{
                  fontSize: 11 * scale,
                  color: "#d4cdc3",
                  marginBottom: 6 * scale,
                }}
              >
                Capture ({game.selectedForCapture.length} cards selected):
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 6 * scale,
                  flexWrap: "wrap",
                }}
              >
                {game.enemyRow.map(
                  (card: PlayingCard | null, idx: number) =>
                    card && (
                      <Button
                        key={`capture-${idx}`}
                        onPress={() => {
                          toggleCardForCapture(game.selectedForCapture[0], idx);
                        }}
                        text={`Cap ${card.rank}${getSuitSymbol(card.suit)}`}
                        disabled={game.selectedForCapture.length === 0}
                        style={{
                          flex: 1,
                          minWidth: 80 * scale,
                        }}
                        textStyle={{
                          fontSize: 9 * scale,
                        }}
                      />
                    ),
                )}
              </View>
              <Button
                onPress={handleCapture}
                text="Capture!"
                disabled={
                  game.selectedForCapture.length === 0 ||
                  game.targetEnemyIdx === null
                }
                theme={game.selectedForCapture.length > 0 ? "#27ae60" : "#666"}
                style={{
                  marginTop: 6 * scale,
                }}
              />
            </View>

            {/* Let Enemy Capture */}
            <View>
              <Text
                style={{
                  fontSize: 11 * scale,
                  color: "#d4cdc3",
                  marginBottom: 6 * scale,
                }}
              >
                Or let enemy capture:
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6 * scale,
                }}
              >
                {game.hand.map((card: PlayingCard, idx: number) => (
                  <Button
                    key={`lose-${idx}`}
                    onPress={() => handleLetEnemyCapture(card)}
                    text={`Lose ${card.rank}`}
                    theme={isFaceCard(card) ? "#e74c3c" : "#3498db"}
                    style={{
                      flex: 1,
                      minWidth: 60 * scale,
                    }}
                    textStyle={{
                      fontSize: 9 * scale,
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Sacrifice */}
            <View>
              <Text
                style={{
                  fontSize: 11 * scale,
                  color: "#d4cdc3",
                  marginBottom: 6 * scale,
                }}
              >
                Or sacrifice ({game.selectedForSacrifice.length} / 2):
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6 * scale,
                  marginBottom: 6 * scale,
                }}
              >
                {game.hand
                  .filter((c: PlayingCard) => !isFaceCard(c))
                  .map((card: PlayingCard, idx: number) => {
                    const isSelected = game.selectedForSacrifice.some(
                      (c: PlayingCard) =>
                        c.suit === card.suit && c.rank === card.rank,
                    );
                    return (
                      <Button
                        key={`sac-${idx}`}
                        onPress={() => toggleCardForSacrifice(card)}
                        text={`${card.rank}`}
                        style={{
                          width: 45 * scale,
                          height: 45 * scale,
                          backgroundColor: isSelected ? "#8e44ad" : "#555",
                        }}
                        textStyle={{
                          fontSize: 10 * scale,
                        }}
                      />
                    );
                  })}
              </View>
              <View style={{ flexDirection: "row", gap: 6 * scale }}>
                {game.enemyRow.map((card: PlayingCard | null, idx: number) =>
                  card ? (
                    <Button
                      key={`sac-target-${idx}`}
                      onPress={() => handleSacrifice(idx)}
                      text={`Send ${card.rank} to bottom`}
                      disabled={game.selectedForSacrifice.length !== 2}
                      theme={
                        game.selectedForSacrifice.length === 2
                          ? "#8e44ad"
                          : "#666"
                      }
                      style={{
                        flex: 1,
                      }}
                      textStyle={{
                        fontSize: 9 * scale,
                      }}
                    />
                  ) : null,
                )}
              </View>
            </View>

            <Button
              onPress={() => {
                setGame((draft) => {
                  draft.selectedForCapture = [];
                  draft.selectedForSacrifice = [];
                  draft.targetEnemyIdx = null;
                });
              }}
              text="Clear Selection"
            />
          </View>
        )}

        {/* Game Over */}
        {game.phase === "gameOver" && (
          <View
            style={{ marginHorizontal: 10 * scale, marginBottom: 15 * scale }}
          >
            <Text
              style={{
                fontSize: 18 * scale,
                fontWeight: "bold",
                color: game.gameWon ? "#27ae60" : "#e74c3c",
                marginBottom: 10 * scale,
              }}
            >
              {game.gameWon ? "YOU WIN!" : "YOU LOSE!"}
            </Text>
            <Button onPress={reset} text="Play Again" theme="#3498db" />
          </View>
        )}

        {/* Message */}
        <View
          style={{ marginHorizontal: 10 * scale, marginBottom: 10 * scale }}
        >
          <Text
            style={{
              fontSize: 11 * scale,
              color: "#d4cdc3",
              textAlign: "center",
            }}
          >
            {game.message}
          </Text>
        </View>
      </View>
    </GameWrapper>
  );
}
