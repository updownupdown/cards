import { Text } from "@/components/common/Text";
import {
  lifespan,
  portraitLength,
  listedName,
  voicesGroups,
  type VoicesAuthor,
} from "@/components/Campaign/voices";
import {
  StepperBar,
  useStackedBarBottom,
  useStackedBarHeight,
} from "@/components/ui/FloatingBar";
import { Segmented } from "@/components/ui/Nocturne";
import { getQuote, type QuoteId } from "@/data/collectibles";
import { GALLERY_LAST_QUOTE_STORAGE_KEY } from "@/data/storage-keys";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { theme } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  CountRow,
  PICKED_PAUSE_MS,
  PickerPanel,
  useSavedNumber,
} from "./shared";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const PORTRAIT_DRAW_MS = 2400;

type AuthorOrder = "eras" | "alphabetical";
/** Kept for the session, so the picker opens as it was left. */
let lastAuthorOrder: AuthorOrder = "eras";

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
  const { spacing } = useResponsiveMetrics();
  const barHeight = useStackedBarHeight();
  const barBottom = useStackedBarBottom();
  const language = useDisplayLanguage();
  const [order, setOrder] = useState<AuthorOrder>(lastAuthorOrder);
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
  const [picking, setPicking] = useState(false);

  const index = entries.findIndex((entry) => entry.quoteId === savedQuote);
  const entry = entries[index];
  const at = (step: number) =>
    entries[(index + step + entries.length) % entries.length];
  const go = (quoteId: QuoteId) => {
    setPicking(false);
    setQuote(quoteId);
  };
  // An author picked from the list shows as picked for a moment before the
  // list closes.
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closing.current), []);
  const pick = (quoteId: QuoteId) => {
    setQuote(quoteId);
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setPicking(false), PICKED_PAUSE_MS);
  };
  const byName = useMemo(
    () =>
      groups
        .flatMap((group) => group.authors)
        .sort((a, b) =>
          listedName(a.name).localeCompare(listedName(b.name), language),
        ),
    [groups, language],
  );
  const authorRow = (author: VoicesAuthor) => (
    <CountRow
      key={author.name}
      // A–Z, last name first: "Tolstoy, Leo".
      label={order === "alphabetical" ? listedName(author.name) : author.name}
      count={author.collectedIds.length}
      total={author.quoteIds.length}
      selected={author.name === entry?.author.name}
      // Their first collected quote, or their first.
      onPress={() => pick(author.collectedIds[0] ?? author.quoteIds[0])}
    />
  );

  return (
    <View style={StyleSheet.absoluteFill}>
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
          // Over the bar, which it replaces while open.
          bottom={barBottom}
          fill
        >
          <Segmented
            size="sm"
            options={[
              { value: "eras", label: t("quotes.byEra") },
              { value: "alphabetical", label: t("quotes.byName") },
            ]}
            value={order}
            onChange={(next) => {
              lastAuthorOrder = next;
              setOrder(next);
            }}
            style={{
              marginHorizontal: spacing(14),
              marginBottom: spacing(6),
            }}
          />
          <ScrollView contentContainerStyle={{ paddingBottom: spacing(12) }}>
            {order === "alphabetical"
              ? byName.map(authorRow)
              : groups.map((group, groupIndex) => {
                  const total = group.authors.reduce(
                    (sum, author) => sum + author.quoteIds.length,
                    0,
                  );
                  return (
                    <View
                      key={group.period.id}
                      // Twice the room between eras.
                      style={{ marginTop: groupIndex > 0 ? spacing(18) : 0 }}
                    >
                      <CountRow
                        heading
                        label={group.period.name}
                        count={group.collected.length}
                        total={total}
                      />
                      {group.authors.map(authorRow)}
                    </View>
                  );
                })}
          </ScrollView>
        </PickerPanel>
      )}

      {entry && (
        <StepperBar
          placement="aboveTabBar"
          action={{
            iconName: "expand-less",
            label: t("quotes.pick"),
            onPress: () => setPicking(true),
          }}
          onPrevious={() => go(at(-1).quoteId)}
          onNext={() => go(at(1).quoteId)}
          previousLabel={t("quotes.previousQuote")}
          nextLabel={t("quotes.nextQuote")}
        />
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
        flexGrow: 1,
        alignItems: "center",
        paddingTop: topInset + spacing(8),
        paddingBottom: bottomInset + spacing(20),
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
        weight={400}
        color={theme.dim}
        style={{
          textAlign: "center",
          fontSize: font(15),
          lineHeight: font(20),
        }}
      >
        {lifespan(author)}
      </Text>

      {/* The quote, centred in the room between the author and the count. */}
      <Animated.View
        key={quoteId}
        entering={FadeIn.duration(900).delay(150)}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: spacing(24),
          gap: spacing(14),
        }}
      >
        {collected && quote ? (
          <>
            <Text
              serif
              italic
              color={theme.ink}
              style={{
                fontSize: font(28),
                lineHeight: font(36),
                textAlign: "center",
                maxWidth: spacing(560),
              }}
            >
              “{quote.text}”
            </Text>
            <Text
              size="md"
              weight={400}
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
            size="xl"
            color={theme.dim}
            style={{ textAlign: "center", maxWidth: spacing(420) }}
          >
            {t("quotes.uncollected")}
          </Text>
        )}
      </Animated.View>

      {/* Which of the author's quotes this is, just above the bar. */}
      <Text
        size="sm"
        weight={400}
        color={theme.dim}
        style={{
          textAlign: "center",
          fontVariant: ["tabular-nums"],
          opacity: count > 1 ? 1 : 0,
        }}
      >
        {author.quoteIds.indexOf(quoteId) + 1} / {count}
      </Text>
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
