import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  outcome,
  pressButton,
  pressCard,
  pressCardId,
  pressZone,
  renderGame,
} from "../../../jest/game-harness";
import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";
import Calculation from "@/components/Games/Calculation";
import CribbageSquares from "@/components/Games/CribbageSquares";
import Dominion from "@/components/Games/Dominion";
import RedDiamond, { redDiamondRules } from "@/components/Games/RedDiamond";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const SUITS: CardSuit[] = ["spades", "hearts", "diamonds", "clubs"];

describe("Dominion", () => {
  const board = () => Array.from({ length: 15 }, () => [] as PlayingCard[]);

  test("conquering down to a single dominion wins", async () => {
    const five = card("5", "spades");
    const nine = card("9", "spades");
    const piles = board();
    piles[0] = [five];
    piles[1] = [nine];
    await renderGame("/dominion", Dominion, {
      board: piles,
      reserve: [],
      reserveActive: null,
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(five.id);
    await pressCardId(nine.id);

    expect(outcome()).toBe("won");
  });

  test("leaving a card isolated loses", async () => {
    const five = card("5", "spades");
    const nine = card("9", "spades");
    const piles = board();
    piles[0] = [five];
    piles[1] = [nine];
    piles[2] = [card("9", "hearts")];
    await renderGame("/dominion", Dominion, {
      board: piles,
      reserve: [],
      reserveActive: null,
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(five.id);
    await pressCardId(nine.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Red Diamond", () => {
  const diamonds = () => [
    card("5", "diamonds"),
    card("6", "diamonds"),
    card("7", "diamonds"),
    card("8", "diamonds"),
  ];
  const emptyPiles = () => Array.from({ length: 9 }, () => [] as PlayingCard[]);

  test("playing the last black card wins", async () => {
    const five = card("5", "clubs");
    await renderGame("/red-diamond", RedDiamond, {
      diamonds: diamonds(),
      diamondStock: [card("9", "diamonds", false)],
      blackStock: [],
      discard: [],
      hand: [five],
      piles: emptyPiles(),
      lost: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(five.id);
    // The north pile matches the first diamond's value.
    await pressZone((zone) => zone.name === "pile" && zone.pileIndex === 0);

    expect(outcome()).toBe("won");
  });

  test("filling a pile with no diamonds left to replenish loses", async () => {
    const five = card("5", "clubs");
    const piles = emptyPiles();
    piles[0] = [card("5", "clubs"), card("5", "spades")];
    await renderGame("/red-diamond", RedDiamond, {
      diamonds: diamonds(),
      diamondStock: [],
      blackStock: [],
      discard: [],
      hand: [five, card("9", "spades")],
      piles,
      lost: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(five.id);
    await pressZone((zone) => zone.name === "pile" && zone.pileIndex === 0);

    expect(outcome()).toBe("lost");
  });

  // Hand 9♣ J♣ against diamonds Q 6 7 3: only the north-west pile (12 - 3)
  // and the center would take the nine, and both are topped by clubs.
  const deadPosition = () => {
    const piles = emptyPiles();
    piles[7] = [card("9", "spades"), card("2", "clubs")];
    piles[8] = [card("10", "clubs")];
    return {
      diamonds: [
        card("Q", "diamonds"),
        card("6", "diamonds"),
        card("7", "diamonds"),
        card("3", "diamonds"),
      ],
      diamondStock: [],
      blackStock: [card("4", "spades", false)],
      discard: [],
      hand: [card("9", "clubs"), card("J", "clubs")],
      piles,
      lost: false,
    };
  };

  test("no fitting card and no diamonds left is a dead position", () => {
    const state = deadPosition();
    expect(redDiamondRules.isDeadPosition(state)).toBe(true);
    expect(redDiamondRules.bestMove(state)).toBeNull();

    // A single diamond in stock still allows a swap.
    expect(
      redDiamondRules.isDeadPosition({
        ...state,
        diamondStock: [card("8", "diamonds", false)],
      }),
    ).toBe(false);
    // A card that fits somewhere can still be played.
    expect(
      redDiamondRules.isDeadPosition({
        ...state,
        hand: [card("9", "spades")],
      }),
    ).toBe(false);
  });

  test("a dead position ends the game as a loss", async () => {
    await renderGame("/red-diamond", RedDiamond, deadPosition());

    expect(outcome()).toBe("lost");
  });
});

describe("Cribbage Squares", () => {
  async function placeLastCardAndEnd(
    grid: (PlayingCard | null)[],
    last: PlayingCard,
    starter: PlayingCard,
  ) {
    const renderer = await renderGame("/cribbage-squares", CribbageSquares, {
      grid,
      stock: [{ ...starter, faceUp: false }],
      current: last,
      starter: null,
      score: 0,
      scoresReady: false,
      isTransitioning: false,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "grid" && zone.pileIndex === 15);
    await pressButton(renderer, "End Game");
  }

  test("scoring 61 or more wins", async () => {
    // Every line of fives (with a five starter) scores 40.
    const grid: (PlayingCard | null)[] = Array.from(
      { length: 16 },
      (_, index) => card("5", SUITS[index % 4]),
    );
    grid[15] = null;

    await placeLastCardAndEnd(grid, card("5", "clubs"), card("5", "hearts"));

    expect(outcome()).toBe("won");
  });

  test("scoring under 61 loses", async () => {
    // K, J, 9, 7 in every line: no fifteens, pairs, runs or flushes.
    const ranks: CardRank[] = ["K", "J", "9", "7"];
    const grid: (PlayingCard | null)[] = Array.from(
      { length: 16 },
      (_, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        return card(ranks[(row + col) % 4], SUITS[(2 * row + col) % 4]);
      },
    );
    const last = grid[15]!;
    grid[15] = null;

    await placeLastCardAndEnd(grid, last, card("3", "hearts"));

    expect(outcome()).toBe("lost");
  });
});

describe("Calculation", () => {
  const sequence = (ranks: CardRank[], suit: CardSuit) =>
    ranks.map((rank) => card(rank, suit));

  test("building all 52 cards wins", async () => {
    const king = card("K", "spades");
    await renderGame("/calculation", Calculation, {
      draw: [king],
      foundations: [
        sequence(
          ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q"],
          "spades",
        ),
        sequence(
          ["2", "4", "6", "8", "10", "Q", "A", "3", "5", "7", "9", "J", "K"],
          "hearts",
        ),
        sequence(
          ["3", "6", "9", "Q", "2", "5", "8", "J", "A", "4", "7", "10", "K"],
          "diamonds",
        ),
        sequence(
          ["4", "8", "Q", "3", "7", "J", "2", "6", "10", "A", "5", "9", "K"],
          "clubs",
        ),
      ],
      wastes: [[], [], [], []],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);
    await pressCard(
      (mapped) => mapped.zoneId === "foundation-0" && mapped.topOfZone,
    );

    expect(outcome()).toBe("won");
  });

  test("no playable card with an empty stock loses", async () => {
    const two = card("2", "spades");
    await renderGame("/calculation", Calculation, {
      draw: [two],
      foundations: [
        [card("A", "spades")],
        [card("2", "hearts")],
        [card("3", "diamonds")],
        [card("4", "clubs")],
      ],
      wastes: [[card("9", "hearts")], [], [], []],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);
    await pressCard(
      (mapped) => mapped.zoneId === "foundation-0" && mapped.topOfZone,
    );

    expect(outcome()).toBe("lost");
  });
});
