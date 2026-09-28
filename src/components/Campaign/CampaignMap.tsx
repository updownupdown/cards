import { GAMES_DATA } from "@/data/games-registry";
import { CampaignBackground } from "@/components/Campaign/CampaignBackground";
import { CampaignBlackHole } from "@/components/Campaign/CampaignBlackHole";
import {
  getGameDotState,
  getUnlockedGameDotPaths,
  GAME_DOTS_BY_PATH,
  GAME_DOT_DEFINITIONS,
  type GameDotDefinition,
  type GameDotState,
} from "@/data/campaign-map";
import { Colors, FontWeight, rgba, textShadow, theme } from "@/styles/styles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useDisplayLanguage } from "@/i18n";
import { useTabReadyHold } from "@/components/Home/TabReady";
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import Animated, {
  Extrapolation,
  FadeOut,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

// A spiral galaxy needs room: 114 game dots three dot-diameters apart do not fit
// in a smaller world (see MAP_GEOMETRY in src/data/campaign-map.ts).
const WORLD_SIZE = 1800;
/** Every game dot is drawn the same size: its state shows in its colours. */
const GAME_DOT_SIZE = 10;
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
 * A game dot's look, as a star on a chart: finished games burn in the accent;
 * won ones with collectibles still to find, in the second accent; reachable
 * ones are an open ring in the second accent, and locked ones a pale grey
 * ring. Lit dots glow.
 */
function gameDotLook(state: GameDotState) {
  switch (state) {
    case "complete":
      return { fill: theme.accent, border: theme.accent, glow: theme.accent };
    case "won":
      return {
        fill: theme.accent2,
        border: theme.accent2,
        glow: theme.accent2,
      };
    case "connected":
      return { fill: undefined, border: theme.accent2, glow: theme.accent2 };
    default:
      return {
        fill: undefined,
        border: rgba(theme.ink, 0.32),
        glow: undefined,
      };
  }
}

/** How strongly each state glows: lit stars most, reachable ones faintly. */
const GLOW_OPACITY = { complete: 0.55, won: 0.5, connected: 0.22, locked: 0 };

/** Link widths in world points: arm strands heavier than the links between. */
const LINE_WIDTH = { arm: 1.9, bridge: 0.77 };
/** Locked links are drawn a little finer as well as fainter. */
const LOCKED_LINE_SCALE = 0.85;

/** The selected game dot's ring: its gap from the dot, in world points. */
const SELECTION_GAP = 7;

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

function labelColor(state: GameDotState) {
  return state === "won" || state === "complete" ? theme.ink : theme.dim;
}

/**
 * The chart's grid, after the old star atlases (Bayer's Uranometria): rings
 * around Klondike at the centre, crossed by lines through it. Plain views,
 * like the links: Android draws a map-sized SVG as one huge bitmap.
 */
const CHART_RING_STEP = 110;
const CHART_RING_COUNT = 8;
const CHART_SPOKES = 12;
const CHART_LINE = 0.7;

const ChartGrid = memo(function ChartGrid() {
  const centre = WORLD_SIZE / 2;
  const reach = CHART_RING_STEP * CHART_RING_COUNT;
  const color = rgba(theme.ink, 0.07);
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      {Array.from({ length: CHART_RING_COUNT }, (_, index) => {
        const radius = CHART_RING_STEP * (index + 1);
        return (
          <View
            key={`ring-${index}`}
            style={{
              position: "absolute",
              left: centre - radius,
              top: centre - radius,
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
              borderWidth: CHART_LINE,
              // Every other ring a little stronger, as the atlases rule them.
              borderColor: index % 2 === 1 ? rgba(theme.ink, 0.1) : color,
            }}
          />
        );
      })}
      {/* Each spoke is a line right through the centre, so half as many. */}
      {Array.from({ length: CHART_SPOKES / 2 }, (_, index) => (
        <View
          key={`spoke-${index}`}
          style={{
            position: "absolute",
            left: centre - reach,
            top: centre - CHART_LINE / 2,
            width: reach * 2,
            height: CHART_LINE,
            backgroundColor: color,
            transform: [{ rotate: `${(index * 360) / CHART_SPOKES}deg` }],
          }}
        />
      ))}
    </View>
  );
});

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
          const lit =
            (gameDotState === "won" || gameDotState === "complete") &&
            (targetState === "won" || targetState === "complete");
          const strokeColor = lit ? theme.accent : theme.ink;
          const strokeOpacity = lit ? 0.5 : locked ? 0.07 : 0.2;

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

const GameDot = memo(function GameDot({
  gameDot,
  state,
  onSelectGameDot,
}: {
  gameDot: GameDotDefinition;
  state: GameDotState;
  onSelectGameDot: (gameDot: GameDotDefinition) => void;
}) {
  const size = GAME_DOT_SIZE;
  const game = GAMES_DATA[gameDot.path];
  const title = localizeGameTitle(game, gameDot.path, useDisplayLanguage());
  const { fill, border, glow } = gameDotLook(state);
  const glowOpacity = GLOW_OPACITY[state];
  const left = toWorld(gameDot.x);
  const top = toWorld(gameDot.y);
  const dot = {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.2,
    borderColor: border,
    backgroundColor: fill,
  } as const;

  if (Platform.OS === "web") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${state}`}
        onPress={() => onSelectGameDot(gameDot)}
        style={{
          ...dot,
          outline: "none",
          pointerEvents: "auto",
          left: left - size / 2,
          top: top - size / 2,
          boxShadow: glow
            ? `0 0 ${size * 0.9}px ${size * 0.25}px ${rgba(glow, glowOpacity)}`
            : "none",
        }}
      />
    );
  }

  // Native taps are handled by the map's tap gesture (see CampaignMap), and
  // native draws the glow from plain circles: a map has over a hundred of
  // these, and Android draws blurred shadows slowly.
  const box = size * 3;
  const circle = (scale: number, style: object) => (
    <View
      style={{
        position: "absolute",
        width: size * scale,
        height: size * scale,
        borderRadius: (size * scale) / 2,
        ...style,
      }}
    />
  );
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
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {glow && circle(3, { backgroundColor: rgba(glow, glowOpacity * 0.18) })}
      {glow && circle(1.9, { backgroundColor: rgba(glow, glowOpacity * 0.35) })}
      {circle(1, { ...dot, position: "absolute" })}
    </View>
  );
});

/**
 * The ring around the selected game dot. Only its coming and going is
 * animated: it grows in around the newly selected dot as the last one's
 * fades away.
 */
function SelectionRing({ gameDot }: { gameDot: GameDotDefinition }) {
  const size = GAME_DOT_SIZE + SELECTION_GAP * 2;
  return (
    <Animated.View
      entering={ZoomIn.duration(220)}
      exiting={FadeOut.duration(180)}
      style={{
        position: "absolute",
        pointerEvents: "none",
        left: toWorld(gameDot.x) - size / 2,
        top: toWorld(gameDot.y) - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.2,
        borderColor: theme.accent,
      }}
    />
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
  // The tab stays hidden until the map is centred on its game dot, so it
  // appears complete.
  const [centered, setCentered] = useState(false);
  useTabReadyHold(!centered);
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

          <ChartGrid />

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

          {selectedGameDot && (
            <SelectionRing
              key={selectedGameDot.path}
              gameDot={selectedGameDot}
            />
          )}

          <GameDotLabels gameDotStates={gameDotStates} scale={scale} />
        </Animated.View>
      </CampaignBackground>
    </GestureDetector>
  );
}
