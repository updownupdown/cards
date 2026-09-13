import { Text } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import type { GameSettingsMap } from "@/data/game-menu";
import { GameTag, GameTagNames } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Icon } from "@/icons";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { HomeCardSizeControl, type HomeCardSize } from "./HomeCardSizeControl";
import { flexStyles } from "@/styles/flexStyles";

export const COLLECT_TAGS: { tag: GameTag; color: string }[] = [
  { tag: GameTag.EasyToLearn, color: "#9df3af" },
  { tag: GameTag.ModernMechanics, color: "#a7bbc9" },
  { tag: GameTag.CardCombat, color: "#fa7b7b" },
  { tag: GameTag.DungeonCrawler, color: "#ecaf69" },
  { tag: GameTag.GridPlacement, color: "#e39dff" },
  { tag: GameTag.PairMatching, color: "#b5f18c" },
  { tag: GameTag.SpatialControl, color: "#8fe7be" },
  { tag: GameTag.TableauBuilding, color: "#f589b6" },
  { tag: GameTag.StockAndWaste, color: "#c1a1d3" },
  { tag: GameTag.ScoringPuzzles, color: "#daf58f" },
  { tag: GameTag.SequenceBuilding, color: "#a1e7dc" },
  { tag: GameTag.PokerAndCribbage, color: "#f5c781" },
];

type CollectTabProps = {
  allEnabledGames: HomeGameEntry[];
  settingsMap: GameSettingsMap;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  cardSize: HomeCardSize;
  onCardSizeChange: (size: HomeCardSize) => void;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

export function CollectTab({
  allEnabledGames,
  settingsMap,
  favorites,
  onToggleFavorite,
  cardSize,
  onCardSizeChange,
  contentPaddingTop,
  contentPaddingBottom,
}: CollectTabProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const { width: viewportWidth } = useViewportDimensions();
  const [openTags, setOpenTags] = useState<Set<GameTag>>(new Set());
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const contentWidth = Math.min(ui.contentMaxWidth, viewportWidth);
  const cardGap = spacing(12);
  const mediumCardWidth: `${number}%` = ui.isTablet ? "31.5%" : "48.5%";

  const gamesByTag = useMemo(
    () =>
      new Map(
        COLLECT_TAGS.map(({ tag }) => [
          tag,
          allEnabledGames.filter(([, game]) => game.tags[0] === tag),
        ]),
      ),
    [allEnabledGames],
  );

  const toggleTag = (tag: GameTag) => {
    setOpenTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        paddingHorizontal: pageSidePadding,
        gap: spacing(12),
      }}
      showsVerticalScrollIndicator={false}
    >
      <HomeCardSizeControl
        contentWidth={contentWidth}
        value={cardSize}
        onChange={onCardSizeChange}
      />

      <View
        style={[
          flexStyles.colCentered,
          flexStyles.fullWidth,
          { gap: spacing(12), paddingVertical: spacing(24) },
        ]}
      >
        {COLLECT_TAGS.map(({ tag }) => {
          const games = gamesByTag.get(tag) ?? [];
          const wonCount = games.filter(
            ([path]) => (settingsMap[path]?.stats?.wins ?? 0) > 0,
          ).length;
          const percentage = games.length
            ? Math.round((wonCount / games.length) * 100)
            : 0;
          const isOpen = openTags.has(tag);
          const progressSize = spacing(38);
          const strokeWidth = spacing(3);
          const radius = (progressSize - strokeWidth) / 2;
          const circumference = 2 * Math.PI * radius;

          return (
            <View
              key={tag}
              style={{
                width: "100%",
                maxWidth: ui.contentMaxWidth,
                alignSelf: "center",
                borderRadius: spacing(12),
                overflow: "hidden",
                backgroundColor: Colors.K900,
                boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(10)}px ${rgba(Colors.black, 0.2)}`,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${GameTagNames[tag]}, ${percentage}% won`}
                accessibilityState={{ expanded: isOpen }}
                onPress={() => toggleTag(tag)}
                style={{
                  minHeight: spacing(52),
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: spacing(8),
                  gap: spacing(10),
                }}
              >
                <View
                  style={{
                    width: progressSize,
                    height: progressSize,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Svg
                    width={progressSize}
                    height={progressSize}
                    style={{ position: "absolute" }}
                  >
                    <Circle
                      cx={progressSize / 2}
                      cy={progressSize / 2}
                      r={radius}
                      fill="none"
                      stroke={Colors.K850}
                      strokeWidth={strokeWidth}
                    />
                    <Circle
                      cx={progressSize / 2}
                      cy={progressSize / 2}
                      r={radius}
                      fill="none"
                      stroke={
                        percentage === 100 ? Colors.trophyGold : Colors.win
                      }
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={circumference * (1 - percentage / 100)}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${progressSize / 2} ${progressSize / 2})`}
                    />
                  </Svg>
                  <Icon
                    name="trophy"
                    size={spacing(18)}
                    color={percentage === 100 ? Colors.trophyGold : Colors.K600}
                  />
                </View>

                <Text
                  size="md"
                  weight={500}
                  color={Colors.K200}
                  style={{ flex: 1, paddingHorizontal: spacing(8) }}
                >
                  {GameTagNames[tag]}
                </Text>

                <Icon
                  name={isOpen ? "expand-less" : "expand-more"}
                  size={spacing(28)}
                  color={Colors.K600}
                />
              </Pressable>

              {isOpen && (
                <View
                  style={{
                    padding: spacing(12),
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    rowGap: cardGap,
                  }}
                >
                  {games.map(([path, game]) => (
                    <HomeCard
                      key={path}
                      path={path}
                      game={game}
                      size={cardSize}
                      onToggleFavorite={onToggleFavorite}
                      isFavorite={favorites.has(path)}
                      style={{
                        width: cardSize === "medium" ? mediumCardWidth : "100%",
                        flexGrow: cardSize === "medium" ? 0 : 1,
                      }}
                      showCompleted={!!settingsMap[path]?.stats?.wins}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
