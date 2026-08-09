import {
  AgainstTheClockGameState,
  againstTheClockRules,
} from "@/components/Games/AgainstTheClock";
import { CardRank, PlayingCard } from "@/components/Cards/card-utils";

function card(rank: CardRank, id: string = rank): PlayingCard {
  return { id, rank, suit: "spades", faceUp: false };
}

function racingState(
  overrides: Partial<AgainstTheClockGameState> = {},
): AgainstTheClockGameState {
  const game = againstTheClockRules.createInitialState();
  game.phase = "racing";
  game.sectors = [card("7", "sector")];
  game.currentPlays = [];
  return { ...game, ...overrides };
}

describe("Against the Clock rules", () => {
  test.each([
    [1, 14, 2, 4, 8, 4],
    [2, 12, 2, 4, 6, 3],
    [3, 10, 2, 3, 5, 2],
  ])("sets up stage %i", (stage, sectors, first, second, third, modifiers) => {
    const game = againstTheClockRules.createInitialState();
    againstTheClockRules.setupStage(game, stage);

    expect(game.sectors).toHaveLength(sectors);
    expect(game.gearOne).toHaveLength(12 - first);
    expect(game.gearTwo).toHaveLength(12 - second);
    expect(game.gearThree).toHaveLength(16 - third);
    expect(game.boosts).toHaveLength(modifiers);
    expect(game.brakes).toHaveLength(modifiers);
  });

  test("starts from either dead end and reveals that sector", () => {
    const game = againstTheClockRules.createInitialState();
    const rightId = game.sectors[game.sectors.length - 1].id;

    expect(againstTheClockRules.chooseStart(game, true)).toBe(true);
    expect(game.sectors[0]).toEqual(
      expect.objectContaining({ id: rightId, faceUp: true }),
    );
    expect(game.phase).toBe("racing");
  });

  test("scores a bonus only for an exact one-card sector", () => {
    const oneCard = racingState({ currentPlays: [card("7")] });
    againstTheClockRules.finishSector(oneCard);
    expect(oneCard.bonuses).toBe(1);

    const twoCards = racingState({
      currentPlays: [card("3", "three"), card("4", "four")],
    });
    againstTheClockRules.finishSector(twoCards);
    expect(twoCards.bonuses).toBe(0);
    expect(twoCards.penalties).toBe(0);
  });

  test("boosts and brakes adjust the current speed", () => {
    const game = racingState({
      currentPlays: [card("7"), card("Q"), card("J")],
    });
    expect(againstTheClockRules.currentTotal(game)).toBe(7);
  });

  test("passing below target loses the difference in time", () => {
    const game = racingState({ currentPlays: [card("3")] });
    againstTheClockRules.finishSector(game);
    expect(game.penalties).toBe(4);
    expect(game.damage).toBe(0);
  });

  test("a repaired bust resolves without damage", () => {
    const game = racingState({
      currentPlays: [card("9"), card("J", "brake-one"), card("J", "brake-two")],
    });
    againstTheClockRules.finishSector(game);
    expect(game.penalties).toBe(0);
    expect(game.damage).toBe(0);
  });

  test("the third unresolved bust ends in a DNF", () => {
    const game = racingState({ damage: 2, currentPlays: [card("10")] });
    againstTheClockRules.finishSector(game);
    expect(game.ended).toBe(true);
    expect(game.won).toBe(false);
    expect(game.winLoseMessage).toContain("DNF");
  });

  test("sixteen time penalties end in a disqualification", () => {
    const game = racingState({ penalties: 15, currentPlays: [card("8")] });
    againstTheClockRules.finishSector(game);
    expect(game.ended).toBe(true);
    expect(game.winLoseMessage).toContain("DSQ");
  });

  test("finishing a stage advances and reduces modifiers", () => {
    const game = racingState({
      stage: 1,
      sectors: [card("7")],
      currentPlays: [card("7", "match")],
    });
    againstTheClockRules.finishSector(game);
    expect(game.stage).toBe(2);
    expect(game.phase).toBe("chooseStart");
    expect(game.sectors).toHaveLength(12);
    expect(game.boosts).toHaveLength(3);
  });
});
