import React, { forwardRef } from "react";
import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import { CardComponents as CardsSmall } from "@/assets/cards/small";
import { Colors, MaxContentWidth, rgba } from "@/styles/styles";
import { cardStyles } from "@/styles/cardStyles";
import { useWindowDimensions, View, ViewStyle } from "react-native";
import type { SvgProps } from "react-native-svg";
import { CardRank, CardSuit } from "./card-utils";

const cardDefaultWidth = 250;
const cardDefaultHeight = 350;
const cardAspectRatio = cardDefaultWidth / cardDefaultHeight;
const cardWidthRatio = 0.82;
const cardShadowRadio = 0.01;

export const useCardSize = (cardsPerRow = 5) => {
  const { width: windowWidth } = useWindowDimensions();

  const contentWidth = Math.min(windowWidth, MaxContentWidth);
  const cardWidthRequested = (100 / cardsPerRow / 100) * contentWidth;
  const width = cardWidthRequested * cardWidthRatio;
  const topMargin = cardWidthRequested * (1 - cardWidthRatio);
  const height = width / cardAspectRatio;
  const borderRadius = width * 0.08;
  const shadowUnit = width * cardShadowRadio;
  const placeholderShadow = `inset ${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 14}px ${rgba(Colors.black, 0.4)}`;

  return {
    width,
    height,
    topMargin,
    borderRadius,
    placeholderShadow,
  };
};

export type CardProps = Omit<SvgProps, "width" | "height" | "style"> & {
  rank?: CardRank;
  suit?: CardSuit;
  isBack?: boolean;
  isPlaceholder?: boolean;
  isAnimRef?: boolean;
  style?: (ViewStyle | false)[];
  cardsPerRow?: number;
  omitShadow?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  isSelectedInvalid?: boolean;
  hasTopMargin?: boolean;
  cardSize?: "small" | "regular";
};

export const Card = forwardRef<any, CardProps>(
  (
    {
      style,
      rank,
      suit,
      isBack,
      isPlaceholder,
      isAnimRef,
      cardsPerRow = 5,
      omitShadow,
      isSelectable,
      isSelected,
      isSelectedInvalid,
      cardSize,
      hasTopMargin,
      ...svgProps
    },
    ref,
  ) => {
    const cardFiles = cardSize === "small" ? CardsSmall : CardsRegular;

    let cardName = "Placeholder";

    if (!isPlaceholder && !isAnimRef) {
      const suitName = suit ? suit.charAt(0).toUpperCase() : "H";
      cardName = rank ?? "Back";
      cardName += suitName;
    }

    const SvgCard = cardFiles[cardName];

    if (!SvgCard) {
      console.warn(`SVG ${cardName} not found.`);
      return null;
    }

    const { width, height, topMargin, borderRadius } = useCardSize(cardsPerRow);

    const cardStyle: ViewStyle = {};

    cardStyle.width = width;
    cardStyle.height = height;
    cardStyle.borderRadius = borderRadius;

    if (hasTopMargin) {
      cardStyle.marginTop = topMargin;
    }

    const shadowUnit = width * cardShadowRadio;

    if (isPlaceholder) {
      cardStyle.boxShadow = `inset ${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 14}px ${rgba(Colors.black, 0.4)}`;
      cardStyle.backgroundColor = Colors.K900;
    }

    if (isSelectedInvalid) {
      cardStyle.boxShadow = `0 0 0 ${shadowUnit * 8}px ${rgba(Colors.cardSelecteInvalid, 0.7)}`;
    } else if (isSelected) {
      cardStyle.boxShadow = `0 0 0 ${shadowUnit * 8}px ${rgba(Colors.cardSelected, 0.8)}`;
    } else if (isSelectable) {
      cardStyle.boxShadow = `0 0 0 ${shadowUnit * 5}px ${rgba(Colors.cardSelectable, 0.7)}`;
    } else if (!isPlaceholder && !omitShadow) {
      cardStyle.boxShadow = `${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 8}px rgba(0,0,0,.1), ${shadowUnit * 2}px ${shadowUnit * 4}px ${shadowUnit * 16}px rgba(0,0,0,.1)`;
    }

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          cardStyles.card,
          cardStyle,
          isAnimRef && cardStyles.animHide,
          style,
        ]}
      >
        <SvgCard {...svgProps} width="100%" height="100%" />
      </View>
    );
  },
);
Card.displayName = "Card";
