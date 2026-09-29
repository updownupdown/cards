import { ChartGrid, WORLD_SIZE } from "@/components/Campaign/ChartGrid";
import { ShootingStar } from "@/components/common/ShootingStar";
import { theme } from "@/styles/styles";
import { Image, type ImageSource } from "expo-image";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { CAMPAIGN_HOME_TAB_INDEX, type HomeTabIndex } from "./home-view-state";

/**
 * The sky behind every Home tab: layers of stars that slide at their own
 * depth as the page scrolls, as the Odyssey map pans, and as you move from
 * tab to tab (each tab sits a little further along the sky), with comets
 * now and then, and the Odyssey's chart rings, which fade in and out with
 * that tab.
 *
 * The stars are baked into seamless tiles (scripts/generate-starfield.mjs),
 * each layer a few copies of one image slid and wrapped: hundreds of stars
 * with glows for a handful of images, and no per-frame work beyond one
 * transform per layer.
 */

/** How far along the sky each tab sits, in points at a depth of 1. */
const TAB_SHIFT = 520;
/** A page's scroll moves the sky this much of it, at a depth of 1. */
const SCROLL_SHARE = 0.5;
/** Moving between tabs takes this long, with a slight rush of depth. */
const TRAVEL_MS = 1400;
const WARP = 0.14;
/** Outside the Odyssey, the sky steps back behind the pages. */
const QUIET_SKY = 0.6;
/** The chart rings' fade as the Odyssey tab is entered or left. */
const CHART_FADE_MS = 670;

type Layer = {
  source: ImageSource;
  /** Its tile's side, in points (as drawn by the generator). */
  tile: number;
  /** How far it moves for a point of travel: the nearer, the more. */
  depth: number;
  opacity: number;
  /** Tinted in the theme's colour (the nebula). */
  tint?: "accent2" | "accent";
  /** A slow swell of brightness, over this many seconds. */
  twinkle?: number;
};

const BACK_LAYERS: Layer[] = [
  {
    source: require("../../../assets/starfield/nebula.png"),
    tile: 1100,
    depth: 0.02,
    opacity: 0.11,
    tint: "accent2",
  },
  {
    source: require("../../../assets/starfield/dust.png"),
    tile: 480,
    depth: 0.05,
    opacity: 0.9,
  },
  {
    source: require("../../../assets/starfield/small.png"),
    tile: 560,
    depth: 0.1,
    opacity: 0.9,
  },
];
const FRONT_LAYERS: Layer[] = [
  {
    source: require("../../../assets/starfield/twinkleA.png"),
    tile: 700,
    depth: 0.14,
    opacity: 1,
    twinkle: 4.6,
  },
  {
    source: require("../../../assets/starfield/mid.png"),
    tile: 650,
    depth: 0.19,
    opacity: 0.85,
  },
  {
    source: require("../../../assets/starfield/twinkleB.png"),
    tile: 830,
    depth: 0.25,
    opacity: 1,
    twinkle: 6.8,
  },
  {
    source: require("../../../assets/starfield/bright.png"),
    tile: 770,
    depth: 0.32,
    opacity: 0.9,
  },
  {
    source: require("../../../assets/starfield/hero.png"),
    tile: 910,
    depth: 0.48,
    opacity: 0.85,
  },
];

type StarfieldMotion = {
  /** Along the sky, by tab. */
  tabX: SharedValue<number>;
  /** The shown tab's scroll. */
  scrollY: SharedValue<number>;
  /** The Odyssey map's pan, eased back to nothing once it is left. */
  panX: SharedValue<number>;
  panY: SharedValue<number>;
  /** A pulse of depth while moving between tabs, 0 to 1. */
  warp: SharedValue<number>;
  /** The map's own place and scale, for the chart rings. */
  chartX: SharedValue<number>;
  chartY: SharedValue<number>;
  chartScale: SharedValue<number>;
};

export type Starfield = StarfieldMotion & {
  /** A tab reports its scroll, which moves the sky while it is shown. */
  reportScroll: (tab: HomeTabIndex, y: number) => void;
  /** Eases the sky into the map's pan once the map is placed. */
  glideToPan: (x: number, y: number) => void;
  /** Once glided in, the map's pans move the sky directly. */
  panLinked: SharedValue<boolean>;
};

const StarfieldContext = createContext<Starfield | null>(null);
export const StarfieldProvider = StarfieldContext.Provider;
/** The Home sky, for the tabs to move; null outside Home. */
export const useStarfield = () => useContext(StarfieldContext);

const ease = Easing.inOut(Easing.cubic);

