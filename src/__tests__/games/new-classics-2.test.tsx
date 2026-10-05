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
  dropMove,
  harness,
  outcome,
  pressCardId,
  pressZone,
  renderGame,
  run,
  settle,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import CrazyQuilt from "@/components/Games/CrazyQuilt";
import GrandfathersClock, {
  grandfathersClockRules,
} from "@/components/Games/GrandfathersClock";
import Labyrinth from "@/components/Games/Labyrinth";
import Parallels from "@/components/Games/Parallels";
import QueensAudience from "@/components/Games/QueensAudience";
import SlyFox from "@/components/Games/SlyFox";
import TenTwentyThirty from "@/components/Games/TenTwentyThirty";
import Windmill from "@/components/Games/Windmill";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const SUITS = ["hearts", "clubs", "diamonds", "spades"] as const;

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

const zoneCardIds = (zoneId: string) =>
  harness.mapConfig?.zones
    .find((zone) => zone.id === zoneId)
    ?.cards?.map((entry) => entry.id) ?? [];

/** Ace and King seeds for the eight up/down foundations. */
const aceKingSeeds = () => [
  ...SUITS.map((suit) => [card("A", suit)]),
  ...SUITS.map((suit) => [card("K", suit)]),
];

/** Every up/down foundation complete except the last King pile's Ace. */
const aceKingAlmostDone = () => [
  ...SUITS.map((suit) => run(suit)),
  ...SUITS.map((suit, index) =>
    run(suit, "K", index === SUITS.length - 1 ? "2" : "A"),
  ),
];

