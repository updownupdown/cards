import { Pressable, ViewStyle, View } from "react-native";
import { CardRank, CardSuit } from "./card-utils";
import { Card, CardSelectColor, CardSizes } from "./Card";
import { cardStyles } from "@/styles/cardStyles";

interface Props {
  style?: (ViewStyle | false)[];
  suit?: CardSuit;
  rank?: CardRank;
  isPlaceholder?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  cardsPerRow?: number;
  hasTopMargin?: boolean;
  customTopMarginPerc?: number;
  selectColor?: CardSelectColor;
  isBack?: boolean;
  onPress?: () => void;
  ref?: React.Ref<View>;
  cardSize?: CardSizes;
  forceSelectColor?: boolean;
  forceOverlay?: boolean;
}

export const CardButton = ({
  rank,
  suit,
  isPlaceholder,
  disabled,
  isSelected,
  style,
  cardsPerRow,
  hasTopMargin,
  customTopMarginPerc,
  selectColor,
  isBack,
  cardSize,
  onPress,
  forceSelectColor,
  forceOverlay,
  ref,
}: Props) => {
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      style={[cardStyles.transition, style]}
      disabled={disabled || !onPress}
    >
      <Card
        suit={suit}
        rank={rank}
        isPlaceholder={isPlaceholder}
        isSelectable={!disabled && onPress !== undefined}
        isSelected={isSelected}
        cardsPerRow={cardsPerRow}
        hasTopMargin={hasTopMargin}
        customTopMarginPerc={customTopMarginPerc}
        isBack={isBack}
        selectColor={selectColor}
        cardSize={cardSize}
        forceSelectColor={forceSelectColor}
        forceOverlay={forceOverlay}
      />
    </Pressable>
  );
};
