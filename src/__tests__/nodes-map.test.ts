import { describe, expect, test } from "@jest/globals";
import { validateNodesMap } from "@/data/nodes-map";

describe("Nodes map", () => {
  test("covers every game with a valid graph and rewards", () => {
    expect(validateNodesMap()).toEqual([]);
  });
});
