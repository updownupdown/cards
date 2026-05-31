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
import { CardRank, CardSuit, PlayingCard } from "./card-utils";
import { useGameSettings } from "@/hooks/useGameSettings";
import { normalizeGamePath } from "@/data/game-menu";
import { usePathname } from "expo-router";
import { useContentWidth } from "@/hooks/useContentWidth";

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
const cardGapRatio = 0.82;
const cardShadowRadio = 0.01;
export const cardBorderRadiusRatio = 0.08;

interface CardGridProps {
  cardsPerRow: number;
  targetGridCols?: number;
  style?: ViewStyle[];
  children: React.ReactNode;
}

export const CardGrid = ({
  cardsPerRow,
  targetGridCols,
  style,
  children,
}: CardGridProps) => {
  const { contentDiameter: contentWidth } = useContentWidth();

  const cardWidth = (contentWidth / cardsPerRow) * cardGapRatio;

  const totalGap = contentWidth - cardWidth * cardsPerRow;
  const gridGap = totalGap / (cardsPerRow - 1);

  const targetCols = targetGridCols ?? cardsPerRow;
  const gridWidth = cardWidth * targetCols + gridGap * (targetCols - 1);

  return (
    <View
      style={[
        {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          width: gridWidth,
          gap: gridGap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const useCardSize = (cardsPerRow = 5, targetGridCol?: number) => {
  const { contentDiameter: contentWidth } = useContentWidth();

  const cardWidthRequested = (100 / cardsPerRow / 100) * contentWidth;
  const width = cardWidthRequested * cardGapRatio;

  const topMargin = cardWidthRequested * (1 - cardGapRatio);
  const height = width / cardAspectRatio;
  const borderRadius = width * cardBorderRadiusRatio;
  const shadowUnit = width * cardShadowRadio;
  const placeholderShadow = `inset ${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 14}px ${rgba(Colors.black, 0.3)}`;

  const gridGap = topMargin / 2;
  const targetCols = targetGridCol ?? cardsPerRow;
  const gridWidth = width * targetCols + gridGap * (targetCols - 1);

  return {
    width,
    height,
    topMargin,
    borderRadius,
    placeholderShadow,
    gridWidth,
    gridGap,
  };
};

export type CardSizes = "small" | "regular" | "small-colored";

export type CardProps = Omit<SvgProps, "width" | "height" | "style"> & {
  card: PlayingCard | undefined | null;
  isPlaceholder?: boolean;
  style?: (ViewStyle | false)[];
  cardsPerRow?: number;
  isSelectable?: boolean;
  isSelected?: boolean;
  selectColor?: CardSelectColor;
  hasTopMargin?: boolean;
  forceSelectColor?: boolean;
  forceOverlay?: boolean;
  customTopMarginPerc?: number;
  cardSize?: CardSizes;
};

export const Card = forwardRef<any, CardProps>(
  (
    {
      style,
      card,
      isPlaceholder,
      cardsPerRow = 5,
      isSelectable,
      selectColor,
      isSelected,
      cardSize,
      hasTopMargin,
      forceSelectColor,
      forceOverlay,
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

    let cardName = isPlaceholder ? "Placeholder" : "BackH";

    if (!isPlaceholder && card && card.faceUp) {
      cardName = card.rank + card.suit.charAt(0).toUpperCase();
    }

    const SvgCard = cardFiles[cardName];

    if (!SvgCard) {
      console.warn(`SVG ${cardName} not found.`);
      return null;
    }

    const { width, height, topMargin, borderRadius, placeholderShadow } =
      useCardSize(cardsPerRow);

    const cardStyle: ViewStyle = {};

    cardStyle.width = width;
    cardStyle.height = height;
    cardStyle.borderRadius = borderRadius;

    if (hasTopMargin && customTopMarginPerc !== undefined) {
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
      } else if ((isSelectable || forceSelectColor) && selectColor !== "none") {
        cardStyle.boxShadow = shadow(shadowSizeUnselected, 0.8);
      } else {
        cardStyle.boxShadow = `0 0 0 1px ${rgba(Colors.K900, 0.2)}, 0 0  ${shadowUnit * 4}px 0 ${rgba(Colors.K900, 0.5)}`;
      }
    }

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[cardStyles.card, cardStyle, style]}
      >
        <View
          style={[
            cardStyles.cardSelectOverlay,
            {
              backgroundColor: isPlaceholder ? undefined : colorValue,
              opacity: isSelected || forceOverlay ? 0.2 : 0,
            },
          ]}
        />
        <SvgCard {...svgProps} width="100%" height="100%" />
        {isPlaceholder && (
          <View
            style={[
              cardStyles.cardPlaceholderUnderlay,
              { boxShadow: placeholderShadow },
            ]}
          />
        )}
      </View>
    );
  },
);
Card.displayName = "Card";
