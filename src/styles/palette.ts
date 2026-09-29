import { createContext, useContext } from "react";
import { theme } from "./styles";
import type { ThemeColors } from "./themes";

/**
 * The colours a component draws in: the app's theme, or inside a game, that
 * game's own palette (see gamePalette), which overrides it. Components that
 * show in games read their colours through usePalette().
 */
export const PaletteContext = createContext<ThemeColors | null>(null);

export function usePalette(): ThemeColors {
  return useContext(PaletteContext) ?? theme;
}

type Hex = `#${string}`;
const channels = (hex: string) =>
  [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
function mix(from: string, to: string, amount: number): Hex {
  const a = channels(from);
  const b = channels(to);
  return `#${a
    .map((value, index) =>
      Math.round(value + (b[index] - value) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * A game's palette from its two colours: its dark colour for the surfaces,
 * its pale one as the accent, and the text between the pale and white.
 */
export function gamePalette(dark: string, pale: string): ThemeColors {
  return {
    night: mix(dark, "#000000", 0.45),
    surface: dark as Hex,
    raise: mix(dark, pale, 0.1),
    ink: mix(pale, "#ffffff", 0.55),
    dim: mix(pale, dark, 0.28),
    faint: mix(pale, dark, 0.5),
    accent: pale as Hex,
    accentInk: mix(dark, "#000000", 0.35),
    accent2: mix(pale, "#ffffff", 0.35),
    sky: dark as Hex,
  };
}
