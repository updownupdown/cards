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
  pressCardId,
  pressZone,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Baroness from "@/components/Games/Baroness";
import Gaps from "@/components/Games/Gaps";
import SirTommy from "@/components/Games/SirTommy";
import TripleStack from "@/components/Games/TripleStack";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

describe("Baroness", () => {
  test("removing the last king wins", async () => {
    const king = card("K", "spades");
    const piles = emptyPiles(5);
    piles[2] = [king];
    await renderGame("/baroness", Baroness, {
      piles,
      draw: [],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);

    expect(outcome()).toBe("won");
  });

  test("no thirteen left to make loses", async () => {
    const king = card("K", "spades");
    const piles = emptyPiles(5);
    piles[0] = [king];
    piles[1] = [card("5", "hearts")];
    await renderGame("/baroness", Baroness, {
      piles,
      draw: [],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Gaps", () => {
  const COLS = 13;
  const suits = ["spades", "hearts", "diamonds", "clubs"] as const;

  test("moving the last king home wins", async () => {
    const grid: (PlayingCard | null)[] = suits.flatMap((suit) => [
      ...run(suit, "2", "K"),
      null,
    ]);
    // Row 0 has its king one space too far right.
    grid[11] = null;
    grid[12] = card("K", "spades");

    await renderGame("/gaps", Gaps, {
      setupPile: [],
      grid,
      maxRedeals: 2,
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "cell" && zone.pileIndex === 11);

    expect(outcome()).toBe("won");
  });

  test("no moves and no redeals left loses", async () => {
    const grid: (PlayingCard | null)[] = Array(4 * COLS).fill(null);
    grid[5] = card("2", "spades");
    // Kings fill the other first-column gaps, and nothing follows a king.
    grid[COLS] = card("K", "clubs");
    grid[COLS * 2] = card("K", "diamonds");
    grid[COLS * 3] = card("K", "hearts");

    await renderGame("/gaps", Gaps, {
      setupPile: [],
      grid,
      maxRedeals: 2,
      redealsUsed: 2,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "cell" && zone.pileIndex === 0);

    expect(outcome()).toBe("lost");
  });
});

describe("Sir Tommy", () => {
  test("playing the last card to the foundations wins", async () => {
    const king = card("K", "spades");
    const waste = emptyPiles(4);
    waste[0] = [king];
    await renderGame("/sir-tommy", SirTommy, {
      stock: [],
      waste,
      foundations: [
        run("hearts"),
        run("clubs"),
        run("diamonds"),
        run("spades", "A", "Q"),
      ],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(king.id);

    expect(outcome()).toBe("won");
  });

  test("a spent stock with no foundation move loses", async () => {
    const six = card("6", "hearts");
    const waste = emptyPiles(4);
    waste[0] = [six];
    waste[1] = [card("9", "clubs")];
    await renderGame("/sir-tommy", SirTommy, {
      stock: [],
      waste,
      foundations: [run("spades", "A", "5"), [], [], []],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(six.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Triple Stack", () => {
  // Kept cards take values from {K, A, 3, 4}, which (mod 13) holds no
  // three-term progression, so no sandwich can be made from them.
  const sandwich = () => [
    card("6", "spades"),
    card("7", "spades"),
    card("8", "spades"),
  ];
  const kept = () => [
    card("K", "hearts"),
    card("K", "diamonds"),
    card("A", "hearts"),
    card("A", "diamonds"),
    card("3", "hearts"),
  ];

  async function serve(
    renderer: Awaited<ReturnType<typeof renderGame>>,
    cards: PlayingCard[],
  ) {
    for (const selected of cards) await pressCardId(selected.id);
    await pressButton(renderer, "Serve Sandwich");
  }

  test("drawing out the deck wins", async () => {
    const served = sandwich();
    const renderer = await renderGame("/triple-stack", TripleStack, {
      hand: [...served, ...kept()],
      deck: [
        card("4", "hearts", false),
        card("4", "diamonds", false),
        card("3", "diamonds", false),
      ],
      discard: [],
      won: false,
      ended: false,
      dealFirstHand: false,
    });
    expect(outcome()).toBe("playing");

    await serve(renderer, served);

    expect(outcome()).toBe("won");
  });

  test("a hand with no sandwich loses", async () => {
    const served = sandwich();
    const renderer = await renderGame("/triple-stack", TripleStack, {
      hand: [...served, ...kept()],
      deck: [
        card("9", "clubs", false),
        card("10", "clubs", false),
        card("3", "diamonds", false),
        card("4", "diamonds", false),
        card("4", "hearts", false),
      ],
      discard: [],
      won: false,
      ended: false,
      dealFirstHand: false,
    });
    expect(outcome()).toBe("playing");

    await serve(renderer, served);

    expect(outcome()).toBe("lost");
  });
});
