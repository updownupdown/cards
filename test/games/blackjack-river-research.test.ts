import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  blackjackRiverResearchRules,
  type BlackjackRiverGameState,
  type BlackjackRiverSchoolEntry,
} from "@/components/Games/BlackjackRiverResearch";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function entry(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  fisherman: PlayingCard | null = null,
  id: string = `${rank}-${suit}`,
): BlackjackRiverSchoolEntry {
  return { school: card(rank, suit, id), fisherman };
}

function state(
  overrides: Partial<BlackjackRiverGameState> = {},
): BlackjackRiverGameState {
  return {
    station: [],
    discard: [],
    segments: [[], [], [], []],
    hand: [],
    studyCount: 0,
    breakthroughs: [],
    ended: false,
    ...overrides,
  };
}

describe("Blackjack River Research rules", () => {
  test.each([
    ["J", 1],
    ["Q", 2],
    ["K", 3],
  ] as const)("a %s catches %s fish", (rank, expected) => {
    expect(blackjackRiverResearchRules.fishermanCatch(card(rank))).toBe(
      expected,
    );
  });

  test("reduces a school without going below zero", () => {
    expect(
      blackjackRiverResearchRules.entryFish(
        entry("2", "hearts", card("K", "clubs")),
      ),
    ).toBe(0);
    expect(
      blackjackRiverResearchRules.entryFish(
        entry("10", "hearts", card("Q", "clubs")),
      ),
    ).toBe(8);
  });

  test("detects every breakthrough and does not duplicate prior awards", () => {
    const breakthroughs = ["dense"];
    const study = [
      entry("2", "spades", card("J", "spades"), "spade-2"),
      entry("2", "hearts", card("Q", "clubs"), "heart-2"),
      entry("3", "diamonds", null, "diamond-3"),
      entry("4", "clubs", null, "club-4"),
      entry("10", "spades", null, "spade-10"),
    ];

    blackjackRiverResearchRules.evaluateStudy(study, breakthroughs);

    expect(breakthroughs.sort()).toEqual(
      ["clusters", "dense", "diversity", "harvesting", "pressure"].sort(),
    );

    blackjackRiverResearchRules.evaluateStudy(
      [entry("10", "hearts"), entry("9", "hearts"), entry("2", "hearts")],
      breakthroughs,
    );
    expect(breakthroughs.filter((key) => key === "dense")).toHaveLength(1);
    expect(breakthroughs).toContain("specialization");
  });

  test("completes only columns totaling exactly 21", () => {
    const game = state({
      segments: [
        [entry("10", "hearts"), entry("10", "clubs"), entry("A", "spades")],
        [entry("10", "hearts"), entry("10", "clubs"), entry("2", "spades")],
        [],
        [],
      ],
    });

    blackjackRiverResearchRules.studyPhase(game);

    expect(game.studyCount).toBe(1);
    expect(game.segments[0]).toEqual([]);
    expect(blackjackRiverResearchRules.columnTotal(game.segments[1])).toBe(22);
  });

  test("ends immediately when a column reaches the collapse threshold", () => {
    const game = state({
      segments: [
        [entry("10", "hearts"), entry("10", "clubs"), entry("5", "spades")],
        [],
        [],
        [],
      ],
      hand: [card("2")],
      station: [card("3")],
    });

    blackjackRiverResearchRules.resolveTurn(game);

    expect(game.ended).toBe(true);
  });

  test("ends after the field station and hand are exhausted", () => {
    const game = state();

    blackjackRiverResearchRules.resolveTurn(game);

    expect(game.ended).toBe(true);
  });

  test.each([
    [8, "little"],
    [9, "local"],
    [14, "advances"],
    [18, "reshapes"],
  ] as const)("maps score %s to the %s contribution tier", (score, phrase) => {
    expect(blackjackRiverResearchRules.scoreTier(score)).toContain(phrase);
  });
});
