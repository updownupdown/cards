import type { CardRank, CardSuit } from "../Cards/Card";
import type { View as RNView } from "react-native";

export type StandardRank = Exclude<CardRank, "Joker" | "Back">;

export type PlayingCard = {
  id: string;
  suit: CardSuit;
  rank: StandardRank;
  faceUp: boolean;
};

export const SUITS: CardSuit[] = ["clubs", "diamonds", "hearts", "spades"];
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

export const RANK_VALUE: Record<StandardRank, number> = {
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
};

export function isRed(suit: CardSuit) {
  return suit === "hearts" || suit === "diamonds";
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
}) {
  const { deckCount = 1, forceSuit, faceUp = false } = options ?? {};
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
