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
import { grantMercySkip } from "@/data/nodes-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
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
  const { t } = useTranslation("nodes");
  const {
    progress,
    isLoading,
    wonPaths,
    unlockedPaths,
    collectedTaoIds,
    collectedQuoteIds,
  } = useNodesProgress();
  const [selectedPath, setSelectedPath] = useState(NODES_START_PATH);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showTao, setShowTao] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showGames, setShowGames] = useState(false);
  // The rare UFO stays hidden for the first stretch on the map each visit,
  // so it never appears the instant the tab opens.
  const [onMapLongEnough, setOnMapLongEnough] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setSelectedPath(progress.lastPlayedPath);
    setIsMapReady(true);
  }, [isLoading, progress.lastPlayedPath]);

  useEffect(() => {
    const timer = setTimeout(() => setOnMapLongEnough(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const totalCollectibles = collectedTaoIds.size + collectedQuoteIds.size;
  const ufoGateOpen =
    onMapLongEnough &&
    // Nothing to offer someone who is still holding a skip.
    progress.mercySkipCount === 0 &&
    (progress.mercySkipCollectibleCheckpoint === null ||
      totalCollectibles >= progress.mercySkipCollectibleCheckpoint + 4);
  const handleUfoCaught = useCallback(() => {
    void grantMercySkip();
  }, []);

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
            label={t("progress.games")}
            iconName="trophy"
            progress={unlockedNodeCount / NODE_DEFINITIONS.length}
            accessibilityLabel={t("progress.summary", {
              label: t("progress.games"),
              collected: unlockedNodeCount,
              total: NODE_DEFINITIONS.length,
            })}
            onPress={() => setShowGames(true)}
          />
          <NodesProgressItem
            label={t("progress.chapters")}
            iconName="tao"
            progress={collectedTaoIds.size / TAO_CHAPTER_COUNT}
            accessibilityLabel={t("progress.summary", {
              label: t("progress.chapters"),
              collected: collectedTaoIds.size,
              total: TAO_CHAPTER_COUNT,
            })}
            onPress={() => setShowTao(true)}
          />
          <NodesProgressItem
            label={t("progress.quotes")}
            iconName="quote"
            progress={collectedQuoteIds.size / QUOTE_COUNT}
            accessibilityLabel={t("progress.summary", {
              label: t("progress.quotes"),
              collected: collectedQuoteIds.size,
              total: QUOTE_COUNT,
            })}
            onPress={() => setShowQuotes(true)}
          />
        </View>
      </View>

      <NodesMap
        selectedPath={selectedNode.path}
        ready={isMapReady}
        onSelectNode={selectNode}
        wonPaths={wonPaths}
        collectedTaoIds={collectedTaoIds}
        collectedQuoteIds={collectedQuoteIds}
        ufoGateOpen={ufoGateOpen}
        onUfoCaught={handleUfoCaught}
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
