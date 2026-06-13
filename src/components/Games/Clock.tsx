import { useGameLoading } from "@/hooks/useGameLoading";
import { useLayoutManager } from "@/hooks/useLayoutManager";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { useState } from "react";
import { Text, View, ViewStyle } from "react-native";
import { CardAnimationParams, useAnimations } from "../Animations/Animations";
import { cardAspectRatio, useCardSizing } from "../Cards/Card";
import { Deck } from "../Cards/Deck";
import {
  createDeck,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 8;

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
    nextPileIndex: 0,
    prevPileIndex: undefined,
    revealedKings: 0,
    revealedCards: 0,
    ended: false,
    won: false,
  };
}

export default function Clock() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const { animateCards, animatingCardIds } = useAnimations();
  const { cardWidth } = useCardSizing(cardsPerRow);
  const cardHeight = cardWidth / cardAspectRatio;

  const [game, setGame] = useState<ClockState>(setup);

  const { getLayout, setRef } = useLayoutManager(["piles"]);

  function reset() {
    setGame(setup());
  }

  async function revealCardAtPileIndex(pileIndex: number) {
    if (game.ended || game.piles.length === 0) {
      return;
    }

    const anims: CardAnimationParams[] = [];

    // GAME: Move previous card to current pile index (unless already at that pile)
    if (game.prevPileIndex !== undefined && game.prevPileIndex !== pileIndex) {
      const prevCard =
        game.piles[game.prevPileIndex][
          game.piles[game.prevPileIndex].length - 1
        ];

      if (prevCard) {
        const prevPos = getLayout("piles", game.prevPileIndex);
        const nextPos = getLayout("piles", pileIndex);
        if (prevPos && nextPos) {
          anims.push({
            card: prevCard,
            from: { ...prevPos, opacity: 1 },
            to: { ...nextPos, opacity: 0 },
            cardsPerRow,
            cardSize: "small",
            duration: 500,
          });
        }
      }
    }

    // ANIMATION - Flip top card over

    if (game.prevPileIndex !== pileIndex) {
      const clickedPileAnim = game.piles[pileIndex];
      const clickedCardAnim = clickedPileAnim[clickedPileAnim.length - 1];

      const cardPos = getLayout("piles", pileIndex);
      if (cardPos) {
        anims.push({
          card: clickedCardAnim,
          from: cardPos,
          to: cardPos,
          cardsPerRow,
          flip: "toFace",
          cardSize: "small",
          duration: 500,
          delay: game.prevPileIndex === undefined ? 0 : 400,
        });
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    setGame((prev) => {
      const piles = [...prev.piles];

      let clickedPile = game.piles[pileIndex];
      const clickedCard = clickedPile[clickedPile.length - 1];

      // Move prev top card to clicked pile
      if (prev.prevPileIndex !== undefined) {
        let prevPile = piles[prev.prevPileIndex];
        const prevPileTop = prevPile[prevPile.length - 1];

        prevPile.pop();

        if (prev.prevPileIndex === pileIndex) {
          clickedPile = prevPile;
        } else {
          clickedPile = [{ ...prevPileTop, faceUp: true }, ...clickedPile];
        }
      }

      // Flip over card on clicked pile
      const cardToTurnIndex = clickedPile.length - 1;
      const cardToTurn = clickedPile[cardToTurnIndex];
      clickedPile[cardToTurnIndex] = { ...cardToTurn, faceUp: true };

      // Update the next pile index
      const clickedCardRank = rankValue(clickedCard);
      const nextPileIndex = clickedCardRank === 13 ? 0 : clickedCardRank;

      // Increment revealed kings
      const revealedKings =
        prev.revealedKings + (clickedCard.rank === "K" ? 1 : 0);

      const revealedCards = prev.revealedCards + 1;
      const won = revealedCards === 52;
      const lost = revealedKings === 4;
      const ended = won || lost;

      return {
        ...prev,
        piles,
        ended,
        won,
        prevPileIndex: pileIndex,
        nextPileIndex,
        revealedCards,
        revealedKings,
      };
    });
  }

  function getPileStyles(pileIndex: number) {
    const style: ViewStyle = {
      position: "absolute",
      zIndex: 10,
    };

    let left = 0;
    let bottom = 0;

    switch (pileIndex) {
      case 12:
      case 6:
        left = 50;
        break;
      case 1:
      case 5:
      case 7:
      case 11:
        left = 65;
        break;
      case 2:
      case 4:
      case 8:
      case 10:
        left = 78;
        break;
      case 3:
      case 9:
        left = 90;
        break;
    }

    switch (pileIndex) {
      case 12:
      case 6:
        bottom = 90;
        break;
      case 1:
      case 11:
      case 5:
      case 7:
        bottom = 82;
        break;
      case 2:
      case 10:
      case 4:
      case 8:
        bottom = 70;
        break;
      case 3:
      case 9:
        bottom = 50;
        break;
    }

    if (pileIndex > 6) {
      left = 100 - left;
    }

    if (pileIndex > 3 && pileIndex < 9) {
      bottom = 100 - bottom;
    }

    if (pileIndex === 0) {
      left = 50;
      bottom = 50;
    }

    style.bottom = `${bottom}%`;
    style.left = `${left}%`;

    return style;
  }

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
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

      <View
        style={[
          {
            position: "relative",
            aspectRatio: 1,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: cardWidth * -0.5,
            marginTop: cardHeight * 0.5,
          },
        ]}
      >
        {game.piles.map((cards, pileIndex) => {
          const style = getPileStyles(pileIndex);
          const pressable =
            isLoaded && pileIndex === game.nextPileIndex && !game.ended;

          return (
            <View key={`clock-pile-${pileIndex}`} style={[style]}>
              <Deck
                refTop={setRef("piles", pileIndex)}
                cards={cards}
                cardsPerRow={cardsPerRow}
                onPress={
                  pressable ? () => revealCardAtPileIndex(pileIndex) : undefined
                }
                cardSize="small"
                fan={pileIndex === 0 ? "horizontalRight" : "verticalDown"}
                limitFan={pileIndex !== 0}
                largeFan={pileIndex === 0 ? "extra-wide" : undefined}
                selectColor={pressable ? "green" : "none"}
                hideTopCard={animatingCardIds.includes(
                  cards[cards.length - 1].id,
                )}
              />
            </View>
          );
        })}
      </View>
    </GameWrapper>
  );
}
