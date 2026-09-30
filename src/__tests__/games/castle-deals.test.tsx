import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import "../../../jest/game-mocks";
import { harness, renderGame, settle } from "../../../jest/game-harness";
import BeleagueredCastle, {
  beleagueredCastleRules,
} from "@/components/Games/BeleagueredCastle";
import Fortress, { fortressRules } from "@/components/Games/Fortress";
import { act } from "react-test-renderer";
import type React from "react";
import type { PlayingCard } from "@/components/Cards/card-utils";

// Beleaguered Castle and Fortress share a board that must never deal a lost
// position, first deal or New Game: every deal offers a move that leaves
// another move. New Games used to reshuffle without checking.

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/** The dealt position, read off the board. */
function dealtPosition() {
  const zones = harness.mapConfig!.zones;
  const cards = (prefix: string) =>
    zones
      .filter((zone) => zone.id.startsWith(prefix))
      .map((zone) => zone.cards ?? []);
  return {
    columns: cards("col"),
    foundations: cards("foundation"),
    ended: false,
    won: false,
  };
}

type CanStack = (
  card: PlayingCard,
  destTop: PlayingCard | undefined,
) => boolean;

describe.each<[string, React.ComponentType, CanStack]>([
  [
    "/beleaguered-castle",
    BeleagueredCastle,
    beleagueredCastleRules.canStackDown,
  ],
  ["/fortress", Fortress, fortressRules.canStack],
])("%s", (path, Game, canStack) => {
  test("every deal, and every New Game, offers two moves in a row", async () => {
    await renderGame(path, Game);
    for (let deal = 0; deal < 30; deal += 1) {
      const position = dealtPosition();
      expect(position.columns.flat().length).toBeGreaterThan(0);
      expect(beleagueredCastleRules.hasTwoMoves(position, canStack)).toBe(true);

      await act(async () => {
        void (harness.wrapperProps!.reset as () => unknown)();
      });
      await settle(120);
    }
  });
});

describe("hasTwoMoves", () => {
  const card = (rank: string, suit: string) =>
    ({ id: `${rank}${suit}`, rank, suit, faceUp: true }) as never;

  test("one move that leads nowhere is not enough", () => {
    // Only the Ace can go, and nothing follows it.
    const stuck = {
      columns: [
        [card("K", "hearts"), card("A", "spades")],
        [card("9", "clubs")],
      ],
      foundations: [[], [], [], []],
      ended: false,
      won: false,
    };
    expect(
      beleagueredCastleRules.hasTwoMoves(stuck, fortressRules.canStack),
    ).toBe(false);
  });

  test("a move that opens another counts", () => {
    const open = {
      columns: [
        [card("2", "spades"), card("A", "spades")],
        [card("9", "clubs")],
      ],
      foundations: [[], [], [], []],
      ended: false,
      won: false,
    };
    expect(
      beleagueredCastleRules.hasTwoMoves(open, fortressRules.canStack),
    ).toBe(true);
  });
});
