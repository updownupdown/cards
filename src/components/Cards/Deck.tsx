import { Icon, IconName } from "@/icons";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles, transitionStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { clamp } from "@/utils/utils";
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { CardSelectColor, CardSizes, useCardSize } from "./Card";
import { CardRank, CardSuit } from "./card-utils";
import { CardButton } from "./CardButton";

export const DEFAULT_FRONT_OVERLAP = 0.7;
export const DEFAULT_BACK_OVERLAP = 0.9;

// Fan sizes, in percentage of width or height of that card
export const minFanSize = 9;
const maxFanSize = 24;
const maxFanSizeExtraWide = 46;

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
  largeFan?: "all" | "progressive" | "extra-wide";
  cardsPerRow: number;
  showCount?: boolean;
  selectColor?: CardSelectColor;
  countPosition?: "over" | "above" | "left" | "right" | "below";
  iconName?: IconName;
  hideTopCard?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  invisibleWhenEmpty?: boolean;
  title?: string;
  refTopCurrent?: React.Ref<View>;
  refTopNext?: React.Ref<View>;
  onPress?: () => void;
  cardSize?: CardSizes;
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
  invisibleWhenEmpty,
  refTopCurrent,
  refTopNext,
  cardSize,
  onPress,
}: DeckProps) => {
  const { width, height, borderRadius, placeholderShadow } =
    useCardSize(cardsPerRow);

  let trueDeckSize = backCount ?? cards?.length ?? 0;
  let limitedDeckSize = trueDeckSize;
  let numSkipCards = 0;

  if (limitFan) {
    const targetDeckSize = Math.min(limitedDeckSize, maxBackDeckSize);
    numSkipCards = limitedDeckSize - targetDeckSize;
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

    let offsetSize = 0;

    let fanSize = adjustedIndex === 0 ? 0 : minFanSize;

    if (largeFan === "extra-wide") {
      fanSize = maxFanSizeExtraWide * adjustedIndex;
    } else if (largeFan === "all") {
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

    if (["horizontalLeft", "horizontalRight"].includes(fan)) {
      offsetSize = (fanSize * width) / 100;
    } else {
      offsetSize = (fanSize * height) / 100;
    }

    if (fan === "horizontalLeft") {
      return { right: offsetSize };
    } else if (fan === "horizontalRight") {
      return { left: offsetSize };
    } else if (fan === "verticalUp") {
      return { bottom: offsetSize };
    } else {
      return { top: offsetSize };
    }
  }

  // Compute container size
  // For limited fan, always make deck as large as it'll be
  const sizeOfLargestOffset =
    (limitFan ? maxBackDeckSize : limitedDeckSize) - 1;
  const largestOffset = cardOffsetStyle(sizeOfLargestOffset);

  const deckContainerStyle: ViewStyle = { width, height };

  if (fan === "horizontalLeft") {
    deckContainerStyle.width = width + Number(largestOffset.right);
  } else if (fan === "horizontalRight") {
    deckContainerStyle.width = width + Number(largestOffset.left);
  } else if (fan === "verticalUp") {
    deckContainerStyle.height = height + Number(largestOffset.bottom);
  } else {
    deckContainerStyle.height = height + Number(largestOffset.top);
  }

  return (
    <View
      style={[
        styles.deckWrap,
        countPosition === "over" && styles.deckWrapCountOver,
        countPosition === "above" && styles.deckWrapCountAbove,
        countPosition === "left" && styles.deckWrapCountLeft,
        countPosition === "right" && styles.deckWrapCountRight,
        countPosition === "below" && styles.deckWrapCountBelow,
        { borderRadius, boxShadow: placeholderShadow },
        invisibleWhenEmpty && styles.deckWrapInvisibleWhenEmpty,
      ]}
    >
      {/* Count */}
      {(showCount || title) && (
        <View
          style={[
            styles.deckCount,
            countPosition === "over" && styles.deckCountOver,
            countPosition === "above" && styles.deckCountAbove,
            countPosition === "left" && styles.deckCountLeft,
            countPosition === "right" && styles.deckCountRight,
            countPosition === "below" && styles.deckCountBelow,
          ]}
        >
          {iconName && (
            <Icon
              name={iconName}
              color={Colors.K300}
              style={styles.deckCountIcon}
            />
          )}
          {title && <Text style={styles.deckCountTitle}>{title}</Text>}
          {showCount && (
            <Text style={styles.deckCountValue}>{trueDeckSize}</Text>
          )}
        </View>
      )}

      {/* Deck */}
      <View
        style={[styles.deck, style, deckContainerStyle]}
        collapsable={false}
      >
        {/* Anchor Views for refs, used for animations */}
        {refTopCurrent && (
          <View
            ref={refTopCurrent}
            style={[
              // Used as a relative positioned card
              cardStyles.card,
              flexStyles.positionAbsolute,
              // Prevent transition, so animations get accurate position quickly!
              transitionStyles.none,
              { width, height, ...cardOffsetStyle(limitedDeckSize - 1) },
              cardStyles.animHide,
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
              // Prevent transition, so animations get accurate position quickly!
              transitionStyles.none,
              { width, height, ...cardOffsetStyle(limitedDeckSize, true) },
              cardStyles.animHide,
            ]}
            collapsable={false}
          />
        )}

        {/* Placeholder at top of deck; sometimes pressable */}
        {limitedDeckSize === 0 && onPress && (
          <CardButton
            onPress={onPress}
            cardsPerRow={cardsPerRow}
            isPlaceholder
            style={[styles.deckCard]}
            disabled={isDisabled}
            selectColor={selectColor}
            cardSize={cardSize}
            forceSelectColor={!isDisabled}
          />
        )}

        {Array.from({ length: limitedDeckSize }, (_, index) => {
          const adjustedIndex = index + numSkipCards;

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
                styles.deckCard,
                { ...cardOffsetStyle(index) },
                hideTopCard === true &&
                  adjustedIndex === limitedDeckSize - 1 &&
                  cardStyles.animHide,
              ]}
              selectColor={selectColor}
              cardSize={cardSize}
            />
          );
        })}
      </View>
    </View>
  );
};
Deck.displayName = "Deck";

