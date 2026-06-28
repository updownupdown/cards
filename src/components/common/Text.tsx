import { HexColor } from "@/data/games-data";
import { Colors, FontWeight as FontFamilies } from "@/styles/styles";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { forwardRef } from "react";
import { Text as RNText } from "react-native";
import type { TextProps as RNTextProps } from "react-native";

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
    200: FontFamilies[200],
    300: FontFamilies[300],
    400: FontFamilies[400],
    500: FontFamilies[500],
    600: FontFamilies[600],
    700: FontFamilies[700],
    regular: FontFamilies[400],
    medium: FontFamilies[500],
    semibold: FontFamilies[600],
    bold: FontFamilies[700],
  },
};

export type TextWeight = keyof typeof Typography.fontFamily;
export type TextSize = keyof typeof Typography.size;

export const setOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

export interface TextProps extends RNTextProps {
  color?: string | HexColor;
  size?: TextSize | number;
  lineHeight?: number;
  weight?: TextWeight;
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
    const responsiveScale = useResponsiveLayout();

    const getFontSize = () => {
      const baseSize =
        typeof size === "number"
          ? size
          : (Typography.size[size] ?? Typography.size["md"]);

      return baseSize * responsiveScale;
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
