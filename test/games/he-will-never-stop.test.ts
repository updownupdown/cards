import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";
import {
  heWillNeverStopRules,
  type HeWillNeverStopGameState,
} from "@/components/Games/HeWillNeverStop";

function card(
  rank: CardRank,
  id: string = rank,
  suit: CardSuit = "spades",
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(
  overrides: Partial<HeWillNeverStopGameState> = {},
): HeWillNeverStopGameState {
  return {
    deck: [],
    hand: [],
    discard: [],
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("He Will Never Stop rules", () => {
  test("builds a 32-card deck containing ranks 2 through 9 only", () => {
    const deck = heWillNeverStopRules.createDeck();

    expect(deck).toHaveLength(32);
    expect(new Set(deck.map((entry) => entry.rank))).toEqual(
      new Set(["2", "3", "4", "5", "6", "7", "8", "9"]),
    );
  });

  test("pursuit continues only while the surviving original prefix is a run of three", () => {
    const game = state({
      hand: ["3", "4", "5", "6", "2", "7"].map((rank, index) =>
        card(rank as CardRank, `hand-${index}`),
      ),
    });

    heWillNeverStopRules.pursue(game);

    expect(game.hand.map((entry) => entry.rank)).toEqual(["5", "6", "2", "7"]);
    expect(game.discard.map((entry) => entry.rank)).toEqual(["3", "4"]);
  });

  test("pursuit does not cascade into a sequence that starts after the first card", () => {
    const game = state({
      hand: ["9", "3", "4", "5", "2"].map((rank, index) =>
        card(rank as CardRank, `hand-${index}`),
      ),
    });

    heWillNeverStopRules.pursue(game);

    expect(game.hand.map((entry) => entry.rank)).toEqual(["3", "4", "5", "2"]);
    expect(game.discard.map((entry) => entry.rank)).toEqual(["9"]);
  });

  test("search discards every matching rank and draws replacements to the right", () => {
    const game = state({
      hand: [card("2", "first"), card("4", "remove"), card("2", "second")],
      deck: [card("9", "draw-second"), card("8", "draw-first")],
    });

    heWillNeverStopRules.searchRank(game, "2");

    expect(game.discard.map((entry) => entry.id)).toEqual(["first", "second"]);
    expect(game.hand.map((entry) => entry.id)).toEqual([
      "remove",
      "draw-first",
      "draw-second",
    ]);
  });

  test("cannot move a card already in a three-card sequence", () => {
    const game = state({ hand: [card("2"), card("3"), card("4"), card("7")] });
    const before = structuredClone(game);

    expect(heWillNeverStopRules.escapeCard(game, 1, 3)).toBe(false);
    expect(game).toEqual(before);
  });

  test("escape draws two cards when the moved card joins a sequence", () => {
    const game = state({
      hand: [
        card("2", "two"),
        card("3", "three"),
        card("4", "four"),
        card("7", "seven"),
        card("5", "five"),
      ],
      deck: [card("9", "draw-two"), card("8", "draw-one")],
    });

    expect(heWillNeverStopRules.escapeCard(game, 4, 3)).toBe(true);
    expect(game.hand.map((entry) => entry.id)).toEqual([
      "two",
      "three",
      "four",
      "five",
      "seven",
      "draw-one",
      "draw-two",
    ]);
  });

  test("four adjacent equal ranks win, while an empty hand loses before deck exhaustion", () => {
    const win = state({
      hand: [card("6", "a"), card("6", "b"), card("6", "c"), card("6", "d")],
    });
    heWillNeverStopRules.evaluateEnd(win);
    expect(win).toMatchObject({ ended: true, won: true });

    const loss = state();
    heWillNeverStopRules.evaluateEnd(loss);
    expect(loss).toMatchObject({ ended: true, won: false });
  });
});
