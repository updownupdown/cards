import { Text } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import type { GameSettingsMap } from "@/data/game-menu";
import { GameTag } from "@/data/games-data";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { HomeCardSizeControl, type HomeCardSize } from "./HomeCardSizeControl";
import {
  findCentreEntry,
  measureInWindow,
  useCardSizeTransition,
} from "./useCardSizeTransition";
import { flexStyles } from "@/styles/flexStyles";

export const COLLECT_TAGS: GameTag[] = [
  GameTag.EasyToLearn,
  GameTag.ModernMechanics,
  GameTag.CardCombat,
  GameTag.DungeonCrawler,
  GameTag.GridPlacement,
  GameTag.PairMatching,
  GameTag.SpatialControl,
  GameTag.TableauBuilding,
  GameTag.StockAndWaste,
  GameTag.ScoringPuzzles,
  GameTag.SequenceBuilding,
  GameTag.PokerAndCribbage,
];

type CollectTabProps = {
  allEnabledGames: HomeGameEntry[];
  settingsMap: GameSettingsMap;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  cardSize: HomeCardSize;
  onCardSizeChange: (size: HomeCardSize) => void;
  onScrolledChange: (isScrolled: boolean) => void;
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
  onScrolledChange,
  contentPaddingTop,
  contentPaddingBottom,
}: CollectTabProps) {
  const { ui, spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const [openTags, setOpenTags] = useState<Set<GameTag>>(new Set());
  const pageSidePadding = spacing(layoutDims.pagePadding);
  const cardGap = spacing(12);
  const mediumCardWidth: `${number}%` = ui.isTablet ? "31.5%" : "48.5%";

  const gamesByTag = useMemo(
    () =>
      new Map(
        COLLECT_TAGS.map((tag) => [
          tag,
          allEnabledGames.filter(([, game]) => game.tags[0] === tag),
        ]),
      ),
    [allEnabledGames],
  );

  const containerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const cardRefs = useRef(new Map<string, View>());

  const { opacity, changeCardSize } = useCardSizeTransition({
    cardSize,
    onCardSizeChange,
    captureAnchor: () =>
      findCentreEntry(containerRef.current, cardRefs.current),
    restoreAnchor: async (anchor) => {
      const container = await measureInWindow(containerRef.current);
      const card = await measureInWindow(cardRefs.current.get(anchor.key));
      if (!container || !card) return;
      const offset =
        card.top + card.height / 2 - (container.top + container.height / 2);
      scrollRef.current?.scrollTo({
        y: Math.max(0, scrollY.current + offset - anchor.offset),
        animated: false,
      });
    },
  });

  const toggleTag = (tag: GameTag) => {
    setOpenTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <View ref={containerRef} style={{ flex: 1 }}>
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: contentPaddingTop,
          left: pageSidePadding,
          right: pageSidePadding,
          zIndex: 1,
        }}
      >
        <HomeCardSizeControl value={cardSize} onChange={changeCardSize} />
      </View>
      <Animated.View style={{ flex: 1, opacity }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: contentPaddingTop,
            paddingBottom: contentPaddingBottom,
            paddingHorizontal: pageSidePadding,
            gap: spacing(12),
          }}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
            onScrolledChange(event.nativeEvent.contentOffset.y > 1);
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: spacing(layoutDims.cardToggleHeight) }} />

          <View
            style={[
              flexStyles.colCentered,
              flexStyles.fullWidth,
              { gap: spacing(12), paddingVertical: spacing(24) },
            ]}
          >
            {COLLECT_TAGS.map((tag) => {
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
                    backgroundColor: rgba(Colors.K900, 0.7),
                    ...homeSurfaceShadow(spacing),
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("collect.tagProgress", {
                      tag: t(`tags.${tag}`),
                      percentage,
                    })}
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
                          strokeDashoffset={
                            circumference * (1 - percentage / 100)
                          }
                          strokeLinecap="round"
                          transform={`rotate(-90 ${progressSize / 2} ${progressSize / 2})`}
                        />
                      </Svg>
                      <Icon
                        name="trophy"
                        size={spacing(18)}
                        color={
                          percentage === 100 ? Colors.trophyGold : Colors.K600
                        }
                      />
                    </View>

                    <Text
                      size="md"
                      weight={500}
                      color={Colors.K200}
                      style={{ flex: 1, paddingHorizontal: spacing(8) }}
                    >
                      {t(`tags.${tag}`)}
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
                        <View
                          key={path}
                          ref={(view) => {
                            if (view) cardRefs.current.set(path, view);
                            else cardRefs.current.delete(path);
                          }}
                          collapsable={false}
                          style={{
                            width:
                              cardSize === "medium" ? mediumCardWidth : "100%",
                            flexGrow: cardSize === "medium" ? 0 : 1,
                          }}
                        >
                          <HomeCard
                            path={path}
                            game={game}
                            size={cardSize}
                            onToggleFavorite={onToggleFavorite}
                            isFavorite={favorites.has(path)}
                            style={{ width: "100%" }}
                            showCompleted={!!settingsMap[path]?.stats?.wins}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
