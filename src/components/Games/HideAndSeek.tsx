import { useGameLoading } from "@/hooks/useGameLoading";
import { useLayoutManager } from "@/hooks/useLayoutManager";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { useState } from "react";
import { View } from "react-native";
import { CardAnimationParams, useAnimations } from "../Animations/Animations";
import { CardGrid, useCardSizing } from "../Cards/Card";
import {
  createDeck,
  isFace,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 6;
const gridCols = 4;
const gridRows = 3;

type GameState = {
  playmates: PlayingCard[];
  guesses: (PlayingCard | null)[];
  drawPile: PlayingCard[];
  discardPile: PlayingCard[];
  scorePile: PlayingCard[];
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

type GameSnapshot = {
  game: GameState;
};

function dealPlaymates(faceCards: PlayingCard[]) {
  const jacks = shuffle(faceCards.filter((c) => c.rank === "J"));
  const queens = shuffle(faceCards.filter((c) => c.rank === "Q"));
  const kings = shuffle(faceCards.filter((c) => c.rank === "K"));

  // Find a partition of 4 columns where each column has J/Q/K with distinct suits
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const cols: Array<[PlayingCard, PlayingCard, PlayingCard]> = [];
    const qPool = shuffle(queens);
    const kPool = shuffle(kings);

    let ok = true;

    for (let c = 0; c < gridCols; c += 1) {
      const j = jacks[c];
      const q = qPool[c];
      const k = kPool[c];
      const suitSet = new Set([j.suit, q.suit, k.suit]);
      if (suitSet.size !== 3) {
        ok = false;
        break;
      }
      cols.push([j, q, k]);
    }

    if (!ok) continue;

    const shuffledColumns = shuffle(cols).map((col) => shuffle(col));

    const out: PlayingCard[] = [];
    for (let r = 0; r < gridRows; r += 1) {
      for (let c = 0; c < gridCols; c += 1) {
        out.push(shuffledColumns[c][r]);
      }
    }
    return out;
  }

  return shuffle(faceCards).slice(0, gridCols * gridRows);
}

function getScoreIndexes(playmateIndex: number) {
  let indexes: number[] = [];

  // Top and bottom rows of guesses
  if (playmateIndex % 4 === 0) indexes.push(0, 10);
  if (playmateIndex % 4 === 1) indexes.push(1, 9);
  if (playmateIndex % 4 === 2) indexes.push(2, 8);
  if (playmateIndex % 4 === 3) indexes.push(3, 7);

  // Left and right columns of guesses
  if (Math.floor(playmateIndex / 4) === 0) indexes.push(13, 4);
  if (Math.floor(playmateIndex / 4) === 1) indexes.push(12, 5);
  if (Math.floor(playmateIndex / 4) === 2) indexes.push(11, 6);

  return indexes;
}

function setup(): GameState {
  const fullDeck = shuffle(createDeck());
  const playmates = dealPlaymates(fullDeck.filter((c) => isFace(c)));
  const drawPile = shuffle(fullDeck.filter((c) => !isFace(c))).map((c) => ({
    ...c,
    faceUp: true,
  }));

  return {
    playmates,
    guesses: Array.from({ length: 14 }, (_, i) => null),
    drawPile,
    discardPile: [],
    scorePile: [],
    ended: false,
    won: false,
    winLoseMessage: "",
  };
}

export default function HideAndSeek() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<GameState>(setup);
  const { animateCards, animatingCardIds } = useAnimations();

  function reset() {
    clearHistory();
    setGame(setup());
  }

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  const { gridGap } = useCardSizing(cardsPerRow, gridCols);

  const { getLayout, setRef } = useLayoutManager([
    "drawPile",
    "scorePile",
    "discardPile",
    "guesses",
    "playmates",
  ]);

  const Guesses = ({ indexes }: { indexes: number[] }) => {
    const isVertical = indexes.length === 3;

    return (
      <View
        style={[
          isVertical ? flexStyles.colCentered : flexStyles.rowCentered,
          { gap: gridGap },
        ]}
      >
        {indexes.map((i) => {
          const guess = game.guesses[i];

          return (
            <CardButton
              key={`guess-${i}`}
              ref={setRef("guesses", i)}
              card={guess}
              cardsPerRow={cardsPerRow}
              cardSize="small"
              onPress={() => {
                if (guess) {
                  widthdrawGuess(i);
                } else {
                  placeGuess(i);
                }
              }}
              isPlaceholder={
                !guess || (guess && animatingCardIds.includes(guess.id))
              }
              selectColor="none"
            />
          );
        })}
      </View>
    );
  };

  async function placeGuess(guessIndex: number) {
    // Calculate game state
    let newDrawPile = [...game.drawPile];
    const topDrawCard = top(newDrawPile);

    if (game.ended || !topDrawCard) return;

    saveUndoState(structuredClone({ game }));

    newDrawPile = newDrawPile.slice(0, -1);

    let newGuesses = [...game.guesses];
    newGuesses[guessIndex] = topDrawCard;

    const newGame: GameState = {
      ...game,
      guesses: newGuesses,
      drawPile: newDrawPile,
    };

    // Animate draw card to guess
    if (topDrawCard) {
      const drawPos = getLayout("drawPile");
      const guessPos = getLayout("guesses", guessIndex);

      if (drawPos && guessPos) {
        await animateCards([
          {
            card: topDrawCard,
            from: drawPos,
            to: guessPos,
            cardsPerRow,
            cardSize: "small",
          },
        ]);
      }
    }

    // Update game
    setGame(newGame);
  }

  async function widthdrawGuess(guessIndex: number) {
    // Calculate game state
    let newDrawPile = [...game.drawPile];
    const topDrawCard = top(newDrawPile);
    const guessCard = game.guesses[guessIndex];

    if (game.ended || !topDrawCard || !guessCard) return;

    saveUndoState(structuredClone({ game }));

    newDrawPile = newDrawPile.slice(0, -1);

    let newGuesses = [...game.guesses];
    newGuesses[guessIndex] = null;

    let newDiscardPile = [...game.discardPile];
    newDiscardPile.push({ ...topDrawCard, faceUp: false });
    newDiscardPile.push({ ...guessCard, faceUp: false });

    const newGame: GameState = {
      ...game,
      guesses: newGuesses,
      drawPile: newDrawPile,
      discardPile: newDiscardPile,
    };

    // Animate draw card to guess
    if (topDrawCard && guessCard) {
      const anims: CardAnimationParams[] = [];

      const drawPos = getLayout("drawPile");
      const discardPos = getLayout("discardPile");
      const guessPos = getLayout("guesses", guessIndex);

      if (drawPos && discardPos && guessPos) {
        // Draw card to discard pile
        anims.push({
          card: topDrawCard,
          from: drawPos,
          to: discardPos,
          cardsPerRow,
          cardSize: "small",
          flip: "toBack",
        });
        // Guess card to discard pile
        anims.push({
          card: guessCard,
          from: guessPos,
          to: discardPos,
          cardsPerRow,
          cardSize: "small",
          flip: "toBack",
          delay: 100,
        });
      }

      if (anims.length > 0) {
        await animateCards(anims);
      }
    }

    // Update game
    setGame(newGame);
  }

  async function revealPlaymate(playmateIndex: number) {
    // Calculate game state
    const playmate = game.playmates[playmateIndex];

    if (game.ended || !playmate) return;

    saveUndoState(structuredClone({ game }));

    let newPlaymates = [...game.playmates];
    newPlaymates[playmateIndex] = { ...playmate, faceUp: true };

    // Animate draw card to guess
    if (playmate) {
      const playmatePos = getLayout("playmates", playmateIndex);

      if (playmatePos) {
        await animateCards([
          {
            card: playmate,
            from: playmatePos,
            to: playmatePos,
            cardsPerRow,
            cardSize: "small",
            flip: "toFace",
          },
        ]);
      }
    }

    let newGame: GameState = {
      ...game,
      playmates: newPlaymates,
    };

    // Update game
    setGame(newGame);

    // Score cards
    let scoredCardsAtIndexes: { card: PlayingCard; index: number }[] = [];
    let scoredIndexes = getScoreIndexes(playmateIndex);
    let newGuesses = [...game.guesses];
    let newScorePile = [...game.scorePile];

    scoredIndexes.forEach((index) => {
      const guessAtIndex = game.guesses[index];
      if (guessAtIndex?.suit === playmate.suit) {
        scoredCardsAtIndexes.push({ card: guessAtIndex, index });
        newScorePile.push({ ...guessAtIndex, faceUp: false });
        newGuesses[index] = null;
      }
    });

    // Animate score cards
    let anims: CardAnimationParams[] = [];

    if (scoredCardsAtIndexes.length) {
      const scorePos = getLayout("scorePile");
      const animPromises = scoredCardsAtIndexes.map(
        async (cardAtIndex, idx) => {
          if (cardAtIndex.card && scorePos) {
            const guessPos = getLayout("guesses", cardAtIndex.index);

            if (guessPos) {
              return {
                card: cardAtIndex.card,
                from: guessPos,
                to: scorePos,
                cardsPerRow,
                flip: "toBack",
                delay: 100 * idx,
                cardSize: "small",
              } as CardAnimationParams;
            }
          }

          return null;
        },
      );

      const resolvedAnims = await Promise.all(animPromises);

      anims = resolvedAnims.filter(
        (anim) => anim !== null,
      ) as CardAnimationParams[];
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    // Check for win/lose conditions
    const hasFaceDownPlaymates = newPlaymates.some((c) => !c.faceUp);
    let newWon: boolean = game.won;
    let newEnded: boolean = game.ended;
    let newWinLoseMessage = game.winLoseMessage;

    if (!hasFaceDownPlaymates) {
      newEnded = true;
      const score = game.scorePile.length;
      newWon = score >= 20;
      newWinLoseMessage = `You scored ${score} (20 to win)`;
    }

    newGame = {
      ...newGame,
      won: newWon,
      ended: newEnded,
      playmates: newPlaymates,
      winLoseMessage: newWinLoseMessage,
      scorePile: newScorePile,
      guesses: newGuesses,
    };

    // Update game
    setGame(newGame);
  }

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      <View style={[flexStyles.rowCentered, flexStyles.gap16]}>
        <Deck
          refTop={setRef("drawPile")}
          // title="Draw"
          iconName="draw"
          cards={game.drawPile}
          cardsPerRow={cardsPerRow}
          cardSize="small"
          showCount
          limitFan
          fan="horizontalRight"
          countPosition="left"
          hideTopCard={
            top(game.drawPile) &&
            animatingCardIds.includes(top(game.drawPile)!.id)
          }
        />

        <Deck
          refNext={setRef("discardPile")}
          // title="Discard"
          iconName="delete"
          cards={game.discardPile}
          cardsPerRow={cardsPerRow}
          cardSize="small"
          showCount
          limitFan
          fan="horizontalRight"
          countPosition="left"
        />
        <Deck
          refNext={setRef("scorePile")}
          // title="Score"
          iconName="star"
          cards={game.scorePile}
          cardsPerRow={cardsPerRow}
          cardSize="small"
          showCount
          limitFan
          fan="horizontalRight"
          countPosition="left"
        />
      </View>

      {/* Grid Wrap */}
      <View style={[flexStyles.colCentered, { gap: gridGap }]}>
        <Guesses indexes={[0, 1, 2, 3]} />
        <View style={[flexStyles.rowCentered, { gap: gridGap }]}>
          <Guesses indexes={[13, 12, 11]} />
          <CardGrid
            cardsPerRow={cardsPerRow}
            targetGridCols={gridCols}
            style={[{ marginHorizontal: "auto" }]}
          >
            {game.playmates.map((card, index) => {
              return (
                <CardButton
                  key={`mc-${index}`}
                  ref={setRef("playmates", index)}
                  card={card}
                  cardsPerRow={cardsPerRow}
                  cardSize="small"
                  isPlaceholder={animatingCardIds.includes(card.id)}
                  selectColor="none"
                  onPress={() => revealPlaymate(index)}
                  disabled={!!card.faceUp}
                />
              );
            })}
          </CardGrid>

          <Guesses indexes={[4, 5, 6]} />
        </View>
        <Guesses indexes={[10, 9, 8, 7]} />
      </View>
    </GameWrapper>
  );
}
