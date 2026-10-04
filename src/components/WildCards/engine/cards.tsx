import { getCardBackImage, getCardImageSource } from "@/components/Cards/CardAssets";
import { Image } from "expo-image";
import { View } from "react-native";

export const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;
export const SUITS = ["S", "H", "D", "C"] as const;
export type Suit = (typeof SUITS)[number];

export type PlayingCard = {
  /** 1 (ace) to 13 (king). */
  rank: number;
  suit: Suit;
};

/** The card's image name, as "10H" or "QS". */
export const cardName = (card: PlayingCard) =>
  `${RANKS[card.rank - 1]}${card.suit}`;

export function shuffledDeck(): PlayingCard[] {
  const deck = SUITS.flatMap((suit) =>
    RANKS.map((_, index) => ({ rank: index + 1, suit })),
  );
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const randomCard = (): PlayingCard => ({
  rank: 1 + Math.floor(Math.random() * 13),
  suit: SUITS[Math.floor(Math.random() * 4)],
});

/** A playing card's width to height. */
export const CARD_ASPECT = 5 / 7;

/**
 * A card drawn at a world position: centred on (x, y), turned `angle`
 * radians, `w` by `h` world units. A card seen edge-on or from an angle is
 * simply drawn narrower or flatter.
 */
export function CardSprite({
  card,
  x,
  y,
  w,
  h,
  angle = 0,
  opacity = 1,
  back = false,
  shadow = false,
  squash = 1,
}: {
  card?: PlayingCard;
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
  opacity?: number;
  /** The card back, as it faces down. */
  back?: boolean;
  shadow?: boolean;
  /**
   * A card lying flat, seen from above at a slant: turned first, then
   * flattened on the screen by this much.
   */
  squash?: number;
}) {
  const source =
    back || !card ? getCardBackImage() : getCardImageSource("small", cardName(card));
  return (
    <View
      style={{
        pointerEvents: "none",
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        opacity,
        transform:
          squash === 1
            ? [{ rotate: `${angle}rad` }]
            : [{ scaleY: squash }, { rotate: `${angle}rad` }],
        borderRadius: Math.min(w, h) * 0.08,
        overflow: "hidden",
        backgroundColor: "#f7f4ee",
        ...(shadow
          ? { boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.35)" }
          : null),
      }}
    >
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        contentFit="fill"
        cachePolicy="memory"
        transition={0}
      />
    </View>
  );
}

/** How thick a card seen edge-on is drawn, whatever its body's thickness. */
export const EDGE_THICKNESS = 5;

/**
 * A card seen on its side: a thin white strip with rounded ends and a soft
 * shadow. `length` runs along the card; it lies flat when `angle` is ±π/2.
 */
export function EdgeCard({
  x,
  y,
  length,
  angle = 0,
  opacity = 1,
  lifted = false,
}: {
  x: number;
  y: number;
  length: number;
  angle?: number;
  opacity?: number;
  /** Held in the hand: a deeper shadow. */
  lifted?: boolean;
}) {
  const w = EDGE_THICKNESS;
  return (
    <View
      style={{
        pointerEvents: "none",
        position: "absolute",
        left: x - w / 2,
        top: y - length / 2,
        width: w,
        height: length,
        borderRadius: w / 2,
        backgroundColor: "#ffffff",
        opacity,
        transform: [{ rotate: `${angle}rad` }],
        boxShadow: lifted
          ? "0px 4px 8px rgba(0, 0, 0, 0.5)"
          : "0px 1px 3px rgba(0, 0, 0, 0.45)",
      }}
    />
  );
}
