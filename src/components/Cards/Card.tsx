import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import { CardComponents as CardsSmall } from "@/assets/cards/small";
import { CardComponents as CardsSmallColored } from "@/assets/cards/small-colored";
import { normalizeGamePath } from "@/data/game-menu";
import { useGameSettings } from "@/hooks/useGameSettings";
import { Colors, rgba } from "@/styles/styles";
import { usePathname } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import type { SvgProps } from "react-native-svg";
import { cardDims, PlayingCard } from "./card-utils";

export type CardSelectColor =
  | "none"
  | "red"
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "yellow"
  | "pink";

export type CardSizes = "small" | "regular" | "small-colored";

function getColorValue(color?: string) {
  let colorValue: string = Colors.cardSelectBlue;

  if (color) {
    switch (color) {
      case "none":
        colorValue = Colors.cardSelectNone;
        break;
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
      default:
        colorValue = color;
    }
  }

  return colorValue;
}

function shadow(
  shadowUnit: number,
  size: number,
  opacity: number,
  colorValue: string,
) {
  return `0 0 0 1px ${rgba(Colors.K875, 0.2)}, 0 0 0 ${shadowUnit * size}px ${rgba(colorValue, opacity)}`;
}

const shadowSizeUnselected = 4;
const shadowSizeSelected = 8;

export type CardProps = Omit<SvgProps, "width" | "height" | "style"> & {
  card: PlayingCard | undefined | null;
  isPlaceholder?: boolean;
  style?: (ViewStyle | false)[];
  isSelectable?: boolean;
  isSelected?: boolean;
  isVisible?: boolean;
  selectColor?: string;
  forceSelectColor?: boolean;
  forceOverlay?: boolean;
  cardWidth: number;
  cardSize?: CardSizes;
  ref?: React.ForwardedRef<any>;
};

export const Card = ({
  ref,
  style,
  card,
  isPlaceholder,
  isSelectable,
  selectColor,
  isVisible = true,
  isSelected,
  cardSize,
  forceSelectColor,
  forceOverlay,
  cardWidth,
  ...svgProps
}: CardProps) => {
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

  if (!isVisible) return null;
  if (!SvgCard) {
    console.warn(`SVG ${cardName} not found.`);
    return null;
  }

  const cardSelectColor = getColorValue(selectColor);

  const cardStyle: ViewStyle = useMemo(() => {
    const shadowUnit = Math.max(cardWidth * cardDims.ratioShadowUnit, 0.2);
    let boxShadow = shadow(
      shadowUnit,
      shadowSizeUnselected,
      0,
      cardSelectColor,
    );

    if (settings?.showCardHints !== false) {
      if (isSelected) {
        boxShadow = shadow(
          shadowUnit,
          shadowSizeSelected,
          0.8,
          cardSelectColor,
        );
      } else if (
        (isSelectable || forceSelectColor) &&
        cardSelectColor !== "none"
      ) {
        boxShadow = shadow(
          shadowUnit,
          shadowSizeUnselected,
          0.8,
          cardSelectColor,
        );
      } else if (!isPlaceholder) {
        boxShadow = `0 0 0 1px ${rgba(Colors.K875, 0.2)}, 0 0 0 1px ${rgba(Colors.K950, 0.3)}, ${shadowUnit * 1}px ${shadowUnit * 2}px ${shadowUnit * 8}px 0 ${rgba(Colors.K900, 0.5)}`;
      }
    }

    return {
      aspectRatio: cardDims.aspectRatio,
      borderRadius: cardWidth * cardDims.ratioRadius,
      boxShadow,
      backgroundColor: "transparent", // Prevents shadow bleeding
    };
  }, [
    cardWidth,
    cardSelectColor,
    isSelected,
    isSelectable,
    forceSelectColor,
    isSelectable,
  ]);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        cardStyle,
        style,
        {
          overflow: "hidden",
          width: "100%",
          height: "auto",
          transitionDuration: "0.15s",
          transitionTimingFunction: "ease",
          transitionProperty: "all",
          position: "relative",
          zIndex: 3,
          outlineWidth: 0,
        },
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            zIndex: 4,
            transitionDuration: "0.15s",
            transitionTimingFunction: "ease",
            transitionProperty: "all",
            backgroundColor: isPlaceholder ? undefined : cardSelectColor,
            opacity: isSelected || forceOverlay ? 0.2 : 0,
          },
        ]}
      />
      <SvgCard {...svgProps} width="100%" height="100%" />
      {isPlaceholder && (
        <View
          style={[
            {
              position: "absolute",
              zIndex: 1,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: Colors.K875,
            },
          ]}
        />
      )}
    </View>
  );
};
