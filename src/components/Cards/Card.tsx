import React, { forwardRef } from "react";
import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import { CardComponents as CardsSmall } from "@/assets/cards/small";
import { CardComponents as CardsSmallColored } from "@/assets/cards/small-colored";
import {
  Colors,
  ContentSidePadding,
  MaxContentWidth,
  rgba,
} from "@/styles/styles";
import { cardStyles } from "@/styles/cardStyles";
import { useWindowDimensions, View, ViewStyle } from "react-native";
import type { SvgProps } from "react-native-svg";
import { CardRank, CardSuit } from "./card-utils";
import { useGameSettings } from "@/hooks/useGameSettings";
import { normalizeGamePath } from "@/data/game-menu";
import { usePathname } from "expo-router";

export type CardSelectColor =
  | "none"
  | "red"
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
  const placeholderShadow = `inset ${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 14}px ${rgba(Colors.black, 0.3)}`;

  return {
    width,
    height,
    topMargin,
    borderRadius,
    placeholderShadow,
  };
};

export type CardSizes = "small" | "regular" | "small-colored";

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
  hasTopMargin?: boolean;
  customTopMarginPerc?: number;
  cardSize?: CardSizes;
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
      cardSize,
      hasTopMargin,
      customTopMarginPerc,
      ...svgProps
    },
    ref,
  ) => {
    const pathname = normalizeGamePath(usePathname());
    const { settings } = useGameSettings(pathname);

    const cardFiles =
      cardSize === "small"
        ? CardsSmall
        : cardSize === "small-colored"
          ? CardsSmallColored
          : CardsRegular;

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

    if (customTopMarginPerc !== undefined) {
      cardStyle.marginTop = customTopMarginPerc * height;
    } else if (hasTopMargin) {
      cardStyle.marginTop = topMargin;
    }

    const shadowUnit = Math.max(width * cardShadowRadio, 0.7);

    let colorValue: string = Colors.cardSelectBlue;

    if (selectColor) {
      switch (selectColor) {
        case "red":
          colorValue = Colors.cardSelectRed;
          break;
        case "blue":
          colorValue = Colors.cardSelectBlue;
          break;
        case "green":
          colorValue = Colors.cardSelectGreen;
          break;
        case "orange":
          colorValue = Colors.cardSelectOrange;
          break;
        case "purple":
          colorValue = Colors.cardSelectPurple;
          break;
        case "yellow":
          colorValue = Colors.cardSelectYellow;
          break;
        case "pink":
          colorValue = Colors.cardSelectPink;
          break;
      }
    }

    function shadow(size: number, opacity: number, customColor?: string) {
      return `0 0 0 1px ${rgba(Colors.K900, 0.2)}, 0 0 0 ${shadowUnit * size}px ${rgba(customColor ?? colorValue, opacity)}`;
    }

    const shadowSizeUnselected = 4;
    const shadowSizeSelected = 8;

    cardStyle.boxShadow = shadow(shadowSizeUnselected, 0);

    if (settings?.showCardHints !== false) {
      if (isSelected) {
        cardStyle.boxShadow = shadow(shadowSizeSelected, 0.8);
      } else if (isSelectable && selectColor !== "none") {
        cardStyle.boxShadow = shadow(shadowSizeUnselected, 0.8);
      } else {
        cardStyle.boxShadow = `0 0 0 1px ${rgba(Colors.K900, 0.2)}, 0 0  ${shadowUnit * 4}px 0 ${rgba(Colors.K900, 0.5)}`;
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
            { backgroundColor: colorValue, opacity: isSelected ? 0.17 : 0 },
          ]}
        />
        <SvgCard {...svgProps} width="100%" height="100%" />
      </View>
    );
  },
);
Card.displayName = "Card";
