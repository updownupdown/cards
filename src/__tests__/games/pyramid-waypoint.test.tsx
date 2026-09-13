import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  outcome,
  pressButton,
  pressCardId,
  pressZone,
  renderGame,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Pyramid from "@/components/Games/Pyramid";
import Waypoint from "@/components/Games/Waypoint";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Pyramid", () => {
  // Index 27 is the bottom-right card (row 6, col 6); 26 is its neighbour.
  const bottomRow = (rank: PlayingCard["rank"], suit: PlayingCard["suit"], col: number) => ({
    ...card(rank, suit),
    row: 6,
    col,
  });

  test("removing the last king clears the pyramid and wins", async () => {
    const king = bottomRow("K", "spades", 6);
    const pyramid = Array(28).fill(null);
    pyramid[27] = king;
    await renderGame("/pyramid", Pyramid, {
      pyramid,
      waste: [],
      discard: [],
      stockCount: 0,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);

    expect(outcome()).toBe("won");
  });

  test("no pair to make with the stock empty loses", async () => {
    const king = bottomRow("K", "spades", 6);
    const pyramid = Array(28).fill(null);
    pyramid[27] = king;
    pyramid[26] = bottomRow("9", "hearts", 5);
    await renderGame("/pyramid", Pyramid, {
      pyramid,
      waste: [],
      discard: [],
      stockCount: 0,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(king.id);

    expect(outcome()).toBe("lost");
  });
});

describe("Waypoint", () => {
  function finalSector(gearCard: PlayingCard, damage: number) {
    return {
      stage: 3,
      gearOne: [gearCard],
      gearTwo: [],
      gearThree: [],
      shuffle: [],
      // The last sector of the last stage, needing exactly 5.
      sectors: [[card("5", "spades")]],
      sectorRows: [0.45],
      boosts: [],
      brakes: [],
      completedSectors: 0,
      bonuses: 0,
      penalties: 0,
      damage,
      ended: false,
      won: false,
      winLoseMessage: "",
    };
  }

  test("finishing the last sector of the last stage wins", async () => {
    const renderer = await renderGame(
      "/waypoint",
      Waypoint,
      finalSector(card("5", "hearts", false), 0),
    );
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "gearOne");
    await pressButton(renderer, "Finish");

    expect(outcome()).toBe("won");
  });

  test("overshooting a sector with two damage (DNF) loses", async () => {
    const renderer = await renderGame(
      "/waypoint",
      Waypoint,
      finalSector(card("9", "hearts", false), 2),
    );
    expect(outcome()).toBe("playing");

    await pressZone((zone) => zone.name === "gearOne");
    await pressButton(renderer, "Finish");

    expect(outcome()).toBe("lost");
  });
});
