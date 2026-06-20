import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import { CardComponents as CardsSmall } from "@/assets/cards/small";
import { CardComponents as CardsSmallColored } from "@/assets/cards/small-colored";
import { Colors } from "@/styles/styles";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { cardDims, PlayingCard } from "./card-utils";
import {
  CardColor,
  CardOverlay,
  CardSizes,
  getCardShadow,
  getColorValue,
} from "./CardStyles";

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
};

export const Card = ({
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
}: CardProps) => {
  const cardFiles =
    cardSize === "small"
      ? CardsSmall
      : cardSize === "small-colored"
        ? CardsSmallColored
        : CardsRegular;

  let cardName = "BackH";

  if (card && card.faceUp) {
    cardName = card.rank + card.suit.charAt(0).toUpperCase();
  }

  const SvgCard = cardFiles[cardName];

  if (!isVisible) return null;
  if (!SvgCard) {
    console.warn(`SVG ${cardName} not found.`);
    return null;
  }

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
          transitionDuration: "0.15s",
          transitionTimingFunction: "ease",
          transitionProperty: "all",
          position: "relative",
          zIndex: 3,
          outlineWidth: 0,
          borderRadius: cardWidth * cardDims.ratioRadius,
          boxShadow: getCardShadow({
            cardWidth,
            selectColor,
            isSelected,
            isSelectable,
            forceSelectColor,
            isPlaceholder,
          }),
        },
      ]}
    >
      <CardOverlay
        isSelected={isSelected}
        forceOverlayColor={forceOverlayColor}
        selectColor={selectColor}
      />

      <SvgCard width="100%" height="100%" />
    </View>
  );
};
