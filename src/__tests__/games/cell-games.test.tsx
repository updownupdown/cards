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
  acceptAutoCompleteOffer,
  card,
  outcome,
  renderVariant,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import type { ComponentType } from "react";
import EightOff from "@/components/Games/EightOff";
import FreeCell from "@/components/Games/FreeCell";
import SeahavenTowers from "@/components/Games/SeahavenTowers";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe.each<[string, string, string, ComponentType, number, number]>([
  ["FreeCell", "/freecell", "freecell", FreeCell, 8, 4],
  ["Baker's Game", "/freecell", "bakers-game", FreeCell, 8, 4],
  ["Eight Off", "/eight-off", "", EightOff, 8, 8],
  ["Seahaven Towers", "/seahaven-towers", "", SeahavenTowers, 10, 4],
])(
  "%s (no lose condition)",
  (_name, path, variant, Game, cascadeCount, cellCount) => {
    test("the last king reaching the foundations wins", async () => {
      const cascades = Array.from(
        { length: cascadeCount },
        () => [] as PlayingCard[],
      );
      cascades[0] = [card("K", "spades")];
      await renderVariant(path, variant, Game, {
        cascades,
        freeCells: Array(cellCount).fill(null),
        foundations: [
          run("hearts"),
          run("clubs"),
          run("diamonds"),
          run("spades", "A", "Q"),
        ],
      });

      // One card and one legal move: the game offers to send the king home.
      await acceptAutoCompleteOffer();
      expect(outcome()).toBe("won");
    });
  },
);
