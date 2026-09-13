import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  dropMove,
  outcome,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import Alaska from "@/components/Games/Alaska";
import Moosehide from "@/components/Games/Moosehide";
import RoyalRest from "@/components/Games/RoyalRest";
import RussianSolitaire from "@/components/Games/RussianSolitaire";
import Yukon from "@/components/Games/Yukon";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe.each<[string, string, ComponentType]>([
  ["Yukon", "/yukon", Yukon],
  ["Alaska", "/alaska", Alaska],
  ["Moosehide", "/moosehide", Moosehide],
  ["Russian Solitaire", "/russian-solitaire", RussianSolitaire],
])("%s (no lose condition)", (_name, path, Game) => {
  test("moving the last king to the foundations wins", async () => {
    const columns = Array.from({ length: 7 }, () => [] as PlayingCard[]);
    columns[0] = [card("K", "spades")];
    // A face-down card keeps auto-complete from finishing the game by itself.
    columns[1] = [card("9", "hearts", false)];
    await renderGame(path, Game, {
      setupPile: [],
      columns,
      foundations: [
        run("hearts"),
        run("clubs"),
        run("diamonds"),
        run("spades", "A", "Q"),
      ],
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { pileIndex: 0, cardIndex: 0 },
      { zone: "foundation", pileIndex: 3 },
    );

    expect(outcome()).toBe("won");
  });
});

describe("Royal Rest (no lose condition)", () => {
  // A finished column is pillow (face-down number), jack, pillow.
  const restingColumn = () => [
    card("5", "spades", false),
    card("J", "spades"),
    card("6", "spades", false),
  ];

  test("putting the last pillow on the last jack wins", async () => {
    await renderGame("/royal-rest", RoyalRest, {
      tableau: [
        restingColumn(),
        restingColumn(),
        restingColumn(),
        [card("7", "hearts", false), card("J", "hearts")],
        [card("8", "hearts", false)],
      ],
      hand: [null, null, null, null],
      discard: [],
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pileIndex: 4, cardIndex: 0 },
      { zone: "tableau", pileIndex: 3 },
    );

    expect(outcome()).toBe("won");
  });
});
