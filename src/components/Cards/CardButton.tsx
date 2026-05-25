import { Pressable, ViewStyle, View } from "react-native";
import { CardRank, CardSuit } from "./card-utils";
import { Card, CardSelectColor } from "./Card";
import { cardStyles } from "@/styles/cardStyles";

interface Props {
  style?: (ViewStyle | false)[];
  suit?: CardSuit;
  rank?: CardRank;
  isPlaceholder?: boolean;
  isSelected?: boolean;
  isSelectedInvalid?: boolean;
  disabled?: boolean;
  cardsPerRow?: number;
  hasTopMargin?: boolean;
  selectColor?: CardSelectColor;
  isBack?: boolean;
  onPress?: () => void;
  ref?: React.Ref<View>;
}

export const CardButton = ({
  rank,
  suit,
  isPlaceholder,
  disabled,
  isSelected,
  isSelectedInvalid,
  style,
  cardsPerRow = 5,
  hasTopMargin,
  selectColor,
  isBack,
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
        isSelectedInvalid={isSelectedInvalid}
        cardsPerRow={cardsPerRow}
        hasTopMargin={hasTopMargin}
        isBack={isBack}
        selectColor={selectColor}
      />
    </Pressable>
  );
};
