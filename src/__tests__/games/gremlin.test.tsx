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
import Gremlin from "@/components/Games/Gremlin";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Gremlin", () => {
  const baseState = {
    discard: [],
    currentHelperCard: null,
    awaitingHelperPlacement: false,
    selectedHandCardId: null,
    playerTurnEnded: false,
    ended: false,
    won: false,
  };

  test("placing the last card wins", async () => {
    const five = card("5", "spades");
    await renderGame("/gremlin", Gremlin, {
      ...baseState,
      // The easy setting holds five cards; the rest of the hand is empty.
      hand: [five, null, null, null, null],
      columns: Array(12).fill(null),
      deck: [],
    });
    expect(outcome()).toBe("playing");

    await pressCardId(five.id);
    await pressZone((zone) => zone.name === "column" && zone.pileIndex === 0);

    expect(outcome()).toBe("won");
  });

  test("a helper card with nowhere to go loses", async () => {
    // Every column is started with a low club, so a heart can't be placed.
    const columns: PlayingCard[][] = Array.from({ length: 12 }, () => [
      card("2", "clubs"),
    ]);
    const renderer = await renderGame("/gremlin", Gremlin, {
      ...baseState,
      hand: [
        card("3", "diamonds"),
        card("4", "diamonds"),
        card("6", "diamonds"),
        card("7", "diamonds"),
        card("8", "diamonds"),
      ],
      columns,
      deck: [card("9", "hearts", false)],
    });
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "End Turn");

    expect(outcome()).toBe("lost");
  });
});
