import { GAMES_DATA } from "@/data/games-registry";
import { CampaignBlackHole } from "@/components/Campaign/CampaignBlackHole";
import {
  getGameDotState,
  GAME_DOTS_BY_PATH,
  GAME_DOT_DEFINITIONS,
  type GameDotDefinition,
  type GameDotState,
} from "@/data/campaign-map";
import { Colors, FontWeight, rgba, textShadow, theme } from "@/styles/styles";
import { mix } from "@/styles/palette";
import { seededRandom } from "@/hints/random";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useDisplayLanguage } from "@/i18n";
import { useStarfield } from "@/components/Home/Starfield";
import { useTabReadyHold, useTabReadyImage } from "@/components/Home/TabReady";
import { localizeGameTitle } from "@/i18n/content";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import { GAME_CHANGE_MS } from "@/components/ui/GameInfoPanel";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// A spiral galaxy needs room: 114 game dots three dot-diameters apart do not fit
// in a smaller world (see MAP_GEOMETRY in src/data/campaign-map.ts).
const WORLD_SIZE = 1800;
/** Every game dot is drawn the same size: its state shows in its colours. */
const GAME_DOT_SIZE = 12;
/** How close (in screen points) a native tap must be to select a game dot. */
const GAME_DOT_TAP_RADIUS = 28;

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

/**
 * A game dot's look, as a star on a chart: finished games are a four-pointed
 * star in the accent (see STAR_PATH), won ones a dot in the accent, reachable
 * ones an open ring in the accent, and locked ones a pale grey ring.
 */
function gameDotLook(state: GameDotState) {
  switch (state) {
    case "complete":
    case "won":
      return { fill: theme.accent, border: theme.accent };
    case "connected":
      return { fill: theme.surface, border: theme.accent };
    default:
      return { fill: theme.surface, border: rgba(theme.ink, 0.32) };
  }
}

/**
 * A finished game's star: four points with curved sides, in a 100 by 100
 * box, its tips softened by a round stroke. Larger than a dot, so it reads
 * as a star.
 */
const STAR_PATH = "M50 4 Q58 42 96 50 Q58 58 50 96 Q42 58 4 50 Q42 42 50 4 Z";
const STAR_SIZE = GAME_DOT_SIZE * 1.5;

/** The game dot states, least advanced first. */
const STATE_ORDER: GameDotState[] = ["locked", "connected", "won", "complete"];
function lessAdvanced(a: GameDotState, b: GameDotState) {
  return STATE_ORDER.indexOf(a) <= STATE_ORDER.indexOf(b) ? a : b;
}
/**
 * A link's look for the state of its less advanced end: every link between
 * reachable games is in the accent, the further along the brighter.
 */
const LINK_LOOK: Record<
  GameDotState,
  () => { color: string; opacity: number }
> = {
  complete: () => ({ color: theme.accent, opacity: 0.8 }),
  won: () => ({ color: theme.accent, opacity: 0.8 }),
  connected: () => ({ color: theme.accent, opacity: 0.8 }),
  locked: () => ({ color: theme.ink, opacity: 0.3 }),
};

/** Link widths in world points: arm strands heavier than the links between. */
const LINE_WIDTH = { arm: 1, bridge: 1 };
/** Locked links are drawn a little finer as well as fainter. */
const LOCKED_LINE_SCALE = 1;

/** The selected game dot is drawn this much larger. */
const SELECTED_SCALE = 1.6;

/**
 * The selected game dot's rings: three thin hoops turning about it like a
 * gyroscope's, each on its own axis and at its own pace, in the game's own
 * colours, passing in front of the dot and behind it. `gap` is the range of
 * how far outside the enlarged dot a hoop may sit (see gameRings), `axis`
 * the angle of the line it turns about, `laps` its half turns per cycle (a
 * hoop looks the same after half a turn, so whole numbers loop without a
 * jump) and `phase` where in a half turn it starts, so they set off out of
 * step.
 */
