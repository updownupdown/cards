import { Text, Typography } from "@/components/common/Text";
import type { TextSize } from "@/components/common/Text";
import { Icon, IconName } from "@/icons";
import {
  Colors,
  FontWeight,
  layoutDims,
  rgba,
  transitionStyles,
} from "@/styles/styles";
import { useResponsiveUiLayout } from "@/hooks/useResponsiveLayout";
import { Platform, Pressable, TextStyle, ViewStyle } from "react-native";
import { textStyles } from "@/styles/textStyles";
import {
  darkenHexColor,
  desaturateHexColor,
  roundToPixel,
} from "@/utils/utils";
import { HexColor } from "@/data/games-data";
import { flexStyles } from "@/styles/flexStyles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

const THEME_COLORS = {
  blue: Colors.buttonBlue,
  red: Colors.buttonRed,
  orange: Colors.buttonOrange,
  purple: Colors.buttonPurple,
  green: Colors.buttonGreen,
  pink: Colors.buttonPink,
  win: Colors.win,
  lose: Colors.lose,
} as const;

interface Props {
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  size?: TextSize;
  textOnly?: boolean;
  headerButton?: boolean;
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
  headerButton = false,
  disabled,
  fullWidth,
  text,
  iconName,
  iconColor,
  theme,
  iconSize,
  uppercase = false,
  onPress,
  onLongPress,
  delayLongPress,
  lineHeight,
  onPressIn,
  onPressOut,
  taller = false,
  preventWebLongPressMenu = false,
}: Props) => {
  const { spacing } = useResponsiveMetrics();
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

  const fallbackColor = textOnly ? Colors.accentBlue : Colors.buttonBlue;
  let themeColor: string =
    (theme && THEME_COLORS[theme as keyof typeof THEME_COLORS]) ||
    theme ||
    fallbackColor;

  if (disabled) {
    themeColor = textOnly
      ? rgba(Colors.white, 0.7)
      : rgba(darkenHexColor(desaturateHexColor(themeColor, 0.5), 0.4), 0.6);
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
  let fontFamily = textOnly ? FontWeight[500] : FontWeight[400];
  let lineHeightUpdated = fontSize * (lineHeight ?? 1.3);

  if (textOnly) {
    height = undefined;
    borderRadius = 0;
    paddingVertical = 0;
    paddingHorizontal = 0;
  }

  if (headerButton) {
    iconSize = spacing(layoutDims.menuIconSize);
  }

  return (
    <Pressable
      style={[
        {
          ...transitionStyles.limited04sec,
          outlineWidth: 0,
          opacity: disabled ? 1 : 1,

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
          outline: "none",
          boxShadow: height
            ? `inset 0 0 0 ${roundToPixel(height * 0.03)}px ${rgba(
                Colors.white,
                0.2,
              )}, inset 0 0 ${roundToPixel(height * 0.4)}px ${rgba(
                Colors.white,
                0.2,
              )}, ${roundToPixel(height * 0.04)}px ${roundToPixel(height * 0.08)}px ${roundToPixel(height * 0.24)}px ${rgba(Colors.black, 0.2)}`
            : undefined,
          backgroundColor: textOnly ? undefined : themeColor,
          ...(Platform.OS === "web" && preventWebLongPressMenu
            ? ({
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                touchAction: "manipulation",
              } as const)
            : null),
        },
        headerButton && {
          ...flexStyles.rowCentered,
          flex: 1,
          padding: 0,
          width: spacing(layoutDims.menuButtonSize),
          height: spacing(layoutDims.menuButtonSize),
          boxShadow: "unset",
          borderWidth: 0,
          borderRadius: "unset",
          backgroundColor: "unset",
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
              ...transitionStyles.limited04sec,
              flexShrink: 0,
              filter: `drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2))`,
            },
          ]}
        />
      )}
      {text && (
        <Text
          style={[
            {
              ...transitionStyles.limited04sec,
              fontSize,
              fontFamily,
              textTransform: uppercase ? "uppercase" : "none",
              color: textOnly
                ? rgba(themeColor, disabled ? 0.5 : 1)
                : rgba(Colors.white, disabled ? 0.5 : 1),
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
