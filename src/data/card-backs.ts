import type { HexColor } from "./games-data";

/**
 * Card backs are the ornament from assets/cards/CardBack.svg printed in one
 * ink on white stock, so a game picks an ink rather than an arbitrary colour.
 * Sharing a small set across games keeps the bundle small (one image per ink
 * instead of one per game) and keeps every back looking like it came from the
 * same printer.
 *
 * Inks are deliberately mid-to-deep and moderately saturated: pale ones lose
 * the ornament against the stock, and fully saturated ones look cheap.
 *
 * To change the look: edit the SVG or this list, then run
 * `npm run card-backs:generate`.
 */
export const CardBackColors = {
  Crimson: "Crimson",
  Burgundy: "Burgundy",
  Rose: "Rose",
  Terracotta: "Terracotta",
  Copper: "Copper",
  Honey: "Honey",
  Bronze: "Bronze",
  Walnut: "Walnut",
  Olive: "Olive",
  Moss: "Moss",
  Forest: "Forest",
  Pine: "Pine",
  Teal: "Teal",
  Ocean: "Ocean",
  Bicycle: "Bicycle",
  Navy: "Navy",
  Indigo: "Indigo",
  Violet: "Violet",
  Plum: "Plum",
  Mauve: "Mauve",
  Slate: "Slate",
  Charcoal: "Charcoal",
} as const;

export type CardBackColor =
  (typeof CardBackColors)[keyof typeof CardBackColors];

/** The ink each back is printed in. Parsed by scripts/generate-card-backs.mjs. */
export const CARD_BACK_INKS: Record<CardBackColor, HexColor> = {
  Crimson: "#b0212e",
  Burgundy: "#7c2438",
  Rose: "#a34164",
  Terracotta: "#ac4f32",
  Copper: "#96592c",
  Honey: "#be7714",
  Bronze: "#7e6327",
  Walnut: "#6b4a33",
  Olive: "#5f6b2a",
  Moss: "#4a6b39",
  Forest: "#2c6644",
  Pine: "#265e4c",
  Teal: "#1f6a70",
  Ocean: "#23607c",
  Bicycle: "#355e96",
  Navy: "#2e4272",
  Indigo: "#4a4489",
  Violet: "#63409a",
  Plum: "#6b3668",
  Mauve: "#7a4e6e",
  Slate: "#4c5a6b",
  Charcoal: "#3c3f45",
};

/** The stock the ornament is printed on. */
export const CARD_BACK_STOCK: HexColor = "#f7f4ee";

export const DEFAULT_CARD_BACK: CardBackColor = CardBackColors.Bicycle;

/** Image file name for an ink, e.g. "Bicycle" -> "bicycle.webp". */
export function cardBackFileName(color: CardBackColor) {
  return `${color.toLowerCase()}.webp`;
}

/** Every ink, in palette order. */
export const ALL_CARD_BACK_COLORS = Object.keys(
  CARD_BACK_INKS,
) as CardBackColor[];
