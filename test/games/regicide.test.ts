import {
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import { regicideRules } from "@/components/Games/Regicide";

function card(
  rank: CardRank,
  suit: CardSuit = "spades",
  id: string = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

describe("Regicide rules", () => {
  test.each([
    ["A", 1],
    ["5", 5],
    ["J", 10],
    ["Q", 15],
    ["K", 20],
    ["Joker", 0],
  ] as const)("values %s as %i attack and defense", (rank, expected) => {
    expect(regicideRules.getCardAttackValue(card(rank))).toBe(expected);
    expect(regicideRules.getCardDamageValue(card(rank))).toBe(expected);
  });

  test.each([
    [[card("5", "hearts", "first"), card("5", "clubs", "second")], true],
    [
      [
        card("2", "hearts", "1"),
        card("2", "clubs", "2"),
        card("2", "diamonds", "3"),
        card("2", "spades", "4"),
      ],
      true,
    ],
    [[card("6", "hearts", "first"), card("6", "clubs", "second")], false],
    [[card("3", "hearts", "first"), card("4", "clubs", "second")], false],
    [[card("Q", "hearts", "first"), card("Q", "clubs", "second")], false],
  ] as const)("validates equal-rank combinations", (cards, expected) => {
    expect(regicideRules.isValidComboSelection([...cards])).toBe(expected);
  });

  test("accepts singles, animal companions, and legal combinations", () => {
    expect(regicideRules.isValidPlaySelection([card("7")])).toBe(true);
    expect(
      regicideRules.isValidPlaySelection([
        card("A", "hearts", "ace"),
        card("K", "clubs", "king"),
      ]),
    ).toBe(true);
    expect(
      regicideRules.isValidPlaySelection([
        card("5", "hearts", "first"),
        card("5", "clubs", "second"),
      ]),
    ).toBe(true);
  });

  test("rejects jesters and oversized animal-companion groups", () => {
    expect(regicideRules.isValidPlaySelection([card("Joker")])).toBe(false);
    expect(
      regicideRules.isValidPlaySelection([
        card("A", "hearts", "ace"),
        card("2", "clubs", "two"),
        card("3", "diamonds", "three"),
      ]),
    ).toBe(false);
    expect(regicideRules.hasValidPlayInHand([card("Joker")])).toBe(false);
    expect(regicideRules.hasValidPlayInHand([card("4")])).toBe(true);
  });

  test.each([
    ["J", 20, 10],
    ["Q", 30, 15],
    ["K", 40, 20],
  ] as const)(
    "creates %s enemies with documented stats",
    (rank, health, attack) => {
      const enemy = regicideRules.createEnemy(card(rank));

      expect(enemy).toMatchObject({ health, maxHealth: health, attack });
    },
  );

  test("doubles club damage unless the enemy is immune", () => {
    const club = card("5", "clubs", "club");

    expect(
      regicideRules.evaluateAttackSelection(
        [club],
        card("K", "hearts", "heart-enemy"),
      ),
    ).toEqual({ totalAttack: 5, damage: 10, suitEffects: ["clubs"] });
    expect(
      regicideRules.evaluateAttackSelection(
        [club],
        card("K", "clubs", "club-enemy"),
      ),
    ).toEqual({ totalAttack: 5, damage: 5, suitEffects: [] });
  });

  test("combines non-immune suit effects from an animal companion play", () => {
    expect(
      regicideRules.evaluateAttackSelection(
        [card("A", "hearts", "ace"), card("4", "spades", "four")],
        card("Q", "diamonds", "enemy"),
      ),
    ).toEqual({
      totalAttack: 5,
      damage: 5,
      suitEffects: ["hearts", "spades"],
    });
  });

  test("heals only the requested number of discard cards", () => {
    const discard = [
      card("2", "hearts", "discard-1"),
      card("3", "clubs", "discard-2"),
    ];
    const tavern = [card("4", "diamonds", "tavern", false)];

    const result = regicideRules.healFromDiscard(discard, tavern, 1);

    expect(result.discardPile).toHaveLength(1);
    expect(result.tavernDeck).toHaveLength(2);
    expect(result.tavernDeck[0].faceUp).toBe(false);
    expect(result.tavernDeck[1]).toBe(tavern[0]);
    expect(discard).toHaveLength(2);
  });

  test("draws from the tavern without exceeding eight hand cards", () => {
    const tavern = [
      card("2", "hearts", "draw-1", false),
      card("3", "clubs", "draw-2", false),
      card("4", "diamonds", "draw-3", false),
    ];
    const hand = Array.from({ length: 7 }, (_, index) =>
      card("5", "spades", `hand-${index}`),
    );

    const result = regicideRules.drawFromTavern(tavern, hand, 3);

    expect(result.hand).toHaveLength(8);
    expect(result.hand.every((entry) => entry.faceUp)).toBe(true);
    expect(result.tavernDeck).toHaveLength(2);
    expect(tavern).toHaveLength(3);
  });

  test("sums defense while treating jesters as zero", () => {
    expect(
      regicideRules.getDefenseValue([
        card("K", "spades", "king"),
        card("5", "hearts", "five"),
        card("Joker", "clubs", "jester"),
      ]),
    ).toBe(25);
  });
});
