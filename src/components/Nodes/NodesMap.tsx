import { GAMES_DATA } from "@/data/games-registry";
import { NodesBackground } from "@/components/Nodes/NodesBackground";
import {
  getNodeVisualState,
  getUnlockedNodePaths,
  NODES_BY_PATH,
  NODE_DEFINITIONS,
  type NodeDefinition,
  type NodeVisualState,
} from "@/data/nodes-map";
import { Colors, rgba } from "@/styles/styles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

const WORLD_SIZE = 920;
const NODE_SIZE = 18;
/** How close (in screen points) a native tap must be to select a node. */
const NODE_TAP_RADIUS = 28;
const MIN_NODE_SIZE_MULTIPLIER = 0.6;
const MAX_NODE_SIZE_MULTIPLIER = 1.4;

const MIN_SCALE = 0.65;
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
const STATE_COLORS = {
  locked: Colors.K800,
  connected: Colors.cardSelectPurple,
  won: Colors.cardSelectBlue,
  complete: Colors.cardSelectGreen,
} as const;

const NODE_CONNECTIONS = NODE_DEFINITIONS.flatMap((node) =>
  node.connections
    .filter((path) => node.path < path)
    .map((path) => ({
      key: `${node.path}-${path}`,
      node,
      target: NODES_BY_PATH.get(path)!,
    })),
);

function getNodeSizeMultiplier(path: string) {
  let hash = 2166136261;
  for (let index = 0; index < path.length; index += 1) {
    hash ^= path.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const normalizedHash = (hash >>> 0) / 0xffffffff;
  return (
    MIN_NODE_SIZE_MULTIPLIER +
    normalizedHash * (MAX_NODE_SIZE_MULTIPLIER - MIN_NODE_SIZE_MULTIPLIER)
  );
}

type Props = {
  selectedPath: string;
  onSelectNode: (node: NodeDefinition) => void;
  wonPaths: ReadonlySet<string>;
  collectedTaoIds: ReadonlySet<number>;
  collectedQuoteIds: ReadonlySet<number>;
};

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
      {NODE_CONNECTIONS.map(({ key, node, target }) => {
        const nodeState = nodeStates.get(node.path)!;
        const targetState = nodeStates.get(target.path)!;
        const strokeColor =
          nodeState === "locked" || targetState === "locked"
            ? Colors.K800
            : nodeState === "complete" && targetState === "complete"
              ? Colors.cardSelectGreen
              : nodeState === "connected" || targetState === "connected"
                ? Colors.cardSelectPurple
                : Colors.accentBlue;

        return (
          <Line
            key={key}
            x1={(node.x + 1) * WORLD_SIZE * 0.5}
            y1={(node.y + 1) * WORLD_SIZE * 0.5}
            x2={(target.x + 1) * WORLD_SIZE * 0.5}
            y2={(target.y + 1) * WORLD_SIZE * 0.5}
            stroke={rgba(strokeColor, 0.7)}
            strokeWidth={1.5}
          />
        );
      })}
    </Svg>
  );
});

const MapNode = memo(function MapNode({
  node,
  state,
  selected,
  onSelectNode,
}: {
  node: NodeDefinition;
  state: NodeVisualState;
  selected: boolean;
  onSelectNode: (node: NodeDefinition) => void;
}) {
  const sizeMultiplier = getNodeSizeMultiplier(node.path);
  const dotSize = NODE_SIZE * sizeMultiplier * (state === "locked" ? 0.65 : 1);
  const glowColor = rgba(STATE_COLORS[state], 0.8);
  const game = GAMES_DATA[node.path];
  const selectionShadow = selected
    ? `0 0 0 2px ${game.gameColorMid}, 0 0 0 6px ${game.gameColorPale}, `
    : `0 0 4px 2px ${game.gameColorDark}, `;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.title}, ${state}`}
      onPress={() => onSelectNode(node)}
      style={{
        position: "absolute",
        outline: "none",
        // Native taps are handled by the map's tap gesture (see NodesMap).
        pointerEvents: Platform.OS === "web" ? "auto" : "none",
        left: (node.x + 1) * WORLD_SIZE * 0.5 - dotSize / 2,
        top: (node.y + 1) * WORLD_SIZE * 0.5 - dotSize / 2,
        width: dotSize,
        height: dotSize,
        borderRadius: dotSize / 2,
        backgroundColor: STATE_COLORS[state],
        boxShadow: `${selectionShadow}0 0 12px ${glowColor}, inset 0 1px 6px ${rgba(game.gameColorPale, 0.6)}, inset -1px -2px 6px -2px ${rgba(game.gameColorDark, 0.8)}`,
      }}
    />
  );
});

export function NodesMap({
  selectedPath,
  onSelectNode,
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
    if (!node || viewport.width <= 0) return;

    centerNode(node, hasCenteredInitialNode.current);
    hasCenteredInitialNode.current = true;
  }, [selectedPath, viewport.width]);

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

  // Native: a tap selects the nearest node to the tap point. Per-node
  // Pressables missed most taps there: the dots are small, and the map moves
  // by transforms that Reanimated applies outside the shadow tree, which
  // Fabric's press handling doesn't see. Web keeps the node Pressables.
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
      .enabled(Platform.OS !== "web")
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
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  return (
    <GestureDetector gesture={cameraGesture}>
      <NodesBackground
        selectedPath={selectedPath}
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
          <NodeConnections nodeStates={nodeStates} />

          {NODE_DEFINITIONS.map((node) => {
            return (
              <MapNode
                key={node.path}
                node={node}
                state={nodeStates.get(node.path)!}
                selected={selectedPath === node.path}
                onSelectNode={onSelectNode}
              />
            );
          })}
        </Animated.View>
      </NodesBackground>
    </GestureDetector>
  );
}
