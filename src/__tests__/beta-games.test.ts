import { afterEach, describe, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  areBetaGamesVisible,
  loadBetaGames,
  saveBetaGames,
} from "@/data/beta-games";
import { isGameEnabled } from "@/data/games-data";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import * as utils from "@/utils/utils";

const betaGame = GAME_DEFINITIONS.find((game) => game.enabledOnLocalOnly)!;

afterEach(async () => {
  await saveBetaGames(false);
  jest.restoreAllMocks();
});

describe("Beta games", () => {
  test("outside dev, beta games show only once turned on", async () => {
    jest.spyOn(utils, "isLocalDevEnvironment").mockReturnValue(false);
    expect(areBetaGamesVisible()).toBe(false);
    expect(isGameEnabled(betaGame)).toBe(false);
    await saveBetaGames(true);
    expect(isGameEnabled(betaGame)).toBe(true);
  });

  test("the saved choice is read back at startup", async () => {
    jest.spyOn(utils, "isLocalDevEnvironment").mockReturnValue(false);
    await AsyncStorage.setItem("cards.betaGames.v1", "1");
    expect(await loadBetaGames()).toBe(true);
    expect(areBetaGamesVisible()).toBe(true);
    await AsyncStorage.setItem("cards.betaGames.v1", "0");
    expect(await loadBetaGames()).toBe(false);
    expect(areBetaGamesVisible()).toBe(false);
  });
});
