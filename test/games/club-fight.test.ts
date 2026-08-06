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
    discard: [],
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
    expect(clubFightRules.createDiscard("easy")).toHaveLength(53);
    expect(clubFightRules.createDiscard("hard")).toHaveLength(54);
  });

  test("collects every card face-down before shuffling a new deal", () => {
    const game = state({
      clubsDeck: [card("A", "clubs-deck")],
      gridDeck: [card("2", "grid-deck", "diamonds")],
      hand: [card("3", "hand")],
      grid: [
        card("4", "grid", "hearts"),
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      discard: [card("5", "discard", "spades")],
    });

    expect(clubFightRules.collectCards(game)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "clubs-deck", faceUp: false }),
        expect.objectContaining({ id: "grid-deck", faceUp: false }),
        expect.objectContaining({ id: "hand", faceUp: false }),
        expect.objectContaining({ id: "grid", faceUp: false }),
        expect.objectContaining({ id: "discard", faceUp: false }),
      ]),
    );
    expect(clubFightRules.shuffleCards([], "easy")).toHaveLength(53);
    expect(clubFightRules.shuffleCards([], "hard")).toHaveLength(54);
  });

  test("blocks Row/Column, Up/Down, and Run after three relevant suits", () => {
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
    expect(clubFightRules.isBlocked(diamonds.grid, "row")).toBe(true);
    expect(clubFightRules.isBlocked(diamonds.grid, "column")).toBe(true);
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

  test("returns clear indexes only for directly executable actions", () => {
    const game = state({
      grid: [
        card("6", "six", "diamonds"),
        card("4", "four", "spades"),
        card("7", "seven", "hearts"),
        card("8", "eight", "spades"),
        card("9", "nine", "hearts"),
        null,
        card("7", "seven-diamonds", "diamonds"),
        null,
        null,
      ],
    });
    const club = card("6", "club");

    expect(
      clubFightRules.getActionClearIndexes(game, club, "match", []),
    ).toEqual([0]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "match", [1]),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "sum", [1, 2]),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "sum", [1]),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "any", [1]),
    ).toEqual([1]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "any", [1, 2]),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "row", [0]),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "column", [0]),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "row", [0, 1, 2]),
    ).toEqual([0, 1, 2]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "column", [0, 3, 6]),
    ).toEqual([0, 3, 6]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "row", [0, 1, 3]),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(game, club, "row", [1]),
    ).toEqual([]);
    expect(clubFightRules.getActionClearIndexes(game, club, "up", [])).toEqual(
      [],
    );
    expect(
      clubFightRules.getActionClearIndexes(
        game,
        card("7", "seven-club"),
        "up",
        [],
      ),
    ).toEqual([3, 4]);
    expect(
      clubFightRules.getActionClearIndexes(
        game,
        card("7", "seven-club"),
        "up",
        [0],
      ),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(
        game,
        card("7", "seven-club"),
        "down",
        [],
      ),
    ).toEqual([0, 1]);
    expect(
      clubFightRules.getActionClearIndexes(
        game,
        card("7", "seven-club"),
        "down",
        [0],
      ),
    ).toEqual([]);
    expect(
      clubFightRules.getActionClearIndexes(
        game,
        card("6", "run-club"),
        "run",
        [2, 3],
      ),
    ).toEqual([2, 3]);
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
    expect(game.discard.map((entry) => entry.id)).toEqual([
      "club",
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
