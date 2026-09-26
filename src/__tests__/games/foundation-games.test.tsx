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
  pressCardId,
  renderGame,
  run,
  acceptAutoCompleteOffer,
} from "../../../jest/game-harness";
import type { CardSuit, PlayingCard } from "@/components/Cards/card-utils";
import BeleagueredCastle from "@/components/Games/BeleagueredCastle";
import ElementaryDetective from "@/components/Games/ElementaryDetective";
import Sultan from "@/components/Games/Sultan";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Sultan", () => {
  const kingSuits: CardSuit[] = [
    "spades",
    "spades",
    "hearts",
    "hearts",
    "diamonds",
    "diamonds",
    "clubs",
  ];

  test("building every foundation to its queen wins", async () => {
    const queen = card("Q", "hearts");
    const foundations = [
      ...kingSuits.map((suit) => [card("K", suit), ...run(suit, "A", "Q")]),
      run("hearts", "A", "J"),
    ];
    await renderGame("/sultan", Sultan, {
      center: card("K", "hearts"),
      foundations,
      reserve: [queen, null, null, null, null, null, null, null],
      stock: [],
      waste: [],
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(queen.id);
    await pressCardId(foundations[7][foundations[7].length - 1].id);

    expect(outcome()).toBe("won");
  });

  test("no moves with the stock and redeals spent loses", async () => {
    const ace = card("A", "spades");
    const foundations = [
      ...kingSuits.map((suit) => [card("K", suit)]),
      [card("A", "hearts")],
    ];
    const reserve: PlayingCard[] = (
      [
        ["9", "diamonds"],
        ["9", "clubs"],
        ["8", "diamonds"],
        ["8", "clubs"],
        ["7", "diamonds"],
        ["7", "clubs"],
        ["6", "diamonds"],
        ["6", "clubs"],
      ] as const
    ).map(([rank, suit]) => card(rank, suit));
    await renderGame("/sultan", Sultan, {
      center: card("K", "hearts"),
      foundations,
      reserve,
      stock: [],
      waste: [card("5", "clubs"), ace],
      redealsUsed: 2,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(ace.id);
    await pressCardId(foundations[0][0].id);

    expect(outcome()).toBe("lost");
  });
});

describe("Elementary Detective", () => {
  function setup(scorePileSize: number) {
    const suits: CardSuit[] = ["spades", "hearts", "diamonds", "clubs"];
    const playmates = Array.from({ length: 12 }, (_, index) => ({
      ...card((["J", "Q", "K"] as const)[index % 3], suits[index % 4]),
      faceUp: index !== 11,
    }));
    const guesses: (PlayingCard | null)[] = Array(14).fill(null);
    // Revealing playmate 11 scores guess slot 3 when the suits match.
    guesses[3] = card("7", playmates[11].suit);
    return {
      playmates,
      guesses,
      draw: [],
      discard: [],
      scorePile: Array.from({ length: scorePileSize }, () =>
        card("2", "clubs", false),
      ),
      ended: false,
      won: false,
      winLoseMessage: "",
    };
  }

  test("revealing the last suspect with 20 points wins", async () => {
    const state = setup(19);
    await renderGame("/elementary-detective", ElementaryDetective, state);
    expect(outcome()).toBe("playing");

    await pressCardId(state.playmates[11].id);

    expect(outcome()).toBe("won");
  });

  test("revealing the last suspect short of 20 points loses", async () => {
    const state = setup(3);
    await renderGame("/elementary-detective", ElementaryDetective, state);
    expect(outcome()).toBe("playing");

    await pressCardId(state.playmates[11].id);

    expect(outcome()).toBe("lost");
  });
});

describe("Beleaguered Castle", () => {
  const emptyColumns = () =>
    Array.from({ length: 8 }, () => [] as PlayingCard[]);

  test("the last king reaching home wins", async () => {
    const king = card("K", "spades");
    const columns = emptyColumns();
    columns[0] = [king];
    await renderGame("/beleaguered-castle", BeleagueredCastle, {
      columns,
      foundations: [
        run("hearts"),
        run("clubs"),
        run("diamonds"),
        run("spades", "A", "Q"),
      ],
      ended: false,
      won: false,
    });

    // One card and one legal move: auto-complete sends the king home
    // during setup, so the outcome is read once that has settled.
    await acceptAutoCompleteOffer();
    expect(outcome()).toBe("won");
  });

  test("no legal move loses", async () => {
    const two = card("2", "spades");
    const columns = emptyColumns();
    columns[0] = [two];
    columns[1] = [card("9", "hearts")];
    columns[2] = [card("5", "diamonds")];
    await renderGame("/beleaguered-castle", BeleagueredCastle, {
      columns,
      foundations: [[card("A", "spades")], [], [], []],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(two.id);

    expect(outcome()).toBe("lost");
  });
});
