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

describe.each<[string, string, ComponentType, number, number]>([
  ["FreeCell", "/freecell", FreeCell, 8, 4],
  ["Baker's Game", "/bakers-game", BakersGame, 8, 4],
  ["Eight Off", "/eight-off", EightOff, 8, 8],
  ["Seahaven Towers", "/seahaven-towers", SeahavenTowers, 10, 4],
])(
  "%s (no lose condition)",
  (_name, path, Game, cascadeCount, cellCount) => {
    test("the last king reaching the foundations wins", async () => {
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

      // One card and one legal move: auto-complete sends the king home
      // during setup, so the outcome is read once that has settled.
      expect(outcome()).toBe("won");
    });
  },
);
