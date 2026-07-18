import { CardSuit, PlayingCard } from "@/components/Cards/card-utils";

export type TheEmissaryKingdom = {
  id: number;
  ruler: PlayingCard; // K or Q
  requiredWins: number;
  visited: boolean;
  won: boolean;
};

export type TheEmissaryVisit = {
  kingdomId: number;
  trumpSuit: CardSuit;
  requiredWins: number;
  wins: number;
  debateTopic: PlayingCard | undefined;
  debateRecord: boolean[];
};

export type GameState = {
  kingdoms: TheEmissaryKingdom[];
  draw: PlayingCard[];
  discardWon: PlayingCard[];
  discardLost: PlayingCard[];
  advisors: PlayingCard[];
  visit: TheEmissaryVisit | null;
  hand: PlayingCard[];
  handNeedsOrdering: boolean;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
  neededToHand: number;
  discardFromHand: number;
  handSize: number;
};

export type GameSnapshot = {
  game: GameState;
};

export type EmissaryRefKeys =
  | "topicRef"
  | "drawCurrentRef"
  | "drawNextRef"
  | "discardLostCurrentRef"
  | "discardLostNextRef"
  | "discardWonCurrentRef"
  | "discardWonNextRef"
  | "futureAdvisorRef"
  | "futureHandRef"
  | "advisorsRefs"
  | "handRefs"
  | "rulersRefs";

export const EmissarySuitsColorMap: Record<string, string> = {
  diamonds: "#6db14e",
  hearts: "#43b39a",
  spades: "#cd7ff1",
  clubs: "#dd5960",
};

export const defaultHandSize = 8;
