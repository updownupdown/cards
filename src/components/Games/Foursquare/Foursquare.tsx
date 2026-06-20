import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useZoneLayout } from "@/hooks/useZoneLayout";
import { Colors } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { Pressable } from "react-native";
import { AnimatedCard } from "../../Cards/AnimatedCard";
import {
  createDeck,
  isFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../../Cards/card-utils";
import { CardPositionBuilder } from "../../Cards/CardPositionBuilder";
import { GameWrapper } from "../../common/GameWrapper";
import { useToast } from "../../common/Toast";
import {
  GameSnapshot,
  GameState,
  getColRow,
  layoutZones,
} from "./FoursquareSetup";

const cardSize = "small";

function setup(): GameState {
  const deck = shuffle(createDeck().filter((c) => !isFace(c)));

  return {
    deck,
    piles: Array(16).fill([]),
    ended: false,
    won: false,
    winLoseMessage: "",
  };
}

function numFaceDownTopCards(piles: PlayingCard[][]) {
  return piles.filter((p) => p.length && !top(p)?.faceUp).length;
}

function hasAllFaceUp(piles: PlayingCard[][]) {
  if (piles.length !== 16) return false;
  return piles.every((p) => p.length && top(p)?.faceUp);
}

function getAdjacentPiles(piles: PlayingCard[][]) {
  const isEmptyBoard = piles.every((pile) => pile.length === 0);

  if (isEmptyBoard) {
    return Array.from({ length: 16 }, (_, i) => i);
  }

  const legalIndices = new Set<number>();

  for (let i = 0; i < 16; i++) {
    if (piles[i].length > 0) {
      // Can place on a pile that already has cards
      legalIndices.add(i);

      // Can place on adjacent (horizontally or vertically) piles
      const row = Math.floor(i / 4);
      const col = i % 4;

      if (row > 0) legalIndices.add(i - 4);
      if (row < 3) legalIndices.add(i + 4);
      if (col > 0) legalIndices.add(i - 1);
      if (col < 3) legalIndices.add(i + 1);
    }
  }

  return Array.from(legalIndices).sort((a, b) => a - b);
}

export default function Foursquare() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  function initGame(game: GameState) {
    turnOverDeckCard(game);
  }

  useEffect(() => {
    if (showIntro === false) {
      initGame(game);
    }
  }, [showIntro]);

  const [game, setGame] = useState<GameState>(setup());

  async function turnOverDeckCard(gameState: GameState) {
    const topCard = top(gameState.deck);
    let deck = [...gameState.deck];
    if (topCard) {
      deck = deck.slice(0, -1);
      deck = [...deck, { ...topCard, faceUp: true }];
    }

    const newGame = { ...gameState, deck };

    setGame(newGame);
  }

  function reset() {
    clearHistory();
    const initSetup = setup();
    setGame(initSetup);
    initGame(initSetup);
  }

  // ====================================
  // PLACE CARD ON A PILE
  // ====================================
  async function placeAt(index: number) {
    if (!legal.includes(index)) return;

    // Save state for undo
    saveUndoState(structuredClone({ game }));

    // Move draw card to selected pile
    const drawCard = top(game.deck);

    const deck = [...game.deck];
    deck.pop();

    const piles = [...game.piles];
    let targetPile = [...piles[index]];

    // Flip top of target pile face down
    const pileTop = top(targetPile);
    if (targetPile.length && pileTop) {
      targetPile = targetPile.slice(0, -1);
      targetPile.push({ ...pileTop, faceUp: false });
    }

    // Add new card to pile
    if (drawCard) {
      targetPile.push(drawCard);
    }

    piles[index] = targetPile;

    // Prepare to update game
    const intermediateGame = { ...game, piles, deck };

    // Update game
    setGame(intermediateGame);

    // Flip cards in piles logic
    const topCardAtTargetPile = top(intermediateGame.piles[index]);
    let finalPiles = [...intermediateGame.piles];

    if (topCardAtTargetPile) {
      const flipResult = applyFlips(
        [...intermediateGame.piles],
        index,
        topCardAtTargetPile,
      );

      finalPiles = flipResult.newPiles;
    }

    const finalGame = { ...intermediateGame, piles: finalPiles };

    setGame(finalGame);

    // Turn over draw deck card
    turnOverDeckCard(finalGame);
  }

  function isMinOrMax(line: PlayingCard[], card: PlayingCard) {
    const cardvalue = rankValue(card);
    const lowest = line.reduce(
      (min, current) =>
        current.faceUp && rankValue(current) < min ? rankValue(current) : min,
      Infinity,
    );
    const highest = line.reduce(
      (max, current) =>
        current.faceUp && rankValue(current) > max ? rankValue(current) : max,
      0,
    );

    return cardvalue < lowest || cardvalue > highest;
  }

  function flipTop(pile: PlayingCard[]) {
    if (pile.length === 0) return pile;

    const copy = [...pile];
    const topCard = copy[copy.length - 1];
    copy[copy.length - 1] = { ...topCard, faceUp: !topCard.faceUp };
    return copy;
  }

  function applyFlips(
    piles: PlayingCard[][],
    index: number,
    lastPlayedCard: PlayingCard,
  ): { newPiles: PlayingCard[][]; flippedIndices: number[] } {
    const { col, row } = getColRow(index);

    function applyFlip(
      currentPiles: PlayingCard[][],
      line: number[],
      lastPlayedCard: PlayingCard,
    ) {
      let lineCards: PlayingCard[] = [];
      const flippedInLine: number[] = [];
      let updatedPiles = [...currentPiles];

      line.forEach((idx) => {
        const topCard = top(currentPiles[idx]);
        if (topCard) {
          lineCards.push(topCard);
        }
      });

      if (lineCards.length && isMinOrMax(lineCards, lastPlayedCard)) {
        line.forEach((idx) => {
          updatedPiles[idx] = flipTop(updatedPiles[idx]);
          flippedInLine.push(idx);
        });
      }

      return { updatedPiles, flippedInLine };
    }

    const colResult = applyFlip(piles, col, lastPlayedCard);
    const rowResult = applyFlip(colResult.updatedPiles, row, lastPlayedCard);

    // Combine the flipped indices. We use a Set to remove duplicates in case
    // the newly placed card (at the intersection) gets targeted by both the row and col
    const uniqueFlippedIndices = Array.from(
      new Set([...colResult.flippedInLine, ...rowResult.flippedInLine]),
    );

    return {
      newPiles: rowResult.updatedPiles,
      flippedIndices: uniqueFlippedIndices,
    };
  }

  function legalPlacements(
    piles: PlayingCard[][],
    drawCard: PlayingCard | undefined,
  ) {
    if (drawCard === undefined) return [];

    let legalPiles: number[] = [];
    const adjacentPiles = getAdjacentPiles(piles);

    for (let i = 0; i < 16; i++) {
      const { newPiles: mockFlipedPiles } = applyFlips([...piles], i, drawCard);
      const tooManyFaceDownCards = numFaceDownTopCards(mockFlipedPiles) > 4;
      const pileFull = piles[i].length >= 4;
      const isInAdjacentPile = adjacentPiles.includes(i);

      if (!pileFull && !tooManyFaceDownCards && isInAdjacentPile) {
        legalPiles.push(i);
      }
    }

    return legalPiles;
  }

  const legal = useMemo(
    () => legalPlacements(game.piles, top(game.deck)),
    [game.piles],
  );

  // Win/lose conditions
  useEffect(() => {
    if (game.deck.length === 40) return;

    // Win condition
    if (hasAllFaceUp(game.piles)) {
      setGame((prev) => {
        return { ...prev, ended: true, won: true, winLoseMessage: "You won!" };
      });
    } else if (game.deck.length === 0) {
      setGame((prev) => {
        return {
          ...prev,
          ended: true,
          won: false,
          winLoseMessage: "You ran out of cards to place!",
        };
      });
    } else if (legal.length === 0) {
      setGame((prev) => {
        return {
          ...prev,
          ended: true,
          won: false,
          winLoseMessage: "You ran out of valid placements!",
        };
      });
    }
  }, [legal, game.deck]);

  const showToast = useToast();

  const [showLegalPlacements, setShowLegalPlacements] = useState(false);

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    gapPc: 0.4,
  });

  const { cardWidth, cardHeight, getCardPosition, getZoneStyles } =
    layoutManager;

  // ========== Card Positions ========== //
  const cardPositions = useMemo(() => {
    const builder = new CardPositionBuilder(getCardPosition);

    builder.addDeck(game.deck, "deck", 50, "deck");

    game.piles.forEach((pile, pileIndex) => {
      builder.addDeck(pile, `pile-${pileIndex}`, 10, "pile");
    });

    return builder.build();
  }, [game, getCardPosition]);

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      score={game.deck.length * (game.won ? 1 : -1)}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      {Object.values(cardPositions).map((target) => {
        return (
          <AnimatedCard
            key={target.card.id}
            targetState={target}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
          />
        );
      })}

      {Array.from({ length: 16 }, (_, pileIndex) => {
        const isLegal = legal.includes(pileIndex);

        const selectColor = showLegalPlacements
          ? isLegal
            ? Colors.cardSelectGreen
            : Colors.cardSelectRed
          : "none";

        return (
          <Pressable
            key={`pile-${pileIndex}`}
            style={[
              getZoneStyles(`pile-${pileIndex}`),
              { zIndex: 90, borderWidth: 2, borderColor: selectColor },
            ]}
            onPress={() => {
              if (!isLegal) {
                if (game.piles[pileIndex].length >= 4) {
                  showToast("Pile is full!");
                } else {
                  const validAdjacentPiles = getAdjacentPiles(game.piles);
                  if (!validAdjacentPiles.includes(pileIndex)) {
                    showToast("Must place on existing or adjacent pile!");
                  } else {
                    showToast(
                      "Placing here would result in too many face up cards!",
                    );
                  }
                }

                setShowLegalPlacements(true);
              } else {
                setShowLegalPlacements(false);
                placeAt(pileIndex);
              }
            }}
          />
        );
      })}
    </GameWrapper>
  );
}
