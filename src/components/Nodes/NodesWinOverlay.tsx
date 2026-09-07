import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { Quote } from "@/components/Nodes/QuotesCollection";
import { TaoChapter } from "@/components/Nodes/TaoChapters";
import {
  getQuote,
  getQuoteCard,
  getTaoChapter,
  type CollectibleReward,
} from "@/data/collectibles";
import { GAMES_DATA } from "@/data/games-registry";
import { getNodeDefinition, getNodeVisualState } from "@/data/nodes-map";
import type { NodesWinResult } from "@/data/nodes-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { Colors, rgba } from "@/styles/styles";
import { Pressable, ScrollView, View } from "react-native";

type NodesWinOverlayProps = {
  path: string;
  result: NodesWinResult;
  onClose: () => void;
};

function isRewardEarned(reward: CollectibleReward, result: NodesWinResult) {
  const earned =
    reward.type === "tao"
      ? result.progress.collectedTaoIds.includes(reward.id)
      : result.progress.collectedQuoteIds.includes(reward.id);
  return earned;
}

export function NodesWinOverlay({
  path,
  result,
  onClose,
}: NodesWinOverlayProps) {
  const { spacing, ui } = useResponsiveMetrics();
  const node = getNodeDefinition(path);
  const reward = result.awardedReward;
  if (!node) return null;

  const wonPaths = new Set(Object.keys(result.progress.winsByPath));
  const nodeState = getNodeVisualState(
    node,
    wonPaths,
    new Set(result.progress.collectedTaoIds),
    new Set(result.progress.collectedQuoteIds),
  );
  const quote = reward?.type === "quote" ? getQuote(reward.id) : undefined;
  const quoteCard =
    reward?.type === "quote" ? getQuoteCard(reward.id) : undefined;
  const chapter = reward?.type === "tao" ? getTaoChapter(reward.id) : undefined;
  const game = GAMES_DATA[path];

  return (
    <View
      style={{
        position: "absolute",
        zIndex: 70,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing(20),
        pointerEvents: "box-none",
      }}
    >
      <Pressable
        accessibilityLabel="Dismiss collectible notification"
        onPress={onClose}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: rgba(Colors.background, 0.85),
        }}
      />
      <View
        style={{
          zIndex: 1,
          width: "100%",
          maxWidth: ui.contentMaxWidth - spacing(24),
          maxHeight: "85%",
          padding: spacing(20),
          gap: spacing(14),
          borderRadius: spacing(12),
          backgroundColor: rgba(Colors.K900, 0.97),
          boxShadow: `0 0 ${spacing(20)}px ${rgba(Colors.black, 0.55)}`,
        }}
      >
        <Button
          accessibilityLabel="Dismiss collectible notification"
          iconName="close"
          size="sm"
          theme="transparent"
          onPress={onClose}
          style={{
            position: "absolute",
            zIndex: 1,
            top: spacing(8),
            right: spacing(8),
            width: spacing(36),
            paddingHorizontal: 0,
            boxShadow: "unset",
          }}
        />

        <Text size="lg" weight={500} color={game.gameColorPale}>
          {reward ? "New collectible earned!" : "New nodes unlocked!"}
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: spacing(8),
            flexWrap: "wrap",
          }}
        >
          {node.rewards.map((nodeReward) => {
            const isNewReward =
              reward?.type === nodeReward.type && reward.id === nodeReward.id;
            const icon = (
              <Icon
                name={nodeReward.type === "tao" ? "tao" : "quote"}
                size={spacing(24)}
                color={
                  isRewardEarned(nodeReward, result)
                    ? game.gameColorPale
                    : rgba(game.gameColorPale, 0.2)
                }
              />
            );

            return (
              <View
                key={`${nodeReward.type}-${nodeReward.id}`}
                style={{
                  width: spacing(36),
                  height: spacing(36),
                  borderRadius: spacing(18),
                  borderWidth: isNewReward ? spacing(2) : 0,
                  borderColor: isNewReward ? game.gameColorPale : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </View>
            );
          })}
        </View>

        <ScrollView style={{ flexGrow: 0 }}>
          {/* Unlocked quote */}
          {quote && <Quote quote={quote} card={quoteCard} showCard />}

          {/* Unlocked chapter */}
          {chapter && reward?.type === "tao" && (
            <TaoChapter chapter={chapter} chapterNumber={reward.id} />
          )}
        </ScrollView>

        {/* Unlocked games */}
        {result.newlyUnlockedPaths.length > 0 && (
          <View
            style={{
              gap: spacing(4),
              borderTopWidth: spacing(1),
              borderTopColor: rgba(game.gameColorPale, 0.2),
              paddingTop: spacing(20),
            }}
          >
            <Text size="md" weight={500} color={game.gameColorPale}>
              Unlocked game{result.newlyUnlockedPaths.length > 1 ? "s" : ""}:{" "}
              <Text size="md" color={Colors.K400}>
                {result.newlyUnlockedPaths
                  .map((unlockedPath) => GAMES_DATA[unlockedPath].title)
                  .join(", ")}
              </Text>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
