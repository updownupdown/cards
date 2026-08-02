import {
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import { acesUpRules } from "@/components/Games/AcesUp";

function card(
  rank: CardRank,
  suit: CardSuit = "spades",
  id = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("Aces Up rules", () => {
  test("marks only lower same-suit top cards as discardable", () => {
    const piles = [
      [card("K", "hearts")],
      [card("8", "hearts")],
      [card("A", "clubs")],
      [card("K", "clubs")],
    ];

    expect(acesUpRules.getDiscardablePileIndexes(piles)).toEqual(
      new Set([1, 3]),
    );
  });

  test("detects a relocation when an empty pile and two cards remain", () => {
    expect(
      acesUpRules.hasRelocateMove([[card("K")], [card("Q")], [], []]),
    ).toBe(true);
    expect(
      acesUpRules.hasRelocateMove([[card("K")], [], [card("Q")], []]),
    ).toBe(true);
  });

  test("does not report a relocation with only one non-empty pile", () => {
    expect(acesUpRules.hasRelocateMove([[card("K")], [], [], []])).toBe(false);
  });

  test("keeps the game active while stock or legal pile moves remain", () => {
    expect(acesUpRules.evaluateEndState([card("2")], [[], [], [], []])).toEqual(
      { ended: false, won: false },
    );

    expect(
      acesUpRules.evaluateEndState([], [[card("K")], [card("Q")], [], []]),
    ).toEqual({ ended: false, won: false });
  });

  test("wins with exactly four aces and loses on a terminal non-ace board", () => {
    expect(
      acesUpRules.evaluateEndState(
        [],
        [
          [card("A", "hearts")],
          [card("A", "diamonds")],
          [card("A", "clubs")],
          [card("A", "spades")],
        ],
      ),
    ).toEqual({ ended: true, won: true });

    expect(
      acesUpRules.evaluateEndState(
        [],
        [
          [card("K", "hearts")],
          [card("K", "diamonds")],
          [card("K", "clubs")],
          [card("K", "spades")],
        ],
      ),
    ).toEqual({ ended: true, won: false });
  });
});
