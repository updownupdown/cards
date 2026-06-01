import "@/styles/global.css";

import { Platform } from "react-native";

export const Colors = {
  // Buttons
  buttonColor: "#6fe9ff",
  buttonColorDisabled: "#494F55",

  btnRed: "#fd6e81",
  btnBlue: "#6fe9ff",
  btnPurple: "#d089ff",
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
  cardSelectPink: "#ff52b1",
  cardSelectOrange: "#ff8b2d",
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
  K950: "#121518",
  K900: "#23292F",
  K875: "#2C3238",
  K850: "#363C42",
  K800: "#494F55",
  K750: "#595F65",
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
