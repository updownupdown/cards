import { Text, Typography } from "@/components/common/Text";
import type { TextSize } from "@/components/common/Text";
import { Icon, IconName } from "@/icons";
import {
  Colors,
  FontWeight,
  layoutDims,
  rgba,
  transitionStyles,
  webDropShadow,
} from "@/styles/styles";
import { useResponsiveUiLayout } from "@/hooks/useResponsiveLayout";
import { useEffect, useRef } from "react";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Animated,
  Platform,
  Pressable,
  processColor,
  StyleSheet,
  TextStyle,
  type StyleProp,
  ViewStyle,
  Easing as RNEasing,
} from "react-native";
import { textStyles } from "@/styles/textStyles";
import {
  darkenHexColor,
  desaturateHexColor,
  lightenHexColor,
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
  winDark: Colors.winDark,
  lose: Colors.lose,
  loseDark: Colors.loseDark,
} as const;

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

// Animated so state changes (e.g. enabled/disabled) fade on native, where the
// CSS transition in transitionStyles is ignored.
const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);
const STATE_TRANSITION_MS = 400;

interface Props {
  accessibilityLabel?: string;
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
  halfTaller?: boolean;
  preventWebLongPressMenu?: boolean;
  autoProgress?: number;
  autoProgressColor?: string;
}

export const Button = ({
  accessibilityLabel,
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
  halfTaller = false,
  preventWebLongPressMenu = false,
  autoProgress,
  autoProgressColor = rgba(Colors.white, 0.3),
}: Props) => {
  const autoProgressValue = useRef(new Animated.Value(0)).current;
  const { spacing } = useResponsiveMetrics();
  const ui = useResponsiveUiLayout();
  const uiScale = ui.scale;
  const textScale = ui.textScale;

  useEffect(() => {
    if (autoProgress === undefined) return;

    autoProgressValue.setValue(0);
    const animation = Animated.timing(autoProgressValue, {
      toValue: 1,
      duration: autoProgress,
      easing: RNEasing.linear,
      // Drives scaleX (not width) so this can run off the JS thread.
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [autoProgress, autoProgressValue]);

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
  const borderColor = themeColor;

  if (disabled) {
    themeColor = textOnly
      ? Colors.white
      : darkenHexColor(desaturateHexColor(themeColor, 0.6), 0.3);
  }

  const baseFontSize = Typography.size[size];
  const sizeScale = baseFontSize / Typography.size.md;

  let fontSize = roundToPixel(baseFontSize * textScale);
  let height: number | undefined = roundToPixel(
    40 * uiScale * sizeScale * (taller ? 1.4 : halfTaller ? 1.2 : 1),
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

  const pressableStyle: StyleProp<ViewStyle> = [
    {
      ...transitionStyles.limited04sec,
      outlineWidth: 0,
      opacity: disabled ? 0.6 : 1,
      // Only clip when there's an autoProgress bar to contain: on native,
      // overflow:hidden also clips the button's own drop shadow.
      overflow: autoProgress === undefined ? undefined : "hidden",
      display: "flex",
      flexDirection: iconName === "close" ? "row-reverse" : "row",
      justifyContent: "center",
      alignItems: "center",
      width: fullWidth ? "100%" : undefined,
      height,
      paddingVertical,
      paddingHorizontal,
      gap,
      borderRadius,
      outline: "none",
      // Only for hex themes: rgba() and lightenHexColor() expect hex, and an
      // rgba() theme (e.g. TipsBox) produced "rgba(NaN, …)". Web and plain RN
      // silently dropped that shadow; Reanimated's animated component throws
      // on it, so leave the shadow out, as it effectively was before.
      boxShadow:
        height && isHexColor(borderColor)
          ? `inset 0 0 1px 1px ${rgba(lightenHexColor(borderColor, 0.3), disabled ? 0.2 : 1)}, ${roundToPixel(height * 0.04)}px ${roundToPixel(height * 0.08)}px ${roundToPixel(height * (disabled ? 0.1 : 0.24))}px ${rgba(Colors.black, disabled ? 0.1 : 0.3)}`
          : undefined,
      // Invalid values (e.g. theme="none") were always ignored; drop them so
      // Reanimated's animated component doesn't throw on them.
      backgroundColor:
        textOnly || processColor(themeColor) == null ? undefined : themeColor,
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
      boxShadow: "none",
      borderWidth: 0,
      borderRadius: 0,
      backgroundColor: "transparent",
    },
    style,
  ];

  const flatStyle = StyleSheet.flatten(pressableStyle);
  // Only animate colours native can parse: e.g. a disabled rgba() theme goes
  // through the hex-only colour helpers and comes out invalid, which RN
  // silently ignores but Reanimated throws on.
  const targetBackground =
    typeof flatStyle.backgroundColor === "string" &&
    processColor(flatStyle.backgroundColor) != null
      ? flatStyle.backgroundColor
      : undefined;
  const targetOpacity =
    typeof flatStyle.opacity === "number" ? flatStyle.opacity : 1;
  const animatedBackground = useSharedValue(targetBackground ?? "transparent");
  const animatedOpacity = useSharedValue(targetOpacity);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const config = { duration: STATE_TRANSITION_MS };
    if (targetBackground !== undefined) {
      animatedBackground.value = withTiming(targetBackground, config);
    }
    animatedOpacity.value = withTiming(targetOpacity, config);
  }, [animatedBackground, animatedOpacity, targetBackground, targetOpacity]);

  // Web keeps its CSS transition; this only takes over on native.
  const isNative = Platform.OS !== "web";
  const animateBackground = isNative && targetBackground !== undefined;
  const stateTransitionStyle = useAnimatedStyle(() => {
    if (!isNative) return {};
    return animateBackground
      ? {
          backgroundColor: animatedBackground.value,
          opacity: animatedOpacity.value,
        }
      : { opacity: animatedOpacity.value };
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[pressableStyle, stateTransitionStyle]}
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
      {autoProgress !== undefined && (
        <Animated.View
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            transformOrigin: "left",
            transform: [{ scaleX: autoProgressValue }],
            backgroundColor: autoProgressColor,
          }}
        />
      )}
      {iconName && (
        <Icon
          name={iconName}
          size={iconSize ?? roundToPixel(24 * uiScale)}
          color={iconColor ?? Colors.white}
          style={[
            {
              ...transitionStyles.limited04sec,
              flexShrink: 0,
              ...webDropShadow("0 1px 3px rgba(0, 0, 0, 0.2)"),
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
    </AnimatedPressable>
  );
};
