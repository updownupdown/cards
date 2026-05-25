import { cardStyles } from "@/styles/cardStyles";
import { clamp } from "@/utils/utils";
import React from "react";
import { Text, View, ViewStyle } from "react-native";
import { CardSelectColor, useCardSize } from "./Card";
import { CardRank, CardSuit } from "./card-utils";
import { CardButton } from "./CardButton";
import { Icon, IconName } from "@/icons";
import { Colors } from "@/styles/styles";
import { flexStyles } from "@/styles/flexStyles";
import { debugStyles } from "@/styles/debugStyles";

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
  limitFan?: boolean;
  cards?: (DeckCard | "back")[];
  fan?:
    | "horizontalRight"
    | "horizontalLeft"
    | "verticalUp"
    | "verticalDown"
    | undefined;
  largeFan?: "all" | "progressive";
  cardsPerRow?: number;
  showCount?: boolean;
  selectColor?: CardSelectColor;
  countPosition?: "over" | "above" | "left" | "right" | "below";
  iconName?: IconName;
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
  selectColor,
  countPosition = "above",
  fan = "horizontalRight",
  limitFan,
  largeFan,
  cardsPerRow = 5,
  title,
  iconName,
  hideTopCard,
  isSelected,
  isDisabled,
  refTopCurrent,
  refTopNext,
  onPress,
}: DeckProps) => {
  let trueDeckSize = backCount ?? cards?.length ?? 0;
  let limitedDeckSize = trueDeckSize;
  let skipFirstCards = 0;

  if (limitFan) {
    const targetDeckSize = Math.min(limitedDeckSize, maxBackDeckSize);
    skipFirstCards = limitedDeckSize - targetDeckSize;
    limitedDeckSize = targetDeckSize;
  }

  function cardOffsetStyle(index: number, nextCardPos?: boolean) {
    let adjustedDeckSize = limitedDeckSize;
    // Prevent current pos ref from being -1
    let adjustedIndex = Math.max(0, index);

    if (nextCardPos) {
      // Look for next position in deck; need to mock deck being larger by 1
      adjustedDeckSize += 1;

      if (limitFan) {
        // Prevent going to larger deck size than will be generated
        adjustedDeckSize = Math.min(adjustedDeckSize, maxBackDeckSize);

        if (index >= maxBackDeckSize) {
          adjustedIndex -= 1;
        }
      }
    }

    let offsetStyle: ViewStyle = {
      top: 0,
      left: 0,
    };

    if (adjustedIndex === 0) return offsetStyle;

    let fanSize = minFanSize;

    if (largeFan === "all") {
      fanSize = maxFanSize * adjustedIndex;
    } else if (largeFan === "progressive") {
      let offsetTally = 0;

      for (let i = 1; i <= adjustedIndex; i++) {
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
      fanSize = minFanSize * adjustedIndex;
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
        cardStyles.deckWrap,
        countPosition === "over" && cardStyles.deckWrapCountOver,
        countPosition === "above" && cardStyles.deckWrapCountAbove,
        countPosition === "left" && cardStyles.deckWrapCountLeft,
        countPosition === "right" && cardStyles.deckWrapCountRight,
        countPosition === "below" && cardStyles.deckWrapCountBelow,
        { borderRadius, boxShadow: placeholderShadow },
      ]}
    >
      {/* Count */}
      {(showCount || title) && (
        <View
          style={[
            cardStyles.deckCount,
            countPosition === "over" && cardStyles.deckCountOver,
            countPosition === "above" && cardStyles.deckCountAbove,
            countPosition === "left" && cardStyles.deckCountLeft,
            countPosition === "right" && cardStyles.deckCountRight,
            countPosition === "below" && cardStyles.deckCountBelow,
          ]}
        >
          {iconName && (
            <Icon
              name={iconName}
              color={Colors.K300}
              style={cardStyles.deckCountIcon}
            />
          )}
          {title && <Text style={cardStyles.deckCountTitle}>{title}</Text>}
          {showCount && (
            <Text style={cardStyles.deckCountValue}>{trueDeckSize}</Text>
          )}
        </View>
      )}

      {/* Deck */}
      <View
        style={[cardStyles.deck, style, { width, height }]}
        collapsable={false}
      >
        {/* Anchor Views for refs, used for animations */}
        {refTopCurrent && (
          <View
            ref={refTopCurrent}
            style={[
              // Used as a relative positioned card
              cardStyles.card,
              cardOffsetStyle(limitedDeckSize - 1),
              cardStyles.animHide,
              { width, height },
            ]}
            collapsable={false}
          />
        )}
        {refTopNext && (
          <View
            ref={refTopNext}
            style={[
              cardStyles.card,
              flexStyles.positionAbsolute,
              cardOffsetStyle(limitedDeckSize, true),
              cardStyles.animHide,
              { width, height },
            ]}
            collapsable={false}
          />
        )}

        {/* Placeholder at bottom of deck; sometimes pressable */}
        <CardButton
          onPress={limitedDeckSize === 0 ? onPress : undefined}
          cardsPerRow={cardsPerRow}
          isPlaceholder
          style={[cardStyles.deckCard]}
          disabled={isDisabled}
          selectColor={selectColor}
        />

        {Array.from({ length: limitedDeckSize }, (_, index) => {
          const adjustedIndex = index + skipFirstCards;

          const suit =
            cards?.[adjustedIndex] !== "back"
              ? cards?.[adjustedIndex].suit
              : undefined;
          const rank =
            cards?.[adjustedIndex] !== "back"
              ? cards?.[adjustedIndex].rank
              : undefined;
          const isBack = !suit || !rank;
          const isTopCard = adjustedIndex === limitedDeckSize - 1;

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
                cardOffsetStyle(index),
                hideTopCard === true &&
                  adjustedIndex === limitedDeckSize - 1 &&
                  cardStyles.animHide,
              ]}
              selectColor={selectColor}
            />
          );
        })}
      </View>
    </View>
  );
};
Deck.displayName = "Deck";
