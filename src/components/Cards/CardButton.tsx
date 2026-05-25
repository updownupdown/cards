import { forwardRef } from "react";
import { Pressable, ViewStyle, View } from "react-native";
import { CardRank, CardSuit } from "./card-utils";
import { Card } from "./Card";
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
  altSelectableColor?: string;
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
  altSelectableColor,
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
        altSelectableColor={altSelectableColor}
      />
    </Pressable>
  );
};
