import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  type SandcastleGameState,
  sandcastleSolitaireRules,
} from "@/components/Games/SandcastleSolitaire";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "hearts",
  id = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function state(
  overrides: Partial<SandcastleGameState> = {},
): SandcastleGameState {
  return {
    deck: [card("K", "spades", "deck", false)],
    hand: [],
    columns: [[]],
    discard: [],
    phase: "gather",
    lastColumn: null,
    direction: null,
    reversed: false,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Sandcastle Solitaire rules", () => {
  test("draws one to seven cards in fixed order and permits pre-play reversal", () => {
    const game = state({
      deck: [
        card("A", "clubs", "first", false),
        card("2", "clubs", "second", false),
        card("3", "clubs", "third", false),
      ],
    });

    expect(sandcastleSolitaireRules.drawCards(game, 3)).toBe(true);
    expect(game.hand.map((entry) => entry.id)).toEqual([
      "third",
      "second",
      "first",
    ]);
    expect(game.hand.every((entry) => entry.faceUp)).toBe(true);
    expect(sandcastleSolitaireRules.reverseHand(game)).toBe(true);
    expect(game.hand.map((entry) => entry.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  test("requires a non-empty first column, then locks adjacent direction", () => {
    const game = state({
      hand: [card("6"), card("7"), card("8")],
      columns: [[card("5")], [], [card("Q")]],
      phase: "play",
    });

    expect(sandcastleSolitaireRules.legalColumns(game)).toEqual([0, 2]);
    expect(sandcastleSolitaireRules.playCard(game, 0)).toBe(true);
    expect(sandcastleSolitaireRules.legalColumns(game)).toEqual([-1, 1]);
    expect(sandcastleSolitaireRules.playCard(game, 1)).toBe(true);
    expect(game.direction).toBe(1);
    expect(sandcastleSolitaireRules.legalColumns(game)).toEqual([2]);
    expect(sandcastleSolitaireRules.playCard(game, 1)).toBe(false);
  });

  test("collapses on neither higher rank nor matching suit", () => {
    const game = state({
      hand: [card("4", "clubs")],
      columns: [[card("5", "hearts")]],
      phase: "play",
      deck: [
        card("K", "spades", "one", false),
        card("Q", "spades", "two", false),
      ],
    });

    expect(sandcastleSolitaireRules.playCard(game, 0)).toBe(true);
    expect(game.columns[0].every((entry) => !entry.faceUp)).toBe(true);
    expect(sandcastleSolitaireRules.isStanding(game.columns[0])).toBe(false);
  });

  test("joker inherits the latest highest-ranked card and collapses alone", () => {
    const tiedHighCards = [
      card("Q", "clubs", "older"),
      card("Q", "diamonds", "newer"),
      card("Joker", "spades", "joker"),
    ];

    expect(
      sandcastleSolitaireRules.effectiveJokerMatch(tiedHighCards)?.id,
    ).toBe("newer");
    expect(
      sandcastleSolitaireRules.keepsStanding(
        tiedHighCards,
        card("2", "diamonds"),
      ),
    ).toBe(true);
    expect(sandcastleSolitaireRules.keepsStanding([], card("Joker"))).toBe(
      false,
    );
  });

  test("tide uses the deck first, then ends by comparing castle and discard", () => {
    const game = state({
      deck: [card("A", "spades", "last", false)],
      columns: [
        [card("3", "clubs")],
        [card("4", "clubs")],
        [card("5", "clubs")],
      ],
      discard: [],
      phase: "play",
    });

    sandcastleSolitaireRules.resolveTide(game);

    expect(game.deck).toHaveLength(0);
    expect(game.discard).toHaveLength(2);
    expect(sandcastleSolitaireRules.faceUpCount(game.columns)).toBe(2);
    expect(game.ended).toBe(true);
    expect(game.won).toBe(false);
  });
});
