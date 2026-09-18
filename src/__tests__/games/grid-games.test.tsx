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
  doubleTapCardId,
  outcome,
  pressButton,
  pressCard,
  pressZone,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";
import CityGrid from "@/components/Games/CityGrid";
import Clock from "@/components/Games/Clock";
import Crescent from "@/components/Games/Crescent";
import PokerSquares from "@/components/Games/PokerSquares";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

describe("Clock", () => {
  test("revealing the 52nd card wins", async () => {
    const piles = emptyPiles(13);
    piles[5] = [card("5", "spades", false)];
    await renderGame("/clock", Clock, {
      piles,
      nextPileIndex: 5,
      prevPileIndex: undefined,
      revealedKings: 0,
      revealedCards: 51,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCard((mapped) => mapped.pileIndex === 5);

    expect(outcome()).toBe("won");
  });

  test("the fourth king loses", async () => {
    const piles = emptyPiles(13);
    piles[0] = [card("K", "spades", false)];
    piles[3] = [card("3", "hearts", false)];
    await renderGame("/clock", Clock, {
      piles,
      nextPileIndex: 0,
      prevPileIndex: undefined,
      revealedKings: 3,
      revealedCards: 10,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCard((mapped) => mapped.pileIndex === 0);

    expect(outcome()).toBe("lost");
  });
});

describe("Poker Squares", () => {
  const suits: CardSuit[] = ["spades", "hearts", "diamonds", "clubs"];

  async function fillLastSquareAndEnd(
    grid: (PlayingCard | null)[],
    last: PlayingCard,
  ) {
    const renderer = await renderGame("/poker-squares", PokerSquares, {
      deck: [last],
      grid,
      score: 0,
      scoresReady: false,
      isTransitioning: false,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "grid" && zone.pileIndex === 24);
    await pressButton(renderer, "End Game");
  }

  test("scoring 200 or more wins", async () => {
    // Four royal-flush rows score 400.
    const royal = (suit: CardSuit) =>
      run(suit, "10", "K").concat(card("A", suit));
    const grid: (PlayingCard | null)[] = [
      ...suits.flatMap(royal),
      card("2", "spades"),
      card("5", "hearts"),
      card("7", "diamonds"),
      card("9", "clubs"),
      null,
    ];

    await fillLastSquareAndEnd(grid, card("3", "hearts"));

    expect(outcome()).toBe("won");
  });

  test("scoring under 200 loses", async () => {
    // No pair, straight or flush in any row or column.
    const ranks: CardRank[] = ["2", "4", "6", "8", "10"];
    const grid: (PlayingCard | null)[] = Array.from(
      { length: 25 },
      (_, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;
        return card(ranks[(row + col) % 5], suits[(row + 2 * col) % 4]);
      },
    );
    const last = grid[24]!;
    grid[24] = null;

    await fillLastSquareAndEnd(grid, last);

    expect(outcome()).toBe("lost");
  });
});

describe("City Grid", () => {
  test("turning every pile face up wins", async () => {
    // The last card is neither the lowest nor highest in its row or column,
    // so it flips nothing back over.
    const ranks: CardRank[] = [
      "2",
      "4",
      "6",
      "3",
      "8",
      "10",
      "2",
      "7",
      "4",
      "6",
      "8",
      "9",
      "3",
      "7",
      "9",
    ];
    const piles = ranks.map((rank) => [card(rank, "spades")]);
    piles.push([]);
    const five = card("5", "hearts");
    await renderGame("/city-grid", CityGrid, {
      draw: [card("2", "clubs", false), five],
      piles,
      ended: false,
      won: false,
      winLoseMessage: "",
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "pile" && zone.pileIndex === 15);

    expect(outcome()).toBe("won");
  });

  test("running out of cards loses", async () => {
    const piles = emptyPiles(16);
    piles[0] = [card("3", "spades")];
    await renderGame("/city-grid", CityGrid, {
      draw: [card("5", "hearts")],
      piles,
      ended: false,
      won: false,
      winLoseMessage: "",
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "pile" && zone.pileIndex === 1);

    expect(outcome()).toBe("lost");
  });
});

describe("Crescent", () => {
  const fullAscending = (suit: CardSuit) => run(suit, "A", "K");
  const fullDescending = (suit: CardSuit) => run(suit, "K", "A");
  const SUIT_ORDER: CardSuit[] = ["hearts", "clubs", "diamonds", "spades"];

  test("completing the last foundation wins", async () => {
    const king = card("K", "spades");
    const tableau = emptyPiles(16);
    tableau[0] = [king];
    await renderGame("/crescent", Crescent, {
      setupPile: [],
      tableau,
      ascending: SUIT_ORDER.map((suit) =>
        suit === "spades" ? run(suit, "A", "Q") : fullAscending(suit),
      ),
      descending: SUIT_ORDER.map(fullDescending),
      restacksUsed: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(king.id);

    expect(outcome()).toBe("won");
  });

  test("no moves with the restacks spent loses", async () => {
    const two = card("2", "spades");
    const tableau = emptyPiles(16);
    tableau[0] = [two];
    tableau[1] = [card("9", "hearts")];
    await renderGame("/crescent", Crescent, {
      setupPile: [],
      tableau,
      ascending: SUIT_ORDER.map((suit) => [card("A", suit)]),
      descending: SUIT_ORDER.map((suit) => [card("K", suit)]),
      restacksUsed: 3,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(two.id);

    expect(outcome()).toBe("lost");
  });
});
