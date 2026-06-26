import { Icon, IconName } from "@/icons";
import { buttonStyles, buttonTransition } from "@/styles/buttonStyles";
import { Colors, rgba } from "@/styles/styles";
import { Platform, Pressable, Text, TextStyle, ViewStyle } from "react-native";
import { cardDims } from "../Cards/card-utils";

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
  cardWidth: number;
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
  cardWidth,
}: Props) => {
  let themeColor: string | undefined = undefined;
  const shadowUnit = Math.max(cardWidth * cardDims.ratioShadowUnit, 2);

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
    themeColor = Colors.K700;
  }

  return (
    <Pressable
      style={[
        size === "text" && buttonStyles.sizeText,
        size === "textLarge" && buttonStyles.sizeTextLarge,
        size === "small" && buttonStyles.sizeSmall,
        size === "medium" && buttonStyles.sizeMedium,
        size === "large" && buttonStyles.sizeLarge,
        disabled && buttonStyles.disabled,
        buttonTransition,
        {
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,

          width: fullWidth ? "100%" : undefined,

          outlineWidth: 0,
          backgroundColor: themeColor ? rgba(themeColor, 0.12) : undefined,
          borderWidth: themeColor ? cardWidth * 0.04 : 0,
          borderColor: themeColor ? rgba(themeColor, 0.6) : undefined,
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
              fontSize: cardWidth ? cardWidth * 0.3 : undefined,
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
