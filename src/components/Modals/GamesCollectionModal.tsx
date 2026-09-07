import { Text } from "@/components/common/Text";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { getNodeDefinition, getUnlockedNodePaths } from "@/data/nodes-map";
import { useNodesProgress } from "@/hooks/useNodesProgress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon } from "@/icons";
import { Colors, rgba } from "@/styles/styles";
import { ScrollView, View } from "react-native";
import ModalFull from "./ModalFull";

type Props = {
  onClose: () => void;
};

const SORTED_GAMES = [...GAME_DEFINITIONS].sort((a, b) =>
  a.title.localeCompare(b.title),
);

export function GamesCollectionModal({ onClose }: Props) {
  const { spacing } = useResponsiveMetrics();
  const { wonPaths, collectedTaoIds, collectedQuoteIds } = useNodesProgress();
  const unlockedPaths = getUnlockedNodePaths(wonPaths);
  const unlockedGameCount = SORTED_GAMES.filter((game) =>
    unlockedPaths.has(game.path),
  ).length;

  return (
    <ModalFull
      title="Games"
      subtitle={`${unlockedGameCount}/${SORTED_GAMES.length} unlocked games`}
      iconName="trophy"
      onClose={onClose}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: spacing(24),
          paddingTop: spacing(12),
          paddingBottom: spacing(32),
          gap: spacing(8),
        }}
      >
        {SORTED_GAMES.map((game) => {
          const node = getNodeDefinition(game.path);
          const unlocked = unlockedPaths.has(game.path);

          return (
            <View
              key={game.path}
              style={{
                minHeight: spacing(48),
                flexDirection: "row",
                alignItems: "center",
                gap: spacing(12),
                paddingHorizontal: spacing(14),
                borderRadius: spacing(10),
                backgroundColor: unlocked ? rgba(Colors.K950, 0.55) : undefined,
              }}
            >
              <Text
                size="md"
                weight={400}
                color={unlocked ? game.gameColorPale : Colors.K700}
                style={{ flex: 1 }}
              >
                {game.title}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  gap: spacing(8),
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                {node?.rewards.map((reward) => {
                  const collected =
                    reward.type === "tao"
                      ? collectedTaoIds.has(reward.id)
                      : collectedQuoteIds.has(reward.id);
                  return (
                    <Icon
                      key={`${reward.type}-${reward.id}`}
                      name={reward.type === "tao" ? "tao" : "quote"}
                      size={24}
                      color={
                        collected
                          ? game.gameColorPale
                          : rgba(game.gameColorPale, 0.2)
                      }
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ModalFull>
  );
}
