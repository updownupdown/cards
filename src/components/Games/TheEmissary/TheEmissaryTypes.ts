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
  started: boolean;
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
  diamonds: "#84cf61",
  hearts: "#58d8bc",
  spades: "#d28af3",
  clubs: "#f16a88",
};

export const defaultHandSize = 8;
