import { describe, expect, test } from "@jest/globals";
import type { PlayingCard } from "@/components/Cards/card-utils";
import { klondikeRules } from "@/components/Games/Klondike";
import { planAutoComplete } from "@/hooks/useAutoComplete";

const card = (
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  faceUp = true,
): PlayingCard => ({ id: `${rank}-${suit}`, rank, suit, faceUp });

const empty = () => Array.from({ length: 4 }, () => [] as PlayingCard[]);

describe("planAutoComplete", () => {
  test("plans every move when all cards can go up in order", () => {
    const sources = [
      [card("3", "hearts"), card("2", "hearts")],
      [card("2", "spades"), card("A", "hearts")],
      [card("A", "spades")],
    ];

    const moves = planAutoComplete(
      sources,
      empty(),
      klondikeRules.canPlaceOnFoundation,
    );

    expect(moves).toHaveLength(5);
    // Lowest ranks first: both aces before any two.
    expect(moves!.slice(0, 2).map((move) => move.source).sort()).toEqual([
      1, 2,
    ]);
    // The input piles are not modified.
    expect(sources.map((pile) => pile.length)).toEqual([2, 2, 1]);
  });

  test("returns null when a buried card blocks the rest", () => {
    const sources = [[card("A", "hearts"), card("2", "hearts")]];

    expect(
      planAutoComplete(sources, empty(), klondikeRules.canPlaceOnFoundation),
    ).toBeNull();
  });

  test("never moves face-down cards", () => {
    const sources = [[card("A", "clubs", false)]];

    expect(
      planAutoComplete(sources, empty(), klondikeRules.canPlaceOnFoundation),
    ).toBeNull();
  });

  test("returns null when there is nothing left to move", () => {
    expect(
      planAutoComplete([[]], empty(), klondikeRules.canPlaceOnFoundation),
    ).toBeNull();
  });
});
