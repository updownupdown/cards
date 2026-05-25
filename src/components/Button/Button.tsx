import { Icon, IconName } from "@/icons";
import { buttonStyles } from "@/styles/buttonStyles";
import { Colors } from "@/styles/styles";
import { Pressable, Text, TextStyle, ViewStyle } from "react-native";

interface Props {
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  size?: "text" | "textLarge" | "small" | "medium" | "large";
  disabled?: boolean;
  fullWidth?: boolean;
  onPress: () => void;
  text?: string;
  iconName?: IconName;
  iconColor?: string;
}

export const Button = ({
  style,
  textStyle,
  size = "medium",
  disabled,
  fullWidth,
  text,
  iconName,
  iconColor,
  onPress,
}: Props) => {
  return (
    <Pressable
      style={[
        buttonStyles.button,
        size === "text" && buttonStyles.sizeText,
        size === "textLarge" && buttonStyles.sizeTextLarge,
        size === "small" && buttonStyles.sizeSmall,
        size === "medium" && buttonStyles.sizeMedium,
        size === "large" && buttonStyles.sizeLarge,
        fullWidth && buttonStyles.fullWidth,
        disabled && buttonStyles.disabled,
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
          style={[
            buttonStyles.text,
            size === "text" && buttonStyles.textSizeText,
            size === "textLarge" && buttonStyles.textSizeTextLarge,
            size === "small" && buttonStyles.textSizeSmall,
            size === "medium" && buttonStyles.textSizeMedium,
            size === "large" && buttonStyles.textSizeLarge,
            disabled && buttonStyles.textDisabled,
            textStyle,
          ]}
        >
          {text}
        </Text>
      )}
    </Pressable>
  );
};
