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

function getPinValue(card: PlayingCard | null): number {
  if (!card) return 0;
  if (card.rank === "A") return 1;
  return rankValue(card);
}

// Pin adjacency map
const PIN_ADJACENCY: Record<number, number[]> = {
  0: [1, 4, 5],
  1: [0, 2, 4, 5, 6],
  2: [1, 3, 5, 6],
  3: [2, 6],
  4: [0, 1, 5, 7, 8],
  5: [0, 1, 2, 4, 6, 7, 8],
  6: [1, 2, 3, 5, 8],
  7: [4, 5, 8, 9],
  8: [4, 5, 6, 7, 9],
  9: [7, 8],
};

type BallPhase =
  | "ballSelect"
  | "pinSelect"
  | "ballEnd"
  | "frameEnd"
  | "gameEnd";

interface Frame {
  ball1Pins: number;
  ball1Type: "regular" | "strike" | null;
  ball2Pins: number | null;
  ball2Type: "regular" | "spare" | null;
  ball3Pins: number | null; // Only for frame 10
  score: number | null;
}

type GameState = {
  pins: (PlayingCard | null)[];
  ballPiles: PlayingCard[][];
  knockedPins: Set<number>;
  frames: Frame[];
  currentFrame: number;
  ballNumber: number;
  phase: BallPhase;
  selectedCard: PlayingCard | null;
  selectedPins: Set<number>;
  ballStartKnockedCount: number;
  message: string;
  totalScore: number;
};

function createBowlingDeck(): PlayingCard[] {
  const deck = createDeck();
  const hearts = deck.filter(
    (c) => c.suit === "hearts" && rankValue(c) >= 1 && rankValue(c) <= 10,
  );
  return shuffle(hearts).slice(0, 20); // 20 cards: 10 for pins, 10 for balls (we'll use 1 suit)
}

function setupGame(): GameState {
  const deck = createBowlingDeck();
  const pinCards = deck.slice(0, 10);
  const ballCards = shuffle(deck.slice(10, 20));

  const ballPiles = [
    ballCards.slice(0, 5), // 5 cards
    ballCards.slice(5, 8), // 3 cards
    ballCards.slice(8, 10), // 2 cards
  ];

  return {
    pins: pinCards,
    ballPiles,
    knockedPins: new Set(),
    frames: Array(10)
      .fill(null)
      .map(() => ({
        ball1Pins: 0,
        ball1Type: null,
        ball2Pins: null,
        ball2Type: null,
        ball3Pins: null,
        score: null,
      })),
    currentFrame: 0,
    ballNumber: 1,
    phase: "ballSelect",
    selectedCard: null,
    selectedPins: new Set(),
    ballStartKnockedCount: 0,
    message: "Frame 1, Ball 1: Select a card from the ball piles",
    totalScore: 0,
  };
}

const gameStateInitial: GameState = setupGame();

