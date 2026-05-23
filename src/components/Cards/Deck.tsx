import { cardStyles } from "@/styles/cardStyles";
import React from "react";
import { Text, View } from "react-native";
import { Card } from "./Card";
import { CardRank, CardSuit } from "./card-utils";
import { clamp } from "@/utils/utils";

export const DEFAULT_FRONT_OVERLAP = 0.7;
export const DEFAULT_BACK_OVERLAP = 0.9;

const minFanSize = 9;
const maxFanSize = 24;
const fanSizeDelta = maxFanSize - minFanSize;
const progressFanProximityThreshold = 4;
const maxBackDeckSize = 3;

type DeckCard = {
  rank: CardRank;
  suit: CardSuit;
};

type DeckProps = {
  backCount?: number;
  cards?: DeckCard[];
  fan?:
    | "horizontalRight"
    | "horizontalLeft"
    | "verticalUp"
    | "verticalDown"
    | undefined;
  largeFan?: "all" | "progressive";
  cardsPerRow?: number;
  showCount?: boolean;
  title?: string;
  children?: React.ReactNode;
};

export function Deck({
  backCount,
  cards,
  showCount,
  fan = "horizontalRight",
  largeFan,
  cardsPerRow = 5,
  title,
  children,
}: DeckProps) {
  let deckSize = 0;

  if (backCount) {
    deckSize = Math.min(backCount, maxBackDeckSize);
    if (children !== undefined && backCount > 0) deckSize -= 1;
  }

  if (cards?.length) {
    deckSize = cards.length;
  }

  function cardOffset(index: number) {
    if (index === 0) return undefined;

    let fanSize = minFanSize;

    if (largeFan === "all") {
      fanSize = maxFanSize * index;
    } else if (largeFan === "progressive") {
      let offsetTally = 0;

      for (let i = 1; i <= index; i++) {
        // Always add min offset
        let addOffset = minFanSize;

        // Add offset proportional to how close card is to top of deck,
        // if card is close to the top
        const distanceFromTopCard = deckSize - i;
        if (distanceFromTopCard < progressFanProximityThreshold) {
          const proximityToTop = (deckSize - distanceFromTopCard) / deckSize;
          addOffset += proximityToTop * fanSizeDelta;
        }

        offsetTally += clamp(addOffset, minFanSize, maxFanSize);
      }

      fanSize = offsetTally;
    } else {
      fanSize = minFanSize * index;
    }

    if (fan === "horizontalRight") {
      return `translateX(${fanSize}%)`;
    } else if (fan === "horizontalLeft") {
      return `translateX(${-fanSize}%)`;
    } else if (fan === "verticalUp") {
      return `translateY(${-fanSize}%)`;
    } else if (fan === "verticalDown") {
      return `translateY(${fanSize}%)`;
    }
  }

  return (
    <View style={[cardStyles.deck]}>
      {(showCount || title) && (
        <View style={cardStyles.deckCount}>
          {title && <Text style={cardStyles.deckCountTitle}>{title}</Text>}

          {showCount && (
            <Text style={cardStyles.deckCountValue}>{backCount}</Text>
          )}
        </View>
      )}

      {deckSize === 0 && !children && (
        <Card isPlaceholder cardsPerRow={cardsPerRow} />
      )}

      {deckSize !== 0 &&
        Array.from({ length: deckSize }, (_, index) => {
          return (
            <Card
              key={`back-${index}`}
              cardsPerRow={cardsPerRow}
              isBack={backCount !== undefined}
              // omitShadow={index !== 0}
              suit={cards && cards[index].suit}
              rank={cards && cards[index].rank}
              style={[
                cardStyles.deckCard,
                index === 0 && cardStyles.deckCardBottom,
                { transform: cardOffset(index) },
              ]}
            />
          );
        })}

      {children && (
        <View
          style={[
            cardStyles.deckCard,
            { transform: cardOffset(deckSize) },
            deckSize === 0 && cardStyles.deckCardBottom,
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}
