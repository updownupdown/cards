import { delay } from "@/utils/utils";
import {
  CardSuit,
  createDeck,
  flipAllToBack,
  isFace,
  rankValue,
  shuffle,
  sortCards,
  type PlayingCard,
} from "../../Cards/card-utils";
import { defaultHandSize, GameState } from "./TheEmissaryTypes";

export const gameStateInitial: GameState = {
  kingdoms: [],
  advisors: [],
  draw: shuffle(createDeck()),
  discardWon: [],
  discardLost: [],
  hand: [],
  visit: null,
  ended: false,
  won: false,
  winLoseMessage: "",
  neededToHand: 0,
  handNeedsOrdering: false,
  discardFromHand: 0,
  handSize: 0,
};

export async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.discardWon,
      ...draft.discardLost,
      ...draft.hand,
      ...draft.advisors,
      ...(draft.visit?.debateTopic ? [draft.visit.debateTopic] : []),
      ...draft.kingdoms.filter((k) => !k.won).map((k) => k.ruler),
    ].filter((card): card is PlayingCard => card !== null);

    draft.draw = flipAllToBack(allCards);
    draft.kingdoms = [];
    draft.discardWon = [];
    draft.discardLost = [];
    draft.advisors = [];
    draft.hand = [];
    draft.visit = null;
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
    draft.neededToHand = 0;
    draft.handNeedsOrdering = false;
    draft.discardFromHand = 0;
    draft.handSize = defaultHandSize;
  });

  await delay();

  setGame((draft) => {
    const deck = shuffle(createDeck());

    draft.advisors = sortCards(
      deck.filter((c) => c.rank === "J").slice(0, 4),
    ).map((c) => ({ ...c, faceUp: true }));

    const rulers = shuffle(
      deck.filter((c) => c.rank === "K" || c.rank === "Q").slice(0, 8),
    ).map((c) => ({ ...c, faceUp: true }));

    draft.kingdoms = rulers.map((ruler, i) => ({
      id: i,
      ruler,
      requiredWins: i + 1,
      visited: false,
      won: false,
    }));
    draft.draw = shuffle(
      deck.filter((c) => !isFace(c) && c.rank !== "9" && c.rank !== "10"),
    );
  });
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
