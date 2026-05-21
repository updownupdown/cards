import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  black: "#000000",
  white: "#ffffff",
  K050: "#fdfdfd",
  K100: "#f8f8f8",
  K150: "#eeeeee",
  K200: "#e4e4e4",
  K300: "#d2d2d2",
  K400: "#bababa",
  K500: "#a2a2a2",
  K600: "#888888",
  K700: "#666666",
  K800: "#4d4d4f",
  K900: "#282828",
  K950: "#0a0a0a",
  accentBtn: "#1d4ed8",
} as const;

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
