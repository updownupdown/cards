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
  dropMove,
  outcome,
  pressButton,
  pressCard,
  pressCardId,
  renderGame,
  renderVariant,
  run,
} from "../../../jest/game-harness";
import type { PlayingCard } from "@/components/Cards/card-utils";
import FieldCommand from "@/components/Games/FieldCommand";
import FortyThieves from "@/components/Games/FortyThieves";
import NightVigil from "@/components/Games/NightVigil";
import Penguin from "@/components/Games/Penguin";
import TwelveTrials from "@/components/Games/TwelveTrials";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Field Command", () => {
  function captureState(enemy: PlayingCard, hand: PlayingCard[]) {
    return {
      personalDeck: [],
      personalDiscard: [],
      enemyDeck: [],
      enemyRow: [null, null, null, enemy],
      enemyCapturePile: [],
      hand,
      phase: "capturePhase",
      selectedHandIds: [],
      selectedEnemyIdx: null,
      ended: false,
      won: false,
      winLoseMessage: "",
    };
  }

  test("capturing the last enemy wins", async () => {
    const enemy = card("5", "spades");
    const attacker = card("7", "spades");
    const renderer = await renderGame(
      "/field-command",
      FieldCommand,
      captureState(enemy, [attacker]),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(attacker.id);
    await pressCardId(enemy.id);
    await pressButton(renderer, "Capture");

    expect(outcome()).toBe("won");
  });

  test("letting the enemy capture a combatant loses", async () => {
    const defender = card("3", "hearts");
    const renderer = await renderGame(
      "/field-command",
      FieldCommand,
      captureState(card("J", "spades"), [defender]),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(defender.id);
    await pressButton(renderer, "Let Capture");

    expect(outcome()).toBe("lost");
  });
});

describe("Night Vigil", () => {
  function encounterState(
    threats: PlayingCard[],
    encounterDeck: PlayingCard[],
    health: number,
    armor: number,
  ) {
    return {
      encounterDeck,
      playDeck: [card("6", "clubs", false)],
      discard: [],
      trackers: [],
      currentEncounter: card("J", "spades"),
      threats: threats.map((threat) => ({
        card: threat,
        responses: [],
        smoked: false,
      })),
      currentResponse: null,
      responsesDrawn: 0,
      smokeUsed: false,
      grapplePair: null,
      grappleResponses: [],
      grappleAnchor: null,
      armor,
      health,
      encounterNumber: 12,
      difficulty: "kingpin",
      ended: false,
      won: false,
    };
  }

  test("surviving the final encounter wins", async () => {
    const renderer = await renderGame(
      "/night-vigil",
      NightVigil,
      encounterState([], [], 10, 10),
    );
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Resolve");

    expect(outcome()).toBe("won");
  });

  test("losing the last health loses", async () => {
    // Two unanswered threats deal 2 damage, less 1 healing.
    const renderer = await renderGame(
      "/night-vigil",
      NightVigil,
      encounterState(
        [card("9", "spades"), card("9", "hearts")],
        [card("Q", "clubs", false)],
        1,
        0,
      ),
    );
    expect(outcome()).toBe("playing");

    await pressButton(renderer, "Resolve");

    expect(outcome()).toBe("lost");
  });
});

