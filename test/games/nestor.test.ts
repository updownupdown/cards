import { createDeck, type PlayingCard } from "@/components/Cards/card-utils";
import { type NestorGameState, nestorRules } from "@/components/Games/Nestor";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "spades", faceUp: true };
}

function state(overrides: Partial<NestorGameState> = {}): NestorGameState {
  return {
    columns: Array.from({ length: 8 }, () => []),
    reserve: [],
    discard: [],
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Nestor rules", () => {
  test("deals the face-down discard into eight six-card columns", () => {
    const game = nestorRules.dealNestor(createDeck({ faceUp: false }));

    expect(game.columns).toHaveLength(nestorRules.columnCount);
    expect(game.columns.map((column) => column.length)).toEqual(
      Array.from({ length: 8 }, () => nestorRules.columnHeight),
    );
    expect(game.reserve).toHaveLength(4);
    expect(game.discard).toEqual([]);
    expect(game.columns.flat()).toHaveLength(48);
    expect(
      [...game.columns.flat(), ...game.reserve].every(({ faceUp }) => faceUp),
    ).toBe(true);
    expect(
      game.columns.every(
        (column) => new Set(column.map(({ rank }) => rank)).size === 6,
      ),
    ).toBe(true);
    const rankRowCounts = new Map<PlayingCard["rank"], Map<number, number>>();
    game.columns.forEach((column) => {
      column.forEach(({ rank }, row) => {
        const rowCounts = rankRowCounts.get(rank) ?? new Map<number, number>();
        rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
        rankRowCounts.set(rank, rowCounts);
      });
    });
    expect(
      [...rankRowCounts.values()].every((rowCounts) =>
        [...rowCounts.values()].every((count) => count <= 2),
      ),
    ).toBe(true);
    expect(
      new Set([...game.columns.flat(), ...game.reserve].map(({ id }) => id))
        .size,
    ).toBe(52);
  });

  test("returns every card to a shuffled face-down discard pile", () => {
    const game = state({
      columns: [[card("2", "column")]],
      reserve: [card("3", "reserve")],
      discard: [{ ...card("4", "discard"), faceUp: false }],
    });

    const discard = nestorRules.prepareDiscard(game);

    expect(discard).toHaveLength(3);
    expect(discard.every(({ faceUp }) => !faceUp)).toBe(true);
    expect(new Set(discard.map(({ id }) => id))).toEqual(
      new Set(["column", "reserve", "discard"]),
    );
  });

  test("returns the exposed column card or selected reserve card", () => {
    const game = state({
      columns: [[card("2", "covered"), card("3", "column-top")]],
      reserve: [card("4", "reserve-covered"), card("5", "reserve-top")],
    });

    expect(nestorRules.exposedCard(game, { zone: "col", index: 0 })?.id).toBe(
      "column-top",
    );
    expect(
      nestorRules.exposedCard(game, { zone: "reserve", index: 0 })?.id,
    ).toBe("reserve-covered");
    expect(
      nestorRules.exposedCard(game, { zone: "reserve", index: 1 })?.id,
    ).toBe("reserve-top");
  });

  test("keeps playing when two reserve cards share a rank", () => {
    expect(
      nestorRules.evaluateEnd(
        state({ reserve: [card("7", "first"), card("7", "second")] }),
      ),
    ).toEqual({ ended: false, won: false });
  });

  test("continues while two exposed cards share a rank", () => {
    expect(
      nestorRules.evaluateEnd(
        state({ columns: [[card("7", "first")], [card("7", "second")]] }),
      ),
    ).toEqual({ ended: false, won: false });
  });

  test("does not count pairs buried below column tops", () => {
    expect(
      nestorRules.evaluateEnd(
        state({
          columns: [
            [card("7", "buried"), card("2", "first-top")],
            [card("7", "exposed"), card("3", "second-top")],
          ],
        }),
      ),
    ).toEqual({ ended: true, won: false });
  });

  test("loses when all exposed ranks are distinct", () => {
    expect(
      nestorRules.evaluateEnd(
        state({
          columns: [[card("2")], [card("4")], [card("6")]],
          reserve: [card("8")],
        }),
      ),
    ).toEqual({ ended: true, won: false });
  });

  test("wins after every card is removed", () => {
    expect(nestorRules.evaluateEnd(state())).toEqual({
      ended: true,
      won: true,
    });
  });

  test("does not resolve the empty initial state during setup", () => {
    expect(nestorRules.evaluateEnd(state(), true)).toEqual({
      ended: false,
      won: false,
    });
  });
});
