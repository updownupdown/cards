import { cardStyles } from "@/styles/cardStyles";
import { Text, View } from "react-native";
import { CardRank, CardSuit } from "../Games/card-utils";
import { Card } from "./Card";

export type DeckCard = {
  suit: CardSuit;
  rank: CardRank;
};

export const DEFAULT_FRONT_OVERLAP = 0.7;
export const DEFAULT_BACK_OVERLAP = 0.9;

/*
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
  const cardCount = isBackDeck ? Math.min(backCount, 5) : (cards?.length ?? 0);

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
      style={[cardStyles.deck, { width: deckWidth, height: deckHeight }, style]}
    >
      {Array.from({ length: cardCount }, (_, index) => {
        const cardStyle = {
          position: "absolute" as const,
          left: offsetX * index - minX,
          top: offsetY * index - minY,
          width: cardWidth,
          bottom: 0,
          zIndex: index,
        };

        if (isBackDeck) {
          return (
            <View
              key={`back-${index}`}
              // style={[cardStyle, cardStyles.cardWrapWidth4]}
              style={[cardStyle]}
            >
              <Card
                suit={backSuit ?? "hearts"}
                isBack
                // style={[cardStyles.cardWidth4]}
              />
            </View>
          );
        }

        if (!cards) return null;

        const card = cards[index];

        return (
          <View
            key={`${card.suit}-${card.rank}-${index}`}
            // style={[cardStyle, cardStyles.cardWrapWidth4]}
          >
            <Card
              suit={card.suit}
              rank={card.rank}
              // style={[cardStyles.cardWidth4]}
            />
          </View>
        );
      })}
    </View>
  );
}
*/

type DeckDownProps = {
  count: number;
  widthPerc: number;
  showCount?: boolean;
};

export function DeckDown({ count, showCount, widthPerc }: DeckDownProps) {
  const numCards = Math.min(count, 3);

  return (
    <View style={[cardStyles.deck]}>
      {showCount && (
        <View style={cardStyles.deckCount}>
          <Text style={cardStyles.deckCountText}>{count}</Text>
        </View>
      )}

      {numCards === 0 && <Card isPlaceholder widthPerc={widthPerc} />}

      {Array.from({ length: numCards }, (_, index) => {
        return (
          <Card
            key={`back-${index}`}
            widthPerc={widthPerc}
            isBack
            omitShadow={index !== 0}
            style={[
              cardStyles.deckCard,
              index === 0 && cardStyles.deckCardBottom,
              {
                transform: `translateX(${8 * index}%)`,
              },
            ]}
          />
        );
      })}
    </View>
  );
}
