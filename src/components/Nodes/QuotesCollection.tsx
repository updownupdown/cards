import { getCollectibleCardImageSource } from "@/components/Cards/CardAssets";
import { Text } from "@/components/common/Text";
import { text as legacyQuotes } from "@/components/Collectibles/QuotedWay";
import type { QuoteCard } from "@/data/collectibles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { Image } from "expo-image";
import { View } from "react-native";
import type { CollectionEntry } from "./TaoChapters";

function splitLastParagraph(value: string): [string, string | undefined] {
  const separatorIndex = value.lastIndexOf("\n\n");
  return separatorIndex < 0
    ? [value, undefined]
    : [value.slice(0, separatorIndex), value.slice(separatorIndex + 2)];
}

function parseQuote(value: string): CollectionEntry {
  const [quoteAndAuthor, source] = splitLastParagraph(value);
  const [text, author] = splitLastParagraph(quoteAndAuthor);
  return { text, author, source };
}

export const QUOTES_COLLECTION: readonly CollectionEntry[] =
  legacyQuotes.map(parseQuote);

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
