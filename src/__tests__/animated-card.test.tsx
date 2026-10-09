import { describe, expect, test } from "@jest/globals";
import React from "react";
import { StyleSheet } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  AnimatedCard,
  type AnimatedCardProps,
  type TargetState,
} from "@/components/Cards/AnimatedCard";
import type { PlayingCard } from "@/components/Cards/card-utils";

const card: PlayingCard = {
  id: "3-spades",
  rank: "3",
  suit: "spades",
  faceUp: true,
} as PlayingCard;

const resting: TargetState = { card, zoneId: "hand", x: 40, y: 200, zIndex: 1 };

function render(props: Partial<AnimatedCardProps> = {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <AnimatedCard
        targetState={resting}
        cardWidth={60}
        cardHeight={84}
        animDuration={200}
        {...props}
      />,
    );
  });
  return renderer;
}

function update(
  renderer: ReactTestRenderer,
  props: Partial<AnimatedCardProps>,
) {
  act(() => {
    renderer.update(
      <AnimatedCard
        targetState={resting}
        cardWidth={60}
        cardHeight={84}
        animDuration={200}
        {...props}
      />,
    );
  });
}

/** The zIndex of the card's outermost view. */
function zIndexOf(renderer: ReactTestRenderer) {
  const root = renderer.root.findAll(
    (node) =>
      typeof node.type !== "string" &&
      StyleSheet.flatten(node.props.style)?.position === "absolute" &&
      StyleSheet.flatten(node.props.style)?.zIndex !== undefined,
  )[0];
  return StyleSheet.flatten(root.props.style).zIndex;
}

describe("AnimatedCard stacking", () => {
  test("a selected card lifts without passing over the cards stacked on it", () => {
    const renderer = render();
    expect(zIndexOf(renderer)).toBe(1);
    update(renderer, { yOffset: -0.2, isSelected: true });
    expect(zIndexOf(renderer)).toBe(1);
  });

  test("a card nudged within its pile keeps its place in the stack", () => {
    const renderer = render();
    update(renderer, { targetState: { ...resting, x: 30, y: 190 } });
    expect(zIndexOf(renderer)).toBe(1);
  });

  test("a card moving within its pile takes its new zIndex at once", () => {
    const renderer = render();
    update(renderer, { targetState: { ...resting, x: 90, zIndex: -40 } });
    expect(zIndexOf(renderer)).toBe(-40);
  });

  test("a card gliding to the board's new layout passes over the board", () => {
    const renderer = render({ layoutKey: "60|84|6|0|0" });
    update(renderer, {
      layoutKey: "40|56|4|10|10",
      targetState: { ...resting, x: 30, y: 150 },
    });
    expect(zIndexOf(renderer)).toBeGreaterThan(1);
  });

  test("a card flying to another pile passes over resting cards", () => {
    const renderer = render();
    update(renderer, {
      targetState: { ...resting, zoneId: "foundation-0", x: 300, zIndex: 3 },
    });
    expect(zIndexOf(renderer)).toBeGreaterThan(3);
  });

  test("a card orbiting to the next place on a loop keeps the loop's order", () => {
    const onLoop = { ...resting, zoneId: "loop-3", zIndex: 97 };
    const renderer = render({
      targetState: onLoop,
      orbitConfig: { enabled: true },
    });
    update(renderer, {
      targetState: { ...onLoop, zoneId: "loop-2", x: 80, zIndex: 98 },
      orbitConfig: { enabled: true },
    });
    expect(zIndexOf(renderer)).toBe(98);
  });

  test("a card that lands without animating sits at its zIndex", () => {
    const renderer = render({ animDuration: 0 });
    update(renderer, {
      animDuration: 0,
      targetState: { ...resting, zoneId: "foundation-0", x: 300, zIndex: 3 },
    });
    expect(zIndexOf(renderer)).toBe(3);
  });
});
