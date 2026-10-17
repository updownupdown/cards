import { ShootingStar } from "@/components/common/ShootingStar";
import { rgba, theme } from "@/styles/styles";
import { Image, type ImageSource } from "expo-image";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, ImageBackground, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { CAMPAIGN_HOME_TAB_INDEX, type HomeTabIndex } from "./home-view-state";
import { SKY_STARS, type SkyStar } from "./starfield-stars";

/**
 * The sky behind every Home tab: the starfield image dimmed into the
 * theme's night, and over it layers of stars that slide at their own depth
 * as the page scrolls and as the Odyssey map pans, with comets now and then.
 *
 * The stars are baked into seamless tiles (scripts/generate-starfield.mjs),
 * each layer a few copies of one image slid and wrapped: hundreds of crisp
 * stars for a handful of images, and no per-frame work beyond one
 * transform per layer.
 */

/**
 * How much of the starfield image shows through the theme's night, so the
 * pages read over it. Drawn as the image's own opacity over the night
 * behind it, which looks the same as a veil of night laid over the image
 * but is one full-screen layer fewer for Android to draw on every frame.
 */
const IMAGE_OPACITY = 0.3;

/** A page's scroll moves the sky this much of it, at a depth of 1. */
const SCROLL_SHARE = 0.5;
/** Outside the Odyssey, the sky steps back behind the pages. */
const QUIET_SKY = 0.6;
/** The sky's fade as the Odyssey tab is entered or left. */
const SKY_FADE_MS = 670;
/**
 * The twinkle moves on this often, not on every frame: a swell over seconds
 * reads the same in a few steps a second, and a sky left still on screen
 * then redraws a few times a second instead of sixty, which spares the
 * battery.
 */
const TWINKLE_TICK_MS = 150;
/** The faintest a twinkling star gets, at the middle of its swell. */
const TWINKLE_LOW = 0.25;

type Layer = {
  /** Its tile's side, in points (as drawn by the generator). */
  tile: number;
  /** How far it moves for a point of travel: the nearer, the more. */
  depth: number;
  opacity: number;
  /** A slow swell of brightness, over this many seconds. */
  twinkle?: number;
} & (
  | {
      /** Many faint stars, baked into a tile. */
      source: ImageSource;
    }
  | {
      /**
       * A few bright stars, each its own dot: a tile would be a screenful
       * of transparent pixels to draw on every frame for a dozen stars, and
       * a whole screen to redraw whenever it twinkled.
       */
      stars: SkyStar[];
    }
);

/** Far to near. */
const LAYERS: Layer[] = [
  {
    // The dust and the small stars.
    source: require("../../../assets/starfield/far.png"),
    tile: 440,
    depth: 0.07,
    opacity: 0.9,
  },
  {
    stars: SKY_STARS.twinkleA,
    tile: 490,
    depth: 0.14,
    opacity: 1,
    twinkle: 4.6,
  },
  {
    source: require("../../../assets/starfield/mid.png"),
    tile: 470,
    depth: 0.19,
    opacity: 0.85,
  },
  {
    stars: SKY_STARS.twinkleB,
    tile: 510,
    depth: 0.25,
    opacity: 1,
    twinkle: 6.8,
  },
  {
    stars: SKY_STARS.bright,
    tile: 500,
    depth: 0.32,
    opacity: 0.9,
  },
  {
    stars: SKY_STARS.hero,
    tile: 520,
    depth: 0.48,
    opacity: 0.85,
  },
];

export type Starfield = {
  /** How far the sky has travelled, at a depth of 1. */
  skyX: SharedValue<number>;
  skyY: SharedValue<number>;
  /** While linked, the Odyssey map's pans move the sky (see linkPan). */
  panLinked: SharedValue<boolean>;
  /** The map's pan the sky last followed. */
  panFromX: SharedValue<number>;
  panFromY: SharedValue<number>;
  /** Each tab's scroll the sky last followed (see useSkyScrollHandler). */
  scrolls: SharedValue<number[]>;
  /** The tab shown, whose scroll moves the sky. */
  shownTab: SharedValue<HomeTabIndex>;
  /** A tab's content was replaced: its next scroll starts afresh. */
  resetScroll: (tab: HomeTabIndex, y?: number) => void;
  /** From the map's pan as it now is, its pans move the sky. */
  linkPan: (x: number, y: number) => void;
};

