import { GAMES_DATA } from "@/data/games-registry";
import { NodesBackground } from "@/components/Nodes/NodesBackground";
import { NodesBlackHole } from "@/components/Nodes/NodesBlackHole";
import {
  ARM_DUST,
  getNodeVisualState,
  getUnlockedNodePaths,
  NODES_BY_PATH,
  NODE_DEFINITIONS,
  type NodeDefinition,
  type NodeVisualState,
} from "@/data/nodes-map";
import { Colors, rgba, textShadow } from "@/styles/styles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useDisplayLanguage } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
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
import Svg, { Circle, Path } from "react-native-svg";

// A spiral galaxy needs room: 114 nodes three dot-diameters apart do not fit
// in a smaller world (see MAP_GEOMETRY in src/data/nodes-map.ts).
const WORLD_SIZE = 1800;
const NODE_SIZE = 18;
/** How close (in screen points) a native tap must be to select a node. */
const NODE_TAP_RADIUS = 28;
/** Size reads as a signal, not decoration: a reachable-but-unplayed node
 * (the one to head for) is biggest, tapering down through won and complete
 * back to a small, unlit locked node. */
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
const NODE_EXTENT_X =
  Math.max(...NODE_DEFINITIONS.map((node) => Math.abs(node.x))) *
    WORLD_SIZE *
    0.5 +
  NODE_SIZE;
const NODE_EXTENT_Y =
  Math.max(...NODE_DEFINITIONS.map((node) => Math.abs(node.y))) *
    WORLD_SIZE *
    0.5 +
  NODE_SIZE;
// Realistic-ish star colours: a locked node is a dim, unlit ember; a
// reachable-but-unplayed node runs hot red; a won-but-incomplete node is a
// warm orange main-sequence star; a fully complete node is a blue-white nova.
const STATE_COLORS = {
  locked: "#585656",
  connected: "#ad4ec5",
  won: "#ffda5f",
  complete: "#a2ffa2",
} as const;

/** Link widths in world points: arm strands heavier than the links between. */
const LINE_WIDTH = { arm: 1.9, bridge: 0.77 };
/** Locked links are drawn a little finer as well as fainter. */
const LOCKED_LINE_SCALE = 0.85;
const LOCKED_LINE_COLOR = "#6b5150";

/** Glow strength per node state: outer blur radius, spread, and opacity. */
const NODE_GLOW = {
  locked: { blur: 3, spread: 0, opacity: 0.28 },
  connected: { blur: 9, spread: 2, opacity: 0.68 },
  won: { blur: 8, spread: 1, opacity: 0.55 },
  complete: { blur: 13, spread: 3, opacity: 0.75 },
} as const;

/**
 * Node names are drawn like the engraving on a star chart: small, spaced
 * capitals sitting just under each dot. They would be noise across the whole
 * galaxy, so they fade in only once you have zoomed in past browsing distance.
 */
const LABEL = {
  fadeFrom: 0.62,
  fadeTo: 1.05,
  fontSize: 7.2,
  letterSpacing: 1.4,
  /** Wide enough that names are never cut off. */
  maxWidth: 150,
  gap: 7,
};
/** Locked games are named more faintly, so the lit ones lead the eye. */
const LABEL_OPACITY = {
  locked: 0.34,
  connected: 0.95,
  won: 0.8,
  complete: 0.9,
} as const;

/** How far a label's colour is mixed from its node's colour towards white:
 *  still colour-coded, but legible as text. */
const LABEL_WHITENESS = 0.65;

function paleFor(state: NodeVisualState) {
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
 * The glow is a pre-blurred image baked by scripts/generate-nodes-map.mjs.
 * A real blur is the only way to get smooth arms (stacked shapes band), SVG
 * blur filters are unreliable on Android, and one image is cheaper to draw
 * than the dozens of paths it replaces.
 */
const GALAXY_GLOW = require("@/assets/images/galaxy-glow.webp");
const ARM_DUST_TINTS = ["#cfe0ff", "#ffffff", "#ffe9bd", "#ffd0c4", "#d8ccff"];
/** Every seventh speck is a brighter star; the rest are fine dust. */
const DUST_RADIUS = { star: 1.95, fine: 1 };

const ArmArtwork = memo(function ArmArtwork() {
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
          contentFit="fill"
          style={{ width: "100%", height: "100%" }}
        />
      </View>
      <Svg
        width={WORLD_SIZE}
        height={WORLD_SIZE}
        style={{ position: "absolute", pointerEvents: "none" }}
      >
        {ARM_DUST.map(([x, y, tint, opacity], index) => (
          <Circle
            key={`dust-${index}`}
            cx={toWorld(x)}
            cy={toWorld(y)}
            r={index % 7 === 0 ? DUST_RADIUS.star : DUST_RADIUS.fine}
            fill={rgba(ARM_DUST_TINTS[tint] ?? "#ffffff", opacity * 0.65)}
          />
        ))}
      </Svg>
    </>
  );
});

