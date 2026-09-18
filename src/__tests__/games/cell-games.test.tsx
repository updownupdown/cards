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
  dropMove,
  outcome,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import BakersGame from "@/components/Games/BakersGame";
import EightOff from "@/components/Games/EightOff";
import FreeCell from "@/components/Games/FreeCell";
import SeahavenTowers from "@/components/Games/SeahavenTowers";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe.each<[string, string, ComponentType, number, number, object]>([
  ["FreeCell", "/freecell", FreeCell, 8, 4, { zone: "cascade", pileIndex: 0 }],
  [
    "Baker's Game",
    "/bakers-game",
    BakersGame,
    8,
    4,
    { zone: "cascade", pileIndex: 0, startIndex: 0 },
  ],
  [
    "Eight Off",
    "/eight-off",
    EightOff,
    8,
    8,
    { zone: "cascade", pileIndex: 0, startIndex: 0 },
  ],
  [
    "Seahaven Towers",
    "/seahaven-towers",
    SeahavenTowers,
    10,
    4,
    { zone: "cascade", pileIndex: 0, startIndex: 0 },
  ],
])(
  "%s (no lose condition)",
  (_name, path, Game, cascadeCount, cellCount, kingSource) => {
    test("playing the last king to the foundations wins", async () => {
      const cascades = Array.from(
        { length: cascadeCount },
        () => [] as PlayingCard[],
      );
      cascades[0] = [card("K", "spades")];
      await renderGame(path, Game, {
        cascades,
        freeCells: Array(cellCount).fill(null),
        foundations: [
          run("hearts"),
          run("clubs"),
          run("diamonds"),
          run("spades", "A", "Q"),
        ],
      });
      expect(outcome()).toBe("playing");

      await dropMove(kingSource, { zone: "foundation", pileIndex: 3 });

      expect(outcome()).toBe("won");
    });
  },
);
