import { describe, expect, jest, test } from "@jest/globals";
import { findDragTap } from "@/hints/hint-taps";
import { useDragDrop } from "@/hooks/useDragDrop";
import { act, create } from "react-test-renderer";

// Autopilot taps a card through its drag handle, found by the card it lifts.
// A card that has moved on (to a foundation, where it has no handle) must not
// answer with the handle it had in its old pile: FreeCell's Autopilot tapped
// the old pile instead of the foundation, and the move never happened.

type Source = { pile: number };

function Board({
  piles,
  onTap,
}: {
  piles: string[][];
  onTap: (source: Source) => void;
}) {
  const { makeDragHandlers } = useDragDrop<Source, Source>({
    canDropOnTarget: () => true,
    onSuccessfulDrop: () => {},
    getDroppedCardIds: (source) => piles[source.pile].slice(-1),
    getTapHandler: (source) => () => onTap(source),
  });
  piles.forEach((pile, index) => {
    if (pile.length > 0) makeDragHandlers({ pile: index }, () => {});
  });
  return null;
}

describe("drag handle taps for Autopilot", () => {
  test("a card that left its pile no longer taps that pile", () => {
    const onTap = jest.fn<(source: Source) => void>();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<Board piles={[["AH"], ["2H"]]} onTap={onTap} />);
    });
    findDragTap("AH")?.();
    expect(onTap).toHaveBeenLastCalledWith({ pile: 0 });

    // The ace goes up to a foundation: no pile lifts it now.
    act(() => {
      renderer.update(<Board piles={[[], ["2H"]]} onTap={onTap} />);
    });
    expect(findDragTap("AH")).toBeUndefined();
    findDragTap("2H")?.();
    expect(onTap).toHaveBeenLastCalledWith({ pile: 1 });
    act(() => renderer.unmount());
  });
});
