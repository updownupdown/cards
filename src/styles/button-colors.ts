import { mix } from "./palette";

/** The contrast a button's label needs against its fill (WCAG, large text). */
export const MIN_LABEL_CONTRAST = 3;

const WHITE = "#ffffff";

/** WCAG relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(left: string, right: string) {
  const [light, dark] = [
    relativeLuminance(left),
    relativeLuminance(right),
  ].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * A game button in the colour it asks for, with a label that reads on it:
 * white, on the fill darkened only as far as white needs; or, on a fill so
 * pale that it would have to turn a different colour, a dark label instead.
 */
export function boardButtonColors(fill: string): {
  fill: string;
  content: string;
} {
  for (let darken = 0; darken <= 0.4; darken += 0.02) {
    const shaded = darken === 0 ? fill : mix(fill, "#000000", darken);
    if (contrastRatio(WHITE, shaded) >= MIN_LABEL_CONTRAST) {
      return { fill: shaded, content: WHITE };
    }
  }
  return { fill, content: mix(fill, "#000000", 0.8) };
}
