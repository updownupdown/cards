import { Colors, rgba } from "@/styles/styles";
import { cardDims } from "./card-utils";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, ViewStyle } from "react-native";

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

/**
 * Card shadow as a style. Web uses the CSS box-shadow above. On Android a
 * blurred box-shadow is redrawn (with a blur mask) for every card on every
 * frame while cards move, which dominated frame time during deals; there the
 * soft shadow is an elevation shadow instead (drawn by the platform renderer),
 * and only the cheap unblurred rings stay as box-shadows.
 */
export function getCardShadowStyle(
  props: Parameters<typeof getCardShadow>[0] & { isHiddenUnderDeck?: boolean },
): ViewStyle {
  if (props.isHiddenUnderDeck) return { boxShadow: "none" };
  if (Platform.OS === "web") return { boxShadow: getCardShadow(props) };

  const isRestingCard =
    !props.isSelected &&
    !props.isSelectable &&
    !props.forceSelectColor &&
    !props.isPlaceholder;

  if (!isRestingCard) {
    // Selection/placeholder rings have no blur, so they stay box-shadows.
    return { boxShadow: getCardShadow(props) };
  }

  const shadowUnit = Math.max(props.cardWidth * cardDims.ratioShadowUnit, 0.2);

  return {
    boxShadow: `0 0 0 1px ${rgba(Colors.K875, 0.2)}, 0 0 0 1px ${rgba(Colors.K950, 0.3)}`,
    elevation: Math.max(1, Math.round(shadowUnit * 5)),
    // Android only casts an elevation shadow from a view with a background.
    backgroundColor: Colors.white,
  };
}

// ==== Overlays ===== //
export const CardOverlay = (props: {
  cardWidth: number;
  selectColor?: CardColor | string;
  isSelected?: boolean;
  forceOverlayColor?: boolean;
  /**
   * Empty zones are dark, so a multiplied tint barely shows on them; they are
   * tinted normally instead, which roughly doubles how bright a highlighted
   * zone looks.
   */
  isPlaceholder?: boolean;
}) => {
  const targetOpacity =
    props.isSelected || props.forceOverlayColor
      ? props.selectColor === "grey"
        ? 0.5
        : 0.27
      : 0;

  // Keep the last visible colour so deselecting fades out rather than the
  // colour snapping to transparent first.
  const lastColorRef = useRef(getColorValue(props.selectColor ?? "none"));
  if (targetOpacity > 0) {
    lastColorRef.current = getColorValue(props.selectColor ?? "none");
  }

  // Only mounted while visible or fading out. A mixBlendMode child makes its
  // parent render to an offscreen layer on every draw (saveLayer on Android),
  // so an always-mounted transparent overlay costs one layer per card face.
  const [isMounted, setIsMounted] = useState(targetOpacity > 0);
  if (targetOpacity > 0 && !isMounted) {
    setIsMounted(true);
  }

  // Animated rather than a CSS transition, which React Native ignores.
  const opacity = useRef(new Animated.Value(targetOpacity)).current;
  useEffect(() => {
    if (!isMounted) return;

    const animation = Animated.timing(opacity, {
      toValue: targetOpacity,
      duration: 200,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start(({ finished }) => {
      if (finished && targetOpacity === 0) setIsMounted(false);
    });

    return () => animation.stop();
  }, [isMounted, opacity, targetOpacity]);

  if (!isMounted) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 4,
          borderRadius: props.cardWidth * cardDims.ratioRadius,
          backgroundColor: lastColorRef.current,
          opacity,
          // No blend mode on placeholders also spares Android an offscreen layer.
          mixBlendMode: props.isPlaceholder ? undefined : "multiply",
          pointerEvents: "none",
        },
      ]}
    />
  );
};

// ===== Underlay ===== //
export const getUnderlayStyle = (
  cardWidth: number,
  colorDark: CardColor | string,
  _colorPale: CardColor | string,
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
