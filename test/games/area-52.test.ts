import { type PlayingCard } from "@/components/Cards/card-utils";
import { type Area52GameState, area52Rules } from "@/components/Games/Area52";

function card(
  rank: PlayingCard["rank"],
  suit: PlayingCard["suit"],
  id: string = `${rank}-${suit}`,
): PlayingCard {
  return { id, rank, suit, faceUp: true };
}

function state(overrides: Partial<Area52GameState> = {}): Area52GameState {
  return {
    defenderDeck: [],
    currentDefenders: Array.from({ length: 6 }, () => null),
    attackerDeck: [],
    discardDeck: [],
    currentAttackers: [],
    wave: 1,
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

describe("Area 52 rules", () => {
  test("single attacks require a stronger opposite-color defender", () => {
    const attacker = card("5", "hearts");

    expect(area52Rules.canSingleAttack(card("6", "spades"), attacker)).toBe(
      true,
    );
    expect(area52Rules.canSingleAttack(card("5", "spades"), attacker)).toBe(
      false,
    );
    expect(area52Rules.canSingleAttack(card("6", "diamonds"), attacker)).toBe(
      false,
    );
  });

  test("dual attacks require exactly two defenders totaling the attacker", () => {
    const attacker = card("7", "hearts");

    expect(
      area52Rules.canDualAttack(
        [card("3", "clubs"), card("4", "diamonds")],
        attacker,
      ),
    ).toBe(true);
    expect(
      area52Rules.canDualAttack(
        [card("3", "clubs"), card("5", "diamonds")],
        attacker,
      ),
    ).toBe(false);
    expect(area52Rules.canDualAttack([card("7", "clubs")], attacker)).toBe(
      false,
    );
  });

  test("loses when an attacker remains and every defender is exhausted", () => {
    expect(
      area52Rules.isLost(
        state({
          currentAttackers: [card("K", "hearts")],
          attackerDeck: [card("Q", "diamonds")],
        }),
      ),
    ).toBe(true);
  });

  test("continues while a current or deck defender remains", () => {
    const attacker = card("K", "hearts");

    expect(
      area52Rules.isLost(
        state({
          currentAttackers: [attacker],
          currentDefenders: [card("2", "clubs"), null],
        }),
      ),
    ).toBe(false);
    expect(
      area52Rules.isLost(
        state({
          currentAttackers: [attacker],
          defenderDeck: [card("2", "clubs")],
        }),
      ),
    ).toBe(false);
  });

  test("scores only actual remaining defenders, not empty slots", () => {
    expect(
      area52Rules.getScore(
        state({
          ended: true,
          won: true,
          defenderDeck: [card("2", "clubs", "deck-defender")],
          currentDefenders: [
            card("3", "spades", "current-defender"),
            null,
            null,
          ],
        }),
      ),
    ).toBe(2);
    expect(area52Rules.getScore(state())).toBeUndefined();
  });
});