const RINGS = [
  { gap: [3, 5.5], axis: 0, laps: 3, phase: 0.1 },
  { gap: [6, 8.5], axis: 60, laps: -4, phase: 0.45 },
  { gap: [9, 11], axis: 120, laps: 5, phase: 0.8 },
] as const;
/** The range of a hoop's line width. */
const RING_WIDTH = [0.7, 1.9] as const;
/** How far each half of a hoop reaches past the middle, to meet the other. */
const RING_SEAM = 0.25;
const RING_CYCLE_MS = 20000;
/** The hoops' axes drift round too, this many half turns per cycle. */
const RING_DRIFT_LAPS = 1;
/** The viewing distance, in hoop diameters: near sides swell a little. */
const RING_PERSPECTIVE = 3;

/**
 * A game's hoops, innermost first: its pale colour, its accent, and the two
 * mixed.
 */
export function ringColors(path: string) {
  const game = GAMES_DATA[path];
  if (!game) return [theme.ink, theme.accent, theme.accent];
  return [
    game.gameColorPale,
    game.gameColorAccent,
    mix(game.gameColorAccent, game.gameColorPale, 0.5),
  ];
}

/**
 * A game's rings, innermost first. Each hoop's size and line width are
 * picked within their ranges from the game's path, so every game has its
 * own set and keeps it.
 */
export function gameRings(path: string) {
  const random = seededRandom(`rings:${path}`);
  const within = ([least, most]: readonly [number, number]) =>
    least + random() * (most - least);
  const colors = ringColors(path);
  return RINGS.map((ring, index) => ({
    ...ring,
    gap: within(ring.gap),
    width: within(RING_WIDTH),
    color: colors[index],
  }));
}
type GameRing = ReturnType<typeof gameRings>[number];

/**
 * Game dot names are drawn like the engraving on a star chart: small, spaced
 * capitals sitting just under each dot. They would be noise across the whole
 * galaxy, so they fade in only once you have zoomed in past browsing distance.
 */
const LABEL = {
  fadeFrom: 0.62,
  fadeTo: 1.05,
  fontSize: 7.2,
  letterSpacing: 1.6,
  /** Wide enough that names are never cut off. */
  maxWidth: 150,
  gap: 14,
};
/** Locked games are named more faintly, so the lit ones lead the eye. */
const LABEL_OPACITY = {
  locked: 0.34,
  connected: 0.85,
  won: 0.8,
  complete: 0.85,
} as const;

function labelColor(state: GameDotState) {
  return state === "won" || state === "complete" ? theme.ink : theme.dim;
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
  unlockedPaths: ReadonlySet<string>;
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
        return (
          <Text
            key={gameDot.path}
            style={{
              position: "absolute",
              left: toWorld(gameDot.x) - LABEL.maxWidth / 2,
              top: toWorld(gameDot.y) + GAME_DOT_SIZE / 2 + LABEL.gap,
              width: LABEL.maxWidth,
              textAlign: "center",
              fontSize: LABEL.fontSize,
              fontFamily: FontWeight[500],
              letterSpacing: LABEL.letterSpacing,
              color: rgba(labelColor(state), LABEL_OPACITY[state]),
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

const GALAXY_GLOW = require("@/assets/images/galaxy-glow.webp");

/**
 * The arms, drawn rather than implied: a soft glow along each spine of the
 * spiral, under the links and dots. One image baked by an earlier version of
 * scripts/generate-campaign-map.mjs: a real blur is the only way to get
 * smooth arms (stacked shapes band), SVG blur filters are unreliable on
 * Android, and Android draws a map-sized SVG as one huge bitmap. The tab
 * waits for it, so the map never shows without it.
 */
const GalaxyArms = memo(function GalaxyArms() {
  const ready = useTabReadyImage(GALAXY_GLOW);
  return (
    // The wrapper carries pointerEvents, which expo-image's style does not
    // accept; the image inherits it, so a drag pans the map on web rather
    // than picking the picture up.
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
        style={{ width: "100%", height: "100%", opacity: 0.75 }}
        onDisplay={ready.onDisplay}
        onError={ready.onError}
      />
    </View>
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
          // A link takes the colour of the less advanced of its two ends.
          const state = lessAdvanced(
            gameDotStates.get(gameDot.path)!,
            gameDotStates.get(target.path)!,
          );
          const locked = state === "locked";
          const { color: strokeColor, opacity: strokeOpacity } =
            LINK_LOOK[state]();

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
                backgroundColor: rgba(strokeColor, strokeOpacity),
                transform: [{ rotate: `${angle}rad` }],
              }}
            />
          );
        },
      )}
    </View>
  );
});

