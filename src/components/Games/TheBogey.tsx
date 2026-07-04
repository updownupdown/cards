import { useStateManager } from "@/hooks/useStateManager";
import { useEffect } from "react";
import {
  createDeck,
  flipAllToFace,
  flipAllToBack,
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

// Win columns based on difficulty
const WIN_COLUMNS = {
  easy: 12,
  difficult: 8,
};

type GameDifficulty = keyof typeof WIN_COLUMNS;

type GameState = {
  hand: PlayingCard[];
  columns: PlayingCard[][];
  deck: PlayingCard[];
  discard: PlayingCard[];
  currentBogeyCard: PlayingCard | null;
  bogeyCardPlayed: boolean;
  gameEnded: boolean;
  won: boolean;
  lastAction: string;
  playerTurnEnded: boolean;
  selectedCard: PlayingCard | null;
  selectedColumnIdx: number | null;
};

const createTheBogeyDeck = () => {
  return createDeck().filter((card) => !(card.rank === "Joker"));
};

function canPlayCard(card: PlayingCard, columns: PlayingCard[][]): number[] {
  // Returns array of valid column indices where card can be played
  const validColumns: number[] = [];

  // Check existing columns
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    if (column.length === 0) continue; // Can't play to empty column

    const lastCard = column[column.length - 1];
    if (lastCard.suit === card.suit && rankValue(lastCard) > rankValue(card)) {
      validColumns.push(i);
    }
  }

  // Can also start a new column if space available
  if (columns.length < 12) {
    validColumns.push(-1); // -1 means start new column
  }

  return validColumns;
}

function playCardToColumn(
  card: PlayingCard,
  columnIndex: number,
  columns: PlayingCard[][],
): PlayingCard[][] {
  const newColumns = columns.map((col) => [...col]);

  if (columnIndex === -1) {
    // Start new column
    newColumns.push([card]);
  } else {
    // Add to existing column
    newColumns[columnIndex] = [...newColumns[columnIndex], card];
  }

  return newColumns;
}

function gameWon(columns: PlayingCard[][]): boolean {
  return columns.length <= 12;
}

function gameLost(columns: PlayingCard[][]): boolean {
  return columns.length >= 12; // No more room for new columns
}

function setupGame(): GameState {
  const fullDeck = createTheBogeyDeck();
  const shuffled = shuffle(fullDeck);
  const hand = shuffled.slice(0, 5);
  const remaining = shuffled.slice(5);

  return {
    hand,
    columns: [],
    deck: remaining,
    discard: [],
    currentBogeyCard: null,
    bogeyCardPlayed: false,
    gameEnded: false,
    won: false,
    lastAction: "Game started",
    playerTurnEnded: false,
    selectedCard: null,
    selectedColumnIdx: null,
  };
}

const gameStateInitial: GameState = setupGame();

