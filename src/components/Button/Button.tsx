import { Icon, IconName } from "@/icons";
import { Colors, FontWeight, MaxContentWidth, rgba } from "@/styles/styles";
import {
  Platform,
  Pressable,
  Text,
  TextStyle,
  useWindowDimensions,
  ViewStyle,
} from "react-native";

interface Props {
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  size?: "text" | "textLarge" | "textMedium" | "small" | "medium" | "large";
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
  cardWidth?: number;
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
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = Math.min(screenWidth, MaxContentWidth);

  if (!cardWidth) {
    cardWidth = containerWidth / 6;
  }

  if (!theme) {
    theme = Colors.accentBlue;
  }

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
    themeColor = Colors.K700;
  }

  let fontSize = cardWidth * 0.3;
  let height = cardWidth * 0.6;
  let borderRadius = cardWidth * 0.15;
  let borderWidth = themeColor ? cardWidth * 0.04 : 0;
  let paddingVertical = cardWidth * 0.12;
  let paddingHorizontal = cardWidth * 0.15;
  let fontFamily = FontWeight[500];
  let lineHeight = fontSize * 1.2;

  switch (size) {
    case "text":
    case "small":
      fontSize = cardWidth * 0.2;
      lineHeight = cardWidth * 0.2;
      height = cardWidth * 0.2;
      borderRadius = cardWidth * 0.1;
      borderWidth = cardWidth * 0.02;
      paddingVertical = cardWidth * 0.3;
      paddingHorizontal = cardWidth * 0.12;
      break;
    case "textMedium":
      borderWidth = 0;
      break;
    case "large":
    case "textLarge":
      fontSize = cardWidth * 0.4;
      lineHeight = cardWidth * 0.44;
      height = cardWidth * 0.4;
      borderRadius = cardWidth * 0.2;
      borderWidth = cardWidth * 0.04;
      paddingVertical = cardWidth * 0.4;
      paddingHorizontal = cardWidth * 0.3;
      break;
  }

  if (size === "text" || size === "textMedium" || size === "textLarge") {
    borderRadius = 0;
    borderWidth = 0;
    paddingVertical = 0;
    paddingHorizontal = 0;
  }

  return (
    <Pressable
      style={[
        {
          transitionDuration: "0.4s",
          transitionProperty: "all",
          transitionTimingFunction: "ease",
          outlineWidth: 0,
          opacity: disabled ? 0.4 : 1,

          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          width: fullWidth ? "100%" : undefined,
          height,
          paddingVertical,
          paddingHorizontal,

          borderRadius,
          borderWidth,
          borderColor: themeColor ? rgba(themeColor, 0.6) : undefined,
          backgroundColor:
            !["text", "textLarge"].includes(size) && themeColor
              ? rgba(themeColor, 0.12)
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
          style={[
            {
              transitionDuration: "0.4s",
              transitionProperty: "all",
              transitionTimingFunction: "ease",
              flexShrink: 0,
            },
          ]}
          color={iconColor ?? Colors.K100}
          size={iconSize ?? 24}
        />
      )}
      {text && (
        <Text
          style={[
            textStyle,
            {
              transitionDuration: "0.4s",
              transitionProperty: "all",
              transitionTimingFunction: "ease",

              fontSize,
              fontFamily,
              textTransform: "uppercase",
              color: themeColor ? themeColor : Colors.accentBlue,
              lineHeight,
              textAlign: "center",
            },
          ]}
        >
          {text}
        </Text>
      )}
    </Pressable>
  );
};
