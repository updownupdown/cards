import "@/styles/global.css";
import { darkenHexColor, roundToPixel } from "@/utils/utils";
import { Platform, StyleSheet, type TextStyle } from "react-native";

export const Colors = {
  // Buttons and progress bars
  buttonRed: "#b43733",
  buttonOrange: "#da8037",
  buttonGreen: "#4ea069",
  buttonBlue: "#52a3c4",
  buttonPurple: "#8956b9",
  buttonPink: "#d36fb5",

  buttonDisabled: "#444444",

  // Bright colours (text buttons, etc.)
  brightRed: "#ff3c67",
  brightBlue: "#82e8fa",
  brightPurple: "#e460ff",
  brightOrange: "#ff8b2d",
  brightYellow: "#ffea2d",
  brightGreen: "#26ff93",
  /** The UFO and its Mercy Skip: a calmer green than brightGreen. */
  ufoGreen: "#4fb381",

  // Accents
  accentBlue: "#86e5fd",
  accentRed: "#CE3566",
  accentGreen: "#26ff93",

  // Card select colours
  cardSelectNone: "#00000000",
  cardSelectRed: "#e0485c",
  cardSelectBlue: "#7bd5ff",
  cardSelectPurple: "#bb55ff",
  cardSelectLightPurple: "#bf91dd",
  cardSelectPink: "#ff74b9",
  cardSelectOrange: "#ff8432",
  cardSelectYellow: "#ffea2d",
  cardSelectGreen: "#78ebb1",
  cardSelectGrey: "#333333",

  // Misc
  win: "#03B491",
  winDark: darkenHexColor("#03B491", 0.25),
  lose: "#CE3566",
  loseDark: darkenHexColor("#CE3566", 0.25),
  favoriteStar: "#ff922d",
  trophyGold: "#ffc74f",

  suitsRed: "#C62440",
  suitsBlack: "#313C3F",
  suitsColoredDiamonds: "#AF75CA",
  suitsColoredHearts: "#D4725A",
  suitsColoredClubs: "#77B15D",
  suitsColoredSpades: "#4EB2CE",

  // Greys
  black: "#000000",
  white: "#ffffff",
  K950: "#14181C",
  K900: "#21282E",
  // K925: "#1A2025",
  // K890: "#262E35",
  K875: "#2B353C",
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
  starfieldOverlay: "#11181f",
  text: "#DDE5ED",
} as const;

/**
 * Converts a hex colour (e.g. from the Colors object) into an rgba string.
 * @param hexColor A hex color string starting with "#"
 * @param opacity Opacity percentage (0 to 0.1)
 */
/**
 * Apply an opacity to a colour. Accepts hex (#rgb, #rrggbb, or #rrggbbaa, whose
 * own alpha is replaced) and rgb()/rgba() strings. Anything else is returned
 * unchanged: this used to assume hex and turn e.g. an rgba() input into an
 * invalid "rgba(NaN, …)", which crashed Reanimated on native.
 */
export function rgba(color: string, opacity: number): string {
  const channels = parseRgbChannels(color);

  if (!channels) {
    if (__DEV__) console.warn(`rgba(): unsupported colour "${color}"`);
    return color;
  }

  const [r, g, b] = channels;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function parseRgbChannels(color: string): [number, number, number] | null {
  const value = color.trim();

  const hexMatch = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((digit) => digit + digit)
        .join("");
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  const functionMatch =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+%?\s*)?\)$/i.exec(
      value,
    );
  if (functionMatch) {
    return [
      Number(functionMatch[1]),
      Number(functionMatch[2]),
      Number(functionMatch[3]),
    ];
  }

  return null;
}

export const FontWeight = {
  200: "Outfit_200ExtraLight",
  300: "Outfit_300Light",
  400: "Outfit_400Regular",
  500: "Outfit_500Medium",
  600: "Outfit_600SemiBold",
  700: "Outfit_700Bold",
};

export const layoutDims = {
  menuBarPadding: 6,
  menuBarHeight: 58,
  tabBarHeight: 64,
  tabBarPadding: 8,
  /** Search tab's search input, card size toggle and Filters button. */
  searchControlHeight: 52,
  menuIconSize: 28,
  menuButtonSize: 52,
  pagePadding: 20,
} as const;

export const LayerZIndexes = {
  boardBackgroundOverlay: 1,
  boardAnimation: 2,
  boardContent: 3,
  winLoseBackdrop: 45,
  tipsContainer: 40,
  tipsCard: 41,
  header: 50,
  autoCompletePanel: 55,
  winLoseCard: 60,
  loadingOverlay: 100,
  toast: 110,
} as const;

export function getHeaderHeightWithInset(
  insetsTop: number,
  scale: number,
): number {
  return roundToPixel(
    insetsTop + (layoutDims.menuBarHeight + layoutDims.pagePadding) * scale,
  );
}

// CSS transitions, authored for the web build. On native the equivalent
// motion is driven by Reanimated, so applying these here is pure overhead -
// animating `box-shadow` on every card in particular is expensive to render
// on Android. Keep the keys so callers spread them unconditionally.
const webTransitionStyles = StyleSheet.create({
  all02sec: {
    transitionDuration: "0.2s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
  },
  all03sec: {
    transitionDuration: "0.3s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
  },
  all05sec: {
    transitionDuration: "0.5s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
  },
  limited02sec: {
    transitionDuration: "0.2s",
    transitionProperty: "background-color, color, opacity, box-shadow",
    transitionTimingFunction: "ease",
  },
  limited04sec: {
    transitionDuration: "0.4s",
    transitionProperty: "background-color, color, opacity, box-shadow",
    transitionTimingFunction: "ease",
  },
  // DO NOT APPLY OPACITY TRANSITION HERE!
  // It will create glitches with drag-and-drop actions
  noOpacity02sec: {
    transitionDuration: "0.2s",
    transitionProperty: "background-color, color, box-shadow",
    transitionTimingFunction: "ease",
  },
});

const emptyTransitionStyles = Object.fromEntries(
  Object.keys(webTransitionStyles).map((key) => [key, {}]),
) as Record<keyof typeof webTransitionStyles, object>;

export const transitionStyles =
  Platform.OS === "web" ? webTransitionStyles : emptyTransitionStyles;

/**
 * A CSS `drop-shadow()` filter, applied on web only. On Android a `filter`
 * forces the view into an offscreen render pass, which is a real cost on
 * elements that appear as often as icons and buttons do.
 */
export const webDropShadow = (value: string) =>
  Platform.OS === "web" ? ({ filter: `drop-shadow(${value})` } as const) : null;

/**
 * A text shadow in the form each platform understands: react-native-web wants
 * one CSS `textShadow` string and warns about the separate props, while iOS
 * and Android only read the separate props.
 */
export const textShadow = (
  color: string,
  radius: number,
  offset: { width: number; height: number } = { width: 0, height: 0 },
): TextStyle =>
  Platform.OS === "web"
    ? ({
        textShadow: `${offset.width}px ${offset.height}px ${radius}px ${color}`,
      } as TextStyle)
    : {
        textShadowColor: color,
        textShadowOffset: offset,
        textShadowRadius: radius,
      };