const StarfieldContext = createContext<Starfield | null>(null);
export const StarfieldProvider = StarfieldContext.Provider;
/** The Home sky, for the tabs to move; null outside Home. */
export const useStarfield = () => useContext(StarfieldContext);

const ease = Easing.inOut(Easing.cubic);

/**
 * The sky's motion, owned by Home, which knows the shown tab. The sky only
 * ever moves with what is dragged: a page's scroll, the map's pan. Moving
 * between tabs leaves it where it is.
 */
export function useStarfieldMotion(activeTab: HomeTabIndex): Starfield {
  const skyX = useSharedValue(0);
  const skyY = useSharedValue(0);
  const panLinked = useSharedValue(false);
  const panFromX = useSharedValue(0);
  const panFromY = useSharedValue(0);
  const scrolls = useSharedValue<number[]>([0, 0, 0, 0]);
  const shownTab = useSharedValue<HomeTabIndex>(activeTab);
  useEffect(() => {
    shownTab.value = activeTab;
    if (activeTab !== CAMPAIGN_HOME_TAB_INDEX) panLinked.value = false;
  }, [activeTab, panLinked, shownTab]);

  return useMemo(
    () => ({
      skyX,
      skyY,
      panLinked,
      panFromX,
      panFromY,
      scrolls,
      shownTab,
      resetScroll: (tab, y = 0) => {
        scrolls.modify((all) => {
          "worklet";
          all[tab] = y;
          return all;
        });
      },
      linkPan: (x, y) => {
        panFromX.value = x;
        panFromY.value = y;
        panLinked.value = true;
      },
    }),
    [panFromX, panFromY, panLinked, scrolls, shownTab, skyX, skyY],
  );
}

/**
 * A tab's scroll handler, which moves the sky while the tab is shown. It runs
 * on the UI thread, so the sky keeps pace with the page whatever the JS
 * thread is doing, and no scroll event has to cross over to it. For a
 * Reanimated scroll view; `scrollY`, if given, follows the page's offset too.
 */
export function useSkyScrollHandler(
  tab: HomeTabIndex,
  scrollY?: SharedValue<number>,
) {
  const starfield = useStarfield();
  const skyY = starfield?.skyY;
  const scrolls = starfield?.scrolls;
  const shownTab = starfield?.shownTab;
  return useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        const y = event.contentOffset.y;
        if (scrollY) scrollY.value = y;
        if (!skyY || !scrolls || !shownTab) return;
        const from = scrolls.value[tab] ?? 0;
        scrolls.modify((all) => {
          "worklet";
          all[tab] = y;
          return all;
        });
        if (tab === shownTab.value) skyY.value -= (y - from) * SCROLL_SHARE;
      },
    },
    [tab, scrollY, skyY, scrolls, shownTab],
  );
}

/** The sky itself, drawn under the tabs. */
export const StarfieldBackdrop = memo(function StarfieldBackdrop({
  motion,
  activeTab,
  animated,
  comets,
}: {
  motion: Starfield;
  activeTab: HomeTabIndex;
  /** Without animations, the sky holds still. */
  animated: boolean;
  /** Comets, and the stars' twinkle, only while Home is on screen. */
  comets: boolean;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cometColors = useMemo(() => [theme.ink, theme.accent2], []);
  const odyssey = activeTab === CAMPAIGN_HOME_TAB_INDEX;
  const skyOpacity = useSharedValue(odyssey ? 1 : QUIET_SKY);
  useEffect(() => {
    skyOpacity.value = withTiming(odyssey ? 1 : QUIET_SKY, {
      duration: SKY_FADE_MS,
      easing: ease,
    });
  }, [odyssey, skyOpacity]);
  const skyStyle = useAnimatedStyle(() => ({ opacity: skyOpacity.value }));
  const twinkleTime = useTwinkleClock(animated && comets);
  // In landscape the portrait image is turned on its side, so it always
  // covers the screen.
  const landscape = size.width > size.height;
  const imageWidth = landscape ? size.height : size.width;
  const imageHeight = landscape ? size.width : size.height;
  return (
    <View
      testID="home-starfield-background"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.night,
          overflow: "hidden",
          pointerEvents: "none",
        },
      ]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
          Math.abs(current.width - width) > 1 ||
          Math.abs(current.height - height) > 1
            ? { width, height }
            : current,
        );
      }}
    >
      {size.width > 0 && (
        <>
          <ImageBackground
            source={require("../../../assets/images/starfield.webp")}
            resizeMode="cover"
            style={{
              position: "absolute",
              left: (size.width - imageWidth) / 2,
              top: (size.height - imageHeight) / 2,
              width: imageWidth,
              height: imageHeight,
              transform: landscape ? [{ rotate: "90deg" }] : undefined,
              opacity: IMAGE_OPACITY,
            }}
          />
          {/* The layers of stars, between the image and the pages. */}
          <Animated.View style={[StyleSheet.absoluteFill, skyStyle]}>
            {LAYERS.map((layer, index) => (
              <StarLayer
                key={index}
                layer={layer}
                size={size}
                motion={motion}
                animated={animated}
                twinkleTime={twinkleTime}
              />
            ))}
          </Animated.View>
          <ShootingStar
            width={size.width}
            height={size.height}
            animationsEnabled={animated && comets}
            colors={cometColors}
            head={false}
            peakOpacity={0.55}
            durationScale={2}
            minIntervalMs={7000}
            maxIntervalMs={16000}
            maxSpeed={700}
          />
        </>
      )}
    </View>
  );
});

