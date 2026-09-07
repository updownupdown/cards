import { GAMES_DATA } from "@/data/games-registry";
import { NodesBackground } from "@/components/Nodes/NodesBackground";
import {
  getNodeVisualState,
  NODE_DEFINITIONS,
  type NodeDefinition,
} from "@/data/nodes-map";
import { Colors, rgba } from "@/styles/styles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

const WORLD_SIZE = 920;
const NODE_SIZE = 18;
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

  const pan = Gesture.Pan()
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
  const cameraGesture = Gesture.Simultaneous(pan, pinch);

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
          <Svg
            width={WORLD_SIZE}
            height={WORLD_SIZE}
            style={{ position: "absolute" }}
          >
            {NODE_DEFINITIONS.flatMap((node) =>
              node.connections
                .filter((path) => node.path < path)
                .map((path) => {
                  const target = NODE_DEFINITIONS.find(
                    (entry) => entry.path === path,
                  )!;
                  const nodeState = getNodeVisualState(
                    node,
                    wonPaths,
                    collectedTaoIds,
                    collectedQuoteIds,
                  );
                  const targetState = getNodeVisualState(
                    target,
                    wonPaths,
                    collectedTaoIds,
                    collectedQuoteIds,
                  );
                  const strokeColor =
                    nodeState === "locked" || targetState === "locked"
                      ? Colors.K800
                      : nodeState === "complete" && targetState === "complete"
                        ? Colors.cardSelectGreen
                        : nodeState === "connected" ||
                            targetState === "connected"
                          ? Colors.cardSelectPurple
                          : Colors.accentBlue;
                  return (
                    <Line
                      key={`${node.path}-${path}`}
                      x1={(node.x + 1) * WORLD_SIZE * 0.5}
                      y1={(node.y + 1) * WORLD_SIZE * 0.5}
                      x2={(target.x + 1) * WORLD_SIZE * 0.5}
                      y2={(target.y + 1) * WORLD_SIZE * 0.5}
                      stroke={rgba(strokeColor, 0.7)}
                      strokeWidth={1.5}
                    />
                  );
                }),
            )}
          </Svg>

          {NODE_DEFINITIONS.map((node) => {
            const state = getNodeVisualState(
              node,
              wonPaths,
              collectedTaoIds,
              collectedQuoteIds,
            );
            const selected = selectedPath === node.path;
            const sizeMultiplier = getNodeSizeMultiplier(node.path);
            const dotSize =
              NODE_SIZE * sizeMultiplier * (state === "locked" ? 0.65 : 1);
            const glowColor = rgba(STATE_COLORS[state], 0.8);
            const selectionShadow = selected
              ? `0 0 0 2px ${GAMES_DATA[node.path].gameColorMid}, 0 0 0 6px ${GAMES_DATA[node.path].gameColorPale}, `
              : `0 0 4px 2px ${GAMES_DATA[node.path].gameColorDark}, `;

            return (
              <Pressable
                key={node.path}
                accessibilityRole="button"
                accessibilityLabel={`${GAMES_DATA[node.path].title}, ${state}`}
                onPress={() => {
                  onSelectNode(node);
                }}
                style={{
                  position: "absolute",
                  outline: "none",
                  left: (node.x + 1) * WORLD_SIZE * 0.5 - dotSize / 2,
                  top: (node.y + 1) * WORLD_SIZE * 0.5 - dotSize / 2,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: STATE_COLORS[state],
                  boxShadow: `${selectionShadow}0 0 12px ${glowColor}, inset 0 1px 6px ${rgba(GAMES_DATA[node.path].gameColorPale, 0.6)}, inset -1px -2px 6px -2px ${rgba(GAMES_DATA[node.path].gameColorDark, 0.8)}`,
                }}
              />
            );
          })}
        </Animated.View>
      </NodesBackground>
    </GestureDetector>
  );
}
