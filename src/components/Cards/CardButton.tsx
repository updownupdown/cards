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
}

export const CardButton = ({
  rank,
  suit,
  isPlaceholder,
  disabled,
  isSelected,
  style,
  cardsPerRow = 5,
  hasTopMargin,
  customTopMarginPerc,
  selectColor,
  isBack,
  cardSize,
  onPress,
  ref,
}: Props) => {
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      style={[style, cardStyles.transition]}
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
      />
    </Pressable>
  );
};
