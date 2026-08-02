import { createDeck, type PlayingCard } from "@/components/Cards/card-utils";
import { type NestorGameState, nestorRules } from "@/components/Games/Nestor";

function card(rank: PlayingCard["rank"], id: string = rank): PlayingCard {
  return { id, rank, suit: "spades", faceUp: true };
}

function state(overrides: Partial<NestorGameState> = {}): NestorGameState {
  return {
    columns: Array.from({ length: 8 }, () => []),
    reserve: [],
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Nestor rules", () => {
  test("deals eight six-card columns without duplicate ranks", () => {
    const game = nestorRules.dealNestor(createDeck({ faceUp: true }));

    expect(game.columns).toHaveLength(nestorRules.columnCount);
    expect(game.columns.map((column) => column.length)).toEqual(
      Array.from({ length: 8 }, () => nestorRules.columnHeight),
    );
    expect(game.reserve).toHaveLength(4);
    expect(game.columns.flat()).toHaveLength(48);
    expect(
      game.columns.every(
        (column) => new Set(column.map(({ rank }) => rank)).size === 6,
      ),
    ).toBe(true);
    expect(
      new Set([...game.columns.flat(), ...game.reserve].map(({ id }) => id))
        .size,
    ).toBe(52);
  });

  test("returns only the exposed column or reserve card", () => {
    const game = state({
      columns: [[card("2", "covered"), card("3", "column-top")]],
      reserve: [card("4", "reserve-covered"), card("5", "reserve-top")],
    });

    expect(nestorRules.exposedCard(game, { zone: "col", index: 0 })?.id).toBe(
      "column-top",
    );
    expect(
      nestorRules.exposedCard(game, { zone: "reserve", index: 0 })?.id,
    ).toBe("reserve-top");
  });

  test("continues while two exposed cards share a rank", () => {
    expect(
      nestorRules.evaluateEnd(
        state({ columns: [[card("7", "first")], [card("7", "second")]] }),
      ),
    ).toEqual({ ended: false, won: false });
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
