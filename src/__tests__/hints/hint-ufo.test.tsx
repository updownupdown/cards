import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { HintUfo } from "@/hints/HintUfo";
import { makeHint, withNote, zoneTarget, type Hint } from "@/hints/hint";
import { requestHint, setHintDock, useHint } from "@/hints/hint-store";

// What the UFO says with a hint: nothing for a plain one (the beacons say
// it all), a note's words when the hint has one.

function Game({ hint }: { hint: Hint }) {
  useHint(() => hint, { game: hint });
  return null;
}

async function showBeacons(hint: Hint) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <>
        <Game hint={hint} />
        <HintUfo onAutopilotMove={() => {}} />
      </>,
    );
  });
  await act(async () => {
    requestHint("beacons");
  });
  // Measuring the board and the dock waits a moment.
  for (let tick = 0; tick < 5; tick += 1) {
    await act(async () => {
      jest.advanceTimersByTime(60);
    });
  }
  const words = renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");
  await act(async () => renderer.unmount());
  return words;
}

describe("the UFO's words", () => {
  let undock: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    undock = setHintDock(() => Promise.resolve({ x: 300, y: 40, size: 40 }));
  });

  afterEach(() => {
    undock();
    jest.useRealTimers();
  });

  test("a plain hint is shown, not said", async () => {
    const words = await showBeacons(makeHint("tapCard", zoneTarget("pile")));
    expect(words).toEqual([]);
  });

  test("a hint with a note says it", async () => {
    const words = await showBeacons(
      withNote(makeHint("tapCard", zoneTarget("pile")), "Kill this zombie"),
    );
    expect(words).toContain("Kill this zombie");
  });
});
