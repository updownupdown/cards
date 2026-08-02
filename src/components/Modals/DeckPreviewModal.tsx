import {
  flipToFace,
  PlayingCard,
  shuffle,
  sortCardsBySuit as sortCardsFn,
} from "@/components/Cards/card-utils";
import { Text } from "@/components/common/Text";
import {
  getConstrainedUiWidth,
  useResponsiveUiLayout,
  useResponsiveUiLayoutFromWidth,
} from "@/hooks/useResponsiveLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { ScrollView, View } from "react-native";
import { Card } from "../Cards/Card";
import ModalFull from "./ModalFull";
import { getGameInfo, normalizeGamePath } from "@/data/game-menu";
import { usePathname } from "expo-router";

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
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const { width: screenWidthActual } = useViewportDimensions();
  const ui = useResponsiveUiLayout();
  const spacing = (value: number) => roundToPixel(value * ui.scale);
  const modalStyles = useModalStyles();
  const containerWidth = getConstrainedUiWidth(
    screenWidthActual,
    ui.contentMaxWidth,
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
    <ModalFull
      title={title}
      onClose={closeModal}
      backgroundColor={gameInfo.gameColorDark}
    >
      <ScrollView
        contentContainerStyle={[
          modalStyles.scrollContent,
          flexStyles.fullWidth,
          {
            justifyContent: "flex-start",
            paddingTop: spacing(30),
            gap: spacing(30),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {shuffleOnClose && (
          <Text
            size="md"
            color={Colors.K200}
            weight={400}
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
              paddingBottom: spacing(40),
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
