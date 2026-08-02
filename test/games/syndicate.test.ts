import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  syndicateRules,
  type SyndicateGameState,
  type SyndicateRankBand,
} from "@/components/Games/Syndicate";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "spades", faceUp: true };
}

function band(
  members: PlayingCard[] = [],
  candidates: PlayingCard[] = [],
): SyndicateRankBand {
  return { members, candidates };
}

function state(ranks: SyndicateRankBand[]): SyndicateGameState {
  return {
    ranks: [
      ...ranks,
      ...Array.from({ length: 5 - ranks.length }, () => band()),
    ],
    dead: [],
    ended: false,
    won: false,
  };
}

describe("Syndicate rules", () => {
  test.each([
    ["9", "4", "5", true],
    ["2", "3", "4", true],
    ["A", "3", "7", true],
    ["8", "3", "4", false],
  ] as const)(
    "checks candidate %s against remaining %s and %s",
    (candidate, first, second, expected) => {
      expect(
        syndicateRules.replacementMatches(
          card(candidate),
          card(first),
          card(second),
        ),
      ).toBe(expected);
    },
  );

  test("treats Tens as zero", () => {
    expect(syndicateRules.cardVal(card("10"))).toBe(0);
    expect(
      syndicateRules.replacementMatches(card("10"), card("5"), card("5")),
    ).toBe(true);
  });

  test("normalizes negative last digits", () => {
    expect(syndicateRules.lastDigit(-1)).toBe(9);
    expect(syndicateRules.lastDigit(-20)).toBe(0);
  });

  test("finds a move by considering each possible promoted member", () => {
    const game = state([
      band(
        [card("2", "member-2"), card("3", "member-3"), card("8", "member-8")],
        [card("4", "candidate-4")],
      ),
    ]);

    expect(syndicateRules.hasAnyMove(game)).toBe(true);
  });

  test("ignores bands without exactly three members", () => {
    expect(
      syndicateRules.hasAnyMove(
        state([band([card("2"), card("3")], [card("6")])]),
      ),
    ).toBe(false);
  });

  test("reports no move when every candidate misses", () => {
    const game = state([
      band(
        [card("2", "member-2"), card("4", "member-4"), card("6", "member-6")],
        [card("9", "candidate-9")],
      ),
    ]);

    expect(syndicateRules.hasAnyMove(game)).toBe(false);
  });
});
