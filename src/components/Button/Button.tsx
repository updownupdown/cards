import { Icon, IconName } from "@/icons";
import { buttonStyles } from "@/styles/buttonStyles";
import { Colors } from "@/styles/styles";
import { Pressable, Text, TextStyle, ViewStyle } from "react-native";

interface Props {
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  size?: "text" | "textLarge" | "small" | "medium" | "large";
  theme?: "blue" | "purple" | "orange" | "red" | "yellow" | "green";
  disabled?: boolean;
  fullWidth?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  onPressIn?: () => void;
  onPressOut?: () => void;
  text?: string;
  iconName?: IconName;
  iconColor?: string;
  iconSize?: number;
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
  theme,
  iconSize,
  onPress,
  onLongPress,
  delayLongPress,
  onPressIn,
  onPressOut,
}: Props) => {
  return (
    <Pressable
      style={[
        buttonStyles.button,
        theme === undefined && buttonStyles.themeBlue,
        theme === "blue" && buttonStyles.themeBlue,
        theme === "red" && buttonStyles.themeRed,
        theme === "orange" && buttonStyles.themeOrange,
        theme === "purple" && buttonStyles.themePurple,
        theme === "yellow" && buttonStyles.themeYellow,
        theme === "green" && buttonStyles.themeGreen,
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
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      {iconName && (
        <Icon
          name={iconName}
          style={buttonStyles.icon}
          color={iconColor ?? Colors.K100}
          size={iconSize ?? 24}
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
            theme === undefined && buttonStyles.themeTextBlue,
            theme === "blue" && buttonStyles.themeTextBlue,
            theme === "red" && buttonStyles.themeTextRed,
            theme === "orange" && buttonStyles.themeTextOrange,
            theme === "purple" && buttonStyles.themeTextPurple,
            theme === "yellow" && buttonStyles.themeTextYellow,
            theme === "green" && buttonStyles.themeTextGreen,
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
