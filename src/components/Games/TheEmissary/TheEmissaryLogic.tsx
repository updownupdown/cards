import {
  CardSuit,
  createDeck,
  isFace,
  rankValue,
  shuffle,
  sortCards,
  type PlayingCard,
} from "../../Cards/card-utils";
import {
  defaultHandSize,
  GameState,
  TheEmissaryKingdom,
} from "./TheEmissaryTypes";

export function setup(firstGame = false): GameState {
  const deck = shuffle(createDeck());
  const rulers = shuffle(
    deck.filter((c) => c.rank === "K" || c.rank === "Q").slice(0, 8),
  ).map((c) => ({ ...c, faceUp: true }));
  const advisors = sortCards(
    deck.filter((c) => c.rank === "J").slice(0, 4),
  ).map((c) => ({ ...c, faceUp: true }));

  const draw = shuffle(
    deck.filter((c) => !isFace(c) && c.rank !== "9" && c.rank !== "10"),
  );

  const kingdoms: TheEmissaryKingdom[] = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    ruler: rulers[i],
    requiredWins: i + 1,
    visited: false,
    won: false,
  }));

  return {
    kingdoms,
    advisors,
    draw,
    discardWon: [],
    discardLost: [],
    hand: [],
    visit: null,
    started: !firstGame,
    ended: false,
    won: false,
    winLoseMessage: "",
    neededToHand: 0,
    handNeedsOrdering: false,
    discardFromHand: 0,
    handSize: defaultHandSize,
  };
}

export function wonDebate(
  card: PlayingCard,
  debateTopic: PlayingCard,
  trumpSuit: CardSuit,
) {
  if (debateTopic.suit !== trumpSuit && card.suit === trumpSuit) {
    return true;
  } else if (card.suit !== debateTopic.suit) {
    return false;
  }

  return rankValue(card) > rankValue(debateTopic);
}

export function canDebateWithCard(
  hand: PlayingCard[],
  debateTopic?: PlayingCard,
  handCard?: PlayingCard,
) {
  if (!debateTopic || !handCard) return false;

  const handContainsTopicSuit = hand.some(
    (card) => card.suit === debateTopic.suit,
  );
  if (handContainsTopicSuit && handCard.suit !== debateTopic.suit) {
    return false;
  }
  return true;
}
