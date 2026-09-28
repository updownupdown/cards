import { Text } from "@/components/common/Text";
import {
  lifespan,
  portraitLength,
  shortName,
  voicesGroups,
  type VoicesAuthor,
} from "@/components/Campaign/voices";
import { ParallaxStars } from "@/components/TaoCollection/ParallaxStars";
import {
  BarButton,
  FloatingBar,
  useStackedBarHeight,
} from "@/components/ui/FloatingBar";
import { getQuote, type QuoteId } from "@/data/collectibles";
import { GALLERY_LAST_QUOTE_STORAGE_KEY } from "@/data/storage-keys";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { theme } from "@/styles/styles";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { CountRow, PickerPanel, useSavedNumber } from "./shared";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const PORTRAIT_DRAW_MS = 2400;

/**
 * The quotes, one at a time, by their authors from the oldest on: the
 * author's portrait drawn in a single line, their name and years, and the
 * quote once it is collected. The bar steps through them all; its middle
 * lists every author, by era, to jump to.
 */
export function QuotesView({
  collectedIds,
  topInset,
}: {
  collectedIds: ReadonlySet<QuoteId>;
  /** Room at the top for the Gallery's switch. */
  topInset: number;
}) {
  const { t } = useTranslation("campaign");
  const { settings } = useGlobalSettings();
  const barHeight = useStackedBarHeight();
  const groups = useMemo(() => voicesGroups(collectedIds), [collectedIds]);
  // Every quote, author by author, oldest first.
  const entries = useMemo(
    () =>
      groups.flatMap((group) =>
        group.authors.flatMap((author) =>
          author.quoteIds.map((quoteId) => ({ author, quoteId })),
        ),
      ),
    [groups],
  );
  const firstCollected = entries.findIndex((entry) =>
    collectedIds.has(entry.quoteId),
  );
  const [savedQuote, setQuote] = useSavedNumber(
    GALLERY_LAST_QUOTE_STORAGE_KEY,
    entries[Math.max(0, firstCollected)]?.quoteId ?? 1,
    (value) => entries.some((entry) => entry.quoteId === value),
  );
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [picking, setPicking] = useState(false);
  const still = useSharedValue(0);

  const index = entries.findIndex((entry) => entry.quoteId === savedQuote);
  const entry = entries[index];
  const at = (step: number) =>
    entries[(index + step + entries.length) % entries.length];
  const go = (quoteId: QuoteId) => {
    setPicking(false);
    setQuote(quoteId);
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

      {entry && (
        <QuoteDetail
          author={entry.author}
          quoteId={entry.quoteId}
          collected={collectedIds.has(entry.quoteId)}
          topInset={topInset}
          bottomInset={barHeight}
        />
      )}

      {picking && entry && (
        <PickerPanel
          title={t("quotes.pick")}
          closeLabel={t("quotes.pick")}
          onClose={() => setPicking(false)}
          top={topInset}
          bottom={barHeight}
          fill
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            {groups.map((group) => {
              const total = group.authors.reduce(
                (sum, author) => sum + author.quoteIds.length,
                0,
              );
              return (
                <View key={group.period.id}>
                  <CountRow
                    heading
                    label={group.period.name}
                    count={group.collected.length}
                    total={total}
                  />
                  {group.authors.map((author) => (
                    <CountRow
                      key={author.name}
                      label={author.name}
                      count={author.collectedIds.length}
                      total={author.quoteIds.length}
                      selected={author.name === entry.author.name}
                      // Their first collected quote, or their first.
                      onPress={() =>
                        go(author.collectedIds[0] ?? author.quoteIds[0])
                      }
                    />
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </PickerPanel>
      )}

      {entry && (
        <FloatingBar placement="aboveTabBar">
          <BarButton
            iconName="chevron-left"
            label={shortName(at(-1).author.name)}
            accessibilityLabel={t("quotes.previousQuote")}
            align="left"
            onPress={() => go(at(-1).quoteId)}
          />
          <BarButton
            iconName={picking ? "expand-more" : "expand-less"}
            label={t("quotes.authors")}
            accessibilityLabel={t("quotes.pick")}
            accent
            onPress={() => setPicking((open) => !open)}
          />
          <BarButton
            iconName="chevron-right"
            label={shortName(at(1).author.name)}
            accessibilityLabel={t("quotes.nextQuote")}
            align="right"
            onPress={() => go(at(1).quoteId)}
          />
        </FloatingBar>
      )}
    </View>
  );
}

/** One quote: portrait, name, years, then the quote and its source. */
function QuoteDetail({
  author,
  quoteId,
  collected,
  topInset,
  bottomInset,
}: {
  author: VoicesAuthor;
  quoteId: QuoteId;
  collected: boolean;
  topInset: number;
  bottomInset: number;
}) {
  const { spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const quote = getQuote(quoteId);
  const count = author.quoteIds.length;
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        alignItems: "center",
        paddingTop: topInset + spacing(8),
        paddingBottom: bottomInset + spacing(24),
        paddingHorizontal: spacing(28),
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Drawn afresh only when the author changes. */}
      <Portrait key={author.name} path={author.portrait} size={spacing(170)} />
      <Text
        size="lg"
        weight={500}
        style={{ textAlign: "center", marginTop: spacing(14) }}
      >
        {author.name}
      </Text>
      <Text
        size="xs"
        weight={300}
        color={theme.dim}
        style={{ textAlign: "center" }}
      >
        {lifespan(author)}
        {count > 1
          ? `  ·  ${author.quoteIds.indexOf(quoteId) + 1} / ${count}`
          : ""}
      </Text>
      <Animated.View
        key={quoteId}
        entering={FadeIn.duration(900).delay(150)}
        style={{
          alignItems: "center",
          marginTop: spacing(20),
          gap: spacing(12),
        }}
      >
        {collected && quote ? (
          <>
            <Text
              serif
              italic
              color={theme.ink}
              style={{
                fontSize: font(24),
                lineHeight: font(31),
                textAlign: "center",
                maxWidth: spacing(520),
              }}
            >
              “{quote.text}”
            </Text>
            <Text
              size="xs"
              weight={300}
              color={theme.dim}
              style={{ textAlign: "center" }}
            >
              {quote.source}
            </Text>
          </>
        ) : (
          <Text
            serif
            italic
            size="lg"
            color={theme.dim}
            style={{ textAlign: "center", maxWidth: spacing(420) }}
          >
            {t("quotes.uncollected")}
          </Text>
        )}
      </Animated.View>
    </ScrollView>
  );
}

/** An author's one-line portrait, drawn in the accent as it appears. */
function Portrait({ path, size }: { path: string; size: number }) {
  const length = useMemo(() => portraitLength(path), [path]);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: PORTRAIT_DRAW_MS,
      easing: Easing.inOut(Easing.quad),
    });
  }, [progress]);
  const dashProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));
  return (
    <Svg width={size} height={(size * 240) / 200} viewBox="0 0 200 240">
      <AnimatedPath
        d={path}
        fill="none"
        stroke={theme.accent}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[length, length]}
        animatedProps={dashProps}
      />
    </Svg>
  );
}
