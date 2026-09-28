/**
 * The app's colour themes, all dark. To add one, add an entry here: it shows
 * up in Settings straight away. Every theme sets the same tokens:
 *
 * - night: the page background, behind everything.
 * - surface: panels, cards and modals, a step up from the night.
 * - raise: controls on a surface (pills, rows, the pressed tab).
 * - ink / dim / faint: text, from main to secondary to disabled.
 * - accent: the one colour the interface owns: buttons, the active tab,
 *   progress, and whatever is earned. accentInk is text drawn on it.
 * - accent2: a second highlight, which must read apart from the accent: on
 *   the Odyssey map, the accent marks a finished game and accent2 one won
 *   (or reachable) with collectibles still to find.
 * - sky: the tint at the heart of the starry backgrounds.
 */
type Hex = `#${string}`;

export type ThemeColors = {
  night: Hex;
  surface: Hex;
  raise: Hex;
  ink: Hex;
  dim: Hex;
  faint: Hex;
  accent: Hex;
  accentInk: Hex;
  accent2: Hex;
  sky: Hex;
};

export type ColorTheme = {
  id: string;
  name: string;
  colors: ThemeColors;
};

export const COLOR_THEMES = [
  {
    id: "nocturne",
    name: "Nocturne",
    colors: {
      night: "#07080d",
      surface: "#14151f",
      raise: "#1f2030",
      ink: "#ece7f2",
      dim: "#8e8aa4",
      faint: "#545168",
      accent: "#ffcf87",
      accentInk: "#2a1a05",
      accent2: "#9fb2ff",
      sky: "#161830",
    },
  },
  {
    id: "folio",
    name: "Folio",
    colors: {
      night: "#0e0c0a",
      surface: "#1a1612",
      raise: "#261f19",
      ink: "#eae2cf",
      dim: "#a89c86",
      faint: "#6d6252",
      accent: "#e0674b",
      accentInk: "#1a0d08",
      accent2: "#c9a862",
      sky: "#221a13",
    },
  },
  {
    id: "prism",
    name: "Prism",
    colors: {
      night: "#0b0b0d",
      surface: "#17171b",
      raise: "#232329",
      ink: "#f4f4f6",
      dim: "#a1a1ab",
      faint: "#62626c",
      accent: "#d9e4ff",
      accentInk: "#0b0b0d",
      accent2: "#8fa9ff",
      sky: "#1b1e2c",
    },
  },
  {
    id: "card-room",
    name: "Card Room",
    colors: {
      night: "#0c0909",
      surface: "#1a1213",
      raise: "#271a1c",
      ink: "#f5eee8",
      dim: "#ad9a9b",
      faint: "#6d5b5d",
      accent: "#e23b4c",
      accentInk: "#ffffff",
      accent2: "#f2e6d0",
      sky: "#2a1216",
    },
  },
  {
    id: "blossom",
    name: "Blossom",
    colors: {
      night: "#0e0a0d",
      surface: "#1c1419",
      raise: "#2a1d25",
      ink: "#f7ecf2",
      dim: "#b69cab",
      faint: "#6f5867",
      accent: "#ff9ecb",
      accentInk: "#2b0a1a",
      accent2: "#a8efc0",
      sky: "#26142a",
    },
  },
  {
    id: "verdigris",
    name: "Verdigris",
    colors: {
      night: "#060c0c",
      surface: "#101a1a",
      raise: "#1a2828",
      ink: "#e6f1ee",
      dim: "#8fa8a3",
      faint: "#526764",
      accent: "#72d8c4",
      accentInk: "#04211b",
      accent2: "#d9c48a",
      sky: "#0f2426",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    colors: {
      night: "#08070f",
      surface: "#15131f",
      raise: "#211e30",
      ink: "#eeeaf8",
      dim: "#9b94b4",
      faint: "#5b5572",
      accent: "#b89cff",
      accentInk: "#170b33",
      accent2: "#7de8d8",
      sky: "#1d1538",
    },
  },
  {
    id: "ember",
    name: "Ember",
    colors: {
      night: "#0c0806",
      surface: "#1a130f",
      raise: "#271c16",
      ink: "#f3e9df",
      dim: "#a8968a",
      faint: "#6a5a4f",
      accent: "#ff9a5a",
      accentInk: "#2a1206",
      accent2: "#ffd27a",
      sky: "#2a170e",
    },
  },
  {
    id: "abyss",
    name: "Abyss",
    colors: {
      night: "#050a12",
      surface: "#0f1826",
      raise: "#1a2536",
      ink: "#e6eef8",
      dim: "#8b9bb2",
      faint: "#4f5d72",
      accent: "#5cb8ff",
      accentInk: "#04162a",
      accent2: "#8fe3d0",
      sky: "#0d2140",
    },
  },
  {
    id: "moss",
    name: "Moss",
    colors: {
      night: "#080b07",
      surface: "#131811",
      raise: "#1e261b",
      ink: "#eaefe2",
      dim: "#9aa68f",
      faint: "#5a6452",
      accent: "#a8d46f",
      accentInk: "#16230a",
      accent2: "#e3c679",
      sky: "#17240f",
    },
  },
  {
    id: "plum",
    name: "Plum",
    colors: {
      night: "#0c0710",
      surface: "#1a1220",
      raise: "#271b30",
      ink: "#f3eaf6",
      dim: "#aa98b6",
      faint: "#66576f",
      accent: "#e184f0",
      accentInk: "#2a0a31",
      accent2: "#ffc49e",
      sky: "#2a1238",
    },
  },
  {
    id: "saffron",
    name: "Saffron",
    colors: {
      night: "#0b0a07",
      surface: "#181611",
      raise: "#24211a",
      ink: "#f5f0e3",
      dim: "#aba38f",
      faint: "#686252",
      accent: "#f5c542",
      accentInk: "#2a1f02",
      accent2: "#8fb8ff",
      sky: "#1f1a0c",
    },
  },
  {
    id: "coral",
    name: "Coral",
    colors: {
      night: "#070a10",
      surface: "#121722",
      raise: "#1d2330",
      ink: "#f2eeec",
      dim: "#9fa3ae",
      faint: "#5d6270",
      accent: "#ff7f6e",
      accentInk: "#2b0c07",
      accent2: "#7fdcd0",
      sky: "#1a1a2e",
    },
  },
  {
    id: "volt",
    name: "Volt",
    colors: {
      night: "#070807",
      surface: "#141614",
      raise: "#1f221f",
      ink: "#eef2ea",
      dim: "#9aa197",
      faint: "#5b6158",
      accent: "#d6ff5c",
      accentInk: "#1a2400",
      accent2: "#b9b9ff",
      sky: "#151a12",
    },
  },
] as const satisfies readonly ColorTheme[];

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

export const DEFAULT_COLOR_THEME: ColorThemeId = "nocturne";

export function getColorTheme(id: string | undefined): ColorTheme {
  return COLOR_THEMES.find((theme) => theme.id === id) ?? COLOR_THEMES[0];
}
