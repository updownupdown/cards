import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  outcome,
  pressButton,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import ChapterAndVerse from "@/components/Games/ChapterAndVerse";
import Gridlines from "@/components/Games/Gridlines";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Chapter and Verse", () => {
  function shopState(customer: PlayingCard, guildScore: number, interactions: number) {
    return {
      inventory: [card("9", "clubs")],
      shelves: Array.from({ length: 8 }, (_, index) =>
        card(String((index % 9) + 2) as PlayingCard["rank"], "diamonds"),
      ),
      lockedShelves: Array(8).fill(false),
      line: [customer],
      usedBooks: [card("5", "hearts")],
      guildScore,
      discard: [],
      interactions,
      ended: false,
      won: false,
    };
  }

  test("serving the twelfth customer wins", async () => {
    const renderer = await renderGame(
      "/chapter-and-verse",
      ChapterAndVerse,
      shopState(card("J", "spades"), 5, 11),
    );
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Pass");

    expect(outcome()).toBe("won");
  });

  test("losing all guild standing (fired) loses", async () => {
    const renderer = await renderGame(
      "/chapter-and-verse",
      ChapterAndVerse,
      shopState(card("K", "spades"), 0, 3),
    );
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Pass");

    expect(outcome()).toBe("lost");
  });
});

describe("Gridlines", () => {
  function tableState(hand: PlayingCard[], firstRow: PlayingCard[], scores: { youScore: number; gridScore: number }) {
    const grid = Array.from({ length: 36 }, () => ({
      card: null as PlayingCard | null,
      faceUp: false,
    }));
    firstRow.forEach((rowCard, index) => {
      grid[index] = { card: rowCard, faceUp: true };
    });
    return {
      grid,
      hand,
      playerWon: [],
      gridWon: [],
      discard: [],
      trump: null,
      trumpPhase: false,
      ...scores,
      round: 3,
      ended: false,
      won: false,
    };
  }

  // Row 0 starts with the only spade, so a spade challenge meets the 2.
  const firstRow = () => [
    card("2", "spades"),
    card("3", "hearts"),
    card("4", "hearts"),
    card("5", "hearts"),
    card("6", "hearts"),
    card("7", "hearts"),
  ];

  test("reaching 21 tricks wins", async () => {
    const king = card("K", "spades");
    const renderer = await renderGame(
      "/gridlines",
      Gridlines,
      tableState([king], firstRow(), { youScore: 20, gridScore: 4 }),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);
    await pressButton(renderer, "▶");

    expect(outcome()).toBe("won");
  });

  test("the grid reaching its target loses", async () => {
    const lowSpade = card("3", "spades");
    const row = firstRow();
    row[0] = card("K", "spades");
    const renderer = await renderGame(
      "/gridlines",
      Gridlines,
      tableState([lowSpade, card("9", "diamonds")], row, {
        youScore: 4,
        gridScore: 20,
      }),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(lowSpade.id);
    await pressButton(renderer, "▶");

    expect(outcome()).toBe("lost");
  });
});
