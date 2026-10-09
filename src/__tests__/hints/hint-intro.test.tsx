import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { GameHeader } from "@/components/common/GameHeader";
import {
  loadHintMode,
  resetHintMode,
  useHintIntroSeen,
  useHintMode,
} from "@/data/hint-mode";
import { makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// The UFO's introduction: the box that opens from the hovering UFO in the
// header, with the "Help from Above" choice and a Dismiss button.

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const hint = makeHint("tapCard", zoneTarget("pile"));
let introSeen = false;

/** The header as GameWrapper shows it: no UFO once the choice is "Hide". */
function Game() {
  useHint(() => hint, { game: hint });
  const mode = useHintMode();
  introSeen = useHintIntroSeen();
  return (
    <GameHeader
      isCampaignMode={false}
      titleColor="#fff"
      backgroundColor="#000"
      scale={1}
      contentMaxWidth={600}
      insetTop={0}
      hidden={false}
      ended={false}
      canUndo={false}
      undoDisabled
      showHint={mode !== "off"}
      hintDisabled={false}
      onHome={() => {}}
      onRules={() => {}}
      onHint={() => {}}
      onUndo={() => {}}
      onReset={() => {}}
      onMenu={() => {}}
    />
  );
}

describe("the UFO's introduction", () => {
  let renderer: ReactTestRenderer;

  // A button is several nested nodes with the same label: its Pressable.
  const buttons = (label: string) =>
    renderer.root.findAll(
      (node) =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === "function" &&
        typeof node.type !== "string" &&
        node.parent?.props.accessibilityLabel !== label,
    );
  const press = async (label: string) => {
    await act(async () => {
      buttons(label)[0].props.onPress();
    });
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    await resetHintMode();
    await loadHintMode();
    await act(async () => {
      renderer = create(<Game />);
    });
    await press("Help from Above");
  });

  afterEach(async () => {
    await act(async () => renderer.unmount());
    jest.useRealTimers();
  });

  test("opens from the header's UFO", () => {
    expect(buttons("Dismiss")).toHaveLength(1);
  });

  test('choosing "Hide" keeps it open, with the UFO gone from the header', async () => {
    await press("Hide");
    expect(buttons("Help from Above")).toHaveLength(0);
    expect(buttons("Dismiss")).toHaveLength(1);
    expect(buttons("Hide")[0].props.accessibilityState).toEqual({
      selected: true,
    });
    expect(introSeen).toBe(false);

    // The choice can still be changed back before putting the box away.
    await press("Beacons");
    expect(buttons("Help from Above")).toHaveLength(1);
    expect(buttons("Dismiss")).toHaveLength(1);
  });

  test("Dismiss puts it away for good", async () => {
    await press("Hide");
    await press("Dismiss");
    expect(buttons("Dismiss")).toHaveLength(0);
    expect(introSeen).toBe(true);
  });

  test("a tap outside it puts it away for good too", async () => {
    await press("Close");
    expect(buttons("Dismiss")).toHaveLength(0);
    expect(introSeen).toBe(true);
    // The header's UFO is the usual hint button from here on.
    expect(buttons("Help from Above")).toHaveLength(1);
    await press("Help from Above");
    expect(buttons("Dismiss")).toHaveLength(0);
  });
});
