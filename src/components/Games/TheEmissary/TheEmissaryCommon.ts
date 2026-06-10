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

export type TheEmissaryGame = {
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

export const EmissarySuitsColorMap: Record<string, string> = {
  diamonds: "#77B15D",
  hearts: "#D4725A",
  spades: "#AF75CA",
  clubs: "#4EB2CE",
};

export const debateRecordsHeight = 40;

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
