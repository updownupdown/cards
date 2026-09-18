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
  pressCardId,
  pressZone,
  renderGame,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import Delta21 from "@/components/Games/Delta21";
import Scorpion from "@/components/Games/Scorpion";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Scorpion (no lose condition)", () => {
  test("completing the fourth suit run wins", async () => {
    const tableau = Array.from({ length: 7 }, () => [] as PlayingCard[]);
    tableau[0] = run("spades", "K", "2");
    tableau[1] = [card("A", "spades")];
    await renderGame("/scorpion", Scorpion, {
      tableau,
      stock: [],
      foundations: [run("hearts"), run("clubs"), run("diamonds"), []],
      stockDealt: true,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pileIndex: 1, cardIndex: 0 },
      { zone: "tableau", pileIndex: 0 },
    );

    expect(outcome()).toBe("won");
  });
});

describe("Delta 21", () => {
  // Score is studies + 2 per breakthrough; 9 or more wins when play ends.
  async function playLastCard(studyCount: number) {
    const two = card("2", "spades");
    const segments = Array.from(
      { length: 4 },
      () => [] as { school: PlayingCard; fisherman: PlayingCard | null }[],
    );
    segments[0] = [{ school: card("5", "spades"), fisherman: null }];
    await renderGame("/delta-21", Delta21, {
      station: [],
      discard: [],
      segments,
      hand: [two],
      studyCount,
      breakthroughs: [],
      ended: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);
    await pressZone((zone) => zone.name === "estuary" && zone.pileIndex === 0);
  }

  test("ending with a score of 9 or more wins", async () => {
    await playLastCard(9);

    expect(outcome()).toBe("won");
  });

  test("ending with a score under 9 loses", async () => {
    await playLastCard(3);

    expect(outcome()).toBe("lost");
  });
});
