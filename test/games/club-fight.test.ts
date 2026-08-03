import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";
import {
  clubFightRules,
  type ClubFightGameState,
} from "@/components/Games/ClubFight";

function card(
  rank: CardRank,
  id: string = rank,
  suit: CardSuit = "clubs",
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(
  overrides: Partial<ClubFightGameState> = {},
): ClubFightGameState {
  return {
    clubsDeck: [],
    gridDeck: [],
    hand: [],
    grid: Array.from({ length: 9 }, () => null),
    clubsDiscard: [],
    gridDiscard: [],
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

describe("Club Fight rules", () => {
  test("creates 13 Club cards and adds Jokers only to the grid deck", () => {
    expect(clubFightRules.createDecks("easy")).toMatchObject({
      clubs: expect.any(Array),
      grid: expect.any(Array),
    });
    expect(clubFightRules.createDecks("easy").clubs).toHaveLength(13);
    expect(clubFightRules.createDecks("easy").grid).toHaveLength(40);
    expect(clubFightRules.createDecks("hard").grid).toHaveLength(41);
  });

  test("blocks Line, Up/Down, and Run after three relevant suits", () => {
    const diamonds = state({
      grid: [
        card("2", "a", "diamonds"),
        card("3", "b", "diamonds"),
        card("4", "c", "diamonds"),
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    });
    const spades = state({
      grid: [
        card("2", "a", "spades"),
        card("3", "b", "spades"),
        card("4", "c", "spades"),
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    });
    const hearts = state({
      grid: [
        card("2", "a", "hearts"),
        card("3", "b", "hearts"),
        card("4", "c", "hearts"),
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    });

    expect(clubFightRules.isBlocked(diamonds.grid, "line")).toBe(true);
    expect(clubFightRules.isBlocked(spades.grid, "up")).toBe(true);
    expect(clubFightRules.isBlocked(hearts.grid, "run")).toBe(true);
  });

  test("requires selected Sum cards to exactly equal the Club value", () => {
    const game = state({
      grid: [
        card("6", "six", "spades"),
        card("4", "four", "hearts"),
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    });
    const club = card("10", "club");

    expect(
      clubFightRules.getClearIndexes(game, club, "sum", [0, 1], null),
    ).toEqual([0, 1]);
    expect(
      clubFightRules.getClearIndexes(game, club, "sum", [0], null),
    ).toEqual([]);
  });

  test("validates a nonwrapping Run with the spent Club", () => {
    const club = card("10", "club");
    expect(
      clubFightRules.isRunWithClub(club, [
        card("8", "eight"),
        card("9", "nine"),
        card("J", "jack"),
      ]),
    ).toBe(true);
    expect(
      clubFightRules.isRunWithClub(card("K", "king"), [card("A", "ace")]),
    ).toBe(false);
  });

  test("clears a matching Line, refreshes slots, and spends exactly one Club", () => {
    const game = state({
      hand: [card("6", "club")],
      grid: [
        card("6", "match", "spades"),
        card("Joker", "joker"),
        card("3", "other", "hearts"),
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      gridDeck: [
        card("4", "refill-three"),
        card("5", "refill-two"),
        card("7", "refill-one"),
      ],
    });

    expect(clubFightRules.playAction(game, "club", "line", [], 0)).toBe(true);
    expect(game.clubsDiscard.map((entry) => entry.id)).toEqual(["club"]);
    expect(game.gridDiscard.map((entry) => entry.id)).toEqual([
      "match",
      "joker",
      "other",
    ]);
    expect(game.grid.slice(0, 3).map((entry) => entry?.id)).toEqual([
      "refill-one",
      "refill-two",
      "refill-three",
    ]);
  });

  test("wins only when both the grid and grid deck are empty", () => {
    const game = state();
    clubFightRules.evaluateOutcome(game);
    expect(game).toMatchObject({ ended: true, won: true });
  });
});