/**
 * The twinkle's time, in seconds, stepped on a timer while it runs. Under a
 * game or with the app away, it holds where it is, and goes on from there.
 */
function useTwinkleClock(running: boolean) {
  const time = useSharedValue(0);
  const [appActive, setAppActive] = useState(
    AppState.currentState !== "background" &&
      AppState.currentState !== "inactive",
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setAppActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!running || !appActive) return;
    const timer = setInterval(() => {
      time.value += TWINKLE_TICK_MS / 1000;
    }, TWINKLE_TICK_MS);
    return () => clearInterval(timer);
  }, [appActive, running, time]);
  return time;
}

/**
 * One layer: its tile repeated to cover the screen and one tile more, then
 * slid by the sky's travel at its depth and wrapped within a tile, so it
 * never runs out.
 */
const StarLayer = memo(function StarLayer({
  layer,
  size,
  motion,
  animated,
  twinkleTime,
}: {
  layer: Layer;
  size: { width: number; height: number };
  motion: Starfield;
  animated: boolean;
  twinkleTime: SharedValue<number>;
}) {
  const { tile, depth } = layer;
  const twinkle = animated ? layer.twinkle : undefined;
  // A layer of dots carries its brightness in each dot's colour, so the
  // moving layer is only ever see-through as it twinkles (and its dots
  // never overlap, so that costs no layer of its own).
  const opacity = "source" in layer ? layer.opacity : 1;
  const columns = Math.ceil(size.width / tile) + 1;
  const rows = Math.ceil(size.height / tile) + 1;
  const { skyX, skyY } = motion;
  const style = useAnimatedStyle(() => {
    const factor = animated ? depth : 0;
    const wrap = (value: number) => (((value % tile) + tile) % tile) - tile;
    // A twinkling layer's stars swell and fade together: from full, down to
    // TWINKLE_LOW halfway through, and back, easing in and out.
    const swell = twinkle
      ? (1 + Math.cos((2 * Math.PI * twinkleTime.value) / twinkle)) / 2
      : 1;
    return {
      opacity: twinkle ? TWINKLE_LOW + (1 - TWINKLE_LOW) * swell : opacity,
      transform: [
        { translateX: wrap(skyX.value * factor) },
        { translateY: wrap(skyY.value * factor) },
      ],
    };
  });
  const tiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = column * tile;
      const top = row * tile;
      if ("source" in layer) {
        tiles.push(
          <Image
            key={`${row}-${column}`}
            source={layer.source}
            cachePolicy="memory"
            contentFit="fill"
            style={{
              position: "absolute",
              left,
              top,
              width: tile,
              height: tile,
            }}
          />,
        );
        continue;
      }
      layer.stars.forEach((star, index) => {
        tiles.push(
          <View
            key={`${row}-${column}-${index}`}
            style={{
              position: "absolute",
              left: left + star.x * tile - star.r,
              top: top + star.y * tile - star.r,
              width: star.r * 2,
              height: star.r * 2,
              borderRadius: star.r,
              backgroundColor: rgba(star.colour, star.a * layer.opacity),
            }}
          />,
        );
      });
    }
  }
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: columns * tile,
          height: rows * tile,
        },
        style,
      ]}
    >
      {tiles}
    </Animated.View>
  );
});
