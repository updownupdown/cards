import { getCollectibleCardImageSource } from "@/components/Cards/CardAssets";
import { Text } from "@/components/common/Text";
import { quotes } from "@/components/Collectibles/QuotesText";
import type { QuoteCard } from "@/data/collectibles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { Image } from "expo-image";
import { View } from "react-native";
import type { CollectionEntry } from "./TaoChapters";

export const QUOTES_COLLECTION: readonly CollectionEntry[] = quotes;

type QuoteProps = {
  quote: CollectionEntry;
  card?: QuoteCard;
  showCard?: boolean;
};

export function Quote({ quote, card, showCard = false }: QuoteProps) {
  const { spacing } = useResponsiveMetrics();
  const cardName = card
    ? `${card.rank}${card.suit.charAt(0).toUpperCase()}`
    : undefined;
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
        {quote.text}
      </Text>

      {quote.author && (
        <Text size="lg" weight={400} color={Colors.K300}>
          {quote.author}
        </Text>
      )}

      {quote.source && (
        <Text size="sm" weight={300} color={Colors.K500}>
          {quote.source}
        </Text>
      )}
    </View>
  );
}
