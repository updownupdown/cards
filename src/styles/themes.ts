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
 *
 * Text contrast: dim holds at least 7.8:1 on the surface (6.8:1 on raise) and
 * faint at least 4.6:1, so secondary text stays readable. Beacon and Signal
 * are the high-contrast themes: black, white and one strong accent.
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
      surface: "#191a24",
      raise: "#262737",
      ink: "#ece7f2",
      dim: "#b2aec2",
      faint: "#868295",
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
      surface: "#1f1b17",
      raise: "#2d261f",
      ink: "#eae2cf",
      dim: "#b9ae9a",
      faint: "#8e8473",
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
      surface: "#1d1d20",
      raise: "#2a2a30",
      ink: "#f4f4f6",
      dim: "#b3b3bb",
      faint: "#86868d",
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
      surface: "#1f1818",
      raise: "#2e2123",
      ink: "#f5eee8",
      dim: "#baaaa9",
      faint: "#8f8080",
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
      surface: "#21191e",
      raise: "#31242c",
      ink: "#f7ecf2",
      dim: "#c2aab7",
      faint: "#937f8b",
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
      surface: "#151f1f",
      raise: "#212f2f",
      ink: "#e6f1ee",
      dim: "#a5bab6",
      faint: "#778a87",
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
      surface: "#1a1824",
      raise: "#282537",
      ink: "#eeeaf8",
      dim: "#b2acc7",
      faint: "#868099",
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
      surface: "#1f1814",
      raise: "#2e231d",
      ink: "#f3e9df",
      dim: "#bbab9f",
      faint: "#8f8176",
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
      surface: "#141d2b",
      raise: "#212c3d",
      ink: "#e6eef8",
      dim: "#a9b6c9",
      faint: "#7a8799",
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
      surface: "#181d16",
      raise: "#252d22",
      ink: "#eaefe2",
      dim: "#acb7a2",
      faint: "#7f8877",
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
      surface: "#1f1725",
      raise: "#2e2237",
      ink: "#f3eaf6",
      dim: "#b9a9c4",
      faint: "#8c7f94",
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
      surface: "#1e1b16",
      raise: "#2b2821",
      ink: "#f5f0e3",
      dim: "#b8b09e",
      faint: "#8a8475",
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
      surface: "#181c27",
      raise: "#242a37",
      ink: "#f2eeec",
      dim: "#b1b3bc",
      faint: "#83858f",
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
      surface: "#191c19",
      raise: "#262926",
      ink: "#eef2ea",
      dim: "#acb3a9",
      faint: "#82867e",
      accent: "#d6ff5c",
      accentInk: "#1a2400",
      accent2: "#b9b9ff",
      sky: "#151a12",
    },
  },
  {
    id: "beacon",
    name: "Beacon",
    colors: {
      night: "#000000",
      surface: "#0f0f0f",
      raise: "#262626",
      ink: "#ffffff",
      dim: "#d9d9d9",
      faint: "#a6a6a6",
      accent: "#ffe14d",
      accentInk: "#000000",
      accent2: "#5ce1ff",
      sky: "#0a0a0a",
    },
  },
  {
    id: "signal",
    name: "Signal",
    colors: {
      night: "#000000",
      surface: "#0c0f12",
      raise: "#232a31",
      ink: "#ffffff",
      dim: "#d5dde5",
      faint: "#a0aab4",
      accent: "#5ce1ff",
      accentInk: "#00141a",
      accent2: "#ffb347",
      sky: "#06121a",
    },
  },
] as const satisfies readonly ColorTheme[];

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

export const DEFAULT_COLOR_THEME: ColorThemeId = "nocturne";

export function getColorTheme(id: string | undefined): ColorTheme {
  return COLOR_THEMES.find((theme) => theme.id === id) ?? COLOR_THEMES[0];
}
