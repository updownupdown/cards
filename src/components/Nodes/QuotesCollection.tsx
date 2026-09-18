import { getCollectibleCardImageSource } from "@/components/Cards/CardAssets";
import { Text } from "@/components/common/Text";
import { quotes } from "@/components/Collectibles/QuotesText";
import { getQuoteCardName, type QuoteCard } from "@/data/collectibles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage } from "@/i18n";
import { isQuoteTranslated, localizeQuote } from "@/i18n/content";
import { Colors, rgba } from "@/styles/styles";
import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import { ShowOriginalToggle } from "./ShowOriginalToggle";
import type { CollectionEntry } from "./TaoChapters";

export const QUOTES_COLLECTION: readonly CollectionEntry[] = quotes;

type QuoteProps = {
  id: number;
  quote: CollectionEntry;
  card?: QuoteCard;
  showCard?: boolean;
};

export function Quote({ id, quote, card, showCard = false }: QuoteProps) {
  const { spacing } = useResponsiveMetrics();
  const language = useDisplayLanguage();
  const { settings } = useGlobalSettings();
  const [showOriginal, setShowOriginal] = useState(false);
  const hasTranslation =
    settings.translateCollectibles && isQuoteTranslated(id, quote, language);
  const shown =
    hasTranslation && !showOriginal
      ? localizeQuote(id, quote, language)
      : quote;
  const cardName = card ? getQuoteCardName(card) : undefined;
  const cardImage =
    card && cardName
      ? getCollectibleCardImageSource(card.deck, cardName)
      : undefined;

  return (
    <View style={{ width: "100%", gap: spacing(20) }}>
      {showCard && cardImage && (
        <View
          style={{
            alignSelf: "center",
            width: spacing(60),
            aspectRatio: 2.5 / 3.5,
            borderRadius: spacing(6),
            overflow: "hidden",
            boxShadow: `0 ${spacing(3)}px ${spacing(8)}px ${rgba(Colors.black, 0.45)}`,
          }}
        >
          <Image
            source={cardImage}
            contentFit="contain"
            style={{ width: "100%", height: "100%" }}
          />
        </View>
      )}

      <Text size="xl" weight={300} color={Colors.K200}>
        {shown.text}
      </Text>

      {shown.author && (
        <Text size="lg" weight={400} color={Colors.K300}>
          {shown.author}
        </Text>
      )}

      {shown.source && (
        <Text size="sm" weight={300} color={Colors.K500}>
          {shown.source}
        </Text>
      )}

      {hasTranslation && (
        <ShowOriginalToggle
          showOriginal={showOriginal}
          onToggle={() => setShowOriginal((current) => !current)}
        />
      )}
    </View>
  );
}
