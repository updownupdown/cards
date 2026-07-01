import { Text } from "@/components/common/Text";
import { Icon, IconName } from "@/icons";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { Platform, Pressable, TextStyle, ViewStyle } from "react-native";

interface Props {
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  size?: "extra-small" | "small" | "medium" | "medium-large" | "large";
  textOnly?: boolean;
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
  uppercase?: boolean;
}

export const Button = ({
  style,
  textStyle,
  size = "medium",
  textOnly = false,
  disabled,
  fullWidth,
  text,
  iconName,
  iconColor,
  theme,
  iconSize,
  uppercase = true,
  onPress,
  onLongPress,
  delayLongPress,
  onPressIn,
  onPressOut,
}: Props) => {
  const scale = useResponsiveScale();

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

  const sizeMultiplier: Record<
    "extra-small" | "small" | "medium" | "medium-large" | "large",
    number
  > = {
    "extra-small": 0.64,
    small: 0.78,
    medium: 1,
    "medium-large": 1.16,
    large: 1.32,
  };
  const sizeScale = sizeMultiplier[size];

  let fontSize = 16 * scale * sizeScale;
  let height: number | undefined = 44 * scale * sizeScale;
  let borderRadius = 8 * scale * sizeScale;
  let borderWidth = themeColor ? 2 * scale * sizeScale : 0;
  let paddingVertical = 8 * scale * sizeScale;
  let paddingHorizontal = 12 * scale * sizeScale;
  let fontFamily = textOnly ? FontWeight[300] : FontWeight[500];
  let lineHeight = fontSize * 1.2;

  if (textOnly) {
    height = undefined;
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
          borderColor: themeColor ? rgba(themeColor, 0.5) : undefined,
          backgroundColor:
            !textOnly && themeColor ? rgba(themeColor, 0.12) : undefined,
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
              textTransform: uppercase ? "uppercase" : "none",
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
