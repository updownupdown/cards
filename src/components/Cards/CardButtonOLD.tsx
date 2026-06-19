import { cardStyles } from "@/styles/cardStyles";
import React from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  View,
  ViewStyle,
} from "react-native";
import { CardOLD, CardSelectColor, CardSizes } from "./CardOLD";
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
  selectColor?: string;
  onPress?: () => void;
  ref?: React.Ref<View>;
  cardSize?: CardSizes;
  forceSelectColor?: boolean;
  forceOverlay?: boolean;
  placeholderContent?: React.ReactNode;
}

/**
 * @deprecated
 */
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
      <CardOLD
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
