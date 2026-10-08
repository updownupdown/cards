import { afterEach, describe, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { areBetaGamesVisible } from "@/data/beta-games";
import { isDevMode, loadDevMode, saveDevMode } from "@/data/dev-mode";
import { isGameEnabled } from "@/data/games-data";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import * as utils from "@/utils/utils";

// A real beta game if there is one; when none is in beta, any game marked
// as one does.
const betaGame = GAME_DEFINITIONS.find((game) => game.enabledOnLocalOnly) ?? {
  ...GAME_DEFINITIONS[0],
  enabledOnLocalOnly: true,
};

afterEach(async () => {
  await saveDevMode(false);
  await AsyncStorage.removeItem("cards.devMode.v1");
  jest.restoreAllMocks();
});

describe("Dev mode", () => {
  test("outside dev, beta games show only once dev mode is on", async () => {
    jest.spyOn(utils, "isLocalDevEnvironment").mockReturnValue(false);
    expect(isDevMode()).toBe(false);
    expect(areBetaGamesVisible()).toBe(false);
    expect(isGameEnabled(betaGame)).toBe(false);
    await saveDevMode(true);
    expect(isDevMode()).toBe(true);
    expect(isGameEnabled(betaGame)).toBe(true);
  });

  test("the saved choice is read back at startup", async () => {
    jest.spyOn(utils, "isLocalDevEnvironment").mockReturnValue(false);
    await AsyncStorage.setItem("cards.devMode.v1", "1");
    expect(await loadDevMode()).toBe(true);
    expect(areBetaGamesVisible()).toBe(true);
    await AsyncStorage.setItem("cards.devMode.v1", "0");
    expect(await loadDevMode()).toBe(false);
    expect(areBetaGamesVisible()).toBe(false);
  });
});
