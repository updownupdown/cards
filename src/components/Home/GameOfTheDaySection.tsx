import { Text } from "@/components/common/Text";
import { HomeCard } from "@/components/Home/HomeCard";
import { SectionTitle } from "@/components/ui/Nocturne";
import {
  daysBefore,
  getDailyStreak,
  getDateKey,
  getGameOfTheDayPath,
  loadDailyWins,
  subscribeToDailyWins,
} from "@/data/game-of-the-day";
import { isGameEnabled } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { rgba, theme } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

/** Today and the days before it that can be swiped back to. */
const DAYS_SHOWN = 7;

type GameOfTheDaySectionProps = {
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  pageSidePadding: number;
  contentMaxWidth: number;
  /** The width the section is laid out in: one swipe page. */
  pageWidth: number;
};

/**
 * Today's game, with the previous days' picks a swipe to the left away.
 * Each day says whether its game was won that day, and the title counts the
 * current run of daily wins.
 */
export function GameOfTheDaySection({
  favorites,
  onToggleFavorite,
  pageSidePadding,
  contentMaxWidth,
  pageWidth,
}: GameOfTheDaySectionProps) {
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const { spacing } = useResponsiveMetrics();
  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [dailyWins, setDailyWins] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToDailyWins(setDailyWins);
    loadDailyWins().then((wins) => {
      if (active) setDailyWins(wins);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Today first, then back through the days before it.
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_SHOWN }, (_, index) => {
      const date = daysBefore(today, index);
      const path = getGameOfTheDayPath(date);
      return { date, key: getDateKey(date), path };
    }).filter(
      (day): day is typeof day & { path: string } =>
        !!day.path && isGameEnabled(GAMES_DATA[day.path]),
    );
  }, []);

  const streak = getDailyStreak(dailyWins);

  const dayLabel = (daysAgo: number, date: Date) => {
    if (daysAgo === 0) return t("gameOfTheDay.today");
    if (daysAgo === 1) return t("gameOfTheDay.yesterday");
    return date.toLocaleDateString(language, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  if (days.length === 0 || pageWidth <= 0) return null;

  return (
    <View
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
      }}
    >
      <View style={{ paddingHorizontal: pageSidePadding }}>
        <SectionTitle
          action={
            <Text size="xs" weight={400} color={theme.dim}>
              {t("gameOfTheDay.streak", { count: streak })}
            </Text>
          }
        >
          {t("sections.gameOfTheDay")}
        </SectionTitle>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: pageWidth }}
        onMomentumScrollEnd={(event) =>
          setPageIndex(
            Math.round(event.nativeEvent.contentOffset.x / pageWidth),
          )
        }
        onScroll={(event) =>
          setPageIndex(
            Math.round(event.nativeEvent.contentOffset.x / pageWidth),
          )
        }
        scrollEventThrottle={32}
      >
        {days.map((day, index) => {
          const daysAgo = index;
          const won = dailyWins.has(day.key);
          return (
            <View
              key={day.key}
              style={{
                width: pageWidth,
                paddingHorizontal: pageSidePadding,
                paddingBottom: spacing(12),
                gap: spacing(8),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: spacing(26),
                }}
              >
                <Text
                  size="sm"
                  weight={400}
                  color={daysAgo === 0 ? theme.ink : theme.dim}
                  style={{ flex: 1 }}
                >
                  {dayLabel(daysAgo, day.date)}
                </Text>
                {won && (
                  <View
                    style={[
                      flexStyles.rowCentered,
                      {
                        gap: spacing(6),
                        paddingHorizontal: spacing(10),
                        height: spacing(26),
                        borderRadius: spacing(13),
                        backgroundColor: rgba(theme.accent, 0.14),
                      },
                    ]}
                  >
                    <Icon
                      name="trophy"
                      size={spacing(14)}
                      color={theme.accent}
                    />
                    <Text size="xs" weight={500} color={theme.accent}>
                      {daysAgo === 0
                        ? t("gameOfTheDay.wonToday")
                        : t("gameOfTheDay.won")}
                    </Text>
                  </View>
                )}
              </View>
              <HomeCard
                path={day.path}
                game={GAMES_DATA[day.path]}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(day.path)}
                style={{ width: "100%" }}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* Which day is showing; tapping one goes to it, which is also how a
          mouse gets around, since it can't swipe. */}
      <View style={[flexStyles.rowCentered, { gap: spacing(2) }]}>
        {days.map((day, index) => (
          <Pressable
            key={day.key}
            accessibilityRole="button"
            accessibilityLabel={dayLabel(index, day.date)}
            accessibilityState={{ selected: index === pageIndex }}
            onPress={() => {
              setPageIndex(index);
              scrollRef.current?.scrollTo({
                x: index * pageWidth,
                animated: true,
              });
            }}
            style={{ padding: spacing(4) }}
          >
            <View
              style={{
                width: spacing(index === pageIndex ? 14 : 6),
                height: spacing(6),
                borderRadius: spacing(3),
                backgroundColor:
                  index === pageIndex
                    ? theme.accent
                    : dailyWins.has(day.key)
                      ? rgba(theme.accent, 0.45)
                      : rgba(theme.ink, 0.14),
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
