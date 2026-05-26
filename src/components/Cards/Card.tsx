import React, { forwardRef } from "react";
import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import { CardComponents as CardsSmall } from "@/assets/cards/small";
import { Colors, MaxContentWidth, rgba } from "@/styles/styles";
import { cardStyles } from "@/styles/cardStyles";
import { useWindowDimensions, View, ViewStyle } from "react-native";
import type { SvgProps } from "react-native-svg";
import { CardRank, CardSuit } from "./card-utils";
import { useGameSettings } from "@/hooks/useGameSettings";
import { normalizeGamePath } from "@/data/game-menu";
import { usePathname } from "expo-router";

export type CardSelectColor =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "yellow"
  | "pink";

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
  isSelectable?: boolean;
  isSelected?: boolean;
  selectColor?: CardSelectColor;
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
      isSelectable,
      selectColor,
      isSelected,
      isSelectedInvalid,
      cardSize,
      hasTopMargin,
      ...svgProps
    },
    ref,
  ) => {
    const pathname = normalizeGamePath(usePathname());
    const { settings } = useGameSettings(pathname);

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

    let color: string = Colors.cardSelectBlue;

    if (selectColor) {
      switch (selectColor) {
        case "blue":
          color = Colors.cardSelectBlue;
          break;
        case "green":
          color = Colors.cardSelectGreen;
          break;
        case "orange":
          color = Colors.cardSelectOrange;
          break;
        case "purple":
          color = Colors.cardSelectPurple;
          break;
        case "yellow":
          color = Colors.cardSelectYellow;
          break;
        case "pink":
          color = Colors.cardSelectPink;
          break;
      }
    }

    function shadow(size: number, opacity: number, invalid?: boolean) {
      return `0 0 0 1px ${rgba(Colors.K900, 0.2)}, 0 0 0 ${shadowUnit * size}px ${rgba(invalid ? Colors.cardSelectInvalid : color, opacity)}`;
    }

    const shadowSizeUnselected = 5;
    const shadowSizeSelected = 8;

    cardStyle.boxShadow = shadow(shadowSizeUnselected, 0);

    if (settings?.showCardHints !== false) {
      if (isSelectedInvalid) {
        cardStyle.boxShadow = shadow(shadowSizeSelected, 0.7, true);
      } else if (isSelected) {
        cardStyle.boxShadow = shadow(shadowSizeSelected, 0.8);
      } else if (isSelectable) {
        cardStyle.boxShadow = shadow(shadowSizeUnselected, 0.8);
      }
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
        <View
          style={[
            cardStyles.cardSelectOverlay,
            { backgroundColor: color, opacity: isSelected ? 0.17 : 0 },
          ]}
        />
        <SvgCard {...svgProps} width="100%" height="100%" />
      </View>
    );
  },
);
Card.displayName = "Card";
