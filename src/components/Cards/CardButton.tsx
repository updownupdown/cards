import { cardStyles } from "@/styles/cardStyles";
import React from "react";
import { Platform, Pressable, View, ViewStyle } from "react-native";
import { Card, CardSelectColor, CardSizes } from "./Card";
import { PlayingCard } from "./card-utils";

interface Props {
  style?: (ViewStyle | false)[];
  card?: PlayingCard | null | undefined;
  isPlaceholder?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  cardsPerRow?: number;
  hasTopMargin?: boolean;
  customTopMarginPerc?: number;
  selectColor?: CardSelectColor;
  onPress?: () => void;
  ref?: React.Ref<View>;
  cardSize?: CardSizes;
  forceSelectColor?: boolean;
  forceOverlay?: boolean;
  placeholderContent?: React.ReactNode;
}

export const CardButton = ({
  card,
  isPlaceholder,
  disabled,
  isSelected,
  style,
  cardsPerRow,
  hasTopMargin,
  customTopMarginPerc,
  selectColor,
  cardSize,
  onPress,
  forceSelectColor,
  forceOverlay,
  placeholderContent,
  ref,
}: Props) => {
  return (
    <Pressable
      ref={ref}
      onPress={() => {
        if (Platform.OS === "web" && typeof document !== "undefined") {
          (document.activeElement as HTMLElement)?.blur?.();
        }
        if (onPress) onPress();
      }}
      style={[cardStyles.transition, style]}
      disabled={disabled || !onPress}
    >
      <Card
        card={card}
        isPlaceholder={isPlaceholder}
        isSelectable={!disabled && onPress !== undefined}
        isSelected={isSelected}
        cardsPerRow={cardsPerRow}
        hasTopMargin={hasTopMargin}
        customTopMarginPerc={customTopMarginPerc}
        selectColor={selectColor}
        cardSize={cardSize}
        forceSelectColor={forceSelectColor}
        forceOverlay={forceOverlay}
      />

      {placeholderContent && (
        <View style={[cardStyles.placeholderContentWrap]}>
          {placeholderContent}
        </View>
      )}
    </Pressable>
  );
};
