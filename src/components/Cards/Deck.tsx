import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  DEFAULT_CARD_WIDTH_RATIO,
  Card,
  getCardDimensions,
  type CardRank,
  type CardSuit,
} from "./Card";

export type DeckCard = {
  suit: CardSuit;
  rank: CardRank;
};

export const DEFAULT_FRONT_OVERLAP = 0.7;
export const DEFAULT_BACK_OVERLAP = 0.9;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export type DeckDirection = "horizontal" | "vertical";

type DeckProps = {
  widthRatio?: number;
  direction?: DeckDirection;
  fan?: boolean;
  reverse?: boolean;
  style?: StyleProp<ViewStyle>;
  frontOverlap?: number;
  backOverlap?: number;
  cards?: DeckCard[];
  backCount?: number;
  backSuit?: CardSuit;
};

export function Deck({
  widthRatio = DEFAULT_CARD_WIDTH_RATIO,
  direction = "horizontal",
  fan = true,
  reverse = false,
  style,
  frontOverlap = DEFAULT_FRONT_OVERLAP,
  backOverlap = DEFAULT_BACK_OVERLAP,
  backCount,
  cards,
  backSuit,
}: DeckProps) {
  const { width: windowWidth } = useWindowDimensions();

  const { width: cardWidth, height: cardHeight } = getCardDimensions(
    windowWidth,
    widthRatio,
  );

  const isBackDeck = backCount !== undefined;
  const cardCount = isBackDeck ? backCount : (cards?.length ?? 0);

  const overlap = clamp(isBackDeck ? backOverlap : frontOverlap, 0, 0.99);

  const stepX =
    direction === "horizontal"
      ? fan
        ? cardWidth * (1 - overlap)
        : cardWidth
      : 0;

  const stepY =
    direction === "vertical"
      ? fan
        ? cardHeight * (1 - overlap)
        : cardHeight
      : 0;

  const offsetX = reverse ? -stepX : stepX;
  const offsetY = reverse ? -stepY : stepY;

  const minX = Math.min(0, offsetX * (cardCount - 1));
  const minY = Math.min(0, offsetY * (cardCount - 1));

  const deckWidth =
    cardCount <= 1 ? cardWidth : cardWidth + stepX * (cardCount - 1);
  const deckHeight =
    cardCount <= 1 ? cardHeight : cardHeight + stepY * (cardCount - 1);

  return (
    <View
      style={[styles.deck, { width: deckWidth, height: deckHeight }, style]}
    >
      {Array.from({ length: cardCount }, (_, index) => {
        const cardStyle = {
          position: "absolute" as const,
          left: offsetX * index - minX,
          top: offsetY * index - minY,
          zIndex: index,
        };

        if (isBackDeck) {
          return (
            <View key={`back-${index}`} style={cardStyle}>
              <Card
                suit={backSuit ?? "hearts"}
                isBack
                widthRatio={widthRatio}
              />
            </View>
          );
        }

        if (!cards) return null;

        const card = cards[index];

        return (
          <View key={`${card.suit}-${card.rank}-${index}`} style={cardStyle}>
            <Card suit={card.suit} rank={card.rank} widthRatio={widthRatio} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    position: "relative",
  },
});