describe("Twelve Trials", () => {
  function dungeonState(
    placed: PlayingCard[],
    hand: PlayingCard[],
    damage: number,
  ) {
    return {
      slots: [
        {
          monster: card("J", "spades"),
          row: 0,
          x: 0,
          defeated: false,
          placed: placed.map((attacker) => ({
            card: attacker,
            role: "attack",
          })),
        },
      ],
      deck: [card("6", "diamonds", false)],
      hand,
      reserve: [],
      damage,
      discard: [],
      kings: [],
      reserveSetup: false,
      ended: false,
      won: false,
    };
  }

  test("defeating the last monster wins", async () => {
    // 6 + 5 meets the Jack's 11; a spade triggers the defeat.
    const trigger = card("3", "spades");
    await renderGame(
      "/twelve-trials",
      TwelveTrials,
      dungeonState([card("6", "spades"), card("5", "hearts")], [trigger], 0),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(trigger.id);
    await pressCard((mapped) => mapped.zoneName === "slot");

    expect(outcome()).toBe("won");
  });

  test("taking the seventh damage loses", async () => {
    const discarded = card("2", "clubs");
    const renderer = await renderGame(
      "/twelve-trials",
      TwelveTrials,
      dungeonState([], [discarded, card("4", "diamonds")], 6),
    );
    expect(outcome()).toBe("playing");

    await pressCardId(discarded.id);
    await pressButton(renderer, "Discard");

    expect(outcome()).toBe("lost");
  });
});

describe("Penguin", () => {
  const emptyColumns = () =>
    Array.from({ length: 7 }, () => [] as PlayingCard[]);

  test("building the last foundation card wins", async () => {
    const tableau = emptyColumns();
    tableau[0] = [card("K", "spades")];
    await renderGame("/penguin", Penguin, {
      foundations: {
        clubs: run("clubs"),
        diamonds: run("diamonds"),
        hearts: run("hearts"),
        spades: run("spades", "A", "Q"),
      },
      beakRank: "A",
      tableau,
      reserves: Array(7).fill(null),
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pileIndex: 0, cardIndex: 0 },
      { zone: "foundation", suit: "spades" },
    );

    expect(outcome()).toBe("won");
  });

  test("filling the last reserve with no moves left loses", async () => {
    // No twos for the foundations, no kings for the empty columns, and no
    // same-suit neighbours once the 9 of hearts is parked.
    const tableau = emptyColumns();
    tableau[0] = [card("5", "spades"), card("9", "hearts")];
    tableau[1] = [card("7", "clubs")];
    await renderGame("/penguin", Penguin, {
      foundations: {
        clubs: [card("A", "clubs")],
        diamonds: [card("A", "diamonds")],
        hearts: [card("A", "hearts")],
        spades: [card("A", "spades")],
      },
      beakRank: "A",
      tableau,
      reserves: [
        card("3", "diamonds"),
        card("7", "diamonds"),
        card("J", "hearts"),
        card("Q", "clubs"),
        card("10", "spades"),
        card("4", "hearts"),
        null,
      ],
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pileIndex: 0, cardIndex: 1 },
      { zone: "reserve", slotIndex: 6 },
    );

    expect(outcome()).toBe("lost");
  });
});

describe("Forty Thieves", () => {
  test("building the last foundation card wins", async () => {
    const tableau = Array.from({ length: 10 }, () => [] as PlayingCard[]);
    tableau[0] = [card("K", "spades")];
    await renderVariant("/forty-thieves", "forty-thieves", FortyThieves, {
      foundations: [
        run("spades"),
        run("hearts"),
        run("hearts"),
        run("clubs"),
        run("clubs"),
        run("diamonds"),
        run("diamonds"),
        run("spades", "A", "Q"),
      ],
      tableau,
      stock: [],
      waste: [],
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pile: 0, card: 0 },
      { zone: "foundation", pile: 7 },
    );

    expect(outcome()).toBe("won");
  });

  test("running out of moves loses", async () => {
    // Once the 9 of hearts is played, no top card has a same-suit neighbour.
    const tableau = [
      [card("5", "spades"), card("9", "hearts")],
      [card("10", "hearts")],
      [card("3", "clubs")],
      [card("7", "diamonds")],
      [card("J", "spades")],
      [card("Q", "diamonds")],
      [card("4", "hearts")],
      [card("8", "clubs")],
      [card("K", "clubs")],
      [card("2", "diamonds")],
    ];
    await renderVariant("/forty-thieves", "forty-thieves", FortyThieves, {
      foundations: Array.from({ length: 8 }, () => []),
      tableau,
      stock: [],
      waste: [],
      redealsUsed: 0,
      ended: false,
      won: false,
    });
    expect(outcome()).toBe("playing");

    await dropMove(
      { zone: "tableau", pile: 0, card: 1 },
      { zone: "tableau", pile: 1 },
    );

    expect(outcome()).toBe("lost");
  });
});
