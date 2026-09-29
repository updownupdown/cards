import { Text } from "@/components/common/Text";
import { TaoChapterDetail } from "@/components/TaoCollection/TaoChapterDetail";
import {
  StepperBar,
  useStackedBarBottom,
  useStackedBarHeight,
} from "@/components/ui/FloatingBar";
import { TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { GALLERY_LAST_CHAPTER_STORAGE_KEY } from "@/data/storage-keys";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { rgba, theme } from "@/styles/styles";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { PICKED_PAUSE_MS, PickerPanel, useSavedNumber } from "./shared";

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
  const barHeight = useStackedBarHeight();
  const barBottom = useStackedBarBottom();
  const firstCollected = Math.min(...collectedIds, Infinity);
  const [chapter, setChapter] = useSavedNumber(
    GALLERY_LAST_CHAPTER_STORAGE_KEY,
    Number.isFinite(firstCollected) ? firstCollected : 1,
    (value) => Number.isInteger(value) && value >= 1 && value <= 81,
  );
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [picking, setPicking] = useState(false);

  const go = (next: number) => {
    setPicking(false);
    setChapter(wrap(next));
  };
  // A chapter picked from the grid shows as picked for a moment before the
  // grid closes.
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closing.current), []);
  const pick = (next: number) => {
    setChapter(next);
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setPicking(false), PICKED_PAUSE_MS);
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
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
          // Over the bar, which it replaces while open.
          bottom={barBottom}
        >
          <ChapterGrid
            current={chapter}
            collectedIds={collectedIds}
            onPick={pick}
          />
        </PickerPanel>
      )}

      {chapter !== undefined && (
        <StepperBar
          placement="aboveTabBar"
          action={{
            iconName: "expand-less",
            label: t("tao.pick"),
            onPress: () => setPicking(true),
          }}
          onPrevious={() => go(chapter - 1)}
          onNext={() => go(chapter + 1)}
          previousLabel={t("tao.previous")}
          nextLabel={t("tao.next")}
        />
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
