import { Text } from "@/components/common/Text";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { getNodeDefinition, getUnlockedNodePaths } from "@/data/nodes-map";
import { useNodesProgress } from "@/hooks/useNodesProgress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { Icon } from "@/icons";
import { Colors, rgba } from "@/styles/styles";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import ModalFull from "./ModalFull";

type Props = {
  onClose: () => void;
};

export function GamesCollectionModal({ onClose }: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("nodes");
  const language = useDisplayLanguage();
  const { wonPaths, collectedTaoIds, collectedQuoteIds } = useNodesProgress();
  const unlockedPaths = getUnlockedNodePaths(wonPaths);
  const sortedGames = useMemo(
    () =>
      GAME_DEFINITIONS.map((game) => ({
        ...game,
        title: localizeGameTitle(game, game.path, language),
      })).sort((a, b) => a.title.localeCompare(b.title, language)),
    [language],
  );
  const unlockedGameCount = sortedGames.filter((game) =>
    unlockedPaths.has(game.path),
  ).length;

  return (
    <ModalFull
      title={t("games.title")}
      subtitle={t("games.subtitle", {
        unlocked: unlockedGameCount,
        total: sortedGames.length,
      })}
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
        {sortedGames.map((game) => {
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
