import { describe, expect, jest, test } from "@jest/globals";
import {
  devilsGripRules,
  DevilsGripGameState,
} from "@/components/Games/DevilsGrip";
import { PlayingCard } from "@/components/Cards/card-utils";

jest.mock("@/data/nodes-map", () => ({
  NODE_DEFINITIONS: [],
  NODES_BY_PATH: new Map(),
}));

function card(rank: PlayingCard["rank"], suit: PlayingCard["suit"] = "spades") {
  return { id: `${suit}-${rank}-${Math.random()}`, rank, suit, faceUp: true };
}

function state(grid: PlayingCard[][]): DevilsGripGameState {
  return {
    grid: [...grid, ...Array.from({ length: 24 - grid.length }, () => [])],
    draw: [],
    waste: [],
  };
}

describe("Devil's Grip rules", () => {
  test("creates a face-down 96-card draw pile with an empty grid", () => {
    const game = devilsGripRules.createInitialState(() => 0.5);
    expect(game.grid).toHaveLength(24);
    expect(game.grid.flat()).toHaveLength(0);
    expect(game.draw).toHaveLength(96);
    expect(game.draw.every((item) => !item.faceUp)).toBe(true);
    expect(game.draw.some((item) => item.rank === "A")).toBe(false);
  });

  test("deals all opening cards from the draw pile", () => {
    const game = devilsGripRules.createInitialState(() => 0.5);
    devilsGripRules.dealInitialGridAction(game);
    expect(game.grid.flat()).toHaveLength(24);
    expect(game.grid.flat().every((item) => item.faceUp)).toBe(true);
    expect(game.draw).toHaveLength(72);
  });

  test("gathers every card face down into draw before a reset deal", () => {
    const game = state([[card("2"), card("5")]]);
    game.draw = [{ ...card("6"), faceUp: false }];
    game.waste = [card("9")];
    devilsGripRules.gatherToDrawAction(game, () => 0.5);
    expect(game.grid.flat()).toHaveLength(0);
    expect(game.waste).toHaveLength(0);
    expect(game.draw).toHaveLength(4);
    expect(game.draw.every((item) => !item.faceUp)).toBe(true);
  });

  test("recognizes row sequences and same-suit builds", () => {
    expect(devilsGripRules.rowForRank(card("2"))).toBe(0);
    expect(devilsGripRules.rowForRank(card("6"))).toBe(1);
    expect(devilsGripRules.rowForRank(card("10"))).toBe(2);
    expect(devilsGripRules.canBuild([card("8")], [card("2"), card("5")])).toBe(
      true,
    );
    expect(devilsGripRules.canBuild([card("8", "hearts")], [card("5")])).toBe(
      false,
    );
  });

  test("moves a single card and refills an emptied grid pile from draw", () => {
    const game = state([[card("5")], [card("2")]]);
    game.draw = [{ ...card("4", "hearts"), faceUp: false }];
    expect(
      devilsGripRules.moveAction(
        game,
        { zone: "grid", pileIndex: 0, cardIndex: 0 },
        1,
      ),
    ).toBe(true);
    expect(game.grid[0][0]).toMatchObject({ rank: "4", faceUp: true });
    expect(game.grid[1].map((item) => item.rank)).toEqual(["2", "5"]);
  });

  test("redeals waste before refilling an emptied grid pile", () => {
    const game = state([[card("5")], [card("2")]]);
    game.waste = [card("K"), card("4", "hearts")];

    expect(
      devilsGripRules.moveAction(
        game,
        { zone: "grid", pileIndex: 0, cardIndex: 0 },
        1,
      ),
    ).toBe(true);

    expect(game.grid[0][0]).toMatchObject({ rank: "K", faceUp: true });
    expect(game.draw.map((item) => item.rank)).toEqual(["4"]);
    expect(game.draw.every((item) => !item.faceUp)).toBe(true);
    expect(game.waste).toEqual([]);
  });

  test("colors only correctly based stacks and greys completed stacks", () => {
    expect(devilsGripRules.pileOverlayColor([card("2")], 0)).toBe("purple");
    expect(devilsGripRules.pileOverlayColor([card("5")], 0)).toBeNull();
    expect(devilsGripRules.pileOverlayColor([card("3")], 0)).toBeNull();
    expect(
      devilsGripRules.pileOverlayColor([card("5"), card("8")], 0),
    ).toBeNull();
    expect(devilsGripRules.pileOverlayColor([card("2"), card("5")], 0)).toBe(
      "purple",
    );
    expect(
      devilsGripRules.pileOverlayColor(
        [card("2"), card("5"), card("8"), card("J")],
        0,
      ),
    ).toBe("lightGrey");
  });

  test("moves a valid stack only as a complete unit", () => {
    const game = state([[card("6"), card("9")], [card("3")], [card("Q")]]);
    expect(
      devilsGripRules.canMove(
        { zone: "grid", pileIndex: 0, cardIndex: 1 },
        1,
        game,
      ),
    ).toBe(false);
    expect(
      devilsGripRules.moveAction(
        game,
        { zone: "grid", pileIndex: 0, cardIndex: 0 },
        1,
      ),
    ).toBe(true);
    expect(game.grid[0]).toEqual([]);
    expect(game.grid[1].map((item) => item.rank)).toEqual(["3", "6", "9"]);
  });

  test("builds a single card onto an incomplete sequence", () => {
    const game = state([[card("8")], [card("5")]]);
    expect(
      devilsGripRules.getMoveType(
        { zone: "grid", pileIndex: 0, cardIndex: 0 },
        1,
        game,
      ),
    ).toBe("build");
    expect(
      devilsGripRules.moveAction(
        game,
        { zone: "grid", pileIndex: 0, cardIndex: 0 },
        1,
      ),
    ).toBe(true);
    expect(game.grid[1].map((item) => item.rank)).toEqual(["5", "8"]);
  });

  test("swaps complete occupied grid piles", () => {
    const game = state([[card("K")], [card("Q", "hearts")]]);
    expect(
      devilsGripRules.getMoveType(
        { zone: "grid", pileIndex: 0, cardIndex: 0 },
        1,
        game,
      ),
    ).toBe("swap");
    expect(
      devilsGripRules.moveAction(
        game,
        { zone: "grid", pileIndex: 0, cardIndex: 0 },
        1,
      ),
    ).toBe(true);
    expect(game.grid[0][0].rank).toBe("Q");
    expect(game.grid[1][0].rank).toBe("K");
  });

  test("deals up to three draw cards to the waste", () => {
    const game = state([]);
    game.draw = [card("2"), card("3")];
    expect(devilsGripRules.dealThreeAction(game)).toBe(true);
    expect(game.draw).toHaveLength(0);
    expect(game.waste).toHaveLength(2);
  });

  test("redeals waste face down without changing card order", () => {
    const game = state([]);
    game.waste = [card("2"), card("5"), card("8")];
    expect(devilsGripRules.redealWasteAction(game)).toBe(true);
    expect(game.waste).toEqual([]);
    expect(game.draw.map((item) => item.rank)).toEqual(["8", "5", "2"]);
    expect(game.draw.every((item) => !item.faceUp)).toBe(true);

    devilsGripRules.dealThreeAction(game);
    expect(game.waste.map((item) => item.rank)).toEqual(["2", "5", "8"]);
  });

  test("finds a legal tableau build from a complete grid pile", () => {
    const game = state([[card("5")], [card("2")]]);
    expect(devilsGripRules.hasTableauBuildMove(game)).toBe(true);
  });

  test("checks only cards exposed during an infinite draw-three cycle", () => {
    const game = state([[card("2")]]);
    game.draw = [card("5"), card("K"), card("Q"), card("J")];
    expect(
      devilsGripRules.getReachableDrawThreeCards(game).map((item) => item.rank),
    ).toEqual(["K", "5"]);
    expect(devilsGripRules.hasPlayableDrawMove(game)).toBe(true);

    game.draw = [card("7"), card("K"), card("5"), card("J")];
    expect(devilsGripRules.hasPlayableDrawMove(game)).toBe(false);
  });

  test("checks both the current pass and the shifted redeal pass", () => {
    const game = state([[card("2")]]);
    game.draw = [card("7"), card("5"), card("Q"), card("J")];
    game.waste = [card("10"), card("K")];
    expect(
      devilsGripRules.getReachableDrawThreeCards(game).map((item) => item.rank),
    ).toEqual(["K", "5", "7", "J"]);
    expect(devilsGripRules.hasPlayableDrawMove(game)).toBe(true);
  });

  test("includes the current waste top in the loss check", () => {
    const game = state([[card("2")]]);
    game.waste = [card("K"), card("5")];
    expect(devilsGripRules.hasAnyProgressMove(game)).toBe(true);
  });

  test("allows a loss with stock and waste remaining when no draw cycle can build", () => {
    const game = state([[card("2")]]);
    game.draw = [card("7"), card("K"), card("Q"), card("J")];
    game.waste = [card("10"), card("9")];
    expect(game.draw.length + game.waste.length).toBeGreaterThan(0);
    expect(devilsGripRules.hasAnyProgressMove(game)).toBe(false);
  });

  test("rates low remaining-card scores", () => {
    expect(devilsGripRules.scoreRating(10)).toBe("Good");
    expect(devilsGripRules.scoreRating(5)).toBe("Excellent");
    expect(devilsGripRules.scoreRating(2)).toBe("Brilliant");
    expect(devilsGripRules.scoreRating(11)).toBeNull();
  });
});
