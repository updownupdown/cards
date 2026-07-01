import {
  flipToFace,
  PlayingCard,
  shuffle,
  sortCards as sortCardsFn,
} from "@/components/Cards/card-utils";
import { Text } from "@/components/common/Text";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { flexStyles } from "@/styles/flexStyles";
import { modalStyles } from "@/styles/modalStyles";
import { Colors, MaxContentWidth } from "@/styles/styles";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { Card } from "../Cards/Card";
import ModalFull from "./ModalFull";

type Props = {
  visible: boolean;
  cards: PlayingCard[];
  onClose: () => void;
  onCardsChange?: (cards: PlayingCard[]) => void;
  title?: string;
  shuffleOnClose?: boolean;
  sortCards?: boolean;
};

export function DeckPreviewModal({
  visible,
  cards,
  onClose,
  onCardsChange,
  title = "Deck Preview",
  shuffleOnClose = false,
  sortCards = false,
}: Props) {
  const responsiveScale = useResponsiveScale();
  const { width: screenWidthActual } = useWindowDimensions();
  const containerWidth = Math.min(
    screenWidthActual,
    MaxContentWidth * responsiveScale,
  );

  if (!visible) return null;

  let cardsTopFirst = [...cards].reverse();

  if (sortCards) {
    sortCardsFn(cardsTopFirst);
  }

  const closeModal = () => {
    if (shuffleOnClose && onCardsChange) {
      onCardsChange(shuffle(cards));
    }
    onClose();
  };

  return (
    <ModalFull title={title} iconName="collections" onClose={closeModal}>
      <ScrollView
        contentContainerStyle={[
          modalStyles.scrollContent,
          flexStyles.fullWidth,
          {
            justifyContent: "flex-start",
            paddingTop: 20 * responsiveScale,
            gap: 30 * responsiveScale,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {shuffleOnClose && (
          <Text
            size="md"
            color={Colors.K200}
            weight={400}
            // style={{
            //   color: Colors.K300,
            //   fontFamily: FontWeight[300],
            // }}
            style={{ textAlign: "center" }}
          >
            The deck will be shuffled after preview.
          </Text>
        )}

        {cardsTopFirst.length === 0 && (
          <Text
            size="md"
            color={Colors.K300}
            weight={400}
            style={{ textAlign: "center" }}
          >
            No cards in deck.
          </Text>
        )}

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            {
              columnGap: "3%",
              rowGap: "1.5%",
              flexWrap: "wrap",
              alignSelf: "stretch",
              paddingBottom: 60 * responsiveScale,
            },
          ]}
        >
          {cardsTopFirst.map((card, index) => (
            <View
              key={`deck-preview-${card.id}-${index}`}
              style={[{ width: "14%" }]}
            >
              <Card
                card={flipToFace(card)}
                cardWidth={containerWidth / 8}
                cardSize="small"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </ModalFull>
  );
}
