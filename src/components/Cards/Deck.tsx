import { cardStyles } from "@/styles/cardStyles";
import { Text, View, ViewStyle } from "react-native";
import { Card } from "./Card";
import React from "react";
import { CardRank, CardSuit } from "./card-utils";

export const DEFAULT_FRONT_OVERLAP = 0.7;
export const DEFAULT_BACK_OVERLAP = 0.9;

type DeckCard = {
  rank: CardRank;
  suit: CardSuit;
};

const minFanSize = 8;
const maxFanSize = 20;

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
  widthPerc?: number;
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
  widthPerc = 25,
  title,
  children,
}: DeckProps) {
  let deckSize = 0;

  if (backCount) {
    deckSize = Math.min(backCount, 6);
    if (children !== undefined && backCount > 0) deckSize -= 1;
  }

  if (cards?.length) {
    deckSize = cards.length;
  }

  function cardOffset(index: number) {
    if (index === 0) return undefined;

    let fanSize = minFanSize;

    if (largeFan === "all") {
      fanSize = maxFanSize;
    } else if (largeFan === "progressive") {
      fanSize = Math.max(maxFanSize - index * 2, minFanSize);
    }

    if (fan === "horizontalRight") {
      return `translateX(${fanSize * index}%)`;
    } else if (fan === "horizontalLeft") {
      return `translateX(${-fanSize * index}%)`;
    } else if (fan === "verticalUp") {
      return `translateY(${-fanSize * index}%)`;
    } else if (fan === "verticalDown") {
      return `translateY(${fanSize * index}%)`;
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
        <Card isPlaceholder widthPerc={widthPerc} />
      )}

      {deckSize !== 0 &&
        Array.from({ length: deckSize }, (_, index) => {
          const fanStyle: ViewStyle = {
            transform: cardOffset(index),
          };

          return (
            <Card
              key={`back-${index}`}
              widthPerc={widthPerc}
              isBack={backCount !== undefined}
              omitShadow={index !== 0}
              suit={cards && cards[index].suit}
              rank={cards && cards[index].rank}
              style={[
                cardStyles.deckCard,
                index === 0 && cardStyles.deckCardBottom,
                fanStyle,
              ]}
            />
          );
        })}

      <View
        style={[
          cardStyles.deckCard,
          cardStyles.deckCardTop,
          { transform: cardOffset(deckSize - (cards?.length !== 0 ? 1 : 0)) },
          deckSize === 0 && cardStyles.deckCardTopOnly,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