/** The sky's motion, owned by Home, which knows the shown tab. */
export function useStarfieldMotion(
  activeTab: HomeTabIndex,
  animated: boolean,
): Starfield {
  const tabX = useSharedValue(-activeTab * TAB_SHIFT);
  const scrollY = useSharedValue(0);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const warp = useSharedValue(0);
  const chartX = useSharedValue(0);
  const chartY = useSharedValue(0);
  const chartScale = useSharedValue(1);
  const panLinked = useSharedValue(false);
  const scrolls = useRef<Partial<Record<HomeTabIndex, number>>>({});
  const active = useRef(activeTab);
  const firstRun = useRef(true);

  useEffect(() => {
    active.current = activeTab;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timing = { duration: animated ? TRAVEL_MS : 0, easing: ease };
    tabX.value = withTiming(-activeTab * TAB_SHIFT, timing);
    scrollY.value = withTiming(scrolls.current[activeTab] ?? 0, timing);
    warp.value = animated
      ? withSequence(
          withTiming(1, { duration: TRAVEL_MS / 2, easing: ease }),
          withTiming(0, { duration: TRAVEL_MS / 2, easing: ease }),
        )
      : 0;
    if (activeTab !== CAMPAIGN_HOME_TAB_INDEX) {
      panLinked.value = false;
      panX.value = withTiming(0, timing);
      panY.value = withTiming(0, timing);
    }
  }, [activeTab]);

  return useMemo(
    () => ({
      tabX,
      scrollY,
      panX,
      panY,
      warp,
      chartX,
      chartY,
      chartScale,
      panLinked,
      reportScroll: (tab, y) => {
        scrolls.current[tab] = y;
        if (tab === active.current) scrollY.value = y;
      },
      glideToPan: (x, y) => {
        const timing = { duration: animated ? TRAVEL_MS : 0, easing: ease };
        panX.value = withTiming(x, timing);
        panY.value = withTiming(y, timing, () => {
          panLinked.value = true;
        });
      },
    }),
    [animated],
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
  /** Comets only while Home is on screen. */
  comets: boolean;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cometColors = useMemo(() => [theme.ink, theme.accent2], []);
  const odyssey = activeTab === CAMPAIGN_HOME_TAB_INDEX;
  const skyOpacity = useSharedValue(odyssey ? 1 : QUIET_SKY);
  useEffect(() => {
    skyOpacity.value = withTiming(odyssey ? 1 : QUIET_SKY, {
      duration: CHART_FADE_MS,
      easing: ease,
    });
  }, [odyssey, skyOpacity]);
  const skyStyle = useAnimatedStyle(() => ({ opacity: skyOpacity.value }));
  return (
    <View
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
        <Animated.View style={[StyleSheet.absoluteFill, skyStyle]}>
          {BACK_LAYERS.map((layer, index) => (
            <StarLayer
              key={`back-${index}`}
              layer={layer}
              size={size}
              motion={motion}
              animated={animated}
            />
          ))}
          <ChartRings
            motion={motion}
            size={size}
            visible={activeTab === CAMPAIGN_HOME_TAB_INDEX}
          />
          {FRONT_LAYERS.map((layer, index) => (
            <StarLayer
              key={`front-${index}`}
              layer={layer}
              size={size}
              motion={motion}
              animated={animated}
            />
          ))}
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
        </Animated.View>
      )}
    </View>
  );
});

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
}: {
  layer: Layer;
  size: { width: number; height: number };
  motion: Starfield;
  animated: boolean;
}) {
  const { tile, depth } = layer;
  const columns = Math.ceil(size.width / tile) + 1;
  const rows = Math.ceil(size.height / tile) + 1;
  const { tabX, scrollY, panX, panY, warp } = motion;
  const style = useAnimatedStyle(() => {
    const factor = animated ? depth : 0;
    const wrap = (value: number) => (((value % tile) + tile) % tile) - tile;
    return {
      transform: [
        { translateX: wrap((tabX.value + panX.value) * factor) },
        {
          translateY: wrap(
            (-scrollY.value * SCROLL_SHARE + panY.value) * factor,
          ),
        },
        { scale: 1 + warp.value * factor * WARP },
      ],
    };
  });
  const tintColor = layer.tint ? theme[layer.tint] : undefined;
  const tiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      tiles.push(
        <Image
          key={`${row}-${column}`}
          source={layer.source}
          cachePolicy="memory"
          contentFit="fill"
          tintColor={tintColor}
          style={{
            position: "absolute",
            left: column * tile,
            top: row * tile,
            width: tile,
            height: tile,
          }}
        />,
      );
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
          opacity: layer.opacity,
        },
        style,
      ]}
    >
      {layer.twinkle && animated ? (
        // A CSS animation: it runs on its own, off the JS thread.
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            animationName: TWINKLE,
            animationDuration: `${layer.twinkle}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-in-out",
          }}
        >
          {tiles}
        </Animated.View>
      ) : (
        tiles
      )}
    </Animated.View>
  );
});

const TWINKLE = {
  "0%": { opacity: 1 },
  "50%": { opacity: 0.25 },
  "100%": { opacity: 1 },
};

/**
 * The Odyssey's chart rings, in the map's place and scale. Here rather than
 * in the map, so they can fade out after the map has gone.
 */
function ChartRings({
  motion,
  size,
  visible,
}: {
  motion: Starfield;
  size: { width: number; height: number };
  visible: boolean;
}) {
  const opacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: CHART_FADE_MS,
      easing: ease,
    });
    if (visible) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), CHART_FADE_MS + 100);
    return () => clearTimeout(timer);
  }, [opacity, visible]);
  const { chartX, chartY, chartScale } = motion;
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: chartX.value },
      { translateY: chartY.value },
      { scale: chartScale.value },
    ],
  }));
  if (!mounted) return null;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: size.width / 2 - WORLD_SIZE / 2,
          top: size.height / 2 - WORLD_SIZE / 2,
          width: WORLD_SIZE,
          height: WORLD_SIZE,
        },
        style,
      ]}
    >
      <ChartGrid />
    </Animated.View>
  );
}
