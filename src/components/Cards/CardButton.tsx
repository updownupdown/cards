import { Pressable, ViewStyle } from "react-native";
import { CardRank, CardSuit } from "./card-utils";
import { Card } from "./Card";

interface Props {
  buttonStyle?: ViewStyle | ViewStyle[];
  suit?: CardSuit;
  rank?: CardRank;
  isPlaceholder?: boolean;
  isSelected?: boolean;
  isSelectedInvalid?: boolean;
  disabled?: boolean;
  widthPerc?: number;
  onPress: () => void;
}

export const CardButton = ({
  rank,
  suit,
  isPlaceholder,
  disabled,
  isSelected,
  isSelectedInvalid,
  buttonStyle,
  widthPerc = 25,
  onPress,
}: Props) => {
  return (
    <Pressable onPress={onPress} style={buttonStyle} disabled={disabled}>
      <Card
        suit={suit}
        rank={rank}
        isPlaceholder={isPlaceholder}
        widthPerc={widthPerc}
        isSelectable={!disabled}
        isSelected={isSelected}
        isSelectedInvalid={isSelectedInvalid}
      />
    </Pressable>
  );
};
