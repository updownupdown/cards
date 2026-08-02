import { type PlayingCard } from "@/components/Cards/card-utils";
import {
  clearTheDungeonRules,
  type ClearDungeonPlacement,
  type ClearDungeonSlot,
} from "@/components/Games/ClearTheDungeon";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "spades",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function placement(
  rank: PlayingCard["rank"],
  options: Partial<ClearDungeonPlacement> = {},
): ClearDungeonPlacement {
  return {
    card: card(rank),
    role: "attack",
    ...options,
  };
}

function slot(
  monsterRank: "J" | "Q" | "K" = "J",
  overrides: Partial<ClearDungeonSlot> = {},
): ClearDungeonSlot {
  return {
    monster: card(monsterRank, "hearts", `monster-${monsterRank}`),
    row: 0,
    x: 0,
    defeated: false,
    placed: [],
    ...overrides,
  };
}

describe("Clear the Dungeon rules", () => {
  test.each([
    ["A", false, 1],
    ["A", true, 11],
    ["Joker", false, 10],
    ["9", false, 9],
  ] as const)("values %s with boomer=%s as %s", (rank, boomer, expected) => {
    expect(clearTheDungeonRules.attackValue(card(rank), boomer)).toBe(expected);
  });

  test("sums only attackers and doubles marked attacks", () => {
    const target = slot("K", {
      placed: [
        placement("4"),
        placement("5", { doubled: true }),
        placement("10", { role: "trigger" }),
      ],
    });

    expect(clearTheDungeonRules.attackerSum(target, false)).toBe(14);
  });

  test("blocks monsters covered by an undefeated lower row", () => {
    const target = slot("J", { row: 0, x: 0 });
    const blocker = slot("Q", { row: 1, x: 0.5 });
    const distant = slot("K", { row: 1, x: 1 });

    expect(clearTheDungeonRules.isAttackable([target, blocker], 0)).toBe(false);
    expect(clearTheDungeonRules.isAttackable([target, distant], 0)).toBe(true);
    blocker.defeated = true;
    expect(clearTheDungeonRules.isAttackable([target, blocker], 0)).toBe(true);
  });

  test("never attacks an already defeated monster", () => {
    expect(
      clearTheDungeonRules.isAttackable([slot("J", { defeated: true })], 0),
    ).toBe(false);
  });

  test("allows any first attacker on an uncovered monster", () => {
    expect(
      clearTheDungeonRules.canPlace([slot("K")], 0, card("2"), false),
    ).toBe(true);
  });

  test("requires the second attacker to reach the monster power", () => {
    const target = slot("Q", { placed: [placement("5")] });

    expect(clearTheDungeonRules.canPlace([target], 0, card("6"), false)).toBe(
      false,
    );
    expect(clearTheDungeonRules.canPlace([target], 0, card("7"), false)).toBe(
      true,
    );
    expect(
      clearTheDungeonRules.canPlace([target], 0, card("4"), false, true),
    ).toBe(true);
  });

  test("requires a matching-suit or Joker trigger after a sufficient attack", () => {
    const target = slot("K", {
      placed: [placement("6"), placement("7")],
    });

    expect(
      clearTheDungeonRules.canPlace([target], 0, card("2", "hearts"), false),
    ).toBe(true);
    expect(
      clearTheDungeonRules.canPlace([target], 0, card("2", "clubs"), false),
    ).toBe(false);
    expect(
      clearTheDungeonRules.canPlace([target], 0, card("Joker", "clubs"), false),
    ).toBe(true);
  });

  test("rejects a trigger when the first two attackers are insufficient", () => {
    const target = slot("K", {
      placed: [placement("5"), placement("7")],
    });

    expect(
      clearTheDungeonRules.canPlace([target], 0, card("2", "hearts"), false),
    ).toBe(false);
  });

  test("rejects a fourth placement", () => {
    const target = slot("J", {
      placed: [
        placement("5"),
        placement("6"),
        placement("2", { role: "trigger" }),
      ],
    });

    expect(clearTheDungeonRules.canPlace([target], 0, card("3"), false)).toBe(
      false,
    );
  });
});
