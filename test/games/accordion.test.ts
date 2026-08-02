import {
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import { accordionRules } from "@/components/Games/Accordion";

function card(
  rank: CardRank,
  suit: CardSuit,
  id = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("Accordion rules", () => {
  test.each([
    [card("5", "hearts"), card("5", "spades"), true],
    [card("5", "hearts"), card("9", "hearts"), true],
    [card("5", "hearts"), card("9", "spades"), false],
    [undefined, card("9", "spades"), false],
  ])("recognizes rank and suit merges", (source, target, expected) => {
    expect(accordionRules.canMerge(source, target)).toBe(expected);
  });

  test("finds a merge one pile to the left", () => {
    const line = [
      [card("A", "hearts")],
      [card("A", "clubs")],
      [card("5", "diamonds")],
    ];

    expect(accordionRules.hasAnyMove(line)).toBe(true);
  });

  test("finds a merge exactly three piles to the left", () => {
    const line = [
      [card("A", "hearts")],
      [card("3", "clubs")],
      [card("5", "diamonds")],
      [card("A", "spades")],
    ];

    expect(accordionRules.hasAnyMove(line)).toBe(true);
  });

  test("rejects a line with no one-or-three-left merge", () => {
    const line = [
      [card("A", "hearts")],
      [card("3", "clubs")],
      [card("5", "diamonds")],
      [card("7", "spades")],
    ];

    expect(accordionRules.hasAnyMove(line)).toBe(false);
  });
});
