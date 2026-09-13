import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  card,
  outcome,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import Accordion from "@/components/Games/Accordion";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Accordion", () => {
  test("merging the last two piles wins", async () => {
    const ace = card("A", "spades");
    const two = card("2", "spades");
    await renderGame("/accordion", Accordion, {
      setupPile: [],
      line: [[ace], [two]],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await pressCardId(two.id);
    await pressCardId(ace.id);

    expect(outcome()).toBe("won");
  });

  test("running out of merges loses", async () => {
    const ace = card("A", "spades");
    const three = card("3", "spades");
    const five = card("5", "hearts");
    await renderGame("/accordion", Accordion, {
      setupPile: [],
      line: [[ace], [three], [five]],
      ended: false,
      won: false,
    });

    await pressCardId(three.id);
    await pressCardId(ace.id);

    expect(outcome()).toBe("lost");
  });
});
