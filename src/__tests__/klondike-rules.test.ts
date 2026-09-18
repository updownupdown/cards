import { describe, expect, test } from "@jest/globals";
import type { PlayingCard } from "@/components/Cards/card-utils";
import { klondikeRules } from "@/components/Games/Klondike";

const card = (
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  faceUp = true,
): PlayingCard => ({ id: `${rank}-${suit}`, rank, suit, faceUp });

describe("klondikeRules", () => {
  test("only a king can start an empty tableau pile", () => {
    expect(klondikeRules.canPlaceOnTableau(card("K", "spades"))).toBe(true);
    expect(klondikeRules.canPlaceOnTableau(card("Q", "hearts"))).toBe(false);
  });

  test("tableau builds down by one in alternating colours", () => {
    const kingOfSpades = card("K", "spades");

    expect(
      klondikeRules.canPlaceOnTableau(card("Q", "hearts"), kingOfSpades),
    ).toBe(true);
    expect(
      klondikeRules.canPlaceOnTableau(card("Q", "clubs"), kingOfSpades),
    ).toBe(false);
    expect(
      klondikeRules.canPlaceOnTableau(card("J", "hearts"), kingOfSpades),
    ).toBe(false);
  });

  test("foundations start with an ace and build up by suit", () => {
    expect(klondikeRules.canPlaceOnFoundation(card("A", "clubs"))).toBe(true);
    expect(klondikeRules.canPlaceOnFoundation(card("2", "clubs"))).toBe(false);

    const aceOfClubs = card("A", "clubs");
    expect(
      klondikeRules.canPlaceOnFoundation(card("2", "clubs"), aceOfClubs),
    ).toBe(true);
    expect(
      klondikeRules.canPlaceOnFoundation(card("2", "spades"), aceOfClubs),
    ).toBe(false);
    expect(
      klondikeRules.canPlaceOnFoundation(card("3", "clubs"), aceOfClubs),
    ).toBe(false);
  });

  test("a run is valid only if it descends in alternating colours", () => {
    expect(klondikeRules.isValidTableauRun([])).toBe(true);
    expect(
      klondikeRules.isValidTableauRun([
        card("K", "spades"),
        card("Q", "hearts"),
        card("J", "clubs"),
      ]),
    ).toBe(true);
    expect(
      klondikeRules.isValidTableauRun([
        card("K", "spades"),
        card("Q", "clubs"),
      ]),
    ).toBe(false);
    expect(
      klondikeRules.isValidTableauRun([
        card("K", "spades"),
        card("J", "hearts"),
      ]),
    ).toBe(false);
  });

  test("revealLastIfNeeded flips only the last card, without mutating", () => {
    const pile = [card("9", "hearts", false), card("5", "clubs", false)];
    const revealed = klondikeRules.revealLastIfNeeded(pile);

    expect(revealed.map((c) => c.faceUp)).toEqual([false, true]);
    expect(pile[1].faceUp).toBe(false);
    expect(klondikeRules.revealLastIfNeeded([])).toEqual([]);
  });
});
