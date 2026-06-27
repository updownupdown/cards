import { HexColor } from "@/data/games-data";
import { Colors, FontWeight } from "@/styles/styles";
import { forwardRef } from "react";
import { PixelRatio, Text as RNText, useWindowDimensions } from "react-native";
import type { TextProps as RNTextProps } from "react-native";

// Base width from iPhone 11
const BASE_WIDTH = 375;

const moderateScale = (size: number, screenWidth: number, factor = 0.5) => {
  const widthScale = screenWidth / BASE_WIDTH;
  return size + (widthScale * size - size) * factor;
};

export const responsiveFontSize = (
  fontSize: number,
  factor = 0.5,
  screenWidth = BASE_WIDTH,
) => {
  const newSize = moderateScale(fontSize, screenWidth, factor);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const Typography = {
  size: {
    xxs: 12,
    xs: 14,
    sm: 15,
    md: 18,
    lg: 20,
    xl: 22,
    xxl: 24,
  },
  fontFamily: {
    200: FontWeight[200],
    300: FontWeight[300],
    400: FontWeight[400],
    500: FontWeight[500],
    600: FontWeight[600],
    700: FontWeight[700],
    regular: FontWeight[400],
    medium: FontWeight[500],
    semibold: FontWeight[600],
    bold: FontWeight[700],
  },
};

export type FontWeight = keyof typeof Typography.fontFamily;
export type TextSize = keyof typeof Typography.size;

export const setOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

export interface TextProps extends RNTextProps {
  color?: string | HexColor;
  size?: TextSize | number;
  lineHeight?: number;
  weight?: FontWeight;
  dimRate?: `${number}%`;
  textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
}

export const Text = forwardRef<React.ElementRef<typeof RNText>, TextProps>(
  (props, ref) => {
    const {
      size = "md",
      lineHeight = 1,
      children,
      weight = "regular",
      textTransform = "none",
      dimRate,
      style,
      color = Colors.K200,
      ...otherProps
    } = props;

    const getFontSize = () => {
      if (typeof size === "number") return size;
      return Typography.size[size] || Typography.size["md"];
    };

    const getLineHeight = () => {
      return getFontSize() * lineHeight;
    };

    const getTextColor = () => {
      if (dimRate)
        return setOpacity(color, parseFloat(dimRate.replace("%", "")) / 100);
      return color;
    };

    const getFontFamily = () => {
      return Typography.fontFamily[weight];
    };

    return (
      <RNText
        style={[
          {
            fontSize: getFontSize(),
            fontFamily: getFontFamily(),
            color: getTextColor(),
            textTransform,
            lineHeight: getLineHeight(),
            flexShrink: 1,
          },
          style,
        ]}
        ref={ref}
        {...otherProps}
      >
        {children}
      </RNText>
    );
  },
);

Text.displayName = "Text";
