import { Image } from "expo-image";
import React, { memo } from "react";
import { View, ViewStyle } from "react-native";
import { getCardBackAsset, getCardImageSource } from "./CardAssets";
import { cardDims, PlayingCard } from "./card-utils";
import { CardColor, CardOverlay, CardSizes, getCardShadow } from "./CardStyles";
import { transitionStyles } from "@/styles/styles";

export type CardProps = {
  card?: PlayingCard;
  style?: ViewStyle;
  isSelectable?: boolean;
  isSelected?: boolean;
  isVisible?: boolean;
  selectColor?: CardColor | string;
  forceSelectColor?: boolean;
  forceOverlayColor?: boolean;
  cardWidth: number;
  cardSize?: CardSizes;
  isPlaceholder?: boolean;
  isHiddenUnderDeck?: boolean;
  customBack?: string;
};

const CardComponent = ({
  style,
  card,
  isSelectable,
  selectColor = "none",
  isVisible = true,
  isSelected,
  cardSize,
  forceSelectColor,
  forceOverlayColor,
  cardWidth,
  isPlaceholder,
  isHiddenUnderDeck,
  customBack,
}: CardProps) => {
  let cardName = "BackH";

  if (card && card.faceUp) {
    cardName = card.rank + card.suit.charAt(0).toUpperCase();
  }

  const isFaceDown = !card || !card.faceUp;
  const imageSource = isFaceDown
    ? undefined
    : getCardImageSource(cardSize, cardName);
  const backAsset = getCardBackAsset(customBack);

  if (!isFaceDown && !imageSource) return null;

  return (
    <View
      collapsable={false}
      style={[
        style,
        {
          overflow: "hidden",
          width: "100%",
          height: "auto",
          aspectRatio: cardDims.aspectRatio,
          // DO NOT APPLY OPACITY TRANSITION HERE!
          // It will create glitches with drag-and-drop actions
          ...transitionStyles.noOpacity02sec,
          position: "relative",
          zIndex: 3,
          outlineWidth: 0,
          boxShadow: isHiddenUnderDeck
            ? "none"
            : getCardShadow({
                cardWidth,
                selectColor,
                isSelected,
                isSelectable,
                forceSelectColor,
                isPlaceholder,
              }),
          borderRadius: Math.max(cardWidth, 1) * cardDims.ratioRadius,
          backfaceVisibility: "hidden",
        },
        !isVisible && { opacity: 0 },
      ]}
    >
      <CardOverlay
        cardWidth={cardWidth}
        isSelected={isSelected}
        forceOverlayColor={forceOverlayColor}
        selectColor={selectColor}
      />

      {isFaceDown ? (
        <Image
          source={backAsset}
          cachePolicy="memory-disk"
          style={{ width: "100%", height: "100%" }}
          transition={0}
        />
      ) : (
        <Image
          source={imageSource}
          cachePolicy="memory-disk"
          style={{ width: "100%", height: "100%" }}
          transition={0}
        />
      )}
    </View>
  );
};

// The card face is purely presentational (no callback props), so it only
// needs to re-render when a value that affects its visual output changes.
// This matters a lot for games like Accordion that fire many rapid state
// updates: the parent AnimatedCard re-renders for every card on each update
// (its `onPress` closure identity changes each render), but with this memo
// only the card whose values actually changed re-runs the expensive image /
// box-shadow / overlay rendering. `style` is compared by identity, which is
// correct because AnimatedCard never passes it (both undefined), while the
// drag-ghost usages that do pass an inline `style` simply re-render as before.
function areCardPropsEqual(prev: CardProps, next: CardProps) {
  return (
    prev.style === next.style &&
    prev.cardWidth === next.cardWidth &&
    prev.isSelectable === next.isSelectable &&
    prev.isSelected === next.isSelected &&
    prev.isVisible === next.isVisible &&
    prev.selectColor === next.selectColor &&
    prev.forceSelectColor === next.forceSelectColor &&
    prev.forceOverlayColor === next.forceOverlayColor &&
    prev.cardSize === next.cardSize &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.isHiddenUnderDeck === next.isHiddenUnderDeck &&
    prev.customBack === next.customBack &&
    prev.card?.id === next.card?.id &&
    prev.card?.faceUp === next.card?.faceUp &&
    prev.card?.rank === next.card?.rank &&
    prev.card?.suit === next.card?.suit
  );
}

export const Card = memo(CardComponent, areCardPropsEqual);
