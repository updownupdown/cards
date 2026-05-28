import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useAnimations } from "../Animations/Animations";
import { useCardSize } from "../Cards/Card";
import { Deck } from "../Cards/Deck";
import {
  createDeck,
  numRanks,
  RANK_VALUE,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 8;
const clockRadius = 140;

type ClockState = {
  piles: PlayingCard[][];
  nextPileIndex?: number;
  prevPileIndex?: number;
  revealedKings: number;
  revealedCards: number;
  ended: boolean;
  won: boolean;
};

function setup(): ClockState {
  const deck = shuffle(createDeck({ faceUp: false }));
  const piles: PlayingCard[][] = Array.from({ length: 13 }, () => []);

  let target = 0;
  while (deck.length > 0) {
    const card = deck.shift();
    if (card) piles[target].push(card);
    target = (target + 1) % 13;
  }

  return {
    piles,
    nextPileIndex: 12,
    prevPileIndex: undefined,
    revealedKings: 0,
    revealedCards: 0,
    ended: false,
    won: false,
  };
}

export default function Clock() {
  const isLoaded = useGameLoading();

  const { animateCards, isAnimating, setIsAnimating } = useAnimations();

  const [game, setGame] = useState<ClockState>(setup);

  function reset() {
    setGame(setup());
  }

  const { width: cardWidth, height: cardHeight } = useCardSize(cardsPerRow);

  async function revealCardAtPileIndex(pileIndex: number) {
    if (game.ended) return;

    setIsAnimating(true);

    // Flip over top card of at pileIndex
    setGame((prev) => {
      if (prev.ended || prev.piles.length === 0) return prev;

      const clickedPile = prev.piles[pileIndex];
      const clickedCard = clickedPile[clickedPile.length - 1];

      // Make copy of clicked pile,
      const newClickedPile = [...clickedPile];
      // and update the last card so it's face up.
      newClickedPile[newClickedPile.length - 1] = {
        ...clickedCard,
        faceUp: true,
      };

      // Make copy of all piles,
      const newPiles = [...prev.piles];
      // and update the current pile with the modified one.
      newPiles[pileIndex] = newClickedPile;

      return {
        ...prev,
        piles: newPiles,
      };
    });

    // Animate previous card to clicked pile
    if (game.prevPileIndex !== undefined) {
      // Skip animation for now; hard to figure out
      // const prevPile = game.piles[game.prevPileIndex];
      // const prevCard = prevPile[prevPile.length - 1];
      // const nextPileIndex = pileIndex;

      // let centerX = 0,
      //   centerY = 0,
      //   radius = clockRadius;

      // if (clockContainerRef.current) {
      //   await new Promise<void>((resolve) => {
      //     clockContainerRef.current?.measure(
      //       (x, y, width, height, pageX, pageY) => {
      //         centerX = pageX + width / 2;
      //         centerY = pageY + height / 2;
      //         resolve();
      //       },
      //     );
      //   });
      // }
      // const prevPos = getPileCardPosition(
      //   game.prevPileIndex,
      //   centerX,
      //   centerY,
      //   radius,
      // );
      // const nextPos = getPileCardPosition(
      //   nextPileIndex,
      //   centerX,
      //   centerY,
      //   radius,
      // );

      // if (prevPos && nextPos) {
      //   await animateCards([
      //     {
      //       id: `discard-${Date.now()}`,
      //       cardInfo: {
      //         rank: prevCard.rank,
      //         suit: prevCard.suit,
      //         isBack: false,
      //         cardsPerRow,
      //         cardSize: "small",
      //       },
      //       from: prevPos,
      //       to: nextPos,
      //       duration: 1000,
      //       keepAlive: false,
      //     },
      //   ]);
      // }

      // Move previous card to current pile index
      setGame((prev) => {
        if (prev.prevPileIndex === undefined) return prev;

        const newPrevPile = prev.piles[prev.prevPileIndex];
        const cardToTransfer = newPrevPile[newPrevPile.length - 1];

        newPrevPile.pop();

        const newPiles = [...prev.piles];
        newPiles[prev.prevPileIndex] = newPrevPile;
        newPiles[pileIndex].unshift(cardToTransfer);

        return { ...prev, piles: newPiles };
      });
    }

    // Update indexes, kings, and check for win/lose conditions
    setGame((prev) => {
      if (prev.ended || prev.piles.length === 0) return prev;

      const clickedPile = prev.piles[pileIndex];
      const clickedCard = clickedPile[clickedPile.length - 1];

      // Update the next pile index
      let nextSourceIndex = RANK_VALUE[clickedCard.rank];
      nextSourceIndex -= 1;
      if (nextSourceIndex === -1) nextSourceIndex = numRanks - 1;

      // Increment revealed kings
      let revealedKings = prev.revealedKings;
      if (clickedCard.rank === "K") {
        revealedKings += 1;
      }

      const revealedCards = prev.revealedCards + 1;

      // Check for win or lose conditions
      let lost = false;
      let won = false;

      if (revealedKings === 4) {
        lost = true;
      } else if (revealedCards === 52) {
        won = true;
      }

      return {
        ...prev,
        ended: lost || won,
        win: won,
        prevPileIndex: pileIndex,
        nextPileIndex: nextSourceIndex,
        revealedCards,
        revealedKings,
      };
    });

    setIsAnimating(false);
  }

  const decks = useMemo(
    () =>
      Array.from({ length: game.piles.length }).map((_, pileIndex) => {
        let style = {};

        if (pileIndex !== 12) {
          const angle = ((pileIndex + 1) % 12) * 30;
          style = {
            position: "absolute",
            transform: [
              { rotate: `${angle}deg` },
              { translateY: clockRadius * -1 },
            ],
          };
        } else {
          style = { position: "absolute" }; // Center pile
        }

        const deckCards = game.piles[pileIndex].map((card) =>
          card.faceUp ? { suit: card.suit, rank: card.rank } : "back",
        );

        const pressable = pileIndex === game.nextPileIndex && !game.ended;

        return (
          <View
            key={`clock-pile-${pileIndex}`}
            style={[
              {
                alignItems: "center",
                justifyContent: "center",
              },
              style,
            ]}
          >
            <Deck
              cards={deckCards}
              cardsPerRow={cardsPerRow}
              isSelected={pileIndex === game.nextPileIndex && !game.ended}
              onPress={() => {
                pressable ? revealCardAtPileIndex(pileIndex) : undefined;
              }}
              cardSize="small"
              fan="verticalDown"
              largeFan="all"
              selectColor={
                pressable
                  ? "green"
                  : pileIndex === game.prevPileIndex
                    ? "blue"
                    : "none"
              }
              isDisabled={isAnimating}
            />
          </View>
        );
      }),
    [game],
  );

  // Ref for the game area to measure its center
  const clockContainerRef = useRef<View>(null);

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? "You revealed all 52 cards."
          : "The fourth king appeared before all cards were revealed."
      }
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.justifyEvenly,
        ]}
      >
        <Text style={textStyles.default}>
          Cards revealed: {game.revealedCards} / 52
        </Text>
        <Text style={textStyles.default}>
          Kings revealed: {game.revealedKings} /4
        </Text>
      </View>

      {/* <View style={styles.revealRow}>
          <View style={styles.lastCardWrap}>
            {game.lastRevealed ? (
              <Card
                suit={game.lastRevealed.suit}
                rank={game.lastRevealed.rank}
                cardsPerRow={5}
                cardSize="small"
              />
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>
        </View> */}

      <View
        style={[
          {
            height: 380,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 10,
          },
          // debugStyles.borderBeige,
        ]}
        ref={clockContainerRef}
      >
        {decks}
      </View>

      {/* <Button
          onPress={revealStep}
          disabled={game.ended}
          text="Reveal Next"
          fullWidth
          size="large"
        /> */}
    </GameWrapper>
  );
}

// Returns the absolute position (x, y) and rotation (deg) for the center of the first card in the pile
function getPileCardPosition(
  pileIndex: number,
  centerX: number,
  centerY: number,
  radius: number,
) {
  // For 12 outer piles, arrange in a circle; for center pile (12), no rotation/offset
  if (pileIndex === 12) {
    return {
      x: centerX,
      y: centerY,
      rotation: 0,
    };
  }

  const modifiedRadius = 200;

  const angleDeg = ((pileIndex + 1) % 12) * 30;
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = centerX + modifiedRadius * Math.sin(angleRad);
  const y = centerY - modifiedRadius * Math.cos(angleRad);
  return {
    x,
    y,
    rotation: angleDeg,
  };
}