/**
 * A game dot's mark: a four-pointed star when finished, else a dot, with a
 * glow in the accent around it once it can be played. The web draws the glow
 * as a drop shadow; native, as two faint circles, since Android draws a
 * blurred shadow on each of a hundred dots slowly.
 */
function DotMark({ state }: { state: GameDotState }) {
  const size = GAME_DOT_SIZE;
  const { fill, border } = gameDotLook(state);
  const complete = state === "complete";
  const box = complete ? STAR_SIZE : size;
  const lit = state !== "locked";
  const webGlow =
    Platform.OS === "web" && lit
      ? ({
          filter: `drop-shadow(0 0 ${size * 0.45}px ${rgba(theme.accent, 0.8)})`,
        } as object)
      : null;
  const nativeGlow = Platform.OS !== "web" && lit;
  const halo = (scale: number, opacity: number) => (
    <View
      style={{
        position: "absolute",
        left: (box - size * scale) / 2,
        top: (box - size * scale) / 2,
        width: size * scale,
        height: size * scale,
        borderRadius: (size * scale) / 2,
        backgroundColor: rgba(theme.accent, opacity),
      }}
    />
  );
  return (
    <View style={[{ width: box, height: box }, webGlow]}>
      {nativeGlow && halo(2.4, 0.08)}
      {nativeGlow && halo(1.7, 0.16)}
      {complete ? (
        <Svg
          width={STAR_SIZE}
          height={STAR_SIZE}
          viewBox="0 0 100 100"
          style={{ pointerEvents: "none" }}
        >
          <Path
            d={STAR_PATH}
            fill={theme.accent}
            stroke={theme.accent}
            strokeWidth={6}
            strokeLinejoin="round"
          />
        </Svg>
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.2,
            borderColor: border,
            backgroundColor: fill,
          }}
        />
      )}
    </View>
  );
}

function markBox(state: GameDotState) {
  return state === "complete" ? STAR_SIZE : GAME_DOT_SIZE;
}

