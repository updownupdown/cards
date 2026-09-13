import { getCollectibleCardImageSource } from "@/components/Cards/CardAssets";
import { Quote } from "@/components/Nodes/QuotesCollection";
import { getQuote, getQuoteCard, QUOTE_COUNT } from "@/data/collectibles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { useState } from "react";
import { Image } from "expo-image";
import { View } from "react-native";
import { CollectionViewer } from "./CollectionViewer";
import ModalFull from "./ModalFull";

type Props = {
  collectedIds: ReadonlySet<number>;
  onClose: () => void;
};

export function QuotesCollectionModal({ collectedIds, onClose }: Props) {
  const { spacing } = useResponsiveMetrics();
  const firstCollected = [...collectedIds].sort((a, b) => a - b)[0];
  const [selectedId, setSelectedId] = useState(firstCollected);
  const card = selectedId ? getQuoteCard(selectedId) : undefined;
  const quoteIds = Array.from({ length: QUOTE_COUNT }, (_, index) => index + 1);

  return (
    <ModalFull
      title="Quotes"
      subtitle={`${collectedIds.size}/${QUOTE_COUNT} collected quote cards`}
      iconName="quote"
      onClose={onClose}
    >
      <CollectionViewer
        itemIds={quoteIds}
        collectedIds={collectedIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        renderItem={(id, selected, collected, size) => {
          const identity = getQuoteCard(id)!;
          const cardName = `${identity.rank}${identity.suit.charAt(0).toUpperCase()}`;
          const imageSource = getCollectibleCardImageSource(
            identity.deck,
            cardName,
          );
          // Fit the card inside its slot. Sizing it from the slot height alone
          // made it wider than narrow (phone) slots, closing the gaps.
          const thumbWidth = Math.min(size.width, (size.height * 2.5) / 3.5);
          return (
            <View
              style={{
                width: thumbWidth,
                height: (thumbWidth * 3.5) / 2.5,
                overflow: "hidden",
                borderRadius: spacing(4),
              }}
            >
              <Image
                source={imageSource}
                contentFit="cover"
                style={{ width: "100%", height: "100%" }}
              />

              {selected && (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: rgba(Colors.cardSelectBlue, 0.35),
                  }}
                />
              )}

              {!collected && (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: rgba(Colors.K950, 0.55),
                  }}
                />
              )}
            </View>
          );
        }}
      >
        {selectedId &&
          collectedIds.has(selectedId) &&
          card &&
          getQuote(selectedId) && (
            <View style={{ width: "100%", gap: spacing(8) }}>
              <Quote quote={getQuote(selectedId)!} />
            </View>
          )}
      </CollectionViewer>
    </ModalFull>
  );
}
