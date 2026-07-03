import { Text } from "@/components/common/Text";
import { Icon, IconName } from "@/icons";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { Platform, Pressable, TextStyle, ViewStyle } from "react-native";
import { textStyles } from "@/styles/textStyles";
import { roundToPixel } from "@/utils/utils";
import { HexColor } from "@/data/games-data";

const TRANSITION_STYLE = {
  transitionDuration: "0.4s",
  transitionProperty: "all",
  transitionTimingFunction: "ease",
} as const;

const THEME_COLORS = {
  blue: Colors.buttonBlue,
  red: Colors.buttonRed,
  orange: Colors.buttonOrange,
  purple: Colors.buttonPurple,
  green: Colors.buttonGreen,
  win: Colors.win,
  lose: Colors.lose,
} as const;

interface Props {
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  size?: "extra-small" | "small" | "medium" | "medium-large" | "large";
  textOnly?: boolean;
  theme?: string | HexColor;
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
  lineHeight?: number;
  uppercase?: boolean;
  taller?: boolean;
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
  lineHeight,
  onPressIn,
  onPressOut,
  taller = false,
}: Props) => {
  const scale = useResponsiveScale();

  const fallbackColor = textOnly ? Colors.brightBlue : Colors.buttonBlue;
  let themeColor: string =
    (theme && THEME_COLORS[theme as keyof typeof THEME_COLORS]) ||
    theme ||
    fallbackColor;

  if (disabled) {
    themeColor = Colors.buttonDisabled;
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

  let fontSize = roundToPixel(16 * scale * sizeScale);
  let height: number | undefined = roundToPixel(
    40 * scale * sizeScale * (taller ? 1.26 : 1),
  );
  let borderRadius = height / 2;
  let gap = height / 6;
  let paddingVertical = roundToPixel(6 * scale * sizeScale);
  let paddingHorizontal = roundToPixel(16 * scale * sizeScale);
  let fontFamily = textOnly ? FontWeight[300] : FontWeight[600];
  let lineHeightUpdated = fontSize * (lineHeight ?? 1);

  if (textOnly) {
    height = undefined;
    borderRadius = 0;
    paddingVertical = 0;
    paddingHorizontal = 0;
  }

  return (
    <Pressable
      style={[
        {
          ...TRANSITION_STYLE,
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
          gap,

          borderRadius,
          boxShadow: height
            ? `inset 0 0 0 ${roundToPixel(height * 0.03)}px ${rgba(
                Colors.white,
                0.4,
              )}, inset 0 0 ${roundToPixel(height * 0.4)}px ${rgba(
                Colors.white,
                disabled ? 0.2 : 0.4,
              )}, 0 0 ${roundToPixel(height * 0.2)}px ${rgba(themeColor, 0.8)}`
            : undefined,
          backgroundColor: textOnly ? undefined : themeColor,
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
          size={iconSize ?? 24}
          color={iconColor ?? Colors.white}
          style={[
            {
              ...TRANSITION_STYLE,
              flexShrink: 0,
            },
          ]}
        />
      )}
      {text && (
        <Text
          style={[
            {
              ...TRANSITION_STYLE,
              fontSize,
              fontFamily,
              textTransform: uppercase ? "uppercase" : "none",
              color: textOnly ? themeColor : Colors.white,
              lineHeight: lineHeightUpdated,
              textAlign: "center",
            },
            textStyles.shadowText,
            textStyle,
          ]}
        >
          {text}
        </Text>
      )}
    </Pressable>
  );
};