describe("Ten Twenty Thirty", () => {
  test("clearing the last cards wins", async () => {
    const five = card("5", "hearts");
    const other = card("5", "clubs");
    await renderGame("/ten-twenty-thirty", TenTwentyThirty, {
      stock: [],
      line: [five, other],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(five.id);
    await pressCardId(other.id);

    expect(outcome()).toBe("won");
  });

  test("a run between two taps is discarded, and no sum left loses", async () => {
    const two = card("2", "hearts");
    const five = card("5", "diamonds");
    const three = card("3", "clubs");
    const nine = card("9", "spades");
    await renderGame("/ten-twenty-thirty", TenTwentyThirty, {
      stock: [],
      line: [two, three, five, nine],
      discard: [],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);
    await pressCardId(three.id);
    await pressCardId(five.id);

    await settle();
    expect(zoneCardIds("line-0")).toEqual([nine.id]);
    expect(outcome()).toBe("lost");
  });
});

type RowsCase = [string, string, ComponentType, number, boolean];

describe.each<RowsCase>([
  ["Labyrinth", "/labyrinth", Labyrinth, 8, false],
  ["Parallels", "/parallels", Parallels, 10, true],
])("%s", (_name, path, Game, columns, kings) => {
  const row = (...cards: PlayingCard[]) => [
    ...cards,
    ...Array(columns - cards.length).fill(null),
  ];

  test("playing the last card wins", async () => {
    const last = kings ? card("A", "spades") : card("K", "spades");
    await renderGame(path, Game, {
      stock: [],
      rows: [row(last)],
      foundations: kings
        ? aceKingAlmostDone()
        : [
            run("hearts"),
            run("clubs"),
            run("diamonds"),
            run("spades", "A", "Q"),
          ],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(last.id);

    expect(outcome()).toBe("won");
  });

  test("a stuck tableau with no stock loses", async () => {
    const two = card("2", "hearts");
    await renderGame(path, Game, {
      stock: [],
      rows: [row(two, card("9", "clubs"))],
      foundations: kings
        ? aceKingSeeds()
        : SUITS.map((suit) => [card("A", suit)]),
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("lost");
  });

  test("a card covered above and below stays put", async () => {
    const middle = card("2", "clubs");
    await renderGame(path, Game, {
      stock: [card("9", "diamonds", false)],
      rows: [row(card("7", "spades")), row(middle), row(card("8", "spades"))],
      foundations: kings
        ? aceKingSeeds()
        : SUITS.map((suit) => [card("A", suit)]),
      ended: false,
      won: false,
    });

    await pressCardId(middle.id);

    expect(zoneCardIds("cell-1-0")).toEqual([middle.id]);
  });
});

describe("Crazy Quilt", () => {
  test("playing the last card wins", async () => {
    const ace = card("A", "spades");
    const quilt = Array(64).fill(null);
    quilt[0] = ace;
    await renderGame("/crazy-quilt", CrazyQuilt, {
      quilt,
      stock: [],
      waste: [],
      foundations: aceKingAlmostDone(),
      redealsUsed: 1,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(ace.id);

    expect(outcome()).toBe("won");
  });

  test("free cards pack onto the waste, and a stuck quilt loses", async () => {
    const eight = card("8", "diamonds");
    const quilt = Array(64).fill(null);
    quilt[0] = eight;
    quilt[1] = card("4", "clubs");
    await renderGame("/crazy-quilt", CrazyQuilt, {
      quilt,
      stock: [],
      waste: [card("7", "diamonds")],
      foundations: aceKingSeeds(),
      redealsUsed: 1,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(eight.id);

    expect(zoneCardIds("waste")).toContain(eight.id);
    expect(outcome()).toBe("lost");
  });

  test("only cards with a free short end can move", async () => {
    // Index 9 is upright with cards directly above (1) and below (17).
    const blocked = card("2", "hearts");
    const quilt = Array(64).fill(null);
    quilt[1] = card("9", "clubs");
    quilt[9] = blocked;
    quilt[17] = card("9", "spades");
    await renderGame("/crazy-quilt", CrazyQuilt, {
      quilt,
      stock: [card("5", "clubs", false)],
      waste: [],
      foundations: aceKingSeeds(),
      redealsUsed: 0,
      ended: false,
      won: false,
    });

    await pressCardId(blocked.id);

    expect(zoneCardIds("quilt-9")).toEqual([blocked.id]);
  });
});

describe("Grandfather's Clock", () => {
  const { clockStart } = grandfathersClockRules;

  test("striking the last hour wins", async () => {
    const queen = card("Q", "clubs");
    const hours = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
    ] as const;
    const tableau = emptyPiles(8);
    tableau[0] = [queen];
    await renderGame("/grandfathers-clock", GrandfathersClock, {
      deck: [],
      tableau,
      foundations: [
        ...hours.map((rank, index) => [card(rank, clockStart[index][1])]),
        run("clubs", "9", "J"),
      ],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(queen.id);

    expect(outcome()).toBe("won");
  });

  test("the tableau builds down regardless of suit, King on Ace", async () => {
    const five = card("5", "hearts");
    const king = card("K", "diamonds");
    const tableau = emptyPiles(8);
    tableau[0] = [five];
    tableau[1] = [card("6", "clubs")];
    tableau[2] = [king];
    tableau[3] = [card("A", "spades")];
    await renderGame("/grandfathers-clock", GrandfathersClock, {
      deck: [],
      tableau,
      foundations: clockStart.map(([rank, suit]) => [card(rank, suit)]),
      ended: false,
      won: false,
    });

    await dropMove({ pile: 0 }, { zone: "tableau", pile: 1 });
    await dropMove({ pile: 2 }, { zone: "tableau", pile: 3 });

    expect(zoneCardIds("tableau-1")).toContain(five.id);
    expect(zoneCardIds("tableau-3")).toContain(king.id);
  });

  test("no move left loses", async () => {
    const jack = card("J", "hearts");
    const tableau = emptyPiles(8);
    tableau[0] = [jack];
    tableau[1] = [card("4", "clubs")];
    await renderGame("/grandfathers-clock", GrandfathersClock, {
      deck: [],
      tableau,
      foundations: clockStart.map(([rank, suit]) => [card(rank, suit)]),
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await doubleTapCardId(jack.id);

    expect(zoneCardIds("foundation-0")).toContain(jack.id);
    expect(outcome()).toBe("lost");
  });
});

describe("Windmill", () => {
  const sails = (...cards: PlayingCard[]) => [
    ...cards,
    ...Array(8 - cards.length).fill(null),
  ];

  test("playing the last card wins", async () => {
    const king = card("K", "clubs");
    await renderGame("/windmill", Windmill, {
      center: [
        ...run("hearts"),
        ...run("clubs"),
        ...run("diamonds"),
        ...run("spades", "A", "Q"),
      ],
      corners: SUITS.map((suit) => run(suit, "K", "A")),
      sails: sails(king),
      stock: [],
      waste: [],
      cornerPlayedToCenter: false,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);

    expect(outcome()).toBe("won");
  });

  test("no playable sail or waste card loses", async () => {
    const two = card("2", "hearts");
    await renderGame("/windmill", Windmill, {
      center: [card("A", "clubs")],
      corners: emptyPiles(4),
      sails: sails(two, card("9", "clubs")),
      stock: [],
      waste: [],
      cornerPlayedToCenter: false,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("lost");
  });

  test("two corner cards can't go to the centre in a row", async () => {
    const queen = card("Q", "hearts");
    const king = card("K", "clubs");
    const corners = emptyPiles(4);
    corners[0] = [card("K", "spades"), queen];
    corners[1] = [king];
    await renderGame("/windmill", Windmill, {
      center: [card("J", "clubs")],
      corners,
      sails: sails(),
      stock: [card("3", "diamonds", false)],
      waste: [],
      cornerPlayedToCenter: false,
      ended: false,
      won: false,
    });

    await pressCardId(queen.id);
    expect(zoneCardIds("center")).toContain(queen.id);

    await pressCardId(king.id);
    expect(zoneCardIds("corner-1")).toEqual([king.id]);
  });
});

describe("Sly Fox", () => {
  test("playing the last card wins", async () => {
    const ace = card("A", "spades");
    const reserves = emptyPiles(20);
    reserves[0] = [ace];
    await renderGame("/sly-fox", SlyFox, {
      stock: [],
      reserves,
      foundations: aceKingAlmostDone(),
      phase: "play",
      toPlace: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(ace.id);

    expect(outcome()).toBe("won");
  });

  test("an empty stock with nothing to play loses", async () => {
    const two = card("2", "hearts");
    const reserves = emptyPiles(20);
    reserves[0] = [two];
    reserves[1] = [card("9", "clubs")];
    await renderGame("/sly-fox", SlyFox, {
      stock: [],
      reserves,
      foundations: aceKingSeeds(),
      phase: "play",
      toPlace: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);

    expect(outcome()).toBe("lost");
  });

  test("a deal is placed on the reserves of your choice", async () => {
    const nine = card("9", "clubs", false);
    const eight = card("8", "hearts", false);
    const reserves = emptyPiles(20).map(() => [card("5", "diamonds")]);
    await renderGame("/sly-fox", SlyFox, {
      stock: [nine, eight],
      reserves,
      foundations: aceKingSeeds(),
      phase: "opening",
      toPlace: 0,
      ended: false,
      won: false,
    });

    await pressZone((zone) => zone.name === "stock");
    await pressZone((zone) => zone.id === "reserve-3");
    await pressZone((zone) => zone.id === "reserve-3");

    expect(zoneCardIds("reserve-3")).toEqual(
      expect.arrayContaining([eight.id, nine.id]),
    );
    expect(zoneCardIds("stock")).toHaveLength(0);
  });
});

describe("Queen's Audience", () => {
  test("the last royal couple is brought in automatically", async () => {
    const king = card("K", "spades");
    const queen = card("Q", "spades");
    const frame = Array(16).fill(null);
    frame[0] = king;
    frame[1] = queen;
    // Nothing left to turn over, so the forced last move plays itself.
    await renderGame("/queens-audience", QueensAudience, {
      frame,
      stock: [],
      waste: [],
      royals: [
        ...SUITS.slice(0, 3).map((suit) => [card("K", suit), card("Q", suit)]),
        [],
      ],
      foundations: SUITS.map((suit) => [
        card("A", suit),
        card("J", suit),
        ...run(suit, "10", "2"),
      ]),
      ended: false,
      won: false,
    });

    expect(zoneCardIds("royal-3")).toEqual([king.id, queen.id]);
    expect(outcome()).toBe("won");
  });

  test("a royal couple is brought in a card at a time, then the gaps refill", async () => {
    const king = card("K", "spades");
    const queen = card("Q", "spades");
    const wasteTop = card("7", "hearts");
    const refill = card("3", "clubs", false);
    const frame = Array(16).fill(null);
    frame[0] = king;
    frame[5] = queen;
    await renderGame("/queens-audience", QueensAudience, {
      frame,
      stock: [refill],
      waste: [wasteTop],
      royals: emptyPiles(4),
      foundations: emptyPiles(4),
      ended: false,
      won: false,
    });

    await pressCardId(king.id);

    expect(zoneCardIds("royal-3")).toEqual([king.id, queen.id]);
    // Each gap refills from the waste first, then the stock.
    expect(zoneCardIds("frame-0")).toEqual([wasteTop.id]);
    expect(zoneCardIds("frame-5")).toEqual([refill.id]);
  });

  test("a Jack pairs with an Ace from the waste, then nothing is left", async () => {
    const jack = card("J", "hearts");
    const frame = Array(16).fill(null);
    frame[0] = jack;
    frame[1] = card("5", "clubs");
    await renderGame("/queens-audience", QueensAudience, {
      frame,
      stock: [],
      waste: [card("A", "hearts")],
      royals: emptyPiles(4),
      foundations: emptyPiles(4),
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(jack.id);

    expect(zoneCardIds("foundation-0")).toHaveLength(2);
    expect(outcome()).toBe("lost");
  });

  test("foundations build down and gaps refill from the stock", async () => {
    const ten = card("10", "hearts");
    const refill = card("3", "clubs", false);
    const frame = Array(16).fill(null);
    frame[4] = ten;
    await renderGame("/queens-audience", QueensAudience, {
      frame,
      stock: [refill],
      waste: [],
      royals: emptyPiles(4),
      foundations: [[card("A", "hearts"), card("J", "hearts")], [], [], []],
      ended: false,
      won: false,
    });

    await pressCardId(ten.id);

    expect(zoneCardIds("foundation-0")).toContain(ten.id);
    expect(zoneCardIds("frame-4")).toEqual([refill.id]);
  });
});
