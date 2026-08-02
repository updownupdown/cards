import {
  appendUndoState,
  MAX_UNDO_HISTORY,
  popUndoState,
} from "@/hooks/state-history";

describe("undo history", () => {
  test("retains only the most recent states", () => {
    const history = Array.from(
      { length: MAX_UNDO_HISTORY + 3 },
      (_, value) => value,
    ).reduce<number[]>((states, value) => appendUndoState(states, value), []);

    expect(history).toHaveLength(MAX_UNDO_HISTORY);
    expect(history).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  test("pops in last-in-first-out order without mutating history", () => {
    const original = [{ turn: 1 }, { turn: 2 }];
    const result = popUndoState(original);

    expect(result.previousState).toEqual({ turn: 2 });
    expect(result.history).toEqual([{ turn: 1 }]);
    expect(original).toEqual([{ turn: 1 }, { turn: 2 }]);
  });

  test("returns no state for an empty history", () => {
    expect(popUndoState([])).toEqual({ previousState: undefined, history: [] });
  });
});
