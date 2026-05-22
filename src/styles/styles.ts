import "@/styles/global.css";

import { Platform } from "react-native";

export const Colors = {
  accentBluePale: "#a8f2ff",
  accentBlue: "#6fe9ff",
  accentBlueDark: "#343f49",
  accentRed: "#ff232e",
  accentPink: "#ff38ac",
  accentGreen: "#26ff93",
  accentYellow: "#fff238",
  accentOrange: "#ff922d",
  cardSelectable: "#79b5f1",
  cardSelected: "#26ff93",
  cardSelecteInvalid: "#ff232e",
  deckRed: "#CD3D50",
  black: "#000000",
  white: "#ffffff",
  K950: "#121518",
  K900: "#23292F",
  K875: "#2C3238",
  K850: "#363C42",
  K800: "#494F55",
  K700: "#696F75",
  K600: "#83898F",
  K500: "#9DA3A9",
  K400: "#B5BBC1",
  K300: "#CDD3D9",
  K200: "#DFE5EB",
  K150: "#E9EFF5",
  K100: "#F6F8FB",
  K075: "#F8FAFC",
  K050: "#FCFDFE",
} as const;

/**
 * Converts a hex colour (e.g. from the Colors object) into an rgba string.
 * @param hexColor A hex color string starting with "#"
 * @param opacity Opacity percentage (0 to 0.1)
 */
export function rgba(hexColor: string, opacity: number): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const a = opacity;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    // sans: "normal",
    sans: "Outfit_500Medium",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const FontWeight = {
  200: "Outfit_200ExtraLight",
  300: "Outfit_300Light",
  400: "Outfit_400Regular",
  500: "Outfit_500Medium",
  600: "Outfit_600SemiBold",
  700: "Outfit_700Bold",
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const ContentSidePadding = 20;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 400;
export const MaxContentHeight = 800;
