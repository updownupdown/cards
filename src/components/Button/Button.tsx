import { Text, Typography } from "@/components/common/Text";
import type { TextSize } from "@/components/common/Text";
import { Icon, IconName } from "@/icons";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { useResponsiveUiLayout } from "@/hooks/useResponsiveLayout";
import { Platform, Pressable, TextStyle, ViewStyle } from "react-native";
import { textStyles } from "@/styles/textStyles";
import { roundToPixel } from "@/utils/utils";
import { HexColor } from "@/data/games-data";

export const QUICK_TRANSITION_STYLE = {
  transitionDuration: "0.2s",
  transitionProperty: "all",
  transitionTimingFunction: "ease",
} as const;

export const BTN_TRANSITION_STYLE = {
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
  size?: TextSize;
  textOnly?: boolean;
  flat?: boolean;
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
  preventWebLongPressMenu?: boolean;
}

export const Button = ({
  style,
  textStyle,
  size = "md",
  textOnly = false,
  flat = false,
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
  preventWebLongPressMenu = false,
}: Props) => {
  const ui = useResponsiveUiLayout();
  const uiScale = ui.scale;
  const textScale = ui.textScale;

  const webContextMenuProps =
    Platform.OS === "web" && preventWebLongPressMenu
      ? ({
          onContextMenu: (e: any) => {
            e.preventDefault();
          },
        } as any)
      : undefined;

  const fallbackColor =
    textOnly || flat ? Colors.accentBlue : Colors.buttonBlue;
  let themeColor: string =
    (theme && THEME_COLORS[theme as keyof typeof THEME_COLORS]) ||
    theme ||
    fallbackColor;

  if (disabled) {
    themeColor = textOnly ? rgba(Colors.white, 0.7) : Colors.buttonDisabled;
  }

  const baseFontSize = Typography.size[size];
  const sizeScale = baseFontSize / Typography.size.md;

  let fontSize = roundToPixel(baseFontSize * textScale);
  let height: number | undefined = roundToPixel(
    40 * uiScale * sizeScale * (taller ? 1.4 : 1),
  );
  let borderRadius = height / 2;
  let gap = height / 6;
  let paddingVertical = roundToPixel(6 * uiScale * sizeScale);
  let paddingHorizontal = roundToPixel(20 * uiScale * sizeScale);
  let fontFamily = textOnly || flat ? FontWeight[600] : FontWeight[600];
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
          ...BTN_TRANSITION_STYLE,
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
          boxShadow:
            height && !flat
              ? `inset 0 0 0 ${roundToPixel(height * 0.03)}px ${rgba(
                  Colors.white,
                  0.2,
                )}, inset 0 0 ${roundToPixel(height * 0.4)}px ${rgba(
                  Colors.white,
                  disabled ? 0.2 : 0.4,
                )}, 0 0 ${roundToPixel(height * 0.2)}px ${rgba(themeColor, 0.8)}`
              : undefined,
          backgroundColor: flat
            ? rgba(themeColor, 0.2)
            : textOnly || disabled
              ? undefined
              : themeColor,
          ...(Platform.OS === "web" && preventWebLongPressMenu
            ? ({
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                touchAction: "manipulation",
              } as const)
            : null),
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
      // Prevent iOS Safari context menu on long-press for hold-to-confirm buttons.
      {...webContextMenuProps}
    >
      {iconName && (
        <Icon
          name={iconName}
          size={iconSize ?? roundToPixel(24 * uiScale)}
          color={iconColor ?? Colors.white}
          style={[
            {
              ...BTN_TRANSITION_STYLE,
              flexShrink: 0,
            },
          ]}
        />
      )}
      {text && (
        <Text
          style={[
            {
              ...BTN_TRANSITION_STYLE,
              fontSize,
              fontFamily,
              textTransform: uppercase ? "uppercase" : "none",
              color: textOnly || flat ? themeColor : Colors.white,
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
