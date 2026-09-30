import { afterEach, beforeEach, jest } from "@jest/globals";

/**
 * Replaces Math.random with a seeded generator (mulberry32) for each test in
 * the file, so games that roll dice play out the same every run.
 */
export function seedRandomForEachTest(seed = 12345) {
  beforeEach(() => {
    let state = seed;
    jest.spyOn(Math, "random").mockImplementation(() => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
}