export const deckCountAboveBelowHeight = 36;

export const styles = StyleSheet.create({
  deckWrap: {
    display: "flex",
    backgroundColor: Colors.K875,
  },
  deckWrapInvisibleWhenEmpty: {
    backgroundColor: "unset",
    boxShadow: "unset",
  },
  deckWrapCountOver: {},
  deckWrapCountAbove: {
    alignItems: "center",
    flexDirection: "column",
  },
  deckWrapCountBelow: {
    alignItems: "center",
    flexDirection: "column-reverse",
  },
  deckWrapCountLeft: {
    flexDirection: "row",
    justifyContent: "center",
  },
  deckWrapCountRight: {
    flexDirection: "row-reverse",
    justifyContent: "center",
  },
  // Deck
  deck: {
    position: "relative",
  },
  deckCard: {
    position: "absolute",
  },
  animHide: {
    opacity: 0,
    pointerEvents: "none",
  },

  // Deck count
  deckCount: {
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
    maxWidth: "100%",
  },
  // To the side
  deckCountAbove: {
    ...flexStyles.rowCentered,
    width: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    flexDirection: "row",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    minHeight: deckCountAboveBelowHeight,
  },
  deckCountBelow: {
    ...flexStyles.rowCentered,
    width: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    flexDirection: "row",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    minHeight: deckCountAboveBelowHeight,
  },
  deckCountLeft: {
    ...flexStyles.colCentered,
    flexDirection: "column",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  deckCountRight: {
    ...flexStyles.colCentered,
    flexDirection: "column",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },

  // Over
  deckCountOver: {
    ...flexStyles.colCentered,
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: Colors.suitsRed,
  },
  deckCountTitle: {
    fontSize: 13,
    fontFamily: FontWeight[500],
    color: Colors.K300,
  },
  deckCountIcon: {
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  deckCountValue: {
    fontSize: 18,
    fontFamily: FontWeight[500],
    color: Colors.K300,
  },
});
