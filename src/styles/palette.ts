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

/**
 * Inside a game, its own accent colour (gameColorAccent); elsewhere, the
 * app's accent, so shared controls keep their usual look outside games.
 */
export function useGameAccent(): string {
  const palette = useContext(PaletteContext);
  return palette ? palette.accent2 : theme.accent;
}

type Hex = `#${string}`;
const channels = (hex: string) =>
  [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
/** A colour part way from one hex colour to another. */
export function mix(from: string, to: string, amount: number): Hex {
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
 * A game's palette from its colours: its dark colour for the surfaces, its
 * pale one as the accent, the text between the pale and white, and its own
 * accent colour (gameColorAccent) as the second accent, for links.
 */
export function gamePalette(
  dark: string,
  pale: string,
  accent?: string,
): ThemeColors {
  return {
    night: mix(dark, "#000000", 0.45),
    surface: dark as Hex,
    raise: mix(dark, pale, 0.1),
    ink: mix(pale, "#ffffff", 0.55),
    dim: mix(pale, dark, 0.28),
    faint: mix(pale, dark, 0.5),
    accent: pale as Hex,
    accentInk: mix(dark, "#000000", 0.35),
    accent2: (accent as Hex | undefined) ?? mix(pale, "#ffffff", 0.35),
    sky: dark as Hex,
  };
}