export default function BowlingSolitaire() {
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

  const getValidBallCards = (): PlayingCard[] => {
    return game.ballPiles
      .map((pile: PlayingCard[]) => (pile.length > 0 ? pile[0] : null))
      .filter((card): card is PlayingCard => card !== null);
  };

  const isAdjacent = (pinIdx: number, knockedPins: Set<number>): boolean => {
    if (knockedPins.size === 0) return true; // First selection can be any pin
    return PIN_ADJACENCY[pinIdx].some((adj) => knockedPins.has(adj));
  };

  const isValidFirstBallSelection = (pinIdx: number): boolean => {
    // Cannot select back row (0,1,2,3) on first ball
    if (game.ballNumber === 1 && game.currentFrame !== 9) {
      if ([0, 1, 2, 3].includes(pinIdx)) return false;
      // Cannot select center pin (5) alone
      if (pinIdx === 5 && game.selectedPins.size === 0) return false;
    }
    return true;
  };

  const calculatePinSum = (): number => {
    let sum = 0;
    for (const pinIdx of game.selectedPins) {
      if (game.pins[pinIdx]) {
        sum += getPinValue(game.pins[pinIdx]!);
      }
    }
    return sum;
  };

  const canKnockPins = (): boolean => {
    if (!game.selectedCard || game.selectedPins.size === 0) return false;

    const cardValue = getPinValue(game.selectedCard);
    const pinSum = calculatePinSum();
    const lastDigit = pinSum % 10;

    return lastDigit === cardValue;
  };

  const knockPins = () => {
    if (!canKnockPins()) return;

    setGame((draft) => {
      // Update knocked pins
      for (const pinIdx of draft.selectedPins) {
        draft.knockedPins.add(pinIdx);
      }

      // Remove card from ball pile
      const ballPileIdx = draft.ballPiles.findIndex(
        (pile: PlayingCard[]) =>
          pile.length > 0 &&
          pile[0].suit === draft.selectedCard!.suit &&
          pile[0].rank === draft.selectedCard!.rank,
      );

      if (ballPileIdx >= 0 && draft.ballPiles[ballPileIdx].length > 0) {
        draft.ballPiles[ballPileIdx] = draft.ballPiles[ballPileIdx].slice(1);
      }

      const newKnockedCount =
        draft.knockedPins.size - draft.ballStartKnockedCount;

      draft.selectedCard = null;
      draft.selectedPins = new Set();
      draft.phase = "ballEnd";
      draft.message = `Knocked down ${newKnockedCount} pin(s). Check for more valid moves...`;
    });
  };

  const handleEndBall = () => {
    setGame((draft) => {
      const ballPinsKnocked =
        draft.knockedPins.size - draft.ballStartKnockedCount;
      const frame = draft.frames[draft.currentFrame];

      if (draft.ballNumber === 1) {
        frame.ball1Pins = ballPinsKnocked;
        frame.ball1Type = ballPinsKnocked === 10 ? "strike" : "regular";

        if (ballPinsKnocked === 10) {
          // Strike - frame ends, move to next frame
          calculateFrameScore(draft.frames, draft.currentFrame);
          const nextFrame = draft.currentFrame + 1;

          if (nextFrame >= 10) {
            // Game over
            const totalScore = draft.frames.reduce(
              (sum: number, f: Frame) => sum + (f.score || 0),
              0,
            );
            draft.totalScore = totalScore;
            draft.phase = "gameEnd";
            draft.message = `Game Over! Final Score: ${totalScore}`;
          } else {
            // Reset for next frame
            draft.currentFrame = nextFrame;
            draft.ballNumber = 1;
            draft.knockedPins = new Set();
            draft.ballStartKnockedCount = 0;
            draft.selectedCard = null;
            draft.selectedPins = new Set();
            draft.phase = "ballSelect";
            draft.message = `Frame ${nextFrame + 1}, Ball 1: Select a card`;
          }
        } else {
          // Ball 2
          draft.ballNumber = 2;
          draft.ballStartKnockedCount = draft.knockedPins.size;
          draft.selectedCard = null;
          draft.selectedPins = new Set();
          draft.phase = "ballSelect";
          draft.message = `Frame ${draft.currentFrame + 1}, Ball 2: Select a card`;
        }
      } else {
        // Ball 2
        frame.ball2Pins = ballPinsKnocked;
        const total = frame.ball1Pins + ballPinsKnocked;
        frame.ball2Type = total === 10 ? "spare" : "regular";

        calculateFrameScore(draft.frames, draft.currentFrame);
        const nextFrame = draft.currentFrame + 1;

        if (nextFrame >= 10) {
          // Game over
          const totalScore = draft.frames.reduce(
            (sum: number, f: Frame) => sum + (f.score || 0),
            0,
          );
          draft.totalScore = totalScore;
          draft.phase = "gameEnd";
          draft.message = `Game Over! Final Score: ${totalScore}`;
        } else {
          // Reset for next frame
          draft.currentFrame = nextFrame;
          draft.ballNumber = 1;
          draft.knockedPins = new Set();
          draft.ballStartKnockedCount = 0;
          draft.selectedCard = null;
          draft.selectedPins = new Set();
          draft.phase = "ballSelect";
          draft.message = `Frame ${nextFrame + 1}, Ball 1: Select a card`;
        }
      }
    });
  };

  const calculateFrameScore = (frames: Frame[], frameIdx: number) => {
    const frame = frames[frameIdx];
    if (frame.ball1Type === "strike") {
      // Strike: 10 + next 2 balls
      let bonus = 0;
      if (frameIdx < 9) {
        const nextFrame = frames[frameIdx + 1];
        bonus += nextFrame.ball1Pins || 0;
        if (nextFrame.ball1Type === "strike" && frameIdx < 8) {
          const nextNextFrame = frames[frameIdx + 2];
          bonus += nextNextFrame.ball1Pins || 0;
        } else {
          bonus += nextFrame.ball2Pins || 0;
        }
      }
      frame.score = (frames[frameIdx - 1]?.score || 0) + 10 + bonus;
    } else if (frame.ball2Type === "spare") {
      // Spare: 10 + next 1 ball
      let bonus = 0;
      if (frameIdx < 9) {
        const nextFrame = frames[frameIdx + 1];
        bonus += nextFrame.ball1Pins || 0;
      }
      frame.score = (frames[frameIdx - 1]?.score || 0) + 10 + bonus;
    } else {
      // Regular: sum of balls
      const prevScore = frames[frameIdx - 1]?.score || 0;
      frame.score = prevScore + (frame.ball1Pins || 0) + (frame.ball2Pins || 0);
    }
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

  const ballCardOptions = getValidBallCards();

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.phase === "gameEnd"}
      won={true}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <View style={[flexStyles.flex1, { backgroundColor: "#1a1f36" }]}>
        {/* Score and Status */}
        <View
          style={{
            marginHorizontal: 10 * scale,
            marginTop: 10 * scale,
            marginBottom: 10 * scale,
          }}
        >
          <Text
            style={{
              fontSize: 13 * scale,
              color: "#f4e4c1",
              marginBottom: 5 * scale,
              fontWeight: "bold",
            }}
          >
            Frame {game.currentFrame + 1} | Ball {game.ballNumber} | Score:{" "}
            {game.totalScore}
          </Text>
          <Text style={{ fontSize: 11 * scale, color: "#d4cfc0" }}>
            Pins Down: {game.knockedPins.size} / 10
          </Text>
        </View>

        {/* Pin Formation */}
        <View
          style={{
            marginHorizontal: 10 * scale,
            marginBottom: 15 * scale,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11 * scale,
              color: "#f4e4c1",
              marginBottom: 8 * scale,
            }}
          >
            Pin Formation
          </Text>
          {/* Row 0: 4 pins */}
          <View
            style={{
              flexDirection: "row",
              gap: 12 * scale,
              marginBottom: 20 * scale,
            }}
          >
            {[0, 1, 2, 3].map((pinIdx) => (
              <Button
                key={`pin-${pinIdx}`}
                onPress={() => {
                  if (game.phase === "pinSelect") {
                    if (!isValidFirstBallSelection(pinIdx)) {
                      setGame((draft) => {
                        draft.message =
                          "Cannot select back row or center pin alone on first ball!";
                      });
                      return;
                    }
                    if (!isAdjacent(pinIdx, game.selectedPins)) {
                      setGame((draft) => {
                        draft.message =
                          "Pin must be adjacent to already knocked pins!";
                      });
                      return;
                    }
                    setGame((draft) => {
                      if (draft.selectedPins.has(pinIdx)) {
                        draft.selectedPins.delete(pinIdx);
                      } else {
                        draft.selectedPins.add(pinIdx);
                      }
                    });
                  }
                }}
                text={
                  game.knockedPins.has(pinIdx)
                    ? "X"
                    : `${game.pins[pinIdx]?.rank || "?"}`
                }
                style={{
                  width: 50 * scale,
                  height: 50 * scale,
                  backgroundColor: game.knockedPins.has(pinIdx)
                    ? "#666"
                    : game.selectedPins.has(pinIdx)
                      ? "#ffd700"
                      : "#333",
                  opacity: game.knockedPins.has(pinIdx) ? 0.4 : 1,
                }}
                textStyle={{
                  fontSize: 14 * scale,
                }}
              />
            ))}
          </View>

          {/* Row 1: 3 pins */}
          <View
            style={{
              flexDirection: "row",
              gap: 12 * scale,
              marginBottom: 20 * scale,
              marginLeft: 30 * scale,
            }}
          >
            {[4, 5, 6].map((pinIdx) => (
              <Button
                key={`pin-${pinIdx}`}
                onPress={() => {
                  if (game.phase === "pinSelect") {
                    if (!isValidFirstBallSelection(pinIdx)) {
                      setGame((draft) => {
                        draft.message =
                          "Cannot select back row or center pin alone on first ball!";
                      });
                      return;
                    }
                    if (!isAdjacent(pinIdx, game.selectedPins)) {
                      setGame((draft) => {
                        draft.message =
                          "Pin must be adjacent to already knocked pins!";
                      });
                      return;
                    }
                    setGame((draft) => {
                      if (draft.selectedPins.has(pinIdx)) {
                        draft.selectedPins.delete(pinIdx);
                      } else {
                        draft.selectedPins.add(pinIdx);
                      }
                    });
                  }
                }}
                text={
                  game.knockedPins.has(pinIdx)
                    ? "X"
                    : `${game.pins[pinIdx]?.rank || "?"}`
                }
                style={{
                  width: 50 * scale,
                  height: 50 * scale,
                  backgroundColor: game.knockedPins.has(pinIdx)
                    ? "#666"
                    : game.selectedPins.has(pinIdx)
                      ? "#ffd700"
                      : "#333",
                  opacity: game.knockedPins.has(pinIdx) ? 0.4 : 1,
                }}
                textStyle={{
                  fontSize: 14 * scale,
                }}
              />
            ))}
          </View>

          {/* Row 2: 2 pins */}
          <View
            style={{
              flexDirection: "row",
              gap: 12 * scale,
              marginBottom: 20 * scale,
              marginLeft: 60 * scale,
            }}
          >
            {[7, 8].map((pinIdx) => (
              <Button
                key={`pin-${pinIdx}`}
                onPress={() => {
                  if (game.phase === "pinSelect") {
                    if (!isValidFirstBallSelection(pinIdx)) {
                      setGame((draft) => {
                        draft.message =
                          "Cannot select back row or center pin alone on first ball!";
                      });
                      return;
                    }
                    if (!isAdjacent(pinIdx, game.selectedPins)) {
                      setGame((draft) => {
                        draft.message =
                          "Pin must be adjacent to already knocked pins!";
                      });
                      return;
                    }
                    setGame((draft) => {
                      if (draft.selectedPins.has(pinIdx)) {
                        draft.selectedPins.delete(pinIdx);
                      } else {
                        draft.selectedPins.add(pinIdx);
                      }
                    });
                  }
                }}
                text={
                  game.knockedPins.has(pinIdx)
                    ? "X"
                    : `${game.pins[pinIdx]?.rank || "?"}`
                }
                style={{
                  width: 50 * scale,
                  height: 50 * scale,
                  backgroundColor: game.knockedPins.has(pinIdx)
                    ? "#666"
                    : game.selectedPins.has(pinIdx)
                      ? "#ffd700"
                      : "#333",
                  opacity: game.knockedPins.has(pinIdx) ? 0.4 : 1,
                }}
                textStyle={{
                  fontSize: 14 * scale,
                }}
              />
            ))}
          </View>

          {/* Row 3: 1 pin */}
          <View style={{ marginLeft: 90 * scale }}>
            <Button
              key="pin-9"
              onPress={() => {
                if (game.phase === "pinSelect") {
                  if (!isAdjacent(9, game.selectedPins)) {
                    setGame((draft) => {
                      draft.message =
                        "Pin must be adjacent to already knocked pins!";
                    });
                    return;
                  }
                  setGame((draft) => {
                    if (draft.selectedPins.has(9)) {
                      draft.selectedPins.delete(9);
                    } else {
                      draft.selectedPins.add(9);
                    }
                  });
                }
              }}
              text={
                game.knockedPins.has(9) ? "X" : `${game.pins[9]?.rank || "?"}`
              }
              style={{
                width: 50 * scale,
                height: 50 * scale,
                backgroundColor: game.knockedPins.has(9)
                  ? "#666"
                  : game.selectedPins.has(9)
                    ? "#ffd700"
                    : "#333",
                opacity: game.knockedPins.has(9) ? 0.4 : 1,
              }}
              textStyle={{
                fontSize: 14 * scale,
              }}
            />
          </View>
        </View>

        {/* Ball Piles */}
        <View
          style={{ marginHorizontal: 10 * scale, marginBottom: 15 * scale }}
        >
          <Text
            style={{
              fontSize: 11 * scale,
              color: "#f4e4c1",
              marginBottom: 8 * scale,
            }}
          >
            Ball Piles
          </Text>
          <View style={{ flexDirection: "row", gap: 12 * scale }}>
            {ballCardOptions.map((card: PlayingCard | null, idx: number) => (
              <Button
                key={`ball-${idx}`}
                onPress={() => {
                  if (game.phase === "ballSelect") {
                    setGame((draft) => {
                      draft.selectedCard = card;
                      draft.phase = "pinSelect";
                      draft.message = `Card ${card?.rank} selected. Sum of pins must end in ${getPinValue(card)}. Select pins...`;
                    });
                  }
                }}
                text={`${card?.rank}${getSuitSymbol(card?.suit || "")}`}
                style={{
                  width: 60 * scale,
                  height: 80 * scale,
                  backgroundColor:
                    game.selectedCard?.rank === card?.rank ? "#ffd700" : "#333",
                }}
                textStyle={{
                  fontSize: 12 * scale,
                }}
              />
            ))}
          </View>
        </View>

        {/* Actions */}
        {game.phase === "pinSelect" && game.selectedCard && (
          <View
            style={{
              marginHorizontal: 10 * scale,
              marginBottom: 15 * scale,
              gap: 8 * scale,
            }}
          >
            <Text style={{ fontSize: 11 * scale, color: "#f4e4c1" }}>
              Need sum ending in {getPinValue(game.selectedCard)} (currently:{" "}
              {calculatePinSum()})
            </Text>
            <Button
              onPress={knockPins}
              text="Knock Down Selected Pins"
              disabled={!canKnockPins()}
              style={{
                backgroundColor: canKnockPins() ? "#27ae60" : "#666",
              }}
            />
            <Button
              onPress={() => {
                setGame((draft) => {
                  draft.selectedPins = new Set();
                });
              }}
              text="Clear Selection"
            />
          </View>
        )}

        {game.phase === "ballEnd" && (
          <View
            style={{ marginHorizontal: 10 * scale, marginBottom: 15 * scale }}
          >
            <Button
              onPress={handleEndBall}
              text="End Ball"
              style={{ backgroundColor: "#3498db" }}
            />
          </View>
        )}

        {game.phase === "gameEnd" && (
          <View
            style={{ marginHorizontal: 10 * scale, marginBottom: 15 * scale }}
          >
            <Text
              style={{
                fontSize: 14 * scale,
                fontWeight: "bold",
                color: "#f4e4c1",
                marginBottom: 10 * scale,
              }}
            >
              Final Score: {game.totalScore}
            </Text>
            <Button
              onPress={reset}
              text="Play Again"
              style={{ backgroundColor: "#3498db" }}
            />
          </View>
        )}

        {/* Message */}
        <View style={{ marginHorizontal: 10 * scale }}>
          <Text
            style={{
              fontSize: 10 * scale,
              color: "#d4cfc0",
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
