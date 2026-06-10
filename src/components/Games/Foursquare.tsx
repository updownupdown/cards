import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { CardAnimationParams, useAnimations } from "../Animations/Animations";
import {
  createDeck,
  isFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { Colors } from "@/styles/styles";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useLayoutManager } from "@/hooks/useLayoutManager";

const cardsPerRow = 5;

function getColRow(index: number) {
  let row: number[] = [];
  let col: number[] = [];

  for (let i = 0; i < 16; i++) {
    if (Math.floor(i / 4) === Math.floor(index / 4) && i !== index) {
      row.push(i);
    }
    if (i % 4 === index % 4 && i !== index) {
      col.push(i);
    }
  }

  return { row, col };
}

type GameState = {
  deck: PlayingCard[];
  piles: PlayingCard[][];
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

type GameSnapshot = {
  game: GameState;
};

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
  const { isAnimating, animateCards, animatingCardIds } = useAnimations();

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  const { getLayout, setRef } = useLayoutManager([
    "draw",
    "pilesTop",
    "pilesNext",
  ]);

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
    const drawPos = getLayout("draw");
    const topCard = top(gameState.deck);
    let deck = [...gameState.deck];
    if (topCard) {
      deck = deck.slice(0, -1);
      deck = [...deck, { ...topCard, faceUp: true }];
    }

    const newGame = { ...gameState, deck };

    if (drawPos && topCard) {
      await animateCards([
        {
          card: topCard,
          from: drawPos,
          to: drawPos,
          flip: "toFace",
          cardsPerRow,
        },
      ]);
    }

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

    // Animate draw card to pile

    const pilePos = getLayout("pilesNext", index);
    const drawPos = getLayout("draw");

    if (drawPos && pilePos && drawCard) {
      await animateCards([
        {
          card: drawCard,
          from: drawPos,
          to: pilePos,
          cardsPerRow,
        },
      ]);
    }

    // Update game
    setGame(intermediateGame);

    // Flip cards in piles logic
    const topCardAtTargetPile = top(intermediateGame.piles[index]);
    let finalPiles = [...intermediateGame.piles];
    let cardsToAnimate: number[] = [];

    if (topCardAtTargetPile) {
      const flipResult = applyFlips(
        [...intermediateGame.piles],
        index,
        topCardAtTargetPile,
      );

      finalPiles = flipResult.newPiles;
      cardsToAnimate = flipResult.flippedIndices;
    }

    const finalGame = { ...intermediateGame, piles: finalPiles };

    // Animate flipped cards
    let anims: CardAnimationParams[] = [];
    if (cardsToAnimate.length) {
      const animPromises = cardsToAnimate.map(async (pileIndex, index) => {
        const card = top(intermediateGame.piles[pileIndex]);

        if (card) {
          const pilePos = getLayout("pilesTop", pileIndex);

          if (pilePos) {
            return {
              card,
              from: pilePos,
              to: pilePos,
              cardsPerRow,
              flip: card.faceUp ? "toBack" : "toFace",
              delay: 100 * index,
            } as CardAnimationParams;
          }
        }

        return null;
      });

      const resolvedAnims = await Promise.all(animPromises);

      anims = resolvedAnims.filter(
        (anim) => anim !== null,
      ) as CardAnimationParams[];
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

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
      <View style={[flexStyles.colCentered]}>
        <Deck
          // title="Draw"
          refTop={setRef("draw")}
          cards={game.deck}
          cardsPerRow={cardsPerRow}
          limitFan
          showCount
          countPosition="left"
          fan="horizontalRight"
          hideTopCard={
            top(game.deck) && animatingCardIds.includes(top(game.deck)!.id)
          }
        />
      </View>

      <View
        style={[
          {
            flexDirection: "row",
            flexWrap: "wrap",
            rowGap: 6,
          },
        ]}
      >
        {game.piles.map((pile, index) => {
          const isLegal = legal.includes(index);

          return (
            <View
              key={`pile-${index}`}
              style={[
                flexStyles.colCentered,
                {
                  width: "25%",
                  padding: 6,
                },
              ]}
            >
              <View
                style={[
                  flexStyles.colStart,
                  {
                    borderRadius: 8,
                    backgroundColor: Colors.K875,
                    width: "100%",
                  },
                ]}
              >
                <Deck
                  cards={pile}
                  refNext={setRef("pilesNext", index)}
                  refTop={setRef("pilesTop", index)}
                  onPress={() => {
                    if (!isLegal) {
                      if (pile.length >= 4) {
                        showToast("Pile is full!");
                      } else {
                        const validAdjacentPiles = getAdjacentPiles(game.piles);
                        if (!validAdjacentPiles.includes(index)) {
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
                      placeAt(index);
                    }
                  }}
                  isDisabled={isAnimating}
                  selectColor={
                    showLegalPlacements ? (isLegal ? "green" : "red") : "none"
                  }
                  limitFan
                  fan="horizontalRight"
                  limitFanNum={4}
                  style={[
                    {
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                  cardsPerRow={cardsPerRow}
                  hideTopCard={
                    top(pile) && animatingCardIds.includes(top(pile)!.id)
                  }
                />
              </View>
            </View>
          );
        })}
      </View>
    </GameWrapper>
  );
}
