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
  harness,
  mappedCards,
  outcome,
  pressCardId,
  pressZone,
  renderGame,
} from "../../../jest/game-harness";
import type { MapZone } from "@/components/Cards/CardMap";
import type { CardSuit, PlayingCard } from "@/components/Cards/card-utils";
import Glazier, {
  glazierRules,
  type GlazierGameState,
} from "@/components/Games/Glazier";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  emptyWindow,
  legalCells,
  paneScore,
  shardPenalty,
  endBonus,
  canFrameTake,
  buildAutoSteps,
} = glazierRules;

function pane(suit: CardSuit) {
  return card("5", suit);
}

function baseState(overrides: Partial<GlazierGameState>): GlazierGameState {
  return {
    deck: [],
    kilns: [[], [], []],
    bench: [],
    frames: [[], [], [], []],
    window: emptyWindow(),
    shards: [],
    discard: [],
    round: 1,
    score: 0,
    ended: false,
    won: false,
    ...overrides,
  };
}

describe("Glazier rules", () => {
  test("a suit may not repeat in a window row or column", () => {
    const window = emptyWindow();
    window[0][1] = pane("hearts");
    window[2][3] = pane("hearts");

    expect(legalCells(window, 0, "hearts")).toEqual([]);
    expect(legalCells(window, 1, "hearts")).toEqual([0, 2]);
    expect(legalCells(window, 1, "spades")).toEqual([0, 1, 2, 3]);
  });

  test("panes score the lines they join", () => {
    const window = emptyWindow();
    window[1][1] = pane("hearts");
    expect(paneScore(window, 1, 1)).toBe(1);

    window[1][2] = pane("spades");
    expect(paneScore(window, 1, 2)).toBe(2);

    window[0][2] = pane("clubs");
    // Joins a row of two and a column of two.
    expect(paneScore(window, 0, 2)).toBe(2);
    window[0][1] = pane("diamonds");
    expect(paneScore(window, 0, 1)).toBe(4);
  });

  test("only the first seven shards cost points", () => {
    expect(shardPenalty(0)).toBe(0);
    expect(shardPenalty(3)).toBe(4);
    expect(shardPenalty(7)).toBe(14);
    expect(shardPenalty(10)).toBe(14);
  });

  test("complete rows and columns earn bonuses", () => {
    const suits: CardSuit[] = ["hearts", "clubs", "diamonds", "spades"];
    const window = emptyWindow();
    suits.forEach((suit, col) => {
      window[0][col] = pane(suit);
      window[col][0] = window[col][0] ?? pane(suits[(col + 1) % 4]);
    });
    // One full row and one full column.
    expect(endBonus(window)).toBe(3 + 6);
  });

  test("a frame refuses a suit that has no legal cell left", () => {
    const window = emptyWindow();
    // Row 1 has hearts in every column except column 0, which is filled.
    window[1][0] = pane("spades");
    window[0][1] = pane("hearts");
    window[2][2] = pane("hearts");
    window[3][3] = pane("hearts");
    const state = baseState({ window });

    expect(canFrameTake(state, 1, "hearts")).toBe(false);
    expect(canFrameTake(state, 1, "clubs")).toBe(true);
  });

  test("the last round ends the game after scoring shards", () => {
    const window = emptyWindow();
    const state = baseState({
      round: 4,
      window,
      frames: [[pane("hearts")], [], [], []],
      shards: [pane("clubs"), pane("clubs")],
    });

    // The heart has four legal cells, so the player must choose first.
    expect(buildAutoSteps(state)).toEqual([]);

    state.frames[0] = [];
    const end = buildAutoSteps(state);
    const last = end[end.length - 1].state;
    expect(last.ended).toBe(true);
    expect(last.score).toBe(-2);
    expect(last.won).toBe(false);
  });
});

// ── Playing through the component ──────────────────────────────────────────

function zones() {
  return harness.mapConfig!.zones;
}

function zoneEnabled(zone: MapZone) {
  const mapping = harness.mapConfig!.zoneMapper?.(zone) as
    | { onPress?: () => void; isDisabled?: boolean }
    | undefined;
  return !!mapping?.onPress && !mapping.isDisabled;
}

function allCardIds() {
  return mappedCards().map((mapped) => mapped.card.id);
}

describe("Glazier games", () => {
  test("a full game can be played to the end with every card accounted for", async () => {
    await renderGame("/glazier", Glazier);
    expect(outcome()).toBe("playing");

    for (let step = 0; step < 200 && outcome() === "playing"; step++) {
      const cell = zones().find(
        (zone) => zone.name === "cell" && zoneEnabled(zone),
      );
      if (cell) {
        await pressZone((zone) => zone.id === cell.id);
        continue;
      }

      const group = mappedCards().find(
        (mapped) => mapped.zoneName === "kiln" || mapped.zoneName === "bench",
      );
      if (!group) throw new Error("Nothing to draft and no cell to choose");
      await pressCardId(group.card.id);

      const frame = zones().find(
        (zone) => zone.name === "frameSlot" && zoneEnabled(zone),
      );
      await pressZone((zone) =>
        frame ? zone.id === frame.id : zone.name === "shard",
      );
    }

    expect(["won", "lost"]).toContain(outcome());
    const ids = allCardIds();
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
    expect(typeof harness.wrapperProps?.score).toBe("number");
  });

  test("setting the final pane can win the game", async () => {
    const suits: CardSuit[] = ["hearts", "clubs", "diamonds", "spades"];
    // A window that is full except for the top-left corner (a Latin square).
    const window: (PlayingCard | null)[][] = suits.map((_, row) =>
      suits.map((__, col) => pane(suits[(row + col) % 4])),
    );
    window[0][0] = null;
    const dealt = card("2", "hearts");

    await renderGame(
      "/glazier",
      Glazier,
      baseState({
        round: 4,
        score: 20,
        window,
        kilns: [[], [], []],
        bench: [dealt],
        frames: [[], [], [], []],
      }),
    );

    await pressCardId(dealt.id);
    await pressZone((zone) => zone.name === "frameSlot" && zone.pileIndex === 0);

    // The only legal cell is set automatically: 4 + 4 points for the pane,
    // then four rows and four columns complete.
    expect(outcome()).toBe("won");
    expect(harness.wrapperProps?.score).toBe(20 + 8 + 4 * 3 + 4 * 6);
  });
});
