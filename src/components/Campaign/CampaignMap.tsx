import { GAMES_DATA } from "@/data/games-registry";
import { CampaignBackground } from "@/components/Campaign/CampaignBackground";
import { CampaignBlackHole } from "@/components/Campaign/CampaignBlackHole";
import {
  ARM_DUST,
  getGameDotState,
  getUnlockedGameDotPaths,
  GAME_DOTS_BY_PATH,
  GAME_DOT_DEFINITIONS,
  type GameDotDefinition,
  type GameDotState,
} from "@/data/campaign-map";
import { Colors, rgba, textShadow } from "@/styles/styles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useDisplayLanguage } from "@/i18n";
import { useTabReadyHold } from "@/components/Home/TabReady";
import { localizeGameTitle } from "@/i18n/content";
import React, {
  memo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// A spiral galaxy needs room: 114 game dots three dot-diameters apart do not fit
// in a smaller world (see MAP_GEOMETRY in src/data/campaign-map.ts).
const WORLD_SIZE = 1800;
const GAME_DOT_SIZE = 18;
/** How close (in screen points) a native tap must be to select a game dot. */
const GAME_DOT_TAP_RADIUS = 28;
/** Size reads as a signal, not decoration: a reachable-but-unplayed game dot
 * (the one to head for) is biggest, tapering down through won and complete
 * back to a small, unlit locked game dot. */
const STATE_SIZE_MULTIPLIER = {
  locked: 0.72,
  complete: 0.85,
  won: 1,
  connected: 1.2,
} as const;

// Far enough out to take in the whole galaxy at once, which is most of why
// the map is worth having.
const MIN_SCALE = 0.22;
const MAX_SCALE = 2.1;
const GAME_DOT_EXTENT_X =
  Math.max(...GAME_DOT_DEFINITIONS.map((gameDot) => Math.abs(gameDot.x))) *
    WORLD_SIZE *
    0.5 +
  GAME_DOT_SIZE;
const GAME_DOT_EXTENT_Y =
  Math.max(...GAME_DOT_DEFINITIONS.map((gameDot) => Math.abs(gameDot.y))) *
    WORLD_SIZE *
    0.5 +
  GAME_DOT_SIZE;
// Realistic-ish star colours: a locked game dot is a dim, unlit ember; a
// reachable-but-unplayed game dot runs hot red; a won-but-incomplete game dot is a
// warm orange main-sequence star; a fully complete game dot is a blue-white nova.
const STATE_COLORS = {
  locked: "#746e6e",
  connected: "#b74ec5",
  won: "#ffda5f",
  complete: "#a2ffa2",
} as const;

/** Link widths in world points: arm strands heavier than the links between. */
const LINE_WIDTH = { arm: 1.9, bridge: 0.77 };
/** Locked links are drawn a little finer as well as fainter. */
const LOCKED_LINE_SCALE = 0.85;
const LOCKED_LINE_COLOR = "#888483";

/** Native game dot sprites, baked by scripts/generate-campaign-map.mjs from the
 *  sizes, colours and glows here; rebake them when those change. */
const GAME_DOT_SPRITES = {
  locked: require("@/assets/images/campaign/game-dot-locked.webp"),
  connected: require("@/assets/images/campaign/game-dot-connected.webp"),
  won: require("@/assets/images/campaign/game-dot-won.webp"),
  complete: require("@/assets/images/campaign/game-dot-complete.webp"),
} as const;
/** A sprite's size in world points: room for the widest halo. Must match
 *  SPRITES.nodeSize in scripts/generate-campaign-map.mjs. */
const GAME_DOT_SPRITE_SIZE = 96;
/** How far the selection rings reach beyond the dot, in world points. */
const SELECTION_RING_WIDTH = 7;

/** Glow strength per game dot state: outer blur radius, spread, and opacity. */
const GAME_DOT_GLOW = {
  locked: { blur: 3, spread: 0, opacity: 0.28 },
  connected: { blur: 9, spread: 2, opacity: 0.68 },
  won: { blur: 8, spread: 1, opacity: 0.55 },
  complete: { blur: 13, spread: 3, opacity: 0.75 },
} as const;

/**
 * Game dot names are drawn like the engraving on a star chart: small, spaced
 * capitals sitting just under each dot. They would be noise across the whole
 * galaxy, so they fade in only once you have zoomed in past browsing distance.
 */
const LABEL = {
  fadeFrom: 0.62,
  fadeTo: 1.05,
  fontSize: 7.2,
  letterSpacing: 0.4,
  /** Wide enough that names are never cut off. */
  maxWidth: 150,
  gap: 7,
};
/** Locked games are named more faintly, so the lit ones lead the eye. */
const LABEL_OPACITY = {
  locked: 0.34,
  connected: 0.85,
  won: 0.8,
  complete: 0.85,
} as const;

/** How far a label's colour is mixed from its game dot's colour towards white:
 *  still colour-coded, but legible as text. */
const LABEL_WHITENESS = 0.95;

function paleFor(state: GameDotState) {
  const hex = STATE_COLORS[state].replace("#", "");
  const channel = (at: number) => {
    const value = parseInt(hex.slice(at, at + 2), 16);
    return Math.round(value + (255 - value) * LABEL_WHITENESS);
  };
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
}

/**
 * The arms, drawn rather than implied: a soft glow along each spine plus a
 * scatter of dust that thins out away from it. Purely decorative, never
 * interactive, and static - it renders once and is never updated.
 *
 * Glow and dust are one pre-rendered image baked by
 * scripts/generate-campaign-map.mjs. A real blur is the only way to get smooth
 * arms (stacked shapes band), SVG blur filters are unreliable on Android,
 * and one image is far cheaper to draw than the shapes it replaces: Android
 * draws a map-sized SVG as a bitmap many times the size of the screen.
 */
const GALAXY_GLOW = require("@/assets/images/galaxy-glow.webp");

/** A soft halo for each dust tint (blue-white, white, cyan, pink and the
 *  bulge's warm tint), in the order scripts/generate-campaign-map.mjs deals
 *  them, and bakes these. */
const FLARE_SPRITES = [
  require("@/assets/images/campaign/flare-0.webp"),
  require("@/assets/images/campaign/flare-1.webp"),
  require("@/assets/images/campaign/flare-2.webp"),
  require("@/assets/images/campaign/flare-3.webp"),
  require("@/assets/images/campaign/flare-4.webp"),
];

/**
 * Some of the brighter stars flare now and then. They are dealt into a few
 * groups that each flare together on their own rhythm, so a handful of
 * animations (not one per star) keep the arms alive; the members of a group
 * are scattered across the whole galaxy, so they never read as a set.
 */
const FLARE_GROUP_COUNT = 6;
/** World-point radius of a flaring star's halo. */
const FLARE_RADIUS = 10;
const FLARE_GROUPS = (() => {
  const groups: { x: number; y: number; tint: number }[][] = Array.from(
    { length: FLARE_GROUP_COUNT },
    () => [],
  );
  let dealt = 0;
  ARM_DUST.forEach(([x, y, tint, opacity], index) => {
    if (index % 7 !== 0 || opacity < 0.6 || index % 14 !== 0) return;
    groups[dealt % FLARE_GROUP_COUNT].push({
      x: toWorld(x),
      y: toWorld(y),
      tint: FLARE_SPRITES[tint] ? tint : 1,
    });
    dealt += 1;
  });
  return groups.map((stars, group) => ({
    stars,
    // Long, uneven rests between short blooms, so a flare is an event.
    periodMs: 6200 + Math.round(hashUnit(`flare:${group}:period`) * 5200),
    phaseMs: Math.round(hashUnit(`flare:${group}:phase`) * 6000),
  }));
})();
/** Share of a flare cycle spent brightening, then fading, out of the whole. */
const FLARE_BLOOM_SHARE = 0.12;
const FLARE_FADE_SHARE = 0.2;

function FlareStars({
  stars,
}: {
  stars: (typeof FLARE_GROUPS)[number]["stars"];
}) {
  return stars.map((star, index) => (
    <Image
      key={index}
      source={FLARE_SPRITES[star.tint]}
      cachePolicy="memory"
      style={{
        position: "absolute",
        left: star.x - FLARE_RADIUS,
        top: star.y - FLARE_RADIUS,
        width: FLARE_RADIUS * 2,
        height: FLARE_RADIUS * 2,
      }}
    />
  ));
}

const flareLayerStyle = {
  position: "absolute",
  left: 0,
  top: 0,
  width: WORLD_SIZE,
  height: WORLD_SIZE,
  pointerEvents: "none",
} as const;

function NativeFlareGroup({ group }: { group: (typeof FLARE_GROUPS)[number] }) {
  const glow = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const bloomMs = group.periodMs * FLARE_BLOOM_SHARE;
    const fadeMs = group.periodMs * FLARE_FADE_SHARE;
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(group.periodMs - bloomMs - fadeMs),
        RNAnimated.timing(glow, {
          toValue: 1,
          duration: bloomMs,
          easing: RNEasing.out(RNEasing.quad),
          useNativeDriver: true,
        }),
        RNAnimated.timing(glow, {
          toValue: 0,
          duration: fadeMs,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    // Groups start staggered so they never fall into step.
    const timer = setTimeout(() => animation.start(), group.phaseMs);
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [glow, group]);

  return (
    <RNAnimated.View style={[flareLayerStyle, { opacity: glow }]}>
      <FlareStars stars={group.stars} />
    </RNAnimated.View>
  );
}

function WebFlareGroup({ group }: { group: (typeof FLARE_GROUPS)[number] }) {
  const webFlareStyle = {
    opacity: 0,
    animationName: "campaign-arm-star-flare",
    animationDuration: `${group.periodMs}ms`,
    animationDelay: `-${group.phaseMs}ms`,
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  } as Record<string, unknown>;

  return (
    <View style={[flareLayerStyle, webFlareStyle]}>
      <FlareStars stars={group.stars} />
    </View>
  );
}

const ArmFlares = memo(function ArmFlares() {
  return FLARE_GROUPS.map((group, index) =>
    Platform.OS === "web" ? (
      <WebFlareGroup key={index} group={group} />
    ) : (
      <NativeFlareGroup key={index} group={group} />
    ),
  );
});

const ArmArtwork = memo(function ArmArtwork({
  animationsEnabled,
  onGlowShown,
}: {
  animationsEnabled: boolean;
  onGlowShown: () => void;
}) {
  return (
    <>
      {/* The wrapper carries pointerEvents, which expo-image's style does not
          accept; the image inherits it, so a drag pans the map on web rather
          than picking the picture up. */}
      <View
        style={{
          position: "absolute",
          pointerEvents: "none",
          left: 0,
          top: 0,
          width: WORLD_SIZE,
          height: WORLD_SIZE,
        }}
      >
        <Image
          source={GALAXY_GLOW}
          cachePolicy="memory"
          contentFit="fill"
          style={{ width: "100%", height: "100%" }}
          onDisplay={onGlowShown}
        />
      </View>
      {animationsEnabled && <ArmFlares />}
    </>
  );
});

/** Fraction of newly-reachable game dots that twinkle, so the sky isn't uniform. */
const TWINKLE_CHANCE = 0.7;

/** Deterministic per-game dot twinkle rhythm so game dots don't pulse in lockstep. */
function getTwinkleTiming(path: string) {
  const bloomMs = 260 + Math.round(hashUnit(`${path}:bloom`) * 220);
  const restMs = 1500 + Math.round(hashUnit(`${path}:rest`) * 2800);
  const durationMs = restMs + bloomMs * 2.3;
  return {
    enabled: hashUnit(`${path}:enabled`) < TWINKLE_CHANCE,
    bloomMs,
    restMs,
    durationMs,
    // One-time delay before a native game dot's first bloom.
    startDelayMs: Math.round(hashUnit(`${path}:start`) * 1800),
    // Offsets a web game dot's CSS animation into its own cycle from frame one.
    phaseMs: Math.round(hashUnit(`${path}:phase`) * durationMs),
  };
}

function hashUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function toWorld(coordinate: number) {
  return (coordinate + 1) * WORLD_SIZE * 0.5;
}

// The swarm of stars marking the galaxy's centre, in world space: it pans and
// zooms like every game dot, and renders behind them.
const BLACK_HOLE_POSITION = { x: toWorld(0), y: toWorld(0) };
/** How much of the map's pan the black hole ignores, for a hint of depth. */
const BLACK_HOLE_PARALLAX = 0.06;
/** It never drifts further than this from the centre game dot, in world pixels. */
const BLACK_HOLE_MAX_DRIFT = 12;

// Precomputed once at module scope, since game dot positions are static.
const GAME_DOT_CONNECTIONS = GAME_DOT_DEFINITIONS.flatMap((gameDot) =>
  gameDot.connections
    .filter((path) => gameDot.path < path)
    .map((path) => {
      const target = GAME_DOTS_BY_PATH.get(path)!;
      const key = `${gameDot.path}-${path}`;
      const x1 = toWorld(gameDot.x);
      const y1 = toWorld(gameDot.y);
      const x2 = toWorld(target.x);
      const y2 = toWorld(target.y);
      // Two game dots on the same arm are a strand of that arm, drawn heavier.
      const onArm = gameDot.arm !== null && gameDot.arm === target.arm;
      return {
        key,
        gameDot,
        target,
        onArm,
        centreX: (x1 + x2) / 2,
        centreY: (y1 + y2) / 2,
        length: Math.hypot(x2 - x1, y2 - y1),
        angle: Math.atan2(y2 - y1, x2 - x1),
      };
    }),
);

type Props = {
  selectedPath: string;
  ready: boolean;
  onSelectGameDot: (gameDot: GameDotDefinition) => void;
  wonPaths: ReadonlySet<string>;
  collectedTaoIds: ReadonlySet<number>;
  collectedQuoteIds: ReadonlySet<number>;
};

const GameDotLabels = memo(function GameDotLabels({
  gameDotStates,
  scale,
}: {
  gameDotStates: ReadonlyMap<string, GameDotState>;
  scale: SharedValue<number>;
}) {
  const language = useDisplayLanguage();
  // One animated wrapper for all of the labels: they share a single fade, so
  // this stays one worklet rather than 114 of them.
  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(
      scale.value,
      [LABEL.fadeFrom, LABEL.fadeTo],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { pointerEvents: "none" }, fade]}
    >
      {GAME_DOT_DEFINITIONS.map((gameDot) => {
        const state = gameDotStates.get(gameDot.path)!;
        const dotSize = GAME_DOT_SIZE * STATE_SIZE_MULTIPLIER[state];
        return (
          <Text
            key={gameDot.path}
            style={{
              position: "absolute",
              left: toWorld(gameDot.x) - LABEL.maxWidth / 2,
              top: toWorld(gameDot.y) + dotSize / 2 + LABEL.gap,
              width: LABEL.maxWidth,
              textAlign: "center",
              fontSize: LABEL.fontSize,
              letterSpacing: LABEL.letterSpacing,
              color: rgba(paleFor(state), LABEL_OPACITY[state]),
              textTransform: "uppercase",
              // Names cross the arm glow and the links, so they carry their
              // own dark backing rather than relying on what is behind them.
              ...textShadow(rgba(Colors.black, 0.7), 2, {
                width: 0,
                height: 0.5,
              }),
            }}
          >
            {localizeGameTitle(
              GAMES_DATA[gameDot.path],
              gameDot.path,
              language,
            )}
          </Text>
        );
      })}
    </Animated.View>
  );
});

