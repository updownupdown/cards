import {
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@/components/Cards/card-utils";
import {
  deadCenterRules,
  type DeadCenterGameState,
  type DeadCenterZombie,
} from "@/components/Games/DeadCenter";

function card(
  rank: CardRank,
  suit: CardSuit = "spades",
  id: string = `${rank}-${suit}`,
  faceUp = true,
): PlayingCard {
  return { id, rank, suit, faceUp };
}

function zombie(
  index: number,
  overrides: Partial<DeadCenterZombie> = {},
): DeadCenterZombie {
  return {
    id: `z-${index}`,
    card: card("J", "spades", `zombie-card-${index}`),
    dead: true,
    ...overrides,
  };
}

function state(
  overrides: Partial<DeadCenterGameState> = {},
): DeadCenterGameState {
  return {
    draw: [card("2", "clubs", "draw")],
    piles: Array.from({ length: 9 }, (_, index) => [
      card("2", "clubs", `pile-${index}`),
    ]),
    zombies: Array.from({ length: 12 }, (_, index) => zombie(index)),
    phase: "kill",
    lastPlayedPile: 0,
    ended: false,
    won: false,
    winLoseMessage: "",
    ...overrides,
  };
}

function allCardIds(game: DeadCenterGameState) {
  return [
    ...game.draw,
    ...game.piles.flat(),
    ...game.zombies.map(({ card: zombieCard }) => zombieCard),
  ]
    .map(({ id }) => id)
    .sort();
}

describe("Dead Center rules", () => {
  test("allows jokers, equal ranks, same-color increases, and opposite-color decreases", () => {
    expect(deadCenterRules.canPlayOn(card("5", "hearts"), card("Joker"))).toBe(
      true,
    );
    expect(
      deadCenterRules.canPlayOn(card("5", "hearts"), card("5", "clubs")),
    ).toBe(true);
    expect(
      deadCenterRules.canPlayOn(card("5", "hearts"), card("6", "diamonds")),
    ).toBe(true);
    expect(
      deadCenterRules.canPlayOn(card("6", "hearts"), card("5", "clubs")),
    ).toBe(true);
  });

  test("rejects reversed color/rank relationships", () => {
    expect(
      deadCenterRules.canPlayOn(card("6", "hearts"), card("5", "diamonds")),
    ).toBe(false);
    expect(
      deadCenterRules.canPlayOn(card("5", "hearts"), card("6", "clubs")),
    ).toBe(false);
  });

  test("finds the two support piles along the attack line", () => {
    expect(deadCenterRules.supportIndicesForAttack(0, 0)).toEqual([3, 6]);
    expect(deadCenterRules.supportIndicesForAttack(4, 4)).toEqual([3, 5]);
    expect(deadCenterRules.supportIndicesForAttack(8, 8)).toEqual([2, 5]);
  });

  test("requires support values totaling at least ten", () => {
    const target = card("J", "spades", "target");

    expect(deadCenterRules.canKillZombie(target, [card("6"), card("4")])).toBe(
      true,
    );
    expect(deadCenterRules.canKillZombie(target, [card("5"), card("4")])).toBe(
      false,
    );
  });

  test("applies king suit and queen color restrictions", () => {
    expect(
      deadCenterRules.canKillZombie(card("K", "hearts"), [
        card("6", "hearts"),
        card("4", "hearts"),
      ]),
    ).toBe(true);
    expect(
      deadCenterRules.canKillZombie(card("K", "hearts"), [
        card("6", "hearts"),
        card("4", "diamonds"),
      ]),
    ).toBe(false);
    expect(
      deadCenterRules.canKillZombie(card("Q", "hearts"), [
        card("6", "hearts"),
        card("4", "diamonds"),
      ]),
    ).toBe(true);
    expect(
      deadCenterRules.canKillZombie(card("Q", "hearts"), [
        card("6", "hearts"),
        card("4", "clubs"),
      ]),
    ).toBe(false);
  });

  test("tracks living and unrevealed zombies", () => {
    const zombies = [
      zombie(0, {
        dead: false,
        card: card("J", "spades", "hidden", false),
      }),
      zombie(1, { dead: false }),
      zombie(2, {
        dead: true,
        card: card("J", "spades", "dead-hidden", false),
      }),
    ];

    expect(deadCenterRules.needsReveal(zombies)).toBe(true);
    expect(deadCenterRules.aliveCount(zombies)).toBe(2);
  });

  test("enumerates valid attacks in a reduced zombie layout", () => {
    const game = state();
    game.zombies[0] = zombie(0, { dead: false });
    game.piles[3] = [card("6", "hearts", "support-1")];
    game.piles[6] = [card("4", "clubs", "support-2")];

    expect(deadCenterRules.getAvailableAttacks(game)).toEqual([0]);

    game.piles[6] = [card("3", "clubs", "weak-support")];
    expect(deadCenterRules.getAvailableAttacks(game)).toEqual([]);
  });

  test("always leaves a no-attack kill phase for reveal or play", () => {
    const hidden = [
      zombie(0, {
        dead: false,
        card: card("J", "spades", "hidden", false),
      }),
    ];
    const revealed = [zombie(0, { dead: false })];

    expect(deadCenterRules.phaseAfterKill(hidden)).toBe("reveal");
    expect(deadCenterRules.phaseAfterKill(revealed)).toBe("play");
  });

  test("plays the draw card onto a legal pile and conserves cards", () => {
    const game = state({
      phase: "play",
      draw: [card("5", "clubs", "draw-card")],
      piles: Array.from({ length: 9 }, (_, index) => [
        card(index === 0 ? "5" : "2", "hearts", `pile-${index}`),
      ]),
    });
    const idsBefore = allCardIds(game);

    expect(deadCenterRules.playPileAction(game, 0)).toBe(true);
    expect(game.draw).toEqual([]);
    expect(game.piles[0].at(-1)?.id).toBe("draw-card");
    expect(game).toMatchObject({ phase: "kill", lastPlayedPile: 0 });
    expect(allCardIds(game)).toEqual(idsBefore);
  });

  test("keeps the game active when the final draw card enables a zombie kill", () => {
    const game = state({
      phase: "play",
      draw: [card("5", "clubs", "last-draw-card")],
    });
    game.zombies[0] = zombie(0, { dead: false });
    game.piles[0] = [card("5", "hearts", "target-pile")];
    game.piles[3] = [card("6", "hearts", "support-1")];
    game.piles[6] = [card("4", "clubs", "support-2")];

    expect(deadCenterRules.playPileAction(game, 0)).toBe(true);
    expect(game.draw).toEqual([]);
    expect(deadCenterRules.getAvailableAttacks(game)).toEqual([0]);
    expect(deadCenterRules.evaluateOutcome(game)).toBeNull();
  });

  test("loses after the final draw card when it cannot kill a zombie", () => {
    const game = state({
      phase: "play",
      draw: [card("5", "clubs", "last-draw-card")],
    });
    game.zombies[0] = zombie(0, { dead: false });
    game.piles[0] = [card("5", "hearts", "target-pile")];
    game.piles[3] = [card("5", "hearts", "support-1")];
    game.piles[6] = [card("4", "clubs", "support-2")];

    expect(deadCenterRules.playPileAction(game, 0)).toBe(true);
    expect(deadCenterRules.getAvailableAttacks(game)).toEqual([]);
    expect(deadCenterRules.evaluateOutcome(game)).toEqual({
      won: false,
      message: "No cards left to draw!",
    });
  });

  test("rejects an illegal pile play without mutation", () => {
    const game = state({
      phase: "play",
      draw: [card("4", "diamonds", "draw-card")],
      piles: Array.from({ length: 9 }, (_, index) => [
        card("5", "hearts", `pile-${index}`),
      ]),
    });
    const before = structuredClone(game);

    expect(deadCenterRules.playPileAction(game, 0)).toBe(false);
    expect(game).toEqual(before);
  });

  test("kills only an available zombie and advances to play", () => {
    const game = state();
    game.zombies[0] = zombie(0, { dead: false });
    game.piles[3] = [card("6", "hearts", "support-1")];
    game.piles[6] = [card("4", "clubs", "support-2")];

    expect(deadCenterRules.killZombieAction(game, 0)).toBe(true);
    expect(game.zombies[0].dead).toBe(true);
    expect(game).toMatchObject({ phase: "play", lastPlayedPile: null });
  });

  test("wins when the final draw card kills the final zombie", () => {
    const game = state({ draw: [] });
    game.zombies[0] = zombie(0, { dead: false });
    game.piles[3] = [card("6", "hearts", "support-1")];
    game.piles[6] = [card("4", "clubs", "support-2")];

    expect(deadCenterRules.killZombieAction(game, 0)).toBe(true);
    expect(deadCenterRules.evaluateOutcome(game)).toEqual({
      won: true,
      message: "You killed all the zombies!",
    });
  });

  test("advances to reveal when another hidden zombie remains", () => {
    const game = state();
    game.zombies[0] = zombie(0, { dead: false });
    game.zombies[1] = zombie(1, {
      dead: false,
      card: card("Q", "hearts", "hidden", false),
    });
    game.piles[3] = [card("6", "hearts", "support-1")];
    game.piles[6] = [card("4", "clubs", "support-2")];

    expect(deadCenterRules.killZombieAction(game, 0)).toBe(true);
    expect(game.phase).toBe("reveal");
  });

  test("rejects killing a zombie without sufficient support", () => {
    const game = state();
    game.zombies[0] = zombie(0, { dead: false });
    game.piles[3] = [card("5", "hearts", "support-1")];
    game.piles[6] = [card("4", "clubs", "support-2")];
    const before = structuredClone(game);

    expect(deadCenterRules.killZombieAction(game, 0)).toBe(false);
    expect(game).toEqual(before);
  });
});
