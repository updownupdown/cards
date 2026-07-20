import { HexColor } from "@/data/games-data";
import { Colors, FontWeight as FontFamilies } from "@/styles/styles";
import { useResponsiveUiLayout } from "@/hooks/useResponsiveLayout";
import { forwardRef, useMemo } from "react";
import { Text as RNText } from "react-native";
import type { TextProps as RNTextProps } from "react-native";

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

    return (
      <RNText
        style={[
          {
            fontSize,
            fontFamily,
            color,
            textTransform,
            lineHeight: resolvedLineHeight,
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
