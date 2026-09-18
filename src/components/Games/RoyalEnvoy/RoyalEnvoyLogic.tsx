import { i18n } from "@/i18n";
import { delay } from "@/utils/utils";
import {
  CardSuit,
  createDeck,
  flipAllToBack,
  flipAllToFace,
  flipToBack,
  isFace,
  rankValue,
  shuffle,
  sortCardsBySuit,
  type PlayingCard,
} from "../../Cards/card-utils";
import { defaultHandSize, GameState } from "./RoyalEnvoyTypes";

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

    draft.advisors = sortCardsBySuit(
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

export function startVisitAction(draft: GameState, kingdomId: number) {
  const kingdom = draft.kingdoms[kingdomId];
  if (draft.ended || draft.visit !== null || !kingdom || kingdom.visited) {
    return false;
  }

  draft.visit = {
    kingdomId,
    trumpSuit: kingdom.ruler.suit,
    requiredWins: kingdom.requiredWins,
    wins: 0,
    debateTopic: undefined,
    debateRecord: [],
  };
  draft.winLoseMessage = "";
  return true;
}

export type DebateActionResult = "invalid" | "won" | "lost" | "too-many";

export function debateWithCardAction(
  draft: GameState,
  cardId: PlayingCard["id"],
): DebateActionResult {
  const visit = draft.visit;
  const handCard = draft.hand.find((card) => card.id === cardId);
  if (
    draft.ended ||
    !visit?.debateTopic ||
    !handCard ||
    !canDebateWithCard(draft.hand, visit.debateTopic, handCard)
  ) {
    return "invalid";
  }

  const debateTopic = visit.debateTopic;
  const wonTopic = wonDebate(handCard, debateTopic, visit.trumpSuit);
  draft.hand = draft.hand.filter((card) => card.id !== cardId);
  visit.debateRecord.push(wonTopic);

  if (wonTopic) {
    visit.wins += 1;
    draft.discardWon.push(flipToBack(handCard), flipToBack(debateTopic));
  } else {
    draft.discardLost.push(flipToBack(handCard), flipToBack(debateTopic));
  }

  if (visit.wins > visit.requiredWins) {
    draft.visit = null;
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = i18n.t("games:royalEnvoy.tooManyDebates");
    return "too-many";
  }

  visit.debateTopic = undefined;
  return wonTopic ? "won" : "lost";
}

export type FinishVisitActionResult =
  "invalid" | "won-kingdom" | "lost-game" | "won-game";

export function finishVisitAction(draft: GameState): FinishVisitActionResult {
  const visit = draft.visit;
  if (!visit || draft.hand.length > 0) return "invalid";

  const kingdom = draft.kingdoms[visit.kingdomId];
  if (!kingdom) return "invalid";

  const wonKingdom = visit.wins === visit.requiredWins;
  const ruler = kingdom.ruler;
  draft.kingdoms[visit.kingdomId] = {
    ...kingdom,
    visited: true,
    won: wonKingdom,
    ruler: flipToBack(ruler),
  };
  draft.advisors = flipAllToFace(draft.advisors);
  if (wonKingdom) draft.advisors.unshift(ruler);
  sortCardsBySuit(draft.advisors);

  draft.handSize = defaultHandSize;
  draft.visit = null;

  const allKingdomsWon = wonKingdom && draft.kingdoms.every(({ won }) => won);
  draft.ended = !wonKingdom || allKingdomsWon;
  draft.won = allKingdomsWon;
  draft.winLoseMessage = allKingdomsWon
    ? i18n.t("games:royalEnvoy.wonAllKingdoms")
    : !wonKingdom
      ? i18n.t("games:royalEnvoy.tooFewDebates")
      : "";

  if (allKingdomsWon) return "won-game";
  return wonKingdom ? "won-kingdom" : "lost-game";
}

export const royalEnvoyRules = {
  wonDebate,
  canDebateWithCard,
  startVisitAction,
  debateWithCardAction,
  finishVisitAction,
};
