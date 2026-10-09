import { describe, expect, test } from "@jest/globals";
import {
  newDeckRules,
  type NewDeckGameState,
} from "@/components/Games/NewDeck";
import { solveNewDeck } from "@/components/Games/new-deck-solver";
import {
  createDeck,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";

const {
  deckIndex,
  countRuns,
  targetsFor,
  moveCard,
  isWon,
  isLost,
  createDeal,
} = newDeckRules;

function card(rank: PlayingCard["rank"], suit: CardSuit): PlayingCard {
  return { id: `${rank}${suit}`, rank, suit, faceUp: true };
}

function state(columns: PlayingCard[][]): NewDeckGameState {
  return {
    pack: [],
    columns,
    deck: Array.from({ length: 52 }, () => null),
    moves: 0,
    par: null,
  };
}

function cardCount(game: NewDeckGameState) {
  return (
    game.columns.flat().length +
    game.deck.filter((spot) => spot !== null).length
  );
}

describe("New Deck", () => {
  test("orders the deck spades, hearts, diamonds, clubs, Ace to King", () => {
    expect(deckIndex(card("A", "spades"))).toBe(0);
    expect(deckIndex(card("K", "spades"))).toBe(12);
    expect(deckIndex(card("A", "hearts"))).toBe(13);
    expect(deckIndex(card("K", "clubs"))).toBe(51);
    const indexes = createDeck()
      .map(deckIndex)
      .sort((a, b) => a - b);
    expect(indexes).toEqual(Array.from({ length: 52 }, (_, i) => i));
  });

  test("deals every card face up into eight columns, winnable, with a par", () => {
    for (let i = 0; i < 5; i += 1) {
      const game = createDeal();
      expect(game.columns).toHaveLength(8);
      expect(game.columns.flat()).toHaveLength(52);
      expect(game.columns.flat().every((c) => c.faceUp)).toBe(true);
      expect(game.par).not.toBeNull();
      const { moves } = solveNewDeck(
        game.columns.map((column) => column.map(deckIndex)),
        newDeckRules.MAX_RUNS,
      );
      expect(moves).toBe(game.par);
    }
  });

  test("builds only onto the next card in order, a King onto the next Ace", () => {
    const game = state([
      [card("A", "hearts")],
      [card("5", "clubs"), card("K", "spades")],
      [card("7", "spades")],
      [card("2", "clubs"), card("6", "spades")],
    ]);
    expect(targetsFor(game, 1).columns).toEqual([0]);
    expect(targetsFor(game, 3).columns).toEqual([2]);
    expect(targetsFor(game, 2).columns).toEqual([]);
  });

  test("a card next to the new deck goes in by itself, and runs join", () => {
    const game = state([
      [card("4", "spades"), card("2", "spades")],
      [card("6", "spades")],
      [card("9", "clubs"), card("5", "spades")],
    ]);
    // Start runs at the 2 and the 6: the 5 then follows the 6 in.
    expect(moveCard(game, 0, "deck")).toBe(true);
    expect(moveCard(game, 1, "deck")).toBe(true);
    expect(game.deck[deckIndex(card("5", "spades"))]).not.toBeNull();
    // The 4 follows the 5, leaving a gap at the 3 between two runs.
    expect(game.deck[deckIndex(card("4", "spades"))]).not.toBeNull();
    expect(countRuns(game)).toBe(2);
    expect(game.moves).toBe(2);
    expect(cardCount(game)).toBe(5);
  });

  test("allows only five runs at once", () => {
    const columns = ["A", "3", "5", "7", "9", "J"].map((rank) => [
      card(rank as PlayingCard["rank"], "hearts"),
    ]);
    const game = state(columns);
    for (let i = 0; i < 5; i += 1) expect(moveCard(game, i, "deck")).toBe(true);
    expect(countRuns(game)).toBe(5);
    expect(targetsFor(game, 5).deck).toBe(false);
    expect(moveCard(game, 5, "deck")).toBe(false);
    expect(isLost(game)).toBe(true);
  });

  test("random play never loses a card", () => {
    for (let deal = 0; deal < 20; deal += 1) {
      const game = createDeal();
      for (let step = 0; step < 300 && !isWon(game) && !isLost(game); step++) {
        const options = game.columns.flatMap((_, from) => {
          const targets = targetsFor(game, from);
          return [
            ...(targets.deck ? [{ from, to: "deck" as const }] : []),
            ...targets.columns.map((to) => ({ from, to })),
          ];
        });
        const pick = options[Math.floor(Math.random() * options.length)];
        expect(moveCard(game, pick.from, pick.to)).toBe(true);
        expect(cardCount(game)).toBe(52);
      }
    }
  });
});
