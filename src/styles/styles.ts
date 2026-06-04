import "@/styles/global.css";

import { Platform } from "react-native";

export const Colors = {
  // Buttons
  buttonColor: "#6fe9ff",
  buttonColorDisabled: "#494F55",

  btnRed: "#ff3c67",
  btnBlue: "#6fe9ff",
  btnPurple: "#d973ee",
  btnOrange: "#ff8b2d",
  btnYellow: "#ffea2d",
  btnGreen: "#26ff93",

  // Accents
  accentBlue: "#6fe9ff",
  accentRed: "#CE3566",
  accentGreen: "#26ff93",

  // Card select colours
  cardSelectRed: "#e0485c",
  cardSelectBlue: "#7bd5ff",
  cardSelectPurple: "#bb55ff",
  cardSelectPink: "#ff52c5",
  cardSelectOrange: "#ff7418",
  cardSelectYellow: "#ffea2d",
  cardSelectGreen: "#26ff93",

  // Misc
  win: "#03B491",
  lose: "#CE3566",
  favoriteStar: "#ff922d",
  suitsRed: "#CD3D50",
  suitsBlack: "#23292F",
  suitsColoredDiamonds: "#AF75CA",
  suitsColoredHearts: "#D4725A",
  suitsColoredClubs: "#77B15D",
  suitsColoredSpades: "#4EB2CE",

  // Greys
  black: "#000000",
  white: "#ffffff",
  K950: "#14181C",
  K900: "#21282E",
  K875: "#283138",
  K860: "#2E3841",
  K850: "#333D47",
  K800: "#414F5B",
  K750: "#54626F",
  K700: "#667582",
  K600: "#7F8C98",
  K500: "#9DA9B4",
  K400: "#B5C0C9",
  K300: "#CAD3DC",
  K200: "#DDE5ED",
  K150: "#E7EEF5",
  K100: "#F6F8FB",
  K075: "#F8FAFC",
  K050: "#FCFDFE",

  background: "#343f49",
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
