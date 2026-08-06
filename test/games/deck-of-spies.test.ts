import {
  type CardRank,
  type CardSuit,
  createDeck,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import { deckOfSpiesRules } from "@/components/Games/DeckOfSpies";

function card(
  rank: CardRank,
  suit: CardSuit = "spades",
  id = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

const noShuffle = <T>(cards: T[]) => [...cards];

describe("Deck of Spies rules", () => {
  test("builds tiered piles and deals five A-4 cards", () => {
    const game = deckOfSpiesRules.createGame(createDeck(), noShuffle);

    expect(game.spyDeck).toHaveLength(36);
    expect(game.drawDeck).toHaveLength(11);
    expect(game.hand).toHaveLength(5);
    expect(game.removedDeck).toEqual([]);
    expect(
      game.hand.every((entry) => ["A", "2", "3", "4"].includes(entry.rank)),
    ).toBe(true);
    expect(["5", "6", "7"]).toContain(game.spyDeck.at(-1)?.rank);
    expect(game.spyDeck.every((entry) => entry.faceUp)).toBe(true);
    expect(game.drawDeck.every((entry) => !entry.faceUp)).toBe(true);
  });

  test("requires a minimal counter combination", () => {
    const spy = card("5", "hearts", "spy");

    expect(
      deckOfSpiesRules.isMinimalCounter(
        [card("3", "clubs", "three"), card("4", "spades", "four")],
        spy,
      ),
    ).toBe(true);
    expect(
      deckOfSpiesRules.isMinimalCounter(
        [
          card("3", "clubs", "three"),
          card("4", "spades", "four"),
          card("2", "diamonds", "extra"),
        ],
        spy,
      ),
    ).toBe(false);
    expect(deckOfSpiesRules.isMinimalCounter([card("4")], spy)).toBe(false);
  });

  test("recruits with one suit or a matching Double Agent", () => {
    const spy = card("9", "clubs", "spy");

    expect(
      deckOfSpiesRules.canRecruit(
        [card("4", "clubs", "four"), card("5", "clubs", "five")],
        spy,
      ),
    ).toBe(true);
    expect(
      deckOfSpiesRules.canRecruit(
        [
          card("A", "clubs", "ace"),
          card("4", "hearts", "four"),
          card("4", "spades", "other-four"),
        ],
        spy,
      ),
    ).toBe(true);
    expect(
      deckOfSpiesRules.canRecruit(
        [card("A", "hearts", "wrong-ace"), card("8", "spades", "eight")],
        spy,
      ),
    ).toBe(false);
  });

  test("retires only sets of two through four matching ranks", () => {
    expect(
      deckOfSpiesRules.canRetire([
        card("2", "clubs", "one"),
        card("2", "hearts", "two"),
      ]),
    ).toBe(true);
    expect(deckOfSpiesRules.canRetire([card("2")])).toBe(false);
    expect(
      deckOfSpiesRules.canRetire([
        card("2", "clubs", "two"),
        card("3", "hearts", "three"),
      ]),
    ).toBe(false);
  });

  test("recycles the discard face down while refilling to five", () => {
    const result = deckOfSpiesRules.drawToFive(
      [],
      [card("6", "clubs", "six"), card("7", "hearts", "seven")],
      [card("2", "spades", "two")],
      noShuffle,
    );

    expect(result.drawDiscard).toEqual([]);
    expect(result.hand).toHaveLength(3);
    expect(result.hand.every((entry) => entry.faceUp)).toBe(true);
  });

  test("wins only with more Key Spies than the Spy Discard", () => {
    const base = deckOfSpiesRules.createGame(createDeck(), noShuffle);
    const personal = [card("J", "clubs", "jack"), card("Q", "clubs", "queen")];
    const discarded = [card("K", "clubs", "king")];

    expect(
      deckOfSpiesRules.scoreGame({
        ...base,
        hand: personal,
        drawDeck: [],
        drawDiscard: [],
        spyDiscard: discarded,
      }),
    ).toEqual({ personalCount: 2, discardedCount: 1, won: true });
    expect(
      deckOfSpiesRules.scoreGame({
        ...base,
        hand: [personal[0]],
        drawDeck: [],
        drawDiscard: [],
        spyDiscard: discarded,
      }).won,
    ).toBe(false);
  });
});
