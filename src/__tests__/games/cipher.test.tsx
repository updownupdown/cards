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
  harness,
  mappedCards,
  outcome,
  pressCardId,
  renderGame,
} from "../../../jest/game-harness";
import {
  createDeck,
  RANKS,
  type StandardRank,
} from "@/components/Cards/card-utils";
import Cipher, {
  cipherRules,
  type CipherGameState,
} from "@/components/Games/Cipher";
import { seededRandom } from "@/hints/random";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const {
  CODE_SIZE,
  GUESSES,
  markRanks,
  gather,
  deal,
  pick,
  pickBack,
  unpick,
  check,
  isReady,
  isOver,
  suggestedGuess,
} = cipherRules;

function freshState(random: () => number) {
  const state: CipherGameState = {
    code: [],
    spare: [],
    pool: [createDeck()],
    guess: [],
    guesses: [],
    solved: false,
  };
  gather(state);
  deal(state, random);
  return state;
}

const ranks = (cards: ({ rank: string } | null)[]) =>
  cards.map((card) => card?.rank ?? null);

/** Lays the suggested guess, from the piles or the rows, and checks it. */
function autoPlay(state: CipherGameState) {
  while (!isOver(state)) {
    const wanted = suggestedGuess(state);
    state.guess.forEach((card, place) => {
      if (card && card.rank !== wanted[place]) unpick(state, card.id);
    });
    while (!isReady(state)) {
      const rank = wanted[state.guess.indexOf(null)];
      if (!pick(state, RANKS.indexOf(rank))) {
        const card = state.guesses
          .flatMap((guess) => guess.cards)
          .find((c) => c?.rank === rank);
        expect(card).toBeTruthy();
        expect(pickBack(state, card!.id)).toBe(true);
      }
    }
    check(state);
  }
}

describe("Cipher rules", () => {
  test("marks each guess card green, amber or plain", () => {
    expect(markRanks(["3", "7", "J"], ["3", "J", "5"])).toEqual([
      "exact",
      "near",
      "none",
    ]);
  });

  test("deals three clubs face down and a pool of three a rank", () => {
    const state = freshState(seededRandom("cipher-deal"));
    expect(state.code).toHaveLength(CODE_SIZE);
    expect(state.code.every((c) => c.suit === "clubs" && !c.faceUp)).toBe(true);
    expect(new Set(state.code.map((c) => c.rank)).size).toBe(CODE_SIZE);
    expect(state.spare).toHaveLength(13 - CODE_SIZE);
    expect(state.pool).toHaveLength(13);
    expect(state.pool.every((pile) => pile.length === 3)).toBe(true);
    expect(state.guess).toEqual([null, null, null]);
  });

  test("a guess holds different ranks, laid in order and taken back", () => {
    const state = freshState(seededRandom("cipher-guess"));
    expect(pick(state, 0)).toBe(true);
    expect(pick(state, 0)).toBe(false);
    expect(pick(state, 1)).toBe(true);
    expect(pick(state, 2)).toBe(true);
    expect(pick(state, 3)).toBe(false);
    expect(ranks(state.guess)).toEqual(["A", "2", "3"]);
    expect(isReady(state)).toBe(true);
    unpick(state, state.guess[1]!.id);
    expect(ranks(state.guess)).toEqual(["A", null, "3"]);
    expect(state.pool[1]).toHaveLength(3);
    // The next card fills the gap.
    pick(state, 4);
    expect(ranks(state.guess)).toEqual(["A", "5", "3"]);
  });

  test("a checked guess moves down with its marks; three greens crack it", () => {
    const state = freshState(seededRandom("cipher-check"));
    const code = state.code.map((c) => c.rank as StandardRank);
    // The first code rank in its place, the second elsewhere, one wrong.
    const other = RANKS.find((rank) => !code.includes(rank))!;
    pick(state, RANKS.indexOf(code[0]));
    pick(state, RANKS.indexOf(other));
    pick(state, RANKS.indexOf(code[1]));
    check(state);
    expect(state.guesses).toHaveLength(1);
    expect(state.guesses[0].marks).toEqual(["exact", "none", "near"]);
    expect(ranks(state.guesses[0].cards)).toEqual([code[0], other, code[1]]);
    expect(state.guess).toEqual([null, null, null]);
    expect(state.solved).toBe(false);
    // Then the cipher itself.
    for (const rank of code) pick(state, RANKS.indexOf(rank));
    check(state);
    expect(state.solved).toBe(true);
    expect(state.guesses).toHaveLength(2);
    expect(state.code.every((c) => c.faceUp)).toBe(true);
    expect(isOver(state)).toBe(true);
  });

  test("a card can come back from a row once its pile is bare", () => {
    const state = freshState(seededRandom("cipher-back"));
    const code = state.code.map((c) => c.rank as StandardRank);
    const wrong = RANKS.filter((rank) => !code.includes(rank)).slice(0, 7);
    // The same wrong rank three times empties its pile.
    for (let round = 0; round < 3; round += 1) {
      pick(state, RANKS.indexOf(wrong[0]));
      pick(state, RANKS.indexOf(wrong[1 + round * 2]));
      pick(state, RANKS.indexOf(wrong[2 + round * 2]));
      check(state);
    }
    expect(state.pool[RANKS.indexOf(wrong[0])]).toHaveLength(0);
    const back = state.guesses[0].cards[0]!;
    expect(back.rank).toBe(wrong[0]);
    expect(pickBack(state, back.id)).toBe(true);
    expect(state.guess[0]).toEqual(back);
    expect(state.guesses[0].cards[0]).toBeNull();
    expect(state.guesses[0].marks[0]).toBeNull();
  });

  test("the hints crack nearly every cipher within the eight guesses", () => {
    const random = seededRandom("cipher-auto");
    let solved = 0;
    let total = 0;
    const games = 60;
    for (let index = 0; index < games; index += 1) {
      const state = freshState(random);
      autoPlay(state);
      expect(isOver(state)).toBe(true);
      expect(state.guesses.length).toBeLessThanOrEqual(GUESSES);
      if (state.solved) {
        solved += 1;
        total += state.guesses.length;
      }
    }
    if (process.env.CIPHER_DEBUG)
      console.log(`solved ${solved} of ${games}, average ${total / solved}`);
    expect(solved).toBeGreaterThan(games * 0.9);
  });
});

describe("Cipher screen", () => {
  test("lays a guess from the pool and takes a card back", async () => {
    await renderGame("/cipher", Cipher);
    const game = () =>
      (harness.mapConfig as unknown as { game: CipherGameState }).game;
    expect(mappedCards()).toHaveLength(CODE_SIZE + 13 * 3);
    await pressCardId(game().pool[0][2].id);
    await pressCardId(game().pool[5][2].id);
    expect(ranks(game().guess)).toEqual(["A", "6", null]);
    await pressCardId(game().guess[0]!.id);
    expect(ranks(game().guess)).toEqual([null, "6", null]);
    expect(outcome()).toBe("playing");
  });
});