const GameDotConnections = memo(function GameDotConnections({
  gameDotStates,
}: {
  gameDotStates: ReadonlyMap<string, GameDotState>;
}) {
  // Each link is a thin view, turned to lie between its game dots, with ends
  // rounded like a round line cap. An SVG would be simpler, but Android draws
  // a map-sized SVG as one huge bitmap, which makes the whole map crawl.
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      {GAME_DOT_CONNECTIONS.map(
        ({ key, gameDot, target, onArm, centreX, centreY, length, angle }) => {
          const gameDotState = gameDotStates.get(gameDot.path)!;
          const targetState = gameDotStates.get(target.path)!;
          const locked = gameDotState === "locked" || targetState === "locked";
          const strokeColor = locked
            ? LOCKED_LINE_COLOR
            : gameDotState === "complete" && targetState === "complete"
              ? STATE_COLORS.complete
              : gameDotState === "connected" || targetState === "connected"
                ? STATE_COLORS.connected
                : STATE_COLORS.won;

          const width =
            LINE_WIDTH[onArm ? "arm" : "bridge"] *
            (locked ? LOCKED_LINE_SCALE : 1);
          // The caps reach half a line width past each game dot's centre.
          const span = length + width;

          return (
            <View
              key={key}
              style={{
                position: "absolute",
                left: centreX - span / 2,
                top: centreY - width / 2,
                width: span,
                height: width,
                borderRadius: width / 2,
                backgroundColor: rgba(strokeColor, locked ? 0.65 : 0.85),
                transform: [{ rotate: `${angle}rad` }],
              }}
            />
          );
        },
      )}
    </View>
  );
});

