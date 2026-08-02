import { type PlayingCard } from "@/components/Cards/card-utils";
import { theEmissaryRules } from "@/components/Games/TheEmissary/TheEmissaryLogic";
import {
  defaultHandSize,
  type GameState,
  type TheEmissaryKingdom,
} from "@/components/Games/TheEmissary/TheEmissaryTypes";
import { exploreGame, type GameModel } from "../framework/game-model";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function kingdom(
  id: number,
  overrides: Partial<TheEmissaryKingdom> = {},
): TheEmissaryKingdom {
  return {
    id,
    ruler: card("K", id % 2 === 0 ? "hearts" : "clubs", `ruler-${id}`),
    requiredWins: id + 1,
    visited: false,
    won: false,
    ...overrides,
  };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    kingdoms: [kingdom(0), kingdom(1)],
    draw: [],
    discardWon: [],
    discardLost: [],
    advisors: [],
    visit: null,
    hand: [],
    handNeedsOrdering: false,
    ended: false,
    won: false,
    winLoseMessage: "",
    neededToHand: 0,
    discardFromHand: 0,
    handSize: defaultHandSize,
    ...overrides,
  };
}

describe("The Emissary rules", () => {
  test("wins with a higher card of the topic suit", () => {
    expect(
      theEmissaryRules.wonDebate(
        card("8", "hearts"),
        card("7", "hearts"),
        "clubs",
      ),
    ).toBe(true);
    expect(
      theEmissaryRules.wonDebate(
        card("6", "hearts"),
        card("7", "hearts"),
        "clubs",
      ),
    ).toBe(false);
  });

  test("a trump card beats a non-trump topic regardless of rank", () => {
    expect(
      theEmissaryRules.wonDebate(
        card("2", "spades"),
        card("K", "hearts"),
        "spades",
      ),
    ).toBe(true);
  });

  test("requires a higher card when the topic is already trump", () => {
    expect(
      theEmissaryRules.wonDebate(
        card("2", "spades"),
        card("A", "spades"),
        "spades",
      ),
    ).toBe(true);
    expect(
      theEmissaryRules.wonDebate(
        card("K", "hearts"),
        card("A", "spades"),
        "spades",
      ),
    ).toBe(false);
  });

  test("requires following the topic suit when the hand can follow", () => {
    const hand = [card("3", "hearts"), card("K", "spades")];
    const topic = card("7", "hearts");

    expect(theEmissaryRules.canDebateWithCard(hand, topic, hand[0])).toBe(true);
    expect(theEmissaryRules.canDebateWithCard(hand, topic, hand[1])).toBe(
      false,
    );
  });

  test("allows any suit when the hand cannot follow", () => {
    const handCard = card("K", "spades");

    expect(
      theEmissaryRules.canDebateWithCard(
        [handCard, card("4", "clubs")],
        card("7", "hearts"),
        handCard,
      ),
    ).toBe(true);
    expect(
      theEmissaryRules.canDebateWithCard([handCard], undefined, handCard),
    ).toBe(false);
  });

  test("starts only an available kingdom visit", () => {
    const game = state({ winLoseMessage: "old result" });

    expect(theEmissaryRules.startVisitAction(game, 0)).toBe(true);
    expect(game.visit).toEqual({
      kingdomId: 0,
      trumpSuit: "hearts",
      requiredWins: 1,
      wins: 0,
      debateTopic: undefined,
      debateRecord: [],
    });
    expect(game.winLoseMessage).toBe("");

    const snapshot = structuredClone(game);
    expect(theEmissaryRules.startVisitAction(game, 1)).toBe(false);
    expect(game).toEqual(snapshot);
  });

  test("resolves a legal debate and rejects breaking follow-suit", () => {
    const legalCard = card("8", "hearts", "legal");
    const illegalCard = card("A", "spades", "illegal");
    const topic = card("7", "hearts", "topic");
    const game = state({ hand: [legalCard, illegalCard] });
    theEmissaryRules.startVisitAction(game, 0);
    game.visit!.debateTopic = topic;

    const beforeInvalid = structuredClone(game);
    expect(theEmissaryRules.debateWithCardAction(game, illegalCard.id)).toBe(
      "invalid",
    );
    expect(game).toEqual(beforeInvalid);

    expect(theEmissaryRules.debateWithCardAction(game, legalCard.id)).toBe(
      "won",
    );
    expect(game.hand).toEqual([illegalCard]);
    expect(game.visit).toMatchObject({ wins: 1, debateRecord: [true] });
    expect(game.visit?.debateTopic).toBeUndefined();
    expect(game.discardWon.map(({ id }) => id)).toEqual(["legal", "topic"]);
    expect(game.discardWon.every(({ faceUp }) => !faceUp)).toBe(true);
  });

  test("loses immediately after exceeding the required wins", () => {
    const debateCard = card("8", "hearts", "debate");
    const game = state({ hand: [debateCard] });
    theEmissaryRules.startVisitAction(game, 0);
    game.visit!.wins = 1;
    game.visit!.debateTopic = card("7", "hearts", "topic");

    expect(theEmissaryRules.debateWithCardAction(game, debateCard.id)).toBe(
      "too-many",
    );
    expect(game).toMatchObject({ visit: null, ended: true, won: false });
    expect(game.winLoseMessage).toContain("too many debates");
  });

  test("finishes a won kingdom and promotes its ruler to advisor", () => {
    const existingAdvisor = {
      ...card("J", "spades", "advisor"),
      faceUp: false,
    };
    const game = state({ advisors: [existingAdvisor] });
    theEmissaryRules.startVisitAction(game, 0);
    game.visit!.wins = 1;

    expect(theEmissaryRules.finishVisitAction(game)).toBe("won-kingdom");
    expect(game.kingdoms[0]).toMatchObject({ visited: true, won: true });
    expect(game.kingdoms[0].ruler.faceUp).toBe(false);
    expect(game.advisors.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["ruler-0", "advisor"]),
    );
    expect(game.advisors.every(({ faceUp }) => faceUp)).toBe(true);
    expect(game).toMatchObject({ visit: null, ended: false, won: false });
  });

  test("a failed visit loses, while winning the final kingdom wins the game", () => {
    const failed = state();
    theEmissaryRules.startVisitAction(failed, 0);
    expect(theEmissaryRules.finishVisitAction(failed)).toBe("lost-game");
    expect(failed).toMatchObject({ ended: true, won: false });

    const final = state({
      kingdoms: [
        kingdom(0, { visited: true, won: true }),
        kingdom(1, { requiredWins: 1 }),
      ],
    });
    theEmissaryRules.startVisitAction(final, 1);
    final.visit!.wins = 1;
    expect(theEmissaryRules.finishVisitAction(final)).toBe("won-game");
    expect(final).toMatchObject({ ended: true, won: true });
  });

  test("exhaustively distinguishes exact wins from excessive wins", () => {
    type CampaignState = { game: GameState; topics: PlayingCard[] };
    type Outcome = "won-kingdom" | "too-many";
    const model: GameModel<CampaignState, string, Outcome> = {
      getActions: ({ game }) => game.hand.map(({ id }) => id),
      applyAction: (current, cardId) => {
        const next = structuredClone(current);
        theEmissaryRules.debateWithCardAction(next.game, cardId);
        if (next.game.ended) return next;
        if (next.game.hand.length === 0) {
          theEmissaryRules.finishVisitAction(next.game);
        } else {
          next.game.visit!.debateTopic = next.topics.shift();
        }
        return next;
      },
      getOutcome: ({ game }) => {
        if (game.ended) return "too-many";
        return game.visit === null ? "won-kingdom" : null;
      },
      getStateKey: (current) => JSON.stringify(current),
      assertInvariants: ({ game, topics }) => {
        const debateCards = [
          ...game.hand,
          ...game.discardWon,
          ...game.discardLost,
          ...(game.visit?.debateTopic ? [game.visit.debateTopic] : []),
          ...topics,
        ].filter(({ id }) => id.startsWith("debate-"));
        expect(debateCards).toHaveLength(4);
        expect(new Set(debateCards.map(({ id }) => id)).size).toBe(4);
      },
    };
    const game = state({
      hand: [
        card("6", "hearts", "debate-hand-6"),
        card("8", "hearts", "debate-hand-8"),
      ],
    });
    theEmissaryRules.startVisitAction(game, 0);
    game.visit!.debateTopic = card("5", "hearts", "debate-topic-5");

    const result = exploreGame(
      model,
      {
        game,
        topics: [card("7", "hearts", "debate-topic-7")],
      },
      { maxDepth: 2, checkMutations: true },
    );

    expect(result.deadEnds).toHaveLength(0);
    expect(result.truncatedPaths).toHaveLength(0);
    expect([...result.outcomes.keys()].sort()).toEqual([
      "too-many",
      "won-kingdom",
    ]);
  });
});
