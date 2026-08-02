import {
  isFace,
  isJoker,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import {
  type DungeonWeaponSlot,
  dungeonBountyRules,
} from "@/components/Games/DungeonBounty";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"] = "clubs",
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function weapon(
  rank: PlayingCard["rank"],
  gem: PlayingCard | null = null,
): DungeonWeaponSlot {
  return { card: card(rank, "clubs", `weapon-${rank}`), gem };
}

describe("Dungeon Bounty rules", () => {
  test.each([
    ["J", 1, 5],
    ["Q", 1, 10],
    ["K", 1, 15],
    ["J", 2, 10],
    ["Q", 2, 20],
    ["K", 2, 30],
  ] as const)("gives %s level %s enemy %s health", (rank, level, hp) => {
    expect(dungeonBountyRules.enemyBaseHP(rank, level)).toBe(hp);
  });

  test.each([
    ["J", 10],
    ["Q", 20],
    ["K", 30],
  ] as const)("awards %s bounty points for %s", (rank, points) => {
    expect(dungeonBountyRules.bountyPoints(rank)).toBe(points);
  });

  test("builds the 44-card dungeon deck with only heart face cards", () => {
    const deck = dungeonBountyRules.buildDungeonDeck();

    expect(deck).toHaveLength(44);
    expect(deck.filter(isJoker)).toHaveLength(2);
    expect(
      deck.filter(
        (candidate) => candidate.suit === "hearts" && !isJoker(candidate),
      ),
    ).toHaveLength(3);
    expect(
      deck
        .filter((candidate) => candidate.suit === "hearts")
        .every((candidate) => isFace(candidate) || isJoker(candidate)),
    ).toBe(true);
  });

  test("applies enemy suit powers outside beginner difficulty", () => {
    const clubEnemy = card("K", "clubs", "club-enemy");
    const spadeEnemy = card("K", "spades", "spade-enemy");

    expect(
      dungeonBountyRules.computeAttack(
        [weapon("5")],
        [],
        [],
        clubEnemy,
        "beginner",
      ).total,
    ).toBe(5);
    expect(
      dungeonBountyRules.computeAttack(
        [weapon("5")],
        [],
        [],
        clubEnemy,
        "intermediate",
      ).total,
    ).toBe(3);
    expect(
      dungeonBountyRules.computeAttack(
        [],
        [card("5", "spades", "spell")],
        [],
        spadeEnemy,
        "intermediate",
      ).total,
    ).toBe(3);
  });

  test("calculates enchant, curse, and volatile relic damage", () => {
    const gem = card("5", "diamonds", "gem");
    const spell = card("5", "spades", "spell");

    expect(
      dungeonBountyRules.computeAttack(
        [weapon("5", gem)],
        [],
        [],
        null,
        "beginner",
      ).total,
    ).toBe(10);

    const curse = dungeonBountyRules.computeAttack(
      [weapon("5")],
      [spell],
      [],
      null,
      "beginner",
    );
    expect(curse.total).toBe(15);
    expect(curse.isCurse).toBe(true);

    const relic = dungeonBountyRules.computeAttack(
      [weapon("5")],
      [spell],
      [gem],
      card("K", "clubs", "enemy"),
      "bloodlust",
    );
    expect(relic.total).toBe(30);
    expect(relic.isRelic).toBe(true);
    expect(relic.overrides).toBe(true);
    expect(relic.hitsBoth).toBe(true);
  });

  test("maps difficulty starts and score tiers", () => {
    expect(dungeonBountyRules.startStrength).toEqual({
      beginner: 5,
      intermediate: 5,
      advanced: 3,
      bloodlust: 1,
    });
    expect(dungeonBountyRules.maxStrength).toBe(10);
    expect(dungeonBountyRules.scoreTier(0, "beginner")).toBe("Penniless Peon");
    expect(dungeonBountyRules.scoreTier(240, "bloodlust")).toBe(
      "Saviour of the World",
    );
  });
});
