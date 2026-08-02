import { readdirSync } from "node:fs";
import path from "node:path";
import type { GameDefinition } from "@/data/games-data";

jest.mock("@/animations", () => jest.requireActual("@/animations/types"));

function isGameDefinition(value: unknown): value is GameDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as GameDefinition).path === "string"
  );
}

function normalizedGameKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

describe("production game test coverage", () => {
  test("every production game route has a focused rule suite", () => {
    const gamesDirectory = path.resolve(__dirname, "../../src/data/games");
    const testsDirectory = path.resolve(__dirname, "../games");
    const testedGameKeys = new Set(
      readdirSync(testsDirectory)
        .filter((fileName) => fileName.endsWith(".test.ts"))
        .map((fileName) =>
          normalizedGameKey(fileName.replace(/\.test\.ts$/, "")),
        ),
    );

    const definitionFiles = readdirSync(gamesDirectory).filter((fileName) =>
      fileName.endsWith(".ts"),
    );
    const definitions = definitionFiles
      .map((fileName) => {
        const moduleExports = jest.requireActual<Record<string, unknown>>(
          path.join(gamesDirectory, fileName),
        );
        return Object.values(moduleExports).find(isGameDefinition);
      })
      .filter((game): game is GameDefinition => game !== undefined);

    const productionGames = definitions.filter(
      ({ enabledOnLocalOnly }) => !enabledOnLocalOnly,
    );
    const missingSuites = productionGames
      .map(({ path: gamePath }) => gamePath.slice(1))
      .filter((gamePath) => !testedGameKeys.has(normalizedGameKey(gamePath)));

    expect(definitions).toHaveLength(definitionFiles.length);
    expect(missingSuites).toEqual([]);
  });
});
