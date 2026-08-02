import { type PlayingCard } from "@/components/Cards/card-utils";
import { sandwichGuyRules } from "@/components/Games/TheSandwichGuy";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

describe("The Sandwich Guy rules", () => {
  test.each([
    [["2", "5", "8"], true],
    [["9", "Q", "2"], true],
    [["A", "5", "9"], true],
    [["2", "5", "9"], false],
    [["2", "5"], false],
  ] as const)("validates sandwich ranks %j", (ranks, expected) => {
    expect(
      sandwichGuyRules.isValidSandwich(
        ranks.map((rank, index) => card(rank, "spades", `${rank}-${index}`)),
      ),
    ).toBe(expected);
  });

  test("accepts every ordering of an evenly spaced sandwich", () => {
    const ranks: PlayingCard["rank"][] = ["9", "Q", "2"];
    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];

    expect(
      permutations.every((order) =>
        sandwichGuyRules.isValidSandwich(
          order.map((index) => card(ranks[index], "spades", `${index}`)),
        ),
      ),
    ).toBe(true);
  });

  test("detects a valid sandwich among nullable hand slots", () => {
    expect(
      sandwichGuyRules.hasAnyValidSandwich([
        card("2"),
        null,
        card("5"),
        card("8"),
        card("K"),
      ]),
    ).toBe(true);
    expect(
      sandwichGuyRules.hasAnyValidSandwich([
        card("2"),
        null,
        card("5"),
        card("9"),
      ]),
    ).toBe(false);
  });

  test.each([
    [["spades", "spades", "spades"], 4],
    [["hearts", "diamonds", "hearts"], 3],
    [["hearts", "clubs", "diamonds"], 2],
  ] as const)("awards %s replacements by suit and color", (suits, expected) => {
    expect(
      sandwichGuyRules.replacementCount(
        suits.map((suit, index) =>
          card(String(index + 2) as PlayingCard["rank"], suit, `${index}`),
        ),
      ),
    ).toBe(expected);
  });

  test("normalizes wrapped rank differences", () => {
    expect(sandwichGuyRules.mod13(-1)).toBe(12);
    expect(sandwichGuyRules.mod13(-13)).toBe(0);
    expect(sandwichGuyRules.mod13(14)).toBe(1);
  });

  test("scores only cards still occupying hand slots", () => {
    expect(
      sandwichGuyRules.handScore([
        card("2"),
        null,
        card("5"),
        null,
        null,
        card("8"),
        null,
        null,
      ]),
    ).toBe(3);
  });
});
