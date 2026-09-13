import { QuotesCollectionModal } from "@/components/Modals/QuotesCollectionModal";
import { TaoCollectionModal } from "@/components/Modals/TaoCollectionModal";
import { GamesCollectionModal } from "@/components/Modals/GamesCollectionModal";
import { QUOTE_COUNT, TAO_CHAPTER_COUNT } from "@/data/collectibles";
import type { GameSettingsMap } from "@/data/game-menu";
import {
  getNodeDefinition,
  getNodeVisualState,
  NODE_DEFINITIONS,
  NODES_START_PATH,
  type NodeDefinition,
} from "@/data/nodes-map";
import { useNodesProgress } from "@/hooks/useNodesProgress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors } from "@/styles/styles";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { NodeDetailsPanel } from "./NodeDetailsPanel";
import { NodesMap } from "./NodesMap";
import { NodesProgressItem } from "./NodesProgressItem";
import { flexStyles } from "@/styles/flexStyles";

type Props = {
  settingsMap: GameSettingsMap;
  contentPaddingTop: number;
};

export function NodesTab({ settingsMap, contentPaddingTop }: Props) {
  const { spacing, ui } = useResponsiveMetrics();
  const {
    progress,
    wonPaths,
    unlockedPaths,
    collectedTaoIds,
    collectedQuoteIds,
  } = useNodesProgress();
  const [selectedPath, setSelectedPath] = useState(NODES_START_PATH);
  const [showTao, setShowTao] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showGames, setShowGames] = useState(false);

  useEffect(() => {
    setSelectedPath(progress.lastPlayedPath);
  }, [progress.lastPlayedPath]);

  const selectedNode =
    getNodeDefinition(selectedPath) ?? getNodeDefinition(NODES_START_PATH)!;
  const state = getNodeVisualState(
    selectedNode,
    wonPaths,
    collectedTaoIds,
    collectedQuoteIds,
    unlockedPaths,
  );
  const unlockedNodeCount = unlockedPaths.size;
  const selectNode = useCallback((node: NodeDefinition) => {
    setSelectedPath(node.path);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.K950,
      }}
    >
      {showTao && (
        <TaoCollectionModal
          collectedIds={collectedTaoIds}
          onClose={() => setShowTao(false)}
        />
      )}
      {showQuotes && (
        <QuotesCollectionModal
          collectedIds={collectedQuoteIds}
          onClose={() => setShowQuotes(false)}
        />
      )}
      {showGames && (
        <GamesCollectionModal onClose={() => setShowGames(false)} />
      )}

      <View
        style={[
          flexStyles.rowCentered,
          {
            position: "absolute",
            zIndex: 5,
            top: contentPaddingTop,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            pointerEvents: "box-none",
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              gap: spacing(14),
              paddingHorizontal: spacing(12),
              pointerEvents: "box-none",
              width: "100%",
              maxWidth: ui.contentMaxWidth,
            },
          ]}
        >
          <NodesProgressItem
            label="Games"
            iconName="trophy"
            progress={unlockedNodeCount / NODE_DEFINITIONS.length}
            accessibilityLabel={`Games ${unlockedNodeCount} of ${NODE_DEFINITIONS.length}`}
            onPress={() => setShowGames(true)}
          />
          <NodesProgressItem
            label="Chapters"
            iconName="tao"
            progress={collectedTaoIds.size / TAO_CHAPTER_COUNT}
            accessibilityLabel={`Chapters ${collectedTaoIds.size} of ${TAO_CHAPTER_COUNT}`}
            onPress={() => setShowTao(true)}
          />
          <NodesProgressItem
            label="Quotes"
            iconName="quote"
            progress={collectedQuoteIds.size / QUOTE_COUNT}
            accessibilityLabel={`Quotes ${collectedQuoteIds.size} of ${QUOTE_COUNT}`}
            onPress={() => setShowQuotes(true)}
          />
        </View>
      </View>

      <NodesMap
        selectedPath={selectedNode.path}
        onSelectNode={selectNode}
        wonPaths={wonPaths}
        collectedTaoIds={collectedTaoIds}
        collectedQuoteIds={collectedQuoteIds}
      />
      <NodeDetailsPanel
        node={selectedNode}
        state={state}
        settingsMap={settingsMap}
        collectedTaoIds={collectedTaoIds}
        collectedQuoteIds={collectedQuoteIds}
      />
    </View>
  );
}
