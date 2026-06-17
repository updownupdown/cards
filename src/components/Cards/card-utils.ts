import type { View as RNView } from "react-native";
import { LoopRank } from "../Games/LootTheLoop";

export const cardDims = {
  aspectRatio: 2.5 / 3.5,
  fanOffset: 0.04, // % of card width or height
  ratioShadowUnit: 0.008, // % of card width
  ratioRadius: 0.08, // % of card width
  layoutPadding: 0.4, // $ of card width or height
  layoutGap: 0.25, // % of card width
};

export type CardSuit = "clubs" | "diamonds" | "hearts" | "spades";
export type CardRank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "Joker";

export type StandardRank = Exclude<CardRank, "Joker">;

export type PlayingCard = {
  id: string;
  suit: CardSuit;
  rank: CardRank;
  faceUp: boolean;
};

export const SUITS: CardSuit[] = ["clubs", "diamonds", "hearts", "spades"];

export const numRanks = 13;

export const RANKS: StandardRank[] = [
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
];

export const RANK_VALUE: Record<StandardRank | "Joker", number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  Joker: 14,
};

export const SUIT_VALUE: Record<CardSuit, number> = {
  hearts: 1,
  clubs: 2,
  diamonds: 3,
  spades: 4,
};

export function suitValue(card: PlayingCard) {
  return SUIT_VALUE[card.suit];
}

export function rankValue(
  card: PlayingCard,
  customAceValue?: number,
  customJokerValue?: number,
) {
  if (card.rank === "Joker") {
    return customJokerValue ?? RANK_VALUE[card.rank];
  } else if (card.rank === "A") {
    return customAceValue ?? RANK_VALUE[card.rank];
  } else {
    return RANK_VALUE[card.rank];
  }
}

export function nameFromRankValue(rank: number) {
  if (rank === 0 || rank === 14) {
    return "Joker";
  } else if (rank === 1) {
    return "Ace";
  } else if (rank === 11) {
    return "Jack";
  } else if (rank === 12) {
    return "Queen";
  } else if (rank === 13) {
    return "King";
  } else {
    return rank.toString();
  }
}

export function areRanksConsecutive(
  rank1: number,
  rank2: number,
  looping: boolean,
) {
  if (looping) return Math.abs(rank1 - rank2) % 13 === 1;

  if (rank1 === 1) {
    return rank2 === 2;
  } else if (rank1 === 13) {
    return rank2 === 12;
  } else {
    return Math.abs(rank1 - rank2) === 1;
  }
}

export function areRanksTwoAway(
  rank1: number,
  rank2: number,
  looping: boolean,
) {
  if (looping) return Math.abs(rank1 - rank2) % 13 === 2;

  if (rank1 === 2) {
    return rank2 === 13 || rank2 === 4;
  } else if (rank1 === 1) {
    return rank2 === 12 || rank2 === 3;
  } else if (rank1 === 13) {
    return rank2 === 11 || rank2 === 2;
  } else if (rank1 === 12) {
    return rank2 === 10 || rank2 === 1;
  } else {
    return Math.abs(rank1 - rank2) === 2;
  }
}

export function isRed(suit: CardSuit) {
  return suit === "hearts" || suit === "diamonds";
}
export function cardColor(card: PlayingCard) {
  return isRed(card.suit) ? "red" : "black";
}
export function isFace(card: PlayingCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}
export function isAce(card: PlayingCard) {
  return card.rank === "A";
}
export function isJoker(card: PlayingCard) {
  return card.rank === "Joker";
}
export function isSameColor(card1: PlayingCard, card2: PlayingCard) {
  const card1Red = isRed(card1.suit) ? "red" : "black";
  const card2Red = isRed(card2.suit) ? "red" : "black";

  return card1Red === card2Red;
}

export function isNumberRank(rank: CardRank | LoopRank) {
  return ["2", "3", "4", "5", "6", "7", "8", "9", "10"].includes(rank);
}

export function top(deck: PlayingCard[]) {
  if (deck.length === 0) return undefined;
  return deck[deck.length - 1];
}
export function flipToFace(card: PlayingCard) {
  return { ...card, faceUp: true } as PlayingCard;
}
export function flipToBack(card: PlayingCard) {
  return { ...card, faceUp: false } as PlayingCard;
}
export function flipAllToFace(cards: PlayingCard[]) {
  return cards.map((c) => flipToFace(c));
}
export function flipAllToBack(cards: PlayingCard[]) {
  return cards.map((c) => flipToBack(c));
}
export function flipTopCardToFace(cards: PlayingCard[]) {
  let newCards = [...cards];
  newCards[newCards.length - 1] = flipToFace(newCards[newCards.length - 1]);
  return newCards;
}
export function flipTopCardToBack(cards: PlayingCard[]) {
  let newCards = [...cards];
  newCards[newCards.length - 1] = flipToBack(newCards[newCards.length - 1]);
  return newCards;
}

export function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function createDeck(options?: {
  deckCount?: number;
  forceSuit?: CardSuit;
  faceUp?: boolean;
  includeJokers?: boolean;
}) {
  const {
    deckCount = 1,
    forceSuit,
    faceUp = false,
    includeJokers,
  } = options ?? {};
  const suits = forceSuit ? [forceSuit] : SUITS;

  const cards: PlayingCard[] = [];
  for (let deck = 0; deck < deckCount; deck += 1) {
    for (const suit of suits) {
      for (const rank of RANKS) {
        cards.push({
          id: `${deck}-${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
          suit,
          rank,
          faceUp,
        });
      }
    }
  }

  if (includeJokers) {
    cards.push({ id: "joker-a", suit: "spades", rank: "Joker", faceUp });
    cards.push({ id: "joker-b", suit: "hearts", rank: "Joker", faceUp });
  }

  return cards;
}

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DRAG_CAPTURE_THRESHOLD = 6;
export const DRAG_MOVE_THRESHOLD = 8;

export function pointInRect(pageX: number, pageY: number, rect: Rect) {
  return (
    pageX >= rect.x &&
    pageX <= rect.x + rect.width &&
    pageY >= rect.y &&
    pageY <= rect.y + rect.height
  );
}

export function measureNode(node: RNView | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!node) {
      resolve(null);
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      resolve({ x, y, width, height });
    });
  });
}
