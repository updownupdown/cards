import { Text, Typography } from "@/components/common/Text";
import { usePalette } from "@/styles/palette";
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
import { boardButtonColors } from "@/styles/button-colors";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Reanimated, {
  type SharedValue,
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
  Text as RNText,
  TextStyle,
  type StyleProp,
  ViewStyle,
  Easing as RNEasing,
} from "react-native";
import { roundToPixel } from "@/utils/utils";
import { HexColor } from "@/data/games-data";
import { flexStyles } from "@/styles/flexStyles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { registerHintButton } from "@/hints/hint-taps";

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

const NAMED_PRIMARY = new Set([
  "blue",
  "red",
  "orange",
  "purple",
  "green",
  "pink",
  "win",
  "lose",
]);

type ButtonVariant = "primary" | "secondary" | "text" | "none";

/**
 * Which of the app's button looks a requested colour gets: named and bright
 * colours are the main (accent) button, dark and see-through ones the quiet
 * one.
 */
function resolveButtonVariant(
  requested: string | undefined,
  textOnly: boolean,
): ButtonVariant {
  if (textOnly) return "text";
  if (!requested) return "primary";
  if (requested === "none" || requested === "transparent") return "none";
  if (NAMED_PRIMARY.has(requested)) return "primary";
  if (requested in THEME_COLORS) return "secondary";
  if (/^rgba?\(/i.test(requested)) return "secondary";
  if (isHexColor(requested)) {
    const value = parseInt(requested.slice(1), 16);
    const luminance =
      (0.2126 * ((value >> 16) & 255) +
        0.7152 * ((value >> 8) & 255) +
        0.0722 * (value & 255)) /
      255;
    return luminance < 0.3 ? "secondary" : "primary";
  }
  return "primary";
}

/**
 * True on a game's board (set by GameWrapper around the game), where a button
 * keeps the colour the game gives it. Everywhere else buttons follow the
 * app's colour theme.
 */
export const BoardButtonsContext = createContext(false);

/** A colour a game asked for by name or as #rrggbb, or undefined. */
function requestedFill(requested: string | undefined) {
  if (!requested) return undefined;
  if (requested in THEME_COLORS) {
    return THEME_COLORS[requested as keyof typeof THEME_COLORS];
  }
  return isHexColor(requested) ? requested : undefined;
}

// Animated so state changes (e.g. enabled/disabled) fade on native, where the
// CSS transition in transitionStyles is ignored.
const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);
/** How far a label may shrink to stay on one line. */
const MIN_LABEL_SCALE = 0.7;
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
  /** The label: plain text, or spans of Text for mixed weights. */
  text?: ReactNode;
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
  /** A bar filling the button as this goes from 0 to 1 (a hold, say), in
   * autoProgressColor. */
  progress?: SharedValue<number>;
  /** A header button's small caption under its icon. */
  label?: string;
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
  progress,
  label,
}: Props) => {
  const autoProgressValue = useRef(new Animated.Value(0)).current;

  // A "Press <label>" hint names this button, and Autopilot presses it.
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const hintLabels = [
    ...new Set([
      accessibilityLabel,
      label,
      typeof text === "string" ? text.split("\n")[0] : undefined,
    ]),
  ]
    .filter(Boolean)
    .join("\n");
  useEffect(() => {
    if (headerButton || disabled || !hintLabels) return;
    const press = () => onPressRef.current?.();
    const unregister = hintLabels
      .split("\n")
      .map((hintLabel) => registerHintButton(hintLabel, press));
    return () => unregister.forEach((done) => done());
  }, [disabled, headerButton, hintLabels]);
  const { spacing } = useResponsiveMetrics();
  const ui = useResponsiveUiLayout();
  // Inside a game, the game's palette.
  const appTheme = usePalette();
  const onBoard = useContext(BoardButtonsContext);
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
      useNativeDriver: Platform.OS !== "web",
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

  // Off the board, buttons follow the app's colour theme, whatever colour a
  // screen asks for: bright requests become the accent-filled button, dark
  // or translucent ones the quiet one, and "none" stays transparent. On a
  // game's board, a colour the game asks for is kept, with a label that
  // reads on it.
  const boardFill =
    onBoard && !textOnly && !headerButton ? requestedFill(theme) : undefined;
  const boardColors = boardFill ? boardButtonColors(boardFill) : undefined;
  const variant = boardColors
    ? "primary"
    : resolveButtonVariant(theme, textOnly);
  let themeColor: string = boardColors
    ? boardColors.fill
    : variant === "primary"
      ? appTheme.accent
      : variant === "secondary"
        ? rgba(appTheme.ink, 0.1)
        : variant === "text"
          ? appTheme.accent
          : "none";
  const contentColor =
    boardColors?.content ??
    (variant === "primary" ? appTheme.accentInk : appTheme.ink);
  const borderColor = themeColor;

  const baseFontSize = Typography.size[size];
  const sizeScale = baseFontSize / Typography.size.md;

  let fontSize = roundToPixel(baseFontSize * textScale);
  let height: number | undefined = roundToPixel(
    40 * uiScale * sizeScale * (taller ? 1.4 : halfTaller ? 1.2 : 1),
  );
  // Fully round ends, as the header and tab bar have.
  let borderRadius = roundToPixel(height / 2);
  let gap = height / 6;
  let paddingVertical = roundToPixel(6 * uiScale * sizeScale);
  // A button sharing a row (flex) gets its width from the row, so it only
  // needs its label kept off the round ends.
  const sharesRow = StyleSheet.flatten(style)?.flex !== undefined;
  let paddingHorizontal = roundToPixel(
    (sharesRow ? 12 : 20) * uiScale * sizeScale,
  );
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
      opacity: disabled ? 0.35 : 1,
      // Only clip when there's an autoProgress bar to contain: on native,
      // overflow:hidden also clips the button's own drop shadow.
      overflow:
        autoProgress === undefined && progress === undefined
          ? undefined
          : "hidden",
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
        height && variant === "primary" && isHexColor(borderColor)
          ? `0 ${roundToPixel(height * 0.08)}px ${roundToPixel(height * 0.3)}px ${rgba(Colors.black, disabled ? 0.1 : 0.3)}`
          : undefined,
      borderWidth: variant === "secondary" && height ? 1 : 0,
      borderColor: rgba(appTheme.ink, 0.1),
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
      // Laid out as the tab bar's buttons are: icon over label, 3 apart.
      ...(label ? { flexDirection: "column" as const, gap: spacing(3) } : null),
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

  // Native shrinks a label that doesn't fit (adjustsFontSizeToFit); the web
  // can't, so it measures the label and scales it down itself.
  const labelRef = useRef<RNText>(null);
  const [labelScale, setLabelScale] = useState(1);
  useEffect(() => setLabelScale(1), [text, fontSize]);
  const fitLabelOnWeb = () => {
    if (Platform.OS !== "web") return;
    // On the web, a Text's ref is its DOM element.
    const element = labelRef.current as unknown as HTMLElement | null;
    if (!element?.scrollWidth || !element.clientWidth) return;
    const ratio = element.clientWidth / element.scrollWidth;
    if (ratio < 1) {
      setLabelScale((current) =>
        Math.max(MIN_LABEL_SCALE, Math.floor(current * ratio * 100) / 100),
      );
    }
  };

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
  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress?.value ?? 0 }],
  }));

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
      accessibilityLabel={accessibilityLabel ?? label}
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
      {progress !== undefined && (
        <Reanimated.View
          style={[
            {
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              transformOrigin: "left",
              backgroundColor: autoProgressColor,
            },
            progressStyle,
          ]}
        />
      )}
      {iconName && (
        <Icon
          name={iconName}
          size={iconSize ?? roundToPixel(24 * uiScale)}
          color={
            variant === "text" || variant === "none" || headerButton
              ? (iconColor ?? appTheme.ink)
              : contentColor
          }
          style={[
            {
              ...transitionStyles.limited04sec,
              flexShrink: 0,
            },
          ]}
        />
      )}
      {headerButton && label ? (
        <Text
          numberOfLines={1}
          style={{
            fontSize: roundToPixel(11 * uiScale),
            lineHeight: roundToPixel(13 * uiScale),
            fontFamily: FontWeight[400],
            color: disabled ? appTheme.faint : appTheme.dim,
          }}
        >
          {label}
        </Text>
      ) : null}
      {text && (
        <Text
          ref={labelRef}
          // One line, always: a long label shrinks to fit rather than wrap.
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={MIN_LABEL_SCALE}
          onLayout={fitLabelOnWeb}
          style={[
            {
              ...transitionStyles.limited04sec,
              fontSize: fontSize * labelScale,
              fontFamily,
              textTransform: uppercase ? "uppercase" : "none",
              color: textOnly ? themeColor : contentColor,
              lineHeight: lineHeightUpdated,
              textAlign: "center",
            },
            textStyle,
          ]}
        >
          {text}
        </Text>
      )}
    </AnimatedPressable>
  );
};
