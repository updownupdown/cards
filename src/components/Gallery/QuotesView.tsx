import {
  listedName,
  shortName,
  voicesGroups,
  type VoicesAuthor,
} from "@/components/Campaign/voices";
import { useTapShootingStars } from "@/components/common/TapShootingStars";
import {
  StepperBar,
  useStackedBarBottom,
  useStackedBarHeight,
} from "@/components/ui/FloatingBar";
import { Segmented } from "@/components/ui/Nocturne";
import { type QuoteId } from "@/data/collectibles";
import { GALLERY_LAST_QUOTE_STORAGE_KEY } from "@/data/storage-keys";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  CountRow,
  PICKED_PAUSE_MS,
  PickerPanel,
  useSavedNumber,
} from "./shared";
import { QuoteDetail } from "./QuoteDetail";

type AuthorOrder = "eras" | "alphabetical";
/** Kept for the session, so the picker opens as it was left. */
let lastAuthorOrder: AuthorOrder = "eras";

/**
 * The quotes, one at a time, by their authors from the oldest on: the
 * author's portrait drawn in a single line, their name and years, and the
 * quote once it is collected (until then, the game it comes from). The bar
 * names the author and which of their quotes this is, steps through them
 * all, and opens a list of every author, by era, to jump to.
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
  const [size, setSize] = useState<{ width: number; height: number }>();
  // The hidden game: taps on the sky send shooting stars (the picker and
  // the bar keep theirs).
  const sky = useTapShootingStars({
    enabled: true,
    width: size?.width ?? 0,
    height: size?.height ?? 0,
  });

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
    <View
      style={StyleSheet.absoluteFill}
      {...sky.rootProps}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
        sky.onLayout();
      }}
    >
      {entry && (
        <QuoteDetail
          author={entry.author}
          quoteId={entry.quoteId}
          collected={collectedIds.has(entry.quoteId)}
          topInset={topInset}
          bottomInset={barHeight}
        />
      )}

      {sky.layer}

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
          // The author and which of their quotes this is; its menu is to
          // pick another author.
          action={{
            iconName: "expand-less",
            label: t("quotes.barLabel", {
              name: shortName(entry.author.name),
              index: entry.author.quoteIds.indexOf(entry.quoteId) + 1,
              total: entry.author.quoteIds.length,
            }),
            accessibilityLabel: t("quotes.pick"),
            onPress: () => setPicking(true),
          }}
          swapColours
          onPrevious={() => go(at(-1).quoteId)}
          onNext={() => go(at(1).quoteId)}
          previousLabel={t("quotes.previousQuote")}
          nextLabel={t("quotes.nextQuote")}
        />
      )}
    </View>
  );
}
