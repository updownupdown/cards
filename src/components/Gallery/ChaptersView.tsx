import { Text } from "@/components/common/Text";
import { ParallaxStars } from "@/components/TaoCollection/ParallaxStars";
import { TaoChapterDetail } from "@/components/TaoCollection/TaoChapterDetail";
import {
  BarButton,
  FloatingBar,
  useStackedBarHeight,
} from "@/components/ui/FloatingBar";
import { TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { GALLERY_LAST_CHAPTER_STORAGE_KEY } from "@/data/storage-keys";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { rgba, theme } from "@/styles/styles";
import { toRoman } from "@/utils/roman";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { PickerPanel, useSavedNumber } from "./shared";

const COLUMNS = 9;

const wrap = (chapter: number) =>
  ((chapter - 1 + TAO_CHAPTER_COUNT) % TAO_CHAPTER_COUNT) + 1;

/**
 * The Tao Te Ching, a chapter at a time: its constellation, then its text
 * read out. Opens on the chapter last read (or the first collected); the bar
 * steps through all 81, and its middle opens a grid of them to jump to.
 * Chapters not collected yet show how to collect them.
 */
export function ChaptersView({
  collectedIds,
  topInset,
}: {
  collectedIds: ReadonlySet<number>;
  /** Room at the top for the Gallery's switch. */
  topInset: number;
}) {
  const { t } = useTranslation("campaign");
  const { settings } = useGlobalSettings();
  const barHeight = useStackedBarHeight();
  const firstCollected = Math.min(...collectedIds, Infinity);
  const [chapter, setChapter] = useSavedNumber(
    GALLERY_LAST_CHAPTER_STORAGE_KEY,
    Number.isFinite(firstCollected) ? firstCollected : 1,
    (value) => Number.isInteger(value) && value >= 1 && value <= 81,
  );
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [picking, setPicking] = useState(false);
  const still = useSharedValue(0);

  const go = (next: number) => {
    setPicking(false);
    setChapter(wrap(next));
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      {size && (
        <View style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}>
          <ParallaxStars
            width={size.width}
            height={size.height}
            x={still}
            y={still}
            moving={settings.showAnimations}
          />
        </View>
      )}

      {size && chapter !== undefined && (
        <TaoChapterDetail
          key={chapter}
          chapterNumber={chapter}
          collected={collectedIds.has(chapter)}
          about={collectedIds.size === 0 ? t("tao.about") : undefined}
          width={size.width}
          height={size.height}
          topInset={topInset}
          bottomInset={barHeight}
        />
      )}

      {picking && chapter !== undefined && (
        <PickerPanel
          title={t("tao.pick")}
          closeLabel={t("tao.pick")}
          onClose={() => setPicking(false)}
          top={topInset}
          bottom={barHeight}
        >
          <ChapterGrid
            current={chapter}
            collectedIds={collectedIds}
            onPick={go}
          />
        </PickerPanel>
      )}

      {chapter !== undefined && (
        <FloatingBar placement="aboveTabBar">
          <BarButton
            iconName="chevron-left"
            label={toRoman(wrap(chapter - 1))}
            accessibilityLabel={t("tao.previous")}
            align="left"
            onPress={() => go(chapter - 1)}
          />
          <BarButton
            iconName={picking ? "expand-more" : "expand-less"}
            label={toRoman(chapter)}
            accessibilityLabel={t("tao.pick")}
            accent
            onPress={() => setPicking((open) => !open)}
          />
          <BarButton
            iconName="chevron-right"
            label={toRoman(wrap(chapter + 1))}
            accessibilityLabel={t("tao.next")}
            align="right"
            onPress={() => go(chapter + 1)}
          />
        </FloatingBar>
      )}
    </View>
  );
}

/** All 81 chapters, nine to a row: collected ones lit, the current ringed. */
function ChapterGrid({
  current,
  collectedIds,
  onPick,
}: {
  current: number;
  collectedIds: ReadonlySet<number>;
  onPick: (chapter: number) => void;
}) {
  const { spacing } = useResponsiveMetrics();
  return (
    <ScrollView
      contentContainerStyle={{
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: spacing(10),
        paddingBottom: spacing(12),
      }}
    >
      {Array.from({ length: TAO_CHAPTER_COUNT }, (_, index) => {
        const chapter = index + 1;
        const collected = collectedIds.has(chapter);
        const selected = chapter === current;
        return (
          <Pressable
            key={chapter}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onPick(chapter)}
            style={{
              width: `${100 / COLUMNS}%`,
              aspectRatio: 1,
              padding: spacing(2),
              outline: "none",
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: selected ? 1.5 : 0,
                borderColor: theme.accent,
                backgroundColor: collected
                  ? rgba(theme.accent, 0.12)
                  : "transparent",
              }}
            >
              <Text
                size="xs"
                weight={collected ? 500 : 300}
                color={collected ? theme.ink : theme.faint}
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {chapter}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
