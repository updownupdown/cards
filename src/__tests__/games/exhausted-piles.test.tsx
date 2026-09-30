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
  harness,
  renderGame,
  renderVariant,
} from "../../../jest/game-harness";
import {
  SUITS,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import { EXHAUSTED_PILE_PLACEHOLDER } from "@/components/Cards/CardMap";
import Bisley from "@/components/Games/Bisley";
import Crescent from "@/components/Games/Crescent";
import Cruel from "@/components/Games/Cruel";
import FlowerGarden from "@/components/Games/FlowerGarden";
import LaBelleLucie from "@/components/Games/LaBelleLucie";

// An empty pile no card can ever be moved onto again shows the "unavailable"
// placeholder, so the player stops looking at it. Piles that can be filled
// never show it.

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const emptyPiles = (count: number) =>
  Array.from({ length: count }, () => [] as PlayingCard[]);

/** The placeholder icon of every zone called `name`, by whether it's empty. */
function placeholders(name: string) {
  const zones = harness.mapConfig!.zones.filter((zone) => zone.name === name);
  return {
    empty: zones
      .filter((zone) => (zone.cards ?? []).length === 0)
      .map((zone) => zone.placeholder?.iconName),
    filled: zones
      .filter((zone) => (zone.cards ?? []).length > 0)
      .map((zone) => zone.placeholder?.iconName),
  };
}

function expectClosedWhenEmpty(name: string) {
  const { empty, filled } = placeholders(name);
  expect(empty.length).toBeGreaterThan(0);
  expect(new Set(empty)).toEqual(
    new Set([EXHAUSTED_PILE_PLACEHOLDER.iconName]),
  );
  expect(filled).not.toContain(EXHAUSTED_PILE_PLACEHOLDER.iconName);
}

describe("Exhausted piles", () => {
  test("Bisley: an empty column closes for good", async () => {
    const columns = emptyPiles(13);
    columns[0] = [card("K", "spades")];
    columns[1] = [card("9", "hearts")];
    await renderGame("/bisley", Bisley, {
      columns,
      ascending: emptyPiles(4),
      descending: emptyPiles(4),
      ended: false,
      won: false,
      deal: [],
    });
    expectClosedWhenEmpty("column");
  });

  test("Crescent: an empty pile is never filled", async () => {
    const tableau = emptyPiles(16);
    tableau[0] = [card("7", "spades")];
    const suits: CardSuit[] = ["hearts", "clubs", "diamonds", "spades"];
    await renderGame("/crescent", Crescent, {
      setupPile: [],
      tableau,
      ascending: suits.map((suit) => [card("A", suit)]),
      descending: suits.map((suit) => [card("K", suit)]),
      restacksUsed: 0,
      ended: false,
      won: false,
    });
    expectClosedWhenEmpty("tableau");
  });

  test("Cruel: no card is moved onto an empty pile", async () => {
    const tableau = emptyPiles(12);
    tableau[0] = [card("9", "spades")];
    tableau[1] = [card("5", "hearts")];
    await renderGame("/cruel", Cruel, {
      deck: [],
      tableau,
      foundations: SUITS.map((suit) => [card("A", suit)]),
      canRedeal: false,
      ended: false,
      won: false,
    });
    expectClosedWhenEmpty("tableau");
  });

  test.each([
    ["la-belle-lucie", 18],
    ["trefoil", 16],
    ["shamrocks", 18],
  ])(
    "La Belle Lucie (%s): an emptied fan stays empty",
    async (variant, count) => {
      const tableau = emptyPiles(count);
      tableau[0] = [card("9", "spades")];
      await renderVariant("/la-belle-lucie", variant, LaBelleLucie, {
        setupPile: [],
        tableau,
        reserve: [],
        foundations: emptyPiles(4),
        redealsUsed: 0,
        ended: false,
        won: false,
      });
      expectClosedWhenEmpty("tableau");
    },
  );

  test("Flower Garden: empty columns can be filled, so they stay open", async () => {
    const tableau = emptyPiles(6);
    tableau[0] = [card("9", "spades")];
    await renderGame("/flower-garden", FlowerGarden, {
      setupPile: [],
      tableau,
      reserve: [card("7", "clubs")],
      foundations: emptyPiles(4),
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    const { empty } = placeholders("tableau");
    expect(empty.length).toBeGreaterThan(0);
    expect(empty).not.toContain(EXHAUSTED_PILE_PLACEHOLDER.iconName);
  });
});