const AnimatedPressable = RNAnimated.createAnimatedComponent(Pressable);

type TwinkleTiming = ReturnType<typeof getTwinkleTiming>;

function NativeTwinklingGameDot({
  style,
  title,
  state,
  onPress,
  twinkle,
  children,
}: {
  style: Record<string, unknown>;
  title: string;
  state: GameDotState;
  onPress: () => void;
  twinkle: TwinkleTiming;
  children?: ReactNode;
}) {
  const pulse = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(twinkle.startDelayMs),
        RNAnimated.timing(pulse, {
          toValue: 1,
          duration: twinkle.bloomMs,
          easing: RNEasing.out(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.timing(pulse, {
          toValue: 0,
          duration: Math.round(twinkle.bloomMs * 1.3),
          easing: RNEasing.in(RNEasing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        RNAnimated.delay(twinkle.restMs),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, twinkle.bloomMs, twinkle.restMs, twinkle.startDelayMs]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${state}`}
      onPress={onPress}
      style={[
        style,
        {
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.88, 1],
          }),
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.16],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

function TwinklingGameDot(props: {
  style: Record<string, unknown>;
  title: string;
  state: GameDotState;
  onPress: () => void;
  twinkle: TwinkleTiming;
  children?: ReactNode;
}) {
  if (Platform.OS === "web") {
    const webTwinkleStyle = {
      animationName: "campaign-game-dot-pulse",
      animationDuration: `${props.twinkle.durationMs}ms`,
      animationDelay: `-${props.twinkle.phaseMs}ms`,
      animationIterationCount: "infinite",
      animationTimingFunction: "ease-in-out",
    } as Record<string, unknown>;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${props.title}, ${props.state}`}
        onPress={props.onPress}
        style={[props.style, webTwinkleStyle]}
      />
    );
  }

  return <NativeTwinklingGameDot {...props} />;
}

const GameDot = memo(function GameDot({
  gameDot,
  state,
  selected,
  animationsEnabled,
  onSelectGameDot,
}: {
  gameDot: GameDotDefinition;
  state: GameDotState;
  selected: boolean;
  animationsEnabled: boolean;
  onSelectGameDot: (gameDot: GameDotDefinition) => void;
}) {
  const dotSize = GAME_DOT_SIZE * STATE_SIZE_MULTIPLIER[state];
  const game = GAMES_DATA[gameDot.path];
  const title = localizeGameTitle(game, gameDot.path, useDisplayLanguage());
  const color = STATE_COLORS[state];
  const glow = GAME_DOT_GLOW[state];

  const selectionRing = selected
    ? `0 0 0 2px ${rgba(Colors.black, 0.85)}, 0 0 0 5px ${rgba(Colors.white, 0.9)}, 0 0 0 7px ${rgba(color, 0.9)}, `
    : "";
  const halo = `0 0 ${glow.blur}px ${glow.spread}px ${rgba(color, glow.opacity)}, 0 0 ${glow.blur * 2.2}px ${glow.spread}px ${rgba(color, glow.opacity * 0.35)}`;
  // Shaded as a sphere lit from the upper left, like the native sprites
  // (SPRITES.sphere in scripts/generate-campaign-map.mjs).
  const glint = state === "locked" ? 0.15 : 0.41;
  const sphere = [
    `radial-gradient(circle at 34% 28%, ${rgba(Colors.white, glint)} 0%, ${rgba(Colors.white, 0)} 42%)`,
    `radial-gradient(circle at 36% 30%, ${rgba(Colors.black, 0)} 25%, ${rgba(Colors.black, 0.26)} 95%)`,
  ].join(", ");

  const webStyle = {
    position: "absolute",
    outline: "none",
    pointerEvents: "auto",
    left: toWorld(gameDot.x) - dotSize / 2,
    top: toWorld(gameDot.y) - dotSize / 2,
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: color,
    backgroundImage: sphere,
    boxShadow: `${selectionRing}${halo}`,
  } as const;
  // Android draws blurred box shadows slowly, and a map has over a hundred of
  // them, so native draws the same look from a sprite baked by
  // scripts/generate-campaign-map.mjs: one image per game dot.
  const nativeStyle = {
    position: "absolute",
    // Native taps are handled by the map's tap gesture (see CampaignMap).
    pointerEvents: "none",
    left: toWorld(gameDot.x) - GAME_DOT_SPRITE_SIZE / 2,
    top: toWorld(gameDot.y) - GAME_DOT_SPRITE_SIZE / 2,
    width: GAME_DOT_SPRITE_SIZE,
    height: GAME_DOT_SPRITE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const isWeb = Platform.OS === "web";
  const style = isWeb ? webStyle : nativeStyle;
  const sprite = isWeb ? undefined : (
    <>
      <Image
        source={GAME_DOT_SPRITES[state]}
        cachePolicy="memory"
        style={StyleSheet.absoluteFill}
      />
      {selected && <SelectionRing dotSize={dotSize} color={color} />}
    </>
  );

  const twinkle = getTwinkleTiming(gameDot.path);
  if (state === "connected" && animationsEnabled && twinkle.enabled) {
    return (
      <TwinklingGameDot
        style={style}
        title={title}
        state={state}
        onPress={() => onSelectGameDot(gameDot)}
        twinkle={twinkle}
      >
        {sprite}
      </TwinklingGameDot>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${state}`}
      onPress={() => onSelectGameDot(gameDot)}
      style={style}
    >
      {sprite}
    </Pressable>
  );
});

/** The selected game dot's rings, as on the web: dark, then white, then the
 *  game dot's own colour, each hugging the one inside it. */
function SelectionRing({ dotSize, color }: { dotSize: number; color: string }) {
  const ring = (width: number, inset: number, ringColor: string) => {
    const size = dotSize + (SELECTION_RING_WIDTH - inset) * 2;
    return (
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: width,
          borderColor: ringColor,
        }}
      />
    );
  };
  return (
    <>
      {ring(2, 0, rgba(color, 0.9))}
      {ring(3, 2, rgba(Colors.white, 0.9))}
      {ring(2, 5, rgba(Colors.black, 0.85))}
    </>
  );
}

export function CampaignMap({
  selectedPath,
  ready,
  onSelectGameDot,
  wonPaths,
  collectedTaoIds,
  collectedQuoteIds,
}: Props) {
  const { settings } = useGlobalSettings();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  // The tab stays hidden until the map is centred on its game dot and its big
  // glow image (slow to decode) is showing, so it appears complete.
  const [centered, setCentered] = useState(false);
  const [glowShown, setGlowShown] = useState(false);
  const onGlowShown = () => setGlowShown(true);
  useTabReadyHold(!centered || !glowShown);
  const containerRef = useRef<View>(null);
  const hasCenteredInitialGameDot = useRef(false);
  const unlockedPaths = useMemo(
    () => getUnlockedGameDotPaths(wonPaths),
    [wonPaths],
  );
  const gameDotStates = useMemo(
    () =>
      new Map(
        GAME_DOT_DEFINITIONS.map((gameDot) => [
          gameDot.path,
          getGameDotState(
            gameDot,
            wonPaths,
            collectedTaoIds,
            collectedQuoteIds,
            unlockedPaths,
          ),
        ]),
      ),
    [collectedQuoteIds, collectedTaoIds, unlockedPaths, wonPaths],
  );

  const centerGameDot = (gameDot: GameDotDefinition, animated = true) => {
    const nextX = -gameDot.x * WORLD_SIZE * 0.5 * scale.value;
    const nextY = -gameDot.y * WORLD_SIZE * 0.5 * scale.value;
    translateX.value = animated ? withTiming(nextX, { duration: 350 }) : nextX;
    translateY.value = animated ? withTiming(nextY, { duration: 350 }) : nextY;
  };

  useEffect(() => {
    const gameDot = GAME_DOT_DEFINITIONS.find(
      (entry) => entry.path === selectedPath,
    );
    if (!ready || !gameDot || viewport.width <= 0) return;

    if (hasCenteredInitialGameDot.current) {
      centerGameDot(gameDot);
      return;
    }

    centerGameDot(gameDot, false);
    hasCenteredInitialGameDot.current = true;
    setCentered(true);
  }, [ready, selectedPath, settings.showAnimations, viewport.width]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const element = containerRef.current as unknown as HTMLElement | null;
    if (!element?.addEventListener) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, scale.value * Math.exp(-event.deltaY * 0.0015)),
      );
      scale.value = nextScale;
      translateX.value = Math.max(
        -GAME_DOT_EXTENT_X * nextScale,
        Math.min(GAME_DOT_EXTENT_X * nextScale, translateX.value),
      );
      translateY.value = Math.max(
        -GAME_DOT_EXTENT_Y * nextScale,
        Math.min(GAME_DOT_EXTENT_Y * nextScale, translateY.value),
      );
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [scale, translateX, translateY]);

  // A tap selects the nearest game dot to the tap point. Per-game dot Pressables miss
  // taps after transformed map movement on native, while Safari can cancel
  // their click inside the map's pan/pinch detector. Web keeps the Pressables
  // for keyboard and accessibility input, with this gesture as touch fallback.
  const selectGameDotAt = (x: number, y: number) => {
    const s = scale.value;
    const localX =
      (x - viewport.width / 2 - translateX.value) / s + WORLD_SIZE / 2;
    const localY =
      (y - viewport.height / 2 - translateY.value) / s + WORLD_SIZE / 2;

    let nearest: GameDotDefinition | undefined;
    let nearestDistance = Infinity;
    for (const gameDot of GAME_DOT_DEFINITIONS) {
      const distance = Math.hypot(
        ((gameDot.x + 1) * WORLD_SIZE * 0.5 - localX) * s,
        ((gameDot.y + 1) * WORLD_SIZE * 0.5 - localY) * s,
      );
      if (distance < nearestDistance) {
        nearest = gameDot;
        nearestDistance = distance;
      }
    }

    if (nearest && nearestDistance <= GAME_DOT_TAP_RADIUS)
      onSelectGameDot(nearest);
  };
  const selectGameDotAtRef = useRef(selectGameDotAt);
  selectGameDotAtRef.current = selectGameDotAt;

  const cameraGesture = useMemo(() => {
    const handleTap = (x: number, y: number) =>
      selectGameDotAtRef.current(x, y);

    const tap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((event, success) => {
        "worklet";
        if (success) scheduleOnRN(handleTap, event.x, event.y);
      });

    const pan = Gesture.Pan()
      // Small finger movement during a tap shouldn't start panning.
      .minDistance(8)
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        const limitX = GAME_DOT_EXTENT_X * scale.value;
        const limitY = GAME_DOT_EXTENT_Y * scale.value;
        translateX.value = Math.max(
          -limitX,
          Math.min(limitX, startX.value + event.translationX),
        );
        translateY.value = Math.max(
          -limitY,
          Math.min(limitY, startY.value + event.translationY),
        );
      });
    const pinch = Gesture.Pinch()
      .onStart(() => {
        startScale.value = scale.value;
      })
      .onUpdate((event) => {
        const nextScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, startScale.value * event.scale),
        );
        scale.value = nextScale;
        translateX.value = Math.max(
          -GAME_DOT_EXTENT_X * nextScale,
          Math.min(GAME_DOT_EXTENT_X * nextScale, translateX.value),
        );
        translateY.value = Math.max(
          -GAME_DOT_EXTENT_Y * nextScale,
          Math.min(GAME_DOT_EXTENT_Y * nextScale, translateY.value),
        );
      });
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [scale, startScale, startX, startY, translateX, translateY]);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));
  // A touch of depth: the black hole lags the map very slightly as it pans, as
  // though it sits further away. Clamped hard so it never wanders out from
  // under the centre game dot it belongs to.
  const blackHoleStyle = useAnimatedStyle(() => {
    const drift = (value: number) => {
      const lag = (-value * BLACK_HOLE_PARALLAX) / scale.value;
      return Math.max(
        -BLACK_HOLE_MAX_DRIFT,
        Math.min(BLACK_HOLE_MAX_DRIFT, lag),
      );
    };
    return {
      transform: [
        { translateX: drift(translateX.value) },
        { translateY: drift(translateY.value) },
      ],
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  return (
    <GestureDetector gesture={cameraGesture}>
      <CampaignBackground
        animationsEnabled={settings.showAnimations}
        translateX={translateX}
        translateY={translateY}
        containerRef={containerRef}
        onLayout={onLayout}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              width: WORLD_SIZE,
              height: WORLD_SIZE,
              left: viewport.width / 2 - WORLD_SIZE / 2,
              top: viewport.height / 2 - WORLD_SIZE / 2,
            },
            worldStyle,
          ]}
        >
          {/* Rendered first (and thus behind connections and game dots): a
              game dot or line drawn on top of it should never be obscured. */}
          <Animated.View
            style={[
              {
                position: "absolute",
                left: BLACK_HOLE_POSITION.x,
                top: BLACK_HOLE_POSITION.y,
              },
              blackHoleStyle,
            ]}
          >
            <CampaignBlackHole animationsEnabled={settings.showAnimations} />
          </Animated.View>

          <ArmArtwork
            animationsEnabled={settings.showAnimations}
            onGlowShown={onGlowShown}
          />

          <GameDotConnections gameDotStates={gameDotStates} />

          {GAME_DOT_DEFINITIONS.map((gameDot) => {
            return (
              <GameDot
                key={gameDot.path}
                gameDot={gameDot}
                state={gameDotStates.get(gameDot.path)!}
                selected={selectedPath === gameDot.path}
                animationsEnabled={settings.showAnimations}
                onSelectGameDot={onSelectGameDot}
              />
            );
          })}

          <GameDotLabels gameDotStates={gameDotStates} scale={scale} />
        </Animated.View>
      </CampaignBackground>
    </GestureDetector>
  );
}
