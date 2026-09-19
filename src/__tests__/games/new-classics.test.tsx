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
  pressButton,
  pressCardId,
  pressZone,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import Carpet from "@/components/Games/Carpet";
import Cruel from "@/components/Games/Cruel";
import Frog from "@/components/Games/Frog";
import PussInTheCorner from "@/components/Games/PussInTheCorner";
import RoyalCotillion from "@/components/Games/RoyalCotillion";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

const zoneCardIds = (zoneId: string) =>
  harness.mapConfig?.zones
    .find((zone) => zone.id === zoneId)
    ?.cards?.map((entry) => entry.id) ?? [];

describe("Carpet", () => {
  test("playing the last card wins", async () => {
    const king = card("K", "spades");
    const carpet = Array(20).fill(null);
    carpet[0] = king;
    await renderGame("/carpet", Carpet, {
      stock: [],
      waste: [],
      carpet,
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

    await pressCardId(king.id);

    expect(outcome()).toBe("won");
  });

  test("a gap refills from the waste, then nothing is playable", async () => {
    const three = card("3", "hearts");
    const nine = card("9", "clubs");
    const carpet = Array(20).fill(null);
    carpet[0] = three;
    await renderGame("/carpet", Carpet, {
      stock: [],
      waste: [nine],
      carpet,
      foundations: [
        run("hearts", "A", "2"),
        [card("A", "clubs")],
        [card("A", "diamonds")],
        [card("A", "spades")],
      ],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(three.id);

    expect(zoneCardIds("carpet-0")).toEqual([nine.id]);
    expect(outcome()).toBe("lost");
  });
});

describe("Royal Cotillion", () => {
  const seeds = () => [
    ...(["hearts", "clubs", "diamonds", "spades"] as const).map((suit) => [
      card("A", suit),
    ]),
    ...(["hearts", "clubs", "diamonds", "spades"] as const).map((suit) => [
      card("2", suit),
    ]),
  ];

  test("playing the last card wins", async () => {
    const queen = card("Q", "spades");
    const right = Array(16).fill(null);
    right[0] = queen;
    await renderGame("/royal-cotillion", RoyalCotillion, {
      left: emptyPiles(4),
      right,
      stock: [],
      waste: [],
      foundations: [
        run("hearts"),
        run("clubs"),
        run("diamonds"),
        run("spades"),
        run("hearts"),
        run("clubs"),
        run("diamonds"),
        [...run("hearts", "A", "J"), card("10", "spades")],
      ],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(queen.id);

    expect(outcome()).toBe("won");
  });

  test("foundations build in twos, and a stuck board loses", async () => {
    const three = card("3", "hearts");
    const right = Array(16).fill(null);
    right[0] = three;
    right[1] = card("9", "clubs");
    await renderGame("/royal-cotillion", RoyalCotillion, {
      left: emptyPiles(4),
      right,
      stock: [],
      waste: [],
      foundations: seeds(),
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(three.id);

    expect(zoneCardIds("foundation-0")).toContain(three.id);
    expect(outcome()).toBe("lost");
  });

  test("an empty right-hand space fills from the waste", async () => {
    const seven = card("7", "diamonds");
    await renderGame("/royal-cotillion", RoyalCotillion, {
      left: emptyPiles(4),
      right: Array(16).fill(null),
      stock: [card("8", "clubs", false)],
      waste: [seven],
      foundations: seeds(),
      ended: false,
      won: false,
    });

    await pressZone((zone) => zone.id === "right-5");

    expect(zoneCardIds("right-5")).toEqual([seven.id]);
  });
});

type WastePilesCase = [
  string,
  string,
  ComponentType,
  number,
  number,
  PlayingCard["suit"],
];

describe.each<WastePilesCase>([
  ["Frog", "/frog", Frog, 8, 5, "hearts"],
  ["Puss in the Corner", "/puss-in-the-corner", PussInTheCorner, 4, 4, "clubs"],
])("%s", (_name, path, Game, foundationCount, wasteCount, sixSuit) => {
  const fixture = (overrides: object) => ({
    stock: [],
    reserve: [],
    waste: emptyPiles(wasteCount),
    foundations: emptyPiles(foundationCount),
    redealsUsed: 1,
    ended: false,
    won: false,
    ...overrides,
  });

  test("playing the last card wins", async () => {
    const king = card("K", "spades");
    const waste = emptyPiles(wasteCount);
    waste[0] = [king];
    const foundations = Array.from({ length: foundationCount }, (_, index) =>
      index === foundationCount - 1 ? run("spades", "A", "Q") : run("clubs"),
    );
    await renderGame(path, Game, fixture({ waste, foundations }));
    expect(outcome()).toBe("playing");

    await doubleTapCardId(king.id);

    expect(outcome()).toBe("won");
  });

  test("a spent stock with no foundation move loses", async () => {
    const six = card("6", sixSuit);
    const waste = emptyPiles(wasteCount);
    waste[0] = [six];
    waste[1] = [card("9", "diamonds")];
    const foundations = emptyPiles(foundationCount);
    foundations[0] = run("spades", "A", "5");
    await renderGame(path, Game, fixture({ waste, foundations }));
    expect(outcome()).toBe("playing");

    await doubleTapCardId(six.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Puss in the Corner redeal", () => {
  test("an empty stock gathers the waste piles once", async () => {
    const waste = emptyPiles(4);
    waste[0] = [card("9", "hearts"), card("4", "diamonds")];
    waste[1] = [card("7", "clubs")];
    await renderGame("/puss-in-the-corner", PussInTheCorner, {
      stock: [],
      reserve: [],
      waste,
      foundations: (["hearts", "clubs", "diamonds", "spades"] as const).map(
        (suit) => [card("A", suit)],
      ),
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "stock");

    expect(zoneCardIds("stock")).toHaveLength(3);
    expect(outcome()).toBe("playing");
  });
});

describe("Cruel", () => {
  test("automatically plays the last card home", async () => {
    const king = card("K", "spades");
    const tableau = emptyPiles(12);
    tableau[0] = [king];
    await renderGame("/cruel", Cruel, {
      deck: [],
      tableau,
      foundations: [
        run("hearts"),
        run("clubs"),
        run("diamonds"),
        run("spades", "A", "Q"),
      ],
      canRedeal: false,
      ended: false,
      won: false,
    });

    expect(outcome()).toBe("won");
  });

  test("builds down in suit, and a fruitless redeal loses", async () => {
    const six = card("6", "hearts");
    const tableau = emptyPiles(12);
    tableau[0] = [six];
    tableau[1] = [card("7", "hearts")];
    tableau[2] = [card("9", "clubs")];
    const renderer = await renderGame("/cruel", Cruel, {
      deck: [],
      tableau,
      foundations: [
        run("hearts", "A", "4"),
        [card("A", "clubs")],
        [card("A", "diamonds")],
        [card("A", "spades")],
      ],
      canRedeal: false,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove({ pile: 0 }, { zone: "tableau", pile: 1 });
    expect(zoneCardIds("tableau-1")).toContain(six.id);
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Redeal");

    expect(outcome()).toBe("lost");
  });
});