const GameDot = memo(function GameDot({
  gameDot,
  state,
  onSelectGameDot,
}: {
  gameDot: GameDotDefinition;
  state: GameDotState;
  onSelectGameDot: (gameDot: GameDotDefinition) => void;
}) {
  const game = GAMES_DATA[gameDot.path];
  const title = localizeGameTitle(game, gameDot.path, useDisplayLanguage());
  const left = toWorld(gameDot.x);
  const top = toWorld(gameDot.y);
  const box = markBox(state);

  if (Platform.OS === "web") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${state}`}
        onPress={() => onSelectGameDot(gameDot)}
        style={{
          position: "absolute",
          outline: "none",
          pointerEvents: "auto",
          left: left - box / 2,
          top: top - box / 2,
          width: box,
          height: box,
        }}
      >
        <DotMark state={state} />
      </Pressable>
    );
  }

  // Native taps are handled by the map's tap gesture (see CampaignMap).
  return (
    <View
      accessibilityLabel={`${title}, ${state}`}
      style={{
        position: "absolute",
        pointerEvents: "none",
        left: left - box / 2,
        top: top - box / 2,
        width: box,
        height: box,
      }}
    >
      <DotMark state={state} />
    </View>
  );
});

/**
 * The selected game dot, drawn again over its own at a larger size, with
 * rings turning about it (see RINGS): it grows as it is chosen and shrinks
 * back as another is, in step with the game's card below the map changing
 * its colours.
 */
function SelectedDots({
  selected,
  gameDotStates,
  animated,
}: {
  selected: GameDotDefinition | undefined;
  gameDotStates: ReadonlyMap<string, GameDotState>;
  /** "Show animations": off, the rings hold still. */
  animated: boolean;
}) {
  // The dot shrinking back stays drawn until it is its own size again.
  const [leaving, setLeaving] = useState<GameDotDefinition[]>([]);
  const shown = useRef(selected);
  useEffect(() => {
    const previous = shown.current;
    shown.current = selected;
    if (previous && previous.path !== selected?.path) {
      setLeaving((current) => [
        ...current.filter((gameDot) => gameDot.path !== previous.path),
        previous,
      ]);
    }
    if (selected) {
      setLeaving((current) =>
        current.filter((gameDot) => gameDot.path !== selected.path),
      );
    }
  }, [selected]);
  const done = (path: string) =>
    setLeaving((current) => current.filter((gameDot) => gameDot.path !== path));
  return (
    <>
      {leaving.map((gameDot) => (
        <GrowingDot
          key={`out-${gameDot.path}`}
          gameDot={gameDot}
          state={gameDotStates.get(gameDot.path)!}
          grow={false}
          animated={animated}
          onDone={done}
        />
      ))}
      {selected && (
        <GrowingDot
          key={`in-${selected.path}`}
          gameDot={selected}
          state={gameDotStates.get(selected.path)!}
          grow
          animated={animated}
        />
      )}
    </>
  );
}

/**
 * Half of one hoop of the selected dot's rings, turning on the shared clock:
 * the half nearer the viewer ("front", drawn over the dot) or the half
 * further away ("back", drawn under it), so the hoop passes round the dot.
 */
function RingHalf({
  ring,
  size,
  side,
  turn,
}: {
  ring: GameRing;
  size: number;
  side: "front" | "back";
  turn: SharedValue<number>;
}) {
  const { axis, laps, phase } = ring;
  const style = useAnimatedStyle(() => {
    // The hoop's turn, kept within its first half: there its left half is
    // always the nearer one, and a hoop looks the same half a turn on.
    const halfTurns = phase + turn.value * laps;
    const angle = (halfTurns - Math.floor(halfTurns)) * 180;
    return {
      transform: [
        { perspective: size * RING_PERSPECTIVE },
        { rotateZ: `${axis + turn.value * RING_DRIFT_LAPS * 180}deg` },
        { rotateY: `${angle}deg` },
      ],
    };
  });
  // The halves overlap by a hair where they meet, clear of the dot.
  const half = size / 2 + RING_SEAM;
  const offset = side === "front" ? 0 : size - half;
  return (
    <Animated.View
      style={[{ position: "absolute", width: size, height: size }, style]}
    >
      <View
        style={{
          position: "absolute",
          left: offset,
          top: 0,
          width: half,
          height: size,
          overflow: "hidden",
        }}
      >
        <View
          testID={`selected-ring-${side}`}
          style={{
            position: "absolute",
            left: -offset,
            top: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ring.width,
            borderColor: ring.color,
          }}
        />
      </View>
    </Animated.View>
  );
}

/**
 * One side of the rings about the selected game dot, centred on it: the
 * back halves go under the dot and the front halves over it. They open out
 * as the dot grows and close as it shrinks back, on the dot's own `scale`.
 */
function SelectedRings({
  gameDot,
  box,
  side,
  scale,
  turn,
}: {
  gameDot: GameDotDefinition;
  box: number;
  side: "front" | "back";
  scale: SharedValue<number>;
  turn: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const shown = interpolate(
      scale.value,
      [1, SELECTED_SCALE],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: shown, transform: [{ scale: 0.5 + shown * 0.5 }] };
  });
  const rings = useMemo(() => gameRings(gameDot.path), [gameDot.path]);
  const sizes = rings.map((ring) => box * SELECTED_SCALE + ring.gap * 2);
  const extent = Math.max(...sizes);
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          pointerEvents: "none",
          left: toWorld(gameDot.x) - extent / 2,
          top: toWorld(gameDot.y) - extent / 2,
          width: extent,
          height: extent,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {rings.map((ring, index) => (
        <RingHalf
          key={index}
          ring={ring}
          size={sizes[index]}
          side={side}
          turn={turn}
        />
      ))}
    </Animated.View>
  );
}

function GrowingDot({
  gameDot,
  state,
  grow,
  animated,
  onDone,
}: {
  gameDot: GameDotDefinition;
  state: GameDotState;
  grow: boolean;
  animated: boolean;
  onDone?: (path: string) => void;
}) {
  const scale = useSharedValue(grow ? 1 : SELECTED_SCALE);
  useEffect(() => {
    const path = gameDot.path;
    scale.value = withTiming(
      grow ? SELECTED_SCALE : 1,
      { duration: GAME_CHANGE_MS },
      (finished) => {
        if (finished && onDone) scheduleOnRN(onDone, path);
      },
    );
  }, [gameDot.path, grow, onDone, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  // The rings' clock, shared by their halves under and over the dot.
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!animated) return;
    turn.value = withRepeat(
      withTiming(1, { duration: RING_CYCLE_MS, easing: Easing.linear }),
      -1,
    );
    return () => {
      cancelAnimation(turn);
      turn.value = 0;
    };
  }, [animated, turn]);
  const box = markBox(state);
  const rings = { gameDot, box, scale, turn };
  return (
    <>
      <SelectedRings {...rings} side="back" />
      <Animated.View
        style={[
          {
            position: "absolute",
            pointerEvents: "none",
            left: toWorld(gameDot.x) - box / 2,
            top: toWorld(gameDot.y) - box / 2,
            width: box,
            height: box,
          },
          style,
        ]}
      >
        <DotMark state={state} />
      </Animated.View>
      <SelectedRings {...rings} side="front" />
    </>
  );
}

export function CampaignMap({
  selectedPath,
  ready,
  onSelectGameDot,
  wonPaths,
  unlockedPaths,
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
  // The tab stays hidden until the map is centred on its game dot, so it
  // appears complete.
  const [centered, setCentered] = useState(false);
  useTabReadyHold(!centered);
  const containerRef = useRef<View>(null);
  const starfield = useStarfield();
  // Once linked, the star layers follow the map's pans. (Only the shared
  // values go into the worklet.)
  const sky = starfield && {
    skyX: starfield.skyX,
    skyY: starfield.skyY,
    panLinked: starfield.panLinked,
    panFromX: starfield.panFromX,
    panFromY: starfield.panFromY,
  };
  useAnimatedReaction(
    () => [translateX.value, translateY.value] as const,
    ([x, y]) => {
      if (!sky || !sky.panLinked.value) return;
      sky.skyX.value += x - sky.panFromX.value;
      sky.skyY.value += y - sky.panFromY.value;
      sky.panFromX.value = x;
      sky.panFromY.value = y;
    },
  );
  const hasCenteredInitialGameDot = useRef(false);
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

  const selectedGameDot = GAME_DOTS_BY_PATH.get(selectedPath);

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
    // From here, the sky follows the map's pans.
    starfield?.linkPan(translateX.value, translateY.value);
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
      {/* The sky behind is Home's starfield, which this map moves. */}
      <View
        ref={containerRef}
        onLayout={onLayout}
        style={{ flex: 1, overflow: "hidden" }}
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

          <GalaxyArms />

          <GameDotConnections gameDotStates={gameDotStates} />

          {GAME_DOT_DEFINITIONS.map((gameDot) => {
            return (
              <GameDot
                key={gameDot.path}
                gameDot={gameDot}
                state={gameDotStates.get(gameDot.path)!}
                onSelectGameDot={onSelectGameDot}
              />
            );
          })}

          <SelectedDots
            selected={selectedGameDot}
            gameDotStates={gameDotStates}
            animated={settings.showAnimations}
          />

          <GameDotLabels gameDotStates={gameDotStates} scale={scale} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
