import { describe, expect, jest, test } from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  CampaignMap,
  gameRings,
  ringColors,
} from "@/components/Campaign/CampaignMap";
import { GAMES_DATA } from "@/data/games-registry";

// The rings turning about the selected game dot on the Odyssey map.

jest.mock("expo-image", () => ({ Image: () => null }));

const NONE: ReadonlySet<never> = new Set();

async function rings(selectedPath: string) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <CampaignMap
        selectedPath={selectedPath}
        ready
        onSelectGameDot={() => {}}
        wonPaths={NONE}
        unlockedPaths={NONE}
        collectedTaoIds={NONE}
        collectedQuoteIds={NONE}
      />,
    );
  });
  // Each hoop is drawn as two halves: one under the dot, one over it.
  const colors = (side: "back" | "front") =>
    renderer.root
      .findAll(
        (node) =>
          node.props.testID === `selected-ring-${side}` &&
          typeof node.type === "string",
      )
      .map(
        (node) =>
          (
            [node.props.style].flat(Infinity) as { borderColor?: string }[]
          ).find((style) => style?.borderColor)?.borderColor,
      );
  const back = colors("back");
  expect(colors("front")).toEqual(back);
  await act(async () => renderer.unmount());
  return back;
}

describe("the selected game dot's rings", () => {
  test("three hoops, in the selected game's own colours", async () => {
    const game = GAMES_DATA["/golf"];
    const colors = await rings("/golf");
    expect(colors).toHaveLength(3);
    expect(colors).toEqual(ringColors("/golf"));
    expect(colors).toContain(game.gameColorPale);
    expect(colors).toContain(game.gameColorAccent);
    expect(new Set(colors).size).toBe(3);
  });

  test("another game's rings are in its colours instead", async () => {
    expect(await rings("/klondike")).toEqual(ringColors("/klondike"));
    expect(ringColors("/klondike")).not.toEqual(ringColors("/golf"));
  });

  test("each game has its own sizes and line widths, and keeps them", () => {
    const shape = (path: string) =>
      gameRings(path).map(({ gap, width }) => [gap, width]);
    expect(shape("/golf")).toEqual(shape("/golf"));
    expect(shape("/golf")).not.toEqual(shape("/klondike"));
    for (const path of Object.keys(GAMES_DATA)) {
      const gaps = gameRings(path).map((ring) => ring.gap);
      // Hoops never swap places or sit on one another.
      expect(gaps[0]).toBeLessThan(gaps[1]);
      expect(gaps[1]).toBeLessThan(gaps[2]);
    }
  });
});
