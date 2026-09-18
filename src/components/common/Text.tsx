import { HexColor } from "@/data/games-data";
import { Colors, FontWeight as FontFamilies } from "@/styles/styles";
import { useResponsiveUiLayout } from "@/hooks/useResponsiveLayout";
import { createElement, forwardRef, useMemo, type ReactNode } from "react";
import { getDisplayLanguage } from "@/i18n";
import { Platform, StyleSheet, Text as RNText } from "react-native";
import type { TextProps as RNTextProps } from "react-native";

const SUIT_WITHOUT_TEXT_PRESENTATION = /([♠♣♥♦])(?!\uFE0E)/g;

/**
 * Android draws ♠♥♦♣ as colour emoji, ignoring the text colour. U+FE0E asks
 * for the plain text glyph instead, which takes the surrounding colour.
 */
export function withTextPresentationSuits(value: string) {
  return value.replace(SUIT_WITHOUT_TEXT_PRESENTATION, "$1\uFE0E");
}

/**
 * Turkish capitalizes i as İ, but textTransform uses the English rule and
 * gives I. Turkish text is uppercased here instead.
 */
export function toTurkishUpperCase(value: string) {
  return value.replace(/i/g, "İ").toUpperCase();
}

/**
 * Uppercases text by the app's language. Use it instead of textTransform on
 * native, where textTransform follows the phone's language.
 */
export function toDisplayUpperCase(value: string) {
  return getDisplayLanguage() === "tr"
    ? toTurkishUpperCase(value)
    : value.toUpperCase();
}

function mapStringChildren(
  children: ReactNode,
  transform: (value: string) => string,
): ReactNode[] {
  const list = Array.isArray(children) ? children : [children];
  return list.map((child) =>
    typeof child === "string" ? transform(child) : child,
  );
}

export const Typography = {
  size: {
    xxs: 11,
    xs: 13,
    sm: 15,
    md: 17,
    lg: 18,
    xl: 20,
    xxl: 22,
    xxxl: 28,
  },
  fontFamily: {
    200: FontFamilies[200],
    300: FontFamilies[300],
    400: FontFamilies[400],
    500: FontFamilies[500],
    600: FontFamilies[600],
    700: FontFamilies[700],
    regular: FontFamilies[300],
    medium: FontFamilies[400],
    semibold: FontFamilies[500],
    bold: FontFamilies[600],
  },
};

export type TextWeight = keyof typeof Typography.fontFamily;
export type TextSize = keyof typeof Typography.size;

export const getScaledTextSize = (size: TextSize, textScale: number) =>
  Typography.size[size] * textScale;

export interface TextProps extends RNTextProps {
  color?: string | HexColor;
  size?: TextSize;
  lineHeight?: number;
  weight?: TextWeight;
  textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
}

export const Text = forwardRef<React.ElementRef<typeof RNText>, TextProps>(
  (props, ref) => {
    const {
      size = "md",
      lineHeight = 1.3,
      children,
      weight = "regular",
      textTransform = "none",
      style,
      color = Colors.white,
      ...otherProps
    } = props;
    const ui = useResponsiveUiLayout();

    const fontSize = useMemo(() => {
      return getScaledTextSize(size, ui.textScale);
    }, [size, ui.textScale]);

    const fontFamily = Typography.fontFamily[weight];
    const resolvedLineHeight = fontSize * lineHeight;

    const textStyle = [
      {
        fontSize,
        fontFamily,
        color,
        textTransform,
        lineHeight: resolvedLineHeight,
        flexShrink: 1,
      },
      style,
    ];

    // Android's textTransform uppercases by the phone's language, which can
    // differ from the app's (a Turkish phone gives "DİFFİCULTÉ"), so native
    // text is uppercased here by the app's language. Browsers already use the
    // page's language.
    let content = children;
    if (
      Platform.OS !== "web" &&
      StyleSheet.flatten(textStyle).textTransform === "uppercase"
    ) {
      content = mapStringChildren(children, toDisplayUpperCase);
      textStyle.push({ textTransform: "none" });
    }

    // createElement with spread children, so an array of children isn't
    // treated as a keyed list.
    return createElement(
      RNText,
      { style: textStyle, ref, ...otherProps },
      ...(Platform.OS === "web"
        ? [children]
        : mapStringChildren(content, withTextPresentationSuits)),
    );
  },
);

Text.displayName = "Text";
