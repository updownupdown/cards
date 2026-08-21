import { Colors, rgba, transitionStyles } from "@/styles/styles";
import { cardDims } from "./card-utils";
import { StyleSheet, View, ViewStyle } from "react-native";

export type CardSizes = "small" | "regular" | "tableau" | "classic";

// ===== Card Select Colors ===== //
const cardSelectColorMap = {
  none: Colors.cardSelectNone,
  red: Colors.cardSelectRed,
  blue: Colors.cardSelectBlue,
  green: Colors.cardSelectGreen,
  orange: Colors.cardSelectOrange,
  purple: Colors.cardSelectPurple,
  yellow: Colors.cardSelectYellow,
  pink: Colors.cardSelectPink,
  grey: Colors.cardSelectGrey,
  lightGrey: Colors.cardSelectGrey,
  lightPurple: Colors.cardSelectLightPurple,
} as const;

export type CardColor = keyof typeof cardSelectColorMap;

export function getColorValue(c: string) {
  return c in cardSelectColorMap ? cardSelectColorMap[c as CardColor] : c;
}

// ==== Shadows ===== //
function shadow(
  shadowUnit: number,
  size: number,
  opacity: number,
  colorValue: string,
) {
  return `0 0 0 1px ${rgba(Colors.K875, 0.2)}, 0 0 0 ${shadowUnit * size}px ${rgba(colorValue, opacity)}`;
}

export function getCardShadow(props: {
  cardWidth: number;
  isSelected?: boolean;
  isSelectable?: boolean;
  forceSelectColor?: boolean;
  isPlaceholder?: boolean;
  selectColor?: CardColor | string;
}) {
  const selectColor = getColorValue(props.selectColor ?? "none");
  const shadowUnit = Math.max(props.cardWidth * cardDims.ratioShadowUnit, 0.2);

  if (props.isSelected) {
    return shadow(shadowUnit, 8, 0.8, selectColor);
  } else if (props.isSelectable || props.forceSelectColor) {
    return shadow(shadowUnit, 4, 0.8, selectColor);
  } else if (!props.isPlaceholder) {
    return `0 0 0 1px ${rgba(Colors.K875, 0.2)}, 0 0 0 1px ${rgba(Colors.K950, 0.3)}, ${shadowUnit * 1}px ${shadowUnit * 2}px ${shadowUnit * 8}px 0 ${rgba(Colors.K900, 0.5)}`;
  } else {
    return shadow(shadowUnit, 4, 0, selectColor);
  }
}

// ==== Overlays ===== //
export const CardOverlay = (props: {
  cardWidth: number;
  selectColor?: CardColor | string;
  isSelected?: boolean;
  forceOverlayColor?: boolean;
}) => {
  const selectColor = getColorValue(props.selectColor ?? "none");

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          ...transitionStyles.limited02sec,
          zIndex: 4,
          borderRadius: props.cardWidth * cardDims.ratioRadius,
          backgroundColor: selectColor,
          opacity:
            props.isSelected || props.forceOverlayColor
              ? props.selectColor === "grey"
                ? 0.5
                : 0.3
              : 0,
          mixBlendMode: "multiply",
        },
      ]}
    />
  );
};

// ===== Underlay ===== //
export const getUnderlayStyle = (
  cardWidth: number,
  colorDark: CardColor | string,
  colorPale: CardColor | string,
  customBackground?: CardColor | string,
  hideBackground?: boolean,
  hideShadow?: boolean,
): ViewStyle => {
  return {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    borderRadius: cardWidth * cardDims.ratioRadius,
    backgroundColor: hideBackground
      ? "transparent"
      : customBackground
        ? customBackground
        : rgba(colorDark, 0.7),
    boxShadow:
      hideBackground || hideShadow
        ? undefined
        : `${cardWidth * 0.05}px ${cardWidth * 0.1}px ${cardWidth * 0.2}px ${rgba(Colors.black, 0.3)}`,
  };
};
