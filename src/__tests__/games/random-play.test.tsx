import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import "../../../jest/game-mocks";
import {
  harness,
  mappedCards,
  outcome,
  renderGame,
  settle,
} from "../../../jest/game-harness";
import { getGameComponentByPath } from "@/data/games-router";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { act } from "react-test-renderer";

// Every game must survive a burst of random taps, double-taps, zone presses and
// legal drags, made faster than animations finish, without errors or cards
// appearing twice. Like the real UI, taps skip disabled cards and zones. Set
// RANDOM_PLAY_SEEDS to play more games per title, and RANDOM_PLAY_FIRST_SEED to
// split a long run into batches (one Jest run holds a few hundred games).

const STEPS = 60;
const SETTLE_ROUNDS = 6;
const SEEDS = Number(process.env.RANDOM_PLAY_SEEDS ?? 1);
const FIRST_SEED = Number(process.env.RANDOM_PLAY_FIRST_SEED ?? 0);

function seededRandom(text: string) {
  let seed = 2166136261;
  for (const char of text) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: T[]) {
  return items[Math.floor(random() * items.length)];
}

async function tapRandomCard(random: () => number) {
  const config = harness.mapConfig!;
  const pressable = mappedCards().filter((card) => {
    const mapping = config.cardMapper(card) as
      | { onPress?: () => void; isDisabled?: boolean }
      | undefined;
    return mapping?.onPress && !mapping.isDisabled;
  });
  if (pressable.length === 0) return "no card to tap";
  const { id } = pick(random, pressable).card;
  const taps = random() < 0.3 ? 2 : 1;
  for (let tap = 0; tap < taps; tap += 1) {
    // Find the card again: the first tap may have moved it.
    const card = mappedCards().find((candidate) => candidate.card.id === id);
    const mapping = card
      ? (harness.mapConfig!.cardMapper(card) as
          | { onPress?: () => void; isDisabled?: boolean }
          | undefined)
      : undefined;
    const onPress = mapping?.isDisabled ? undefined : mapping?.onPress;
    if (!onPress) break;
    await act(async () => {
      onPress();
    });
  }
  return `tap ${id} x${taps}`;
}

async function pressRandomZone(random: () => number) {
  const config = harness.mapConfig!;
  const zones = config.zones.filter((zone) => {
    const mapping = config.zoneMapper?.(zone) as
      | { onPress?: () => void; isDisabled?: boolean }
      | undefined;
    return mapping?.onPress && !mapping.isDisabled;
  });
  if (zones.length === 0) return "no zone to press";
  const zone = pick(random, zones);
  await act(async () => {
    config.zoneMapper?.(zone)?.onPress?.();
  });
  return `press ${zone.id}`;
}

async function dragRandomCard(random: () => number) {
  const options = harness.dragOptions;
  const targets =
    options?.getDropHitAreas?.().map((area) => area.target) ?? [];
  if (!options || harness.dragSources.length === 0 || targets.length === 0) {
    return "nothing to drag";
  }
  const source = pick(random, harness.dragSources);
  const allowed = targets.filter((target) =>
    options.canDropOnTarget(source, target),
  );
  if (allowed.length === 0) return "no legal drop";
  const target = pick(random, allowed);
  await act(async () => {
    await options.onSuccessfulDrop(source, target);
  });
  return `drag ${JSON.stringify(source)} -> ${JSON.stringify(target)}`;
}

function duplicateCardIds() {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const zone of harness.mapConfig?.zones ?? []) {
    for (const card of zone.cards ?? []) {
      if (seen.has(card.id)) duplicates.push(`${card.id} in ${zone.id}`);
      seen.add(card.id);
    }
  }
  return duplicates;
}

let consoleErrors: unknown[][] = [];

beforeEach(() => {
  jest.useFakeTimers();
  consoleErrors = [];
  jest.spyOn(console, "error").mockImplementation((...args) => {
    consoleErrors.push(args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const cases = GAME_DEFINITIONS.flatMap(({ path }) =>
  Array.from(
    { length: SEEDS },
    (_, index) => [path, FIRST_SEED + index] as [string, number],
  ),
);

describe.each(cases)("%s (seed %i)", (path, seed) => {
  test("survives random play", async () => {
    const random = seededRandom(`${path}:${seed}`);
    const renderer = await renderGame(path, getGameComponentByPath(path)!);
    const moves: string[] = [];

    for (let step = 0; step < STEPS && outcome() === "playing"; step += 1) {
      const roll = random();
      try {
        moves.push(
          await (roll < 0.5
            ? tapRandomCard(random)
            : roll < 0.7
              ? pressRandomZone(random)
              : dragRandomCard(random)),
        );
        await settle(SETTLE_ROUNDS);
      } catch (error) {
        throw new Error(
          `Step ${step} after: ${moves.slice(-4).join(" | ")}\n${(error as Error).stack}`,
        );
      }
      expect({ step, duplicates: duplicateCardIds(), consoleErrors }).toEqual({
        step,
        duplicates: [],
        consoleErrors: [],
      });
    }

    await act(async () => {
      renderer.unmount();
    });
  });
});
