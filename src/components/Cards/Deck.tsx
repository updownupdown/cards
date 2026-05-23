import { cardStyles } from "@/styles/cardStyles";
import { clamp } from "@/utils/utils";
import React from "react";
import { Text, View, ViewStyle } from "react-native";
import { useCardSize } from "./Card";
import { CardRank, CardSuit } from "./card-utils";
import { CardButton } from "./CardButton";

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
  style?: ViewStyle[];
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
  hideTopCard?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  title?: string;
  refTopCurrent?: React.Ref<View>;
  refTopNext?: React.Ref<View>;
  onPress?: () => void;
};

export const Deck = ({
  style,
  backCount,
  cards,
  showCount,
  fan = "horizontalRight",
  largeFan,
  cardsPerRow = 5,
  title,
  hideTopCard,
  isSelected,
  isDisabled,
  refTopCurrent,
  refTopNext,
  onPress,
}: DeckProps) => {
  let deckSize = 0;

  if (backCount !== undefined) {
    deckSize += Math.min(backCount, maxBackDeckSize);
  }
  if (cards?.length) {
    deckSize += cards.length;
  }

  function cardOffsetStyle(index: number, isAnimRef?: boolean) {
    const adjustedDeckSize = isAnimRef ? deckSize + 1 : deckSize;

    let offsetStyle: ViewStyle = {
      top: 0,
      left: 0,
    };

    if (index === 0) return offsetStyle;

    let fanSize = minFanSize;

    if (largeFan === "all") {
      fanSize = maxFanSize * index;
    } else if (largeFan === "progressive") {
      let offsetTally = 0;

      for (let i = 1; i <= index; i++) {
        // Always add min offset
        let addOffset = minFanSize;

        // Add offset proportional to how close card is to top of deck,
        // if card is close enough to the top
        const distanceFromTop = adjustedDeckSize - i;
        if (distanceFromTop < progressFanProximityThreshold) {
          const proximityToTop =
            (adjustedDeckSize - distanceFromTop) / adjustedDeckSize;
          addOffset += proximityToTop * fanSizeDelta;
        }

        offsetTally += clamp(addOffset, minFanSize, maxFanSize);
      }

      fanSize = offsetTally;
    } else {
      fanSize = minFanSize * index;
    }

    if (fan === "horizontalRight") {
      offsetStyle.left = `${fanSize}%`;
    } else if (fan === "horizontalLeft") {
      offsetStyle.left = `${-fanSize}%`;
    } else if (fan === "verticalUp") {
      offsetStyle.top = `${-fanSize}%`;
    } else if (fan === "verticalDown") {
      offsetStyle.top = `${fanSize}%`;
    }

    return offsetStyle;
  }

  const { width, height, borderRadius, placeholderShadow } =
    useCardSize(cardsPerRow);

  return (
    <View
      style={[
        cardStyles.deck,
        style,
        { width, height, borderRadius, boxShadow: placeholderShadow },
      ]}
      collapsable={false}
    >
      {/* Anchor Views for refs, used for animations */}
      <View
        ref={refTopCurrent}
        style={[
          cardStyles.card,
          cardStyles.deckCard,
          cardOffsetStyle(Math.max(deckSize - 1)),
          cardStyles.animHide,
          { width, height },
        ]}
        collapsable={false}
      />
      <View
        ref={refTopNext}
        style={[
          cardStyles.card,
          cardStyles.deckCard,
          cardOffsetStyle(deckSize, true),
          cardStyles.animHide,
          { width, height },
        ]}
        collapsable={false}
      />

      {/* Count */}
      {(showCount || title) && (
        <View style={cardStyles.deckCount}>
          {title && <Text style={cardStyles.deckCountTitle}>{title}</Text>}

          {showCount && (
            <Text style={cardStyles.deckCountValue}>{backCount}</Text>
          )}
        </View>
      )}

      {/* Placeholder at bottom of deck; sometimes pressable */}
      <CardButton
        onPress={deckSize === 0 ? onPress : undefined}
        cardsPerRow={cardsPerRow}
        isPlaceholder
        style={[cardStyles.deckCard]}
        disabled={isDisabled}
      />

      {Array.from({ length: deckSize }, (_, index) => {
        const suit = cards?.[index].suit;
        const rank = cards?.[index].rank;
        const isBack = !suit || !rank;
        const isTopCard = index === deckSize - 1;

        return (
          <CardButton
            key={`back-${index}`}
            // Top card props
            onPress={isTopCard && onPress ? onPress : undefined}
            isSelected={isTopCard && isSelected}
            disabled={isTopCard && isDisabled}
            // Other
            cardsPerRow={cardsPerRow}
            isBack={isBack}
            suit={suit}
            rank={rank}
            style={[
              cardStyles.deckCard,
              hideTopCard === true &&
                index === deckSize - 1 &&
                cardStyles.animHide,
              cardOffsetStyle(index),
            ]}
          />
        );
      })}
    </View>
  );
};
Deck.displayName = "Deck";
