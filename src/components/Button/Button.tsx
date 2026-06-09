import { Icon, IconName } from "@/icons";
import { buttonStyles } from "@/styles/buttonStyles";
import { Colors, rgba } from "@/styles/styles";
import { Platform, Pressable, Text, TextStyle, ViewStyle } from "react-native";

interface Props {
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  size?: "text" | "textLarge" | "small" | "medium" | "large";
  theme?: string;
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
  let themeColor: string | undefined = undefined;

  switch (theme) {
    case "blue":
      themeColor = Colors.btnBlue;
      break;
    case "red":
      themeColor = Colors.btnRed;
      break;
    case "orange":
      themeColor = Colors.btnOrange;
      break;
    case "purple":
      themeColor = Colors.btnPurple;
      break;
    case "yellow":
      themeColor = Colors.btnYellow;
      break;
    case "green":
      themeColor = Colors.btnGreen;
      break;
    default:
      themeColor = theme;
  }

  if (disabled) {
    themeColor = Colors.K600;
  }

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
        {
          backgroundColor: themeColor ? rgba(themeColor, 0.07) : undefined,
          boxShadow: themeColor
            ? `inset 0 1px 1px ${rgba(Colors.white, 0.2)}, inset 1px 2px 6px ${rgba(themeColor, 0.35)}, inset 2px 4px 20px ${rgba(themeColor, 0.2)}, -2px -2px 18px ${rgba(Colors.K750, 0.7)}, 2px 2px 18px ${rgba(Colors.K950, 0.8)}`
            : undefined,
        },
        style,
      ]}
      onPress={() => {
        if (Platform.OS === "web" && typeof document !== "undefined") {
          (document.activeElement as HTMLElement)?.blur?.();
        }
        if (onPress) onPress();
      }}
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
            disabled && buttonStyles.textDisabled,
            textStyle,
            {
              color: themeColor ? rgba(themeColor, 1) : undefined,
            },
          ]}
        >
          {text}
        </Text>
      )}
    </Pressable>
  );
};