/** Fraction of newly-reachable nodes that twinkle, so the sky isn't uniform. */
const TWINKLE_CHANCE = 0.7;

/** Deterministic per-node twinkle rhythm so nodes don't pulse in lockstep. */
function getTwinkleTiming(path: string) {
  const bloomMs = 260 + Math.round(hashUnit(`${path}:bloom`) * 220);
  const restMs = 1500 + Math.round(hashUnit(`${path}:rest`) * 2800);
  const durationMs = restMs + bloomMs * 2.3;
  return {
    enabled: hashUnit(`${path}:enabled`) < TWINKLE_CHANCE,
    bloomMs,
    restMs,
    durationMs,
    // One-time delay before a native node's first bloom.
    startDelayMs: Math.round(hashUnit(`${path}:start`) * 1800),
    // Offsets a web node's CSS animation into its own cycle from frame one.
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
// zooms like every node, and renders behind them.
const BLACK_HOLE_POSITION = { x: toWorld(0), y: toWorld(0) };
/** How much of the map's pan the black hole ignores, for a hint of depth. */
const BLACK_HOLE_PARALLAX = 0.06;
/** It never drifts further than this from the centre node, in world pixels. */
const BLACK_HOLE_MAX_DRIFT = 12;

// Precomputed once at module scope, since node positions are static.
const NODE_CONNECTIONS = NODE_DEFINITIONS.flatMap((node) =>
  node.connections
    .filter((path) => node.path < path)
    .map((path) => {
      const target = NODES_BY_PATH.get(path)!;
      const key = `${node.path}-${path}`;
      const x1 = toWorld(node.x);
      const y1 = toWorld(node.y);
      const x2 = toWorld(target.x);
      const y2 = toWorld(target.y);
      // Two nodes on the same arm are a strand of that arm, drawn heavier.
      const onArm = node.arm !== null && node.arm === target.arm;
      return {
        key,
        node,
        target,
        onArm,
        path: `M${x1},${y1} L${x2},${y2}`,
      };
    }),
);

type Props = {
  selectedPath: string;
  ready: boolean;
  onSelectNode: (node: NodeDefinition) => void;
  wonPaths: ReadonlySet<string>;
  collectedTaoIds: ReadonlySet<number>;
  collectedQuoteIds: ReadonlySet<number>;
  /** False while the rare UFO shouldn't spawn yet (too soon, or on cooldown
   * until more collectibles are owned). */
  ufoGateOpen: boolean;
  onUfoCaught: () => void;
};

const NodeLabels = memo(function NodeLabels({
  nodeStates,
  scale,
}: {
  nodeStates: ReadonlyMap<string, NodeVisualState>;
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
      {NODE_DEFINITIONS.map((node) => {
        const state = nodeStates.get(node.path)!;
        const dotSize = NODE_SIZE * STATE_SIZE_MULTIPLIER[state];
        return (
          <Text
            key={node.path}
            style={{
              position: "absolute",
              left: toWorld(node.x) - LABEL.maxWidth / 2,
              top: toWorld(node.y) + dotSize / 2 + LABEL.gap,
              width: LABEL.maxWidth,
              textAlign: "center",
              fontSize: LABEL.fontSize,
              letterSpacing: LABEL.letterSpacing,
              color: rgba(paleFor(state), LABEL_OPACITY[state]),
              textTransform: "uppercase",
              // Names cross the arm glow and the links, so they carry their
              // own dark backing rather than relying on what is behind them.
              ...textShadow(rgba(Colors.black, 0.9), 3, {
                width: 0,
                height: 1,
              }),
            }}
          >
            {localizeGameTitle(GAMES_DATA[node.path], node.path, language)}
          </Text>
        );
      })}
    </Animated.View>
  );
});

const NodeConnections = memo(function NodeConnections({
  nodeStates,
}: {
  nodeStates: ReadonlyMap<string, NodeVisualState>;
}) {
  return (
    <Svg
      width={WORLD_SIZE}
      height={WORLD_SIZE}
      style={{ position: "absolute" }}
    >
      {NODE_CONNECTIONS.map(({ key, node, target, onArm, path }) => {
        const nodeState = nodeStates.get(node.path)!;
        const targetState = nodeStates.get(target.path)!;
        const locked = nodeState === "locked" || targetState === "locked";
        const strokeColor = locked
          ? LOCKED_LINE_COLOR
          : nodeState === "complete" && targetState === "complete"
            ? STATE_COLORS.complete
            : nodeState === "connected" || targetState === "connected"
              ? STATE_COLORS.connected
              : STATE_COLORS.won;

        return (
          <Path
            key={key}
            d={path}
            fill="none"
            stroke={rgba(strokeColor, locked ? 0.55 : 0.85)}
            strokeWidth={
              LINE_WIDTH[onArm ? "arm" : "bridge"] *
              (locked ? LOCKED_LINE_SCALE : 1)
            }
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
});

const AnimatedPressable = RNAnimated.createAnimatedComponent(Pressable);

type TwinkleTiming = ReturnType<typeof getTwinkleTiming>;

function NativeTwinklingNode({
  style,
  title,
  state,
  onPress,
  twinkle,
}: {
  style: Record<string, unknown>;
  title: string;
  state: NodeVisualState;
  onPress: () => void;
  twinkle: TwinkleTiming;
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
    />
  );
}

function TwinklingNode(props: {
  style: Record<string, unknown>;
  title: string;
  state: NodeVisualState;
  onPress: () => void;
  twinkle: TwinkleTiming;
}) {
  if (Platform.OS === "web") {
    const webTwinkleStyle = {
      animationName: "nodes-node-pulse",
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

  return <NativeTwinklingNode {...props} />;
}

const MapNode = memo(function MapNode({
  node,
  state,
  selected,
  animationsEnabled,
  onSelectNode,
}: {
  node: NodeDefinition;
  state: NodeVisualState;
  selected: boolean;
  animationsEnabled: boolean;
  onSelectNode: (node: NodeDefinition) => void;
}) {
  const dotSize = NODE_SIZE * STATE_SIZE_MULTIPLIER[state];
  const game = GAMES_DATA[node.path];
  const title = localizeGameTitle(game, node.path, useDisplayLanguage());
  const color = STATE_COLORS[state];
  const glow = NODE_GLOW[state];

  const selectionRing = selected
    ? `0 0 0 2px ${rgba(Colors.black, 0.85)}, 0 0 0 5px ${rgba(Colors.white, 0.9)}, 0 0 0 7px ${rgba(color, 0.9)}, `
    : "";
  const halo = `0 0 ${glow.blur}px ${glow.spread}px ${rgba(color, glow.opacity)}, 0 0 ${glow.blur * 2.2}px ${glow.spread}px ${rgba(color, glow.opacity * 0.35)}`;
  const glint = `inset 0 1px 2px ${rgba(Colors.white, state === "locked" ? 0.2 : 0.55)}, `;
  const shade = `inset -1px -2px 3px -1px ${rgba(game.gameColorDark, 0.55)}`;

  const style = {
    position: "absolute",
    outline: "none",
    // Native taps are handled by the map's tap gesture (see NodesMap).
    pointerEvents: Platform.OS === "web" ? "auto" : "none",
    left: (node.x + 1) * WORLD_SIZE * 0.5 - dotSize / 2,
    top: (node.y + 1) * WORLD_SIZE * 0.5 - dotSize / 2,
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: color,
    boxShadow: `${selectionRing}${glint}${halo}, ${shade}`,
  } as const;

  const twinkle = getTwinkleTiming(node.path);
  if (state === "connected" && animationsEnabled && twinkle.enabled) {
    return (
      <TwinklingNode
        style={style}
        title={title}
        state={state}
        onPress={() => onSelectNode(node)}
        twinkle={twinkle}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${state}`}
      onPress={() => onSelectNode(node)}
      style={style}
    />
  );
});

export function NodesMap({
  selectedPath,
  ready,
  onSelectNode,
  wonPaths,
  collectedTaoIds,
  collectedQuoteIds,
  ufoGateOpen,
  onUfoCaught,
}: Props) {
  const { settings } = useGlobalSettings();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const worldOpacity = useSharedValue(0);
  const containerRef = useRef<View>(null);
  const hasCenteredInitialNode = useRef(false);
  const unlockedPaths = useMemo(
    () => getUnlockedNodePaths(wonPaths),
    [wonPaths],
  );
  const nodeStates = useMemo(
    () =>
      new Map(
        NODE_DEFINITIONS.map((node) => [
          node.path,
          getNodeVisualState(
            node,
            wonPaths,
            collectedTaoIds,
            collectedQuoteIds,
            unlockedPaths,
          ),
        ]),
      ),
    [collectedQuoteIds, collectedTaoIds, unlockedPaths, wonPaths],
  );

  const centerNode = (node: NodeDefinition, animated = true) => {
    const nextX = -node.x * WORLD_SIZE * 0.5 * scale.value;
    const nextY = -node.y * WORLD_SIZE * 0.5 * scale.value;
    translateX.value = animated ? withTiming(nextX, { duration: 350 }) : nextX;
    translateY.value = animated ? withTiming(nextY, { duration: 350 }) : nextY;
  };

  useEffect(() => {
    const node = NODE_DEFINITIONS.find((entry) => entry.path === selectedPath);
    if (!ready || !node || viewport.width <= 0) return;

    if (hasCenteredInitialNode.current) {
      centerNode(node);
      return;
    }

    centerNode(node, false);
    hasCenteredInitialNode.current = true;
    worldOpacity.value = settings.showAnimations
      ? withTiming(1, { duration: 250 })
      : 1;
  }, [
    ready,
    selectedPath,
    settings.showAnimations,
    viewport.width,
    worldOpacity,
  ]);

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
        -NODE_EXTENT_X * nextScale,
        Math.min(NODE_EXTENT_X * nextScale, translateX.value),
      );
      translateY.value = Math.max(
        -NODE_EXTENT_Y * nextScale,
        Math.min(NODE_EXTENT_Y * nextScale, translateY.value),
      );
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [scale, translateX, translateY]);

  // A tap selects the nearest node to the tap point. Per-node Pressables miss
  // taps after transformed map movement on native, while Safari can cancel
  // their click inside the map's pan/pinch detector. Web keeps the Pressables
  // for keyboard and accessibility input, with this gesture as touch fallback.
  const selectNodeAt = (x: number, y: number) => {
    const s = scale.value;
    const localX =
      (x - viewport.width / 2 - translateX.value) / s + WORLD_SIZE / 2;
    const localY =
      (y - viewport.height / 2 - translateY.value) / s + WORLD_SIZE / 2;


    let nearest: NodeDefinition | undefined;
    let nearestDistance = Infinity;
    for (const node of NODE_DEFINITIONS) {
      const distance = Math.hypot(
        ((node.x + 1) * WORLD_SIZE * 0.5 - localX) * s,
        ((node.y + 1) * WORLD_SIZE * 0.5 - localY) * s,
      );
      if (distance < nearestDistance) {
        nearest = node;
        nearestDistance = distance;
      }
    }

    if (nearest && nearestDistance <= NODE_TAP_RADIUS) onSelectNode(nearest);
  };
  const selectNodeAtRef = useRef(selectNodeAt);
  selectNodeAtRef.current = selectNodeAt;

  const cameraGesture = useMemo(() => {
    const handleTap = (x: number, y: number) => selectNodeAtRef.current(x, y);

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
        const limitX = NODE_EXTENT_X * scale.value;
        const limitY = NODE_EXTENT_Y * scale.value;
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
          -NODE_EXTENT_X * nextScale,
          Math.min(NODE_EXTENT_X * nextScale, translateX.value),
        );
        translateY.value = Math.max(
          -NODE_EXTENT_Y * nextScale,
          Math.min(NODE_EXTENT_Y * nextScale, translateY.value),
        );
      });
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [scale, startScale, startX, startY, translateX, translateY]);

  const worldStyle = useAnimatedStyle(() => ({
    opacity: worldOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));
  // A touch of depth: the black hole lags the map very slightly as it pans, as
  // though it sits further away. Clamped hard so it never wanders out from
  // under the centre node it belongs to.
  const blackHoleStyle = useAnimatedStyle(() => {
    const drift = (value: number) => {
      const lag = (-value * BLACK_HOLE_PARALLAX) / scale.value;
      return Math.max(-BLACK_HOLE_MAX_DRIFT, Math.min(BLACK_HOLE_MAX_DRIFT, lag));
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
      <NodesBackground
        animationsEnabled={settings.showAnimations}
        ufoEnabled={settings.showAnimations && ufoGateOpen}
        onUfoCaught={onUfoCaught}
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
          {/* Rendered first (and thus behind connections and nodes): a
              node or line drawn on top of it should never be obscured. */}
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
            <NodesBlackHole animationsEnabled={settings.showAnimations} />
          </Animated.View>

          <ArmArtwork />

          <NodeConnections nodeStates={nodeStates} />

          {NODE_DEFINITIONS.map((node) => {
            return (
              <MapNode
                key={node.path}
                node={node}
                state={nodeStates.get(node.path)!}
                selected={selectedPath === node.path}
                animationsEnabled={settings.showAnimations}
                onSelectNode={onSelectNode}
              />
            );
          })}

          <NodeLabels nodeStates={nodeStates} scale={scale} />
        </Animated.View>
      </NodesBackground>
    </GestureDetector>
  );
}
