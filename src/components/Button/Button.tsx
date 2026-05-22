import { Icon, IconName } from "@/icons";
import { buttonStyles } from "@/styles/buttonStyles";
import { Colors } from "@/styles/styles";
import { Pressable, Text, ViewStyle } from "react-native";

interface Props {
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  onPress: () => void;
  text?: string;
  iconName?: IconName;
  iconColor?: string;
}

export const Button = ({
  style,
  disabled,
  text,
  iconName,
  iconColor,
  onPress,
}: Props) => {
  return (
    <Pressable
      style={[
        buttonStyles.button,
        disabled && buttonStyles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {iconName && (
        <Icon
          name={iconName}
          style={buttonStyles.icon}
          color={iconColor ?? Colors.K100}
        />
      )}
      {text && (
        <Text
          style={[buttonStyles.text, disabled && buttonStyles.textDisabled]}
        >
          {text}
        </Text>
      )}
    </Pressable>
  );
};
