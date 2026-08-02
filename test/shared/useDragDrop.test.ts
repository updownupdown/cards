import {
  createRect,
  pointInRect,
  resolveOverlapDropTarget,
  type DropHitArea,
} from "@/hooks/useDragDrop";

type Target = { id: string; allowed: boolean };

function area(
  id: string,
  x: number,
  y: number,
  priority = 0,
  allowed = true,
): DropHitArea<Target> {
  return {
    target: { id, allowed },
    rect: createRect(x, y, 40, 40),
    priority,
  };
}

describe("useDragDrop geometry", () => {
  test("includes rectangle boundaries and excludes points beyond them", () => {
    const rect = createRect(10, 20, 30, 40);

    expect(pointInRect(10, 20, rect)).toBe(true);
    expect(pointInRect(40, 60, rect)).toBe(true);
    expect(pointInRect(40.1, 60, rect)).toBe(false);
    expect(pointInRect(40, 60.1, rect)).toBe(false);
  });

  test("selects the nearest overlapping legal target", () => {
    const target = resolveOverlapDropTarget(
      "source",
      createRect(25, 0, 40, 40),
      [area("left", 0, 0), area("right", 40, 0)],
      (_source, candidate) => candidate.allowed,
    );

    expect(target?.id).toBe("right");
  });

  test("uses priority when overlapping targets are equally near", () => {
    const target = resolveOverlapDropTarget(
      "source",
      createRect(20, 20, 20, 20),
      [area("low", 10, 10, 1), area("high", 10, 10, 10)],
      (_source, candidate) => candidate.allowed,
    );

    expect(target?.id).toBe("high");
  });

  test("ignores illegal targets and returns null without overlap", () => {
    expect(
      resolveOverlapDropTarget(
        "source",
        createRect(10, 10, 20, 20),
        [area("blocked", 0, 0, 10, false)],
        (_source, candidate) => candidate.allowed,
      ),
    ).toBeNull();
    expect(
      resolveOverlapDropTarget(
        "source",
        createRect(100, 100, 20, 20),
        [area("distant", 0, 0)],
        (_source, candidate) => candidate.allowed,
      ),
    ).toBeNull();
  });
});
