import { CampaignUFO } from "@/components/Campaign/CampaignUFO";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

jest.mock("@/icons/Icon", () => ({ Icon: () => null }));

// Flights are scheduled 10-110s apart; with random() pinned to 0.5 the first
// one leaves after 60s and takes a little under 13s to cross.
const UNTIL_TAKEOFF = 61_000;
const PAST_A_WHOLE_FLIGHT = 14_000;

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

function ufo(renderer: ReactTestRenderer) {
  return renderer.root.findAll(
    (node) =>
      node.props.testID === "campaign-ufo" && typeof node.type === "string",
  )[0];
}

function opacityOf(node: ReactTestInstance) {
  return StyleSheet.flatten(node.props.style).opacity;
}

function positionOf(node: ReactTestInstance) {
  const transform = StyleSheet.flatten(node.props.style).transform as {
    translateX?: number;
    translateY?: number;
  }[];
  return {
    x: transform.find((step) => "translateX" in step)?.translateX,
    y: transform.find((step) => "translateY" in step)?.translateY,
  };
}

function buttons(renderer: ReactTestRenderer) {
  return renderer.root.findAll(
    (node) =>
      node.props.accessibilityRole === "button" &&
      typeof node.props.onPress === "function",
  );
}

function render(animationsEnabled: boolean, onCatch = () => {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <CampaignUFO
        width={400}
        height={800}
        animationsEnabled={animationsEnabled}
        summons={0}
        visits={0}
        onCatch={onCatch}
      />,
    );
  });
  return renderer;
}

describe("CampaignUFO", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    // The native driver never updates values in JS, so without this the
    // fade would never be observable here. Web runs every animation in JS.
    jest.replaceProperty(Platform, "OS", "web");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test("a caught UFO stays, fully visible, until it is dismissed", () => {
    const onCatch = jest.fn();
    const renderer = render(true, onCatch);

    advance(UNTIL_TAKEOFF);
    advance(3_000);
    expect(ufo(renderer)).toBeDefined();

    act(() => {
      buttons(renderer)[0].props.onPress();
    });
    expect(onCatch).toHaveBeenCalledTimes(1);

    // Well past where the fly-past would have faded it out.
    advance(PAST_A_WHOLE_FLIGHT);
    expect(ufo(renderer)).toBeDefined();
    expect(opacityOf(ufo(renderer))).toBe(1);

    // The only way out is the dismiss button, which is not inside the ship's
    // own button (on web that nests a <button> in a <button>).
    const dismiss = buttons(renderer).find(
      (button) =>
        button.props.accessibilityLabel !==
        buttons(renderer)[0].props.accessibilityLabel,
    );
    expect(dismiss).toBeDefined();
    act(() => {
      dismiss!.props.onPress();
    });
    advance(2_000);
    expect(ufo(renderer)).toBeUndefined();
  });

  test("the gate closing after a catch neither hides nor strands the UFO", () => {
    const renderer = render(true);
    advance(UNTIL_TAKEOFF);
    advance(3_000);
    act(() => {
      buttons(renderer)[0].props.onPress();
    });

    // Catching grants a skip, which closes the gate straight away.
    act(() => {
      renderer.update(
        <CampaignUFO
          width={400}
          height={800}
          animationsEnabled={false}
          summons={0}
          visits={0}
          onCatch={() => {}}
        />,
      );
    });
    advance(PAST_A_WHOLE_FLIGHT);

    expect(ufo(renderer)).toBeDefined();
    expect(opacityOf(ufo(renderer))).toBe(1);
    // It still finishes its drift to the middle, where the message is readable,
    // rather than freezing wherever it was when the gate closed.
    const { x, y } = positionOf(ufo(renderer));
    expect(x).toBeCloseTo(400 / 2, 0);
    expect(y).toBeCloseTo(800 * 0.44, 0);
  });

  test("a summoned UFO leaves at once, even with the gate closed", () => {
    const renderer = render(false);
    advance(UNTIL_TAKEOFF);
    expect(ufo(renderer)).toBeUndefined();

    act(() => {
      renderer.update(
        <CampaignUFO
          width={400}
          height={800}
          animationsEnabled={false}
          summons={1}
          visits={0}
          onCatch={() => {}}
        />,
      );
    });
    advance(1_000);
    expect(ufo(renderer)).toBeDefined();
    expect(opacityOf(ufo(renderer))).toBeGreaterThan(0);
  });

  test("a Mercy Skip visit flies in, can't be caught, and leaves by itself", () => {
    const onCatch = jest.fn();
    const renderer = render(false, onCatch);
    act(() => {
      renderer.update(
        <CampaignUFO
          width={400}
          height={800}
          animationsEnabled={false}
          summons={0}
          visits={1}
          onCatch={onCatch}
        />,
      );
    });
    advance(1_600);
    expect(ufo(renderer)).toBeDefined();
    // Hovering in the middle, with nothing to press: no dismiss button, and
    // the ship itself doesn't respond.
    const { x, y } = positionOf(ufo(renderer));
    expect(x).toBeCloseTo(400 / 2, 0);
    expect(y).toBeCloseTo(800 * 0.44, 0);
    const ship = renderer.root.findAll(
      (node) =>
        node.props.accessibilityLabel !== undefined &&
        node.props.disabled === true,
    );
    expect(ship.length).toBeGreaterThan(0);
    expect(onCatch).not.toHaveBeenCalled();

    advance(2_000 + 1_200);
    expect(ufo(renderer)).toBeUndefined();
  });

  test("the dismiss button is not nested inside the ship's button", () => {
    const renderer = render(true);
    advance(UNTIL_TAKEOFF);
    advance(3_000);
    act(() => {
      buttons(renderer)[0].props.onPress();
    });

    const [ship, dismiss] = buttons(renderer);
    const insideShip = (node: ReactTestInstance | null): boolean =>
      node === null ? false : node === ship || insideShip(node.parent);
    expect(insideShip(dismiss.parent)).toBe(false);
  });
});