export default function TheBogey() {
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

  // Auto-refill hand at start of turn
  useEffect(() => {
    if (game.playerTurnEnded) return;
    if (game.gameEnded) return;

    let needsUpdate = false;
    for (let i = 0; i < 5 && game.deck.length > 0; i++) {
      if (game.hand.length < 5) {
        needsUpdate = true;
        break;
      }
    }

    if (game.deck.length === 0 && game.discard.length > 0) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      setGame((draft) => {
        // Draw cards to reach 5
        while (draft.hand.length < 5 && draft.deck.length > 0) {
          const card = draft.deck.pop();
          if (card) draft.hand.push(card);
        }

        // If deck empty, reshuffle discard
        if (draft.deck.length === 0 && draft.discard.length > 0) {
          draft.deck = shuffle(draft.discard);
          draft.discard = [];
        }
      });
    }
  }, [
    game.playerTurnEnded,
    game.gameEnded,
    game.deck.length,
    game.discard.length,
    setGame,
  ]);

  // Bogey's turn
  useEffect(() => {
    if (!game.playerTurnEnded) return;
    if (game.bogeyCardPlayed) return;
    if (game.gameEnded) return;

    const timer = setTimeout(() => {
      setGame((draft) => {
        let bogeyCard: PlayingCard | null = null;

        // Draw next card for bogey
        if (draft.deck.length > 0) {
          bogeyCard = draft.deck.pop() || null;
        } else if (draft.discard.length > 0) {
          draft.deck = shuffle(draft.discard);
          draft.discard = [];
          bogeyCard = draft.deck.pop() || null;
        }

        if (!bogeyCard) {
          // No cards left - shouldn't happen
          draft.gameEnded = true;
          draft.won = true;
          draft.lastAction = "Deck exhausted - you win!";
          return;
        }

        // Try to play bogey card to best column
        const validColumns = canPlayCard(bogeyCard, draft.columns);
        if (validColumns.length === 0) {
          // Can't play - game lost
          draft.currentBogeyCard = bogeyCard;
          draft.gameEnded = true;
          draft.won = false;
          draft.lastAction = `Bogey drew ${bogeyCard.rank}${getSuitSymbol(bogeyCard.suit)} but it cannot be played - you lose!`;
          draft.bogeyCardPlayed = true;
          return;
        }

        draft.currentBogeyCard = bogeyCard;
        draft.lastAction = `Bogey drew ${bogeyCard.rank}${getSuitSymbol(bogeyCard.suit)} - choose a column!`;
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    game.playerTurnEnded,
    game.bogeyCardPlayed,
    game.gameEnded,
    game.deck.length,
    game.discard.length,
    setGame,
  ]);

  const handlePlayCard = (card: PlayingCard) => {
    if (game.gameEnded || game.playerTurnEnded) return;

    const validColumns = canPlayCard(card, game.columns);
    if (validColumns.length === 0) {
      setGame((draft) => {
        draft.lastAction = `Cannot play ${card.rank}${getSuitSymbol(card.suit)} - invalid move`;
      });
      return;
    }

    setGame((draft) => {
      draft.selectedCard = card;
      draft.lastAction = `Select column for ${card.rank}${getSuitSymbol(card.suit)} or start new column`;
    });
  };

  const handlePlayToColumn = (columnIdx: number | null) => {
    if (!game.selectedCard) return;

    const validColumns = canPlayCard(game.selectedCard, game.columns);
    const targetIdx = columnIdx === null ? -1 : columnIdx;

    if (!validColumns.includes(targetIdx)) {
      setGame((draft) => {
        draft.lastAction = "Invalid column selection";
      });
      return;
    }

    const newColumns = playCardToColumn(
      game.selectedCard,
      targetIdx,
      game.columns,
    );
    const newHand = game.hand.filter((c) => c !== game.selectedCard);

    // Check if player won
    if (gameWon(newColumns)) {
      setGame((draft) => {
        draft.hand = newHand;
        draft.columns = newColumns;
        draft.gameEnded = true;
        draft.won = true;
        draft.lastAction = "You won!";
        draft.playerTurnEnded = false;
        draft.selectedCard = null;
      });
      return;
    }

    setGame((draft) => {
      draft.hand = newHand;
      draft.columns = newColumns;
      draft.lastAction = `Played ${game.selectedCard?.rank}${getSuitSymbol(game.selectedCard?.suit || "")}`;
      draft.selectedCard = null;
    });
  };

  const handleDiscardCard = (card: PlayingCard) => {
    if (game.gameEnded || game.playerTurnEnded) return;

    const newHand = game.hand.filter((c) => c !== card);
    const newDiscard = [...game.discard, card];

    setGame((draft) => {
      draft.hand = newHand;
      draft.discard = newDiscard;
      draft.lastAction = `Discarded ${card.rank}${getSuitSymbol(card.suit)}`;
    });
  };

  const handleBogeyColumnSelect = (columnIdx: number | null) => {
    if (!game.currentBogeyCard || !game.bogeyCardPlayed) return;

    const validColumns = canPlayCard(game.currentBogeyCard, game.columns);
    const targetIdx = columnIdx === null ? -1 : columnIdx;

    if (!validColumns.includes(targetIdx)) {
      setGame((draft) => {
        draft.lastAction = "Invalid column for Bogey card";
      });
      return;
    }

    const newColumns = playCardToColumn(
      game.currentBogeyCard,
      targetIdx,
      game.columns,
    );

    // Check if loss (too many columns)
    if (gameLost(newColumns)) {
      setGame((draft) => {
        draft.columns = newColumns;
        draft.currentBogeyCard = null;
        draft.bogeyCardPlayed = false;
        draft.gameEnded = true;
        draft.won = false;
        draft.lastAction = "Too many columns - you lose!";
      });
      return;
    }

    // Continue to next player turn
    setGame((draft) => {
      draft.columns = newColumns;
      draft.currentBogeyCard = null;
      draft.bogeyCardPlayed = false;
      draft.playerTurnEnded = false;
      draft.lastAction = "Bogey played. Your turn!";
    });
  };

  const handleEndTurn = () => {
    if (game.playerTurnEnded || game.gameEnded) return;

    setGame((draft) => {
      draft.playerTurnEnded = true;
      draft.lastAction = "Bogey's turn...";
    });
  };

  const getSuitSymbol = (suit: string): string => {
    const symbols: Record<string, string> = {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    };
    return symbols[suit] || suit;
  };

  // Layout cards
  const cardWidth = 80 * scale;
  const cardHeight = 120 * scale;

  // Render
  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.gameEnded}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <View style={[flexStyles.flex1, { backgroundColor: "#1a2332" }]}>
        <Text
          style={{
            fontSize: 14 * scale,
            color: "#f0e8d8",
            marginVertical: 10 * scale,
            textAlign: "center",
          }}
        >
          Columns: {game.columns.length} | Target: 12 | Cards Left:{" "}
          {game.deck.length}
        </Text>

        {/* Columns Display */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginHorizontal: 10 * scale,
            marginBottom: 20 * scale,
            gap: 10 * scale,
          }}
        >
          {game.columns.map((col: PlayingCard[], idx: number) => (
            <View
              key={`column-${idx}`}
              style={{
                width: 80 * scale,
                minHeight: 160 * scale,
                backgroundColor: "rgba(100,100,100,0.3)",
                borderRadius: 4 * scale,
                borderWidth: 2,
                borderColor: "#666",
                padding: 5 * scale,
              }}
            >
              <Text
                style={{
                  fontSize: 10 * scale,
                  color: "#999",
                  marginBottom: 5 * scale,
                }}
              >
                Col {idx + 1}
              </Text>
              {col.map((card: PlayingCard, cardIdx: number) => (
                <View
                  key={`${idx}-${cardIdx}`}
                  style={{
                    width: 60 * scale,
                    height: 50 * scale,
                    backgroundColor: "#444",
                    borderRadius: 4 * scale,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#666",
                    marginBottom: 5 * scale,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12 * scale,
                      fontWeight: "bold",
                      color:
                        card.suit === "hearts" || card.suit === "diamonds"
                          ? "#e74c3c"
                          : "#ecf0f1",
                    }}
                  >
                    {card.rank}
                    {getSuitSymbol(card.suit)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Bogey Card Display */}
        {game.currentBogeyCard && !game.bogeyCardPlayed && (
          <View
            style={{ marginHorizontal: 10 * scale, marginBottom: 20 * scale }}
          >
            <Text
              style={{
                fontSize: 12 * scale,
                color: "#f0e8d8",
                marginBottom: 10 * scale,
              }}
            >
              Bogeys card - Select column:
            </Text>
            <View
              style={{
                width: cardWidth,
                height: cardHeight,
                backgroundColor: "#333",
                borderRadius: 4 * scale,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "#f0e8d8",
              }}
            >
              <Text
                style={{
                  fontSize: 24 * scale,
                  fontWeight: "bold",
                  color:
                    game.currentBogeyCard.suit === "hearts" ||
                    game.currentBogeyCard.suit === "diamonds"
                      ? "#e74c3c"
                      : "#ecf0f1",
                }}
              >
                {game.currentBogeyCard.rank}
                {getSuitSymbol(game.currentBogeyCard.suit)}
              </Text>
            </View>
          </View>
        )}

        {/* Hand */}
        <View
          style={{ marginHorizontal: 10 * scale, marginBottom: 20 * scale }}
        >
          <Text
            style={{
              fontSize: 12 * scale,
              color: "#f0e8d8",
              marginBottom: 10 * scale,
            }}
          >
            Your hand:
          </Text>
          <View
            style={{ flexDirection: "row", gap: 8 * scale, flexWrap: "wrap" }}
          >
            {game.hand.map((card: PlayingCard) => (
              <View
                key={`${card.suit}-${card.rank}`}
                style={{
                  opacity: game.selectedCard === card ? 0.5 : 1,
                }}
              >
                <Button
                  onPress={() => handlePlayCard(card)}
                  text={`${card.rank}${getSuitSymbol(card.suit)}`}
                  style={{
                    width: cardWidth * 0.7,
                    height: cardHeight * 0.6,
                    backgroundColor:
                      game.selectedCard === card ? "#666" : "#333",
                    borderColor:
                      game.selectedCard === card ? "#ffd700" : "#666",
                    borderWidth: 2,
                  }}
                  textStyle={{
                    fontSize: 12 * scale,
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            gap: 10 * scale,
            marginHorizontal: 10 * scale,
            marginBottom: 20 * scale,
            flexWrap: "wrap",
          }}
        >
          {game.selectedCard && (
            <>
              {game.columns.map((col: PlayingCard[], idx: number) => {
                const validColumns = canPlayCard(
                  game.selectedCard!,
                  game.columns,
                );
                const isValid = validColumns.includes(idx);
                return (
                  <Button
                    key={`col-${idx}`}
                    onPress={() => handlePlayToColumn(idx)}
                    text={`Col ${idx + 1}`}
                    disabled={!isValid}
                    style={{
                      opacity: isValid ? 1 : 0.3,
                    }}
                  />
                );
              })}
              {game.columns.length < 12 && (
                <Button
                  onPress={() => handlePlayToColumn(-1)}
                  text="New Col"
                  style={{
                    backgroundColor: "#27ae60",
                  }}
                />
              )}
              <Button
                onPress={() => handleDiscardCard(game.selectedCard!)}
                text="Discard"
              />
              <Button
                onPress={() => {
                  setGame((draft) => {
                    draft.selectedCard = null;
                  });
                }}
                text="Cancel"
              />
            </>
          )}
          {!game.selectedCard && !game.playerTurnEnded && (
            <Button
              onPress={handleEndTurn}
              text="End Turn"
              style={{
                backgroundColor: "#3498db",
              }}
            />
          )}
        </View>

        {/* Status */}
        <View
          style={{ marginHorizontal: 10 * scale, marginBottom: 20 * scale }}
        >
          <Text style={{ fontSize: 12 * scale, color: "#f0e8d8" }}>
            {game.lastAction}
          </Text>
          {game.gameEnded && (
            <Text
              style={{
                fontSize: 16 * scale,
                fontWeight: "bold",
                color: game.won ? "#27ae60" : "#e74c3c",
                marginTop: 10 * scale,
              }}
            >
              {game.won ? "YOU WIN!" : "YOU LOSE!"}
            </Text>
          )}
        </View>
      </View>
    </GameWrapper>
  );
}
